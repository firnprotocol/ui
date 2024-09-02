import { ExplorerLink } from "@components/ExplorerLink";
import { FIRN_ABI } from "@constants/abis";
import { ADDRESSES } from "@constants/addresses";
import { N } from "@crypto/algebra";
import { EPOCH_LENGTH } from "@crypto/client";
import { useEpoch } from "hooks/useEpoch";
import toast from "react-hot-toast";
import { relayFetch } from "utils/relay";
import { encodeAbiParameters, keccak256 } from "viem";
import { useAccount, useConfig } from "wagmi";
import {
  getBlock,
  waitForTransactionReceipt,
  watchContractEvent,
} from "wagmi/actions";

export function useFirnRelay() {
  const config = useConfig();

  const nextEpoch = useEpoch();
  const { chain } = useAccount();

  async function firnRelayTransferWithdraw({
    setDisplay,
    recipient,
    setRecipient,
    data,
    setRawDisplay,
    amount,
    setAmount,
    setLocked,
    isTransfer,
    client,
    tip,
    fee,
    shadowBan,
    setMaxEnabled,
    setAbiInterfaceStr,
  }) {
    // isTransfer maps to props.transfer
    setLocked(true);
    try {
      let block = await getBlock(config); // atomic?
      let epoch = Math.floor(Number(block.timestamp) / EPOCH_LENGTH);
      const away =
        (Math.floor(Number(block.timestamp) / EPOCH_LENGTH) + 1) *
          EPOCH_LENGTH -
        Number(block.timestamp);
      // crude attempt to determine how much time is left in the epoch. typically this will be an underestimate
      const delay =
        client.banned || amount > client.state.available || away < 20;
      // if `away < 20`, then the "real" distance from the epoch change is at least 5.
      // let next = client.next() // give (the relay) some time after the next epoch...
      // let away = next - Date.now()

      toast.loading("We've staged your transaction; please wait.");

      if (delay) {
        block = await nextEpoch(block);
        epoch = Math.floor(Number(block.timestamp) / EPOCH_LENGTH);
      }
      const promise = nextEpoch(block); // start counting; note that we don't await.
      // invariant: epoch points to current, nextEpoch resolves upon next true regardless of delay.

      const [Y, C, D, u, proof] = await (isTransfer
        ? client.transfer(recipient, amount, epoch, tip, chain.name)
        : client.withdraw(
            amount,
            epoch,
            tip + fee,
            recipient,
            data,
            chain.name,
          ));
      const hash = keccak256(
        encodeAbiParameters(
          [
            { name: "", type: `bytes32[${N}]` },
            { name: "", type: `bytes32[${N}]` },
            { name: "", type: "bytes32" },
          ],
          [Y, C, D],
        ),
      );

      const alternative = new Promise((resolve) => {
        const unwatch = watchContractEvent(config, {
          address: ADDRESSES[chain.name].FIRN,
          abi: FIRN_ABI,
          eventName: isTransfer ? "TransferOccurred" : "WithdrawalOccurred",
          onLogs(logs) {
            logs.forEach((log) => {
              const { Y, C, D } = log.args;
              const candidate = keccak256(
                encodeAbiParameters(
                  [
                    { name: "", type: `bytes32[${N}]` },
                    { name: "", type: `bytes32[${N}]` },
                    { name: "", type: "bytes32" },
                  ],
                  [Y, C, D],
                ),
              );
              if (hash === candidate) {
                unwatch();
                resolve(log);
              }
            });
          },
        });
        setTimeout(() => {
          unwatch();
        }, 180000);
      });

      const body = { Y, C, D, u, epoch, tip, proof };

      if (!isTransfer) {
        body.destination = recipient;
        body.data = data; // relay will overwrite this anyway for now...
        body.amount = amount;
        // can submit calldata here as well
      }

      const transactionReceipt = await Promise.race([
        // could be an event..
        relayFetch(`${isTransfer ? "transfer" : "withdrawal"}${chain.id}`, body)
          .then((json) => {
            toast(
              <span>
                <ExplorerLink hash={json.hash}>
                  Your {isTransfer ? "transfer" : "withdrawal"} transaction
                </ExplorerLink>{" "}
                was successfully submitted, and is now pending; please wait.
              </span>,
            );
            return Promise.race([
              waitForTransactionReceipt(config, json).catch((error) => {
                // apparently, when the thing reverts, instead of returning a receipt with { status: "reverted" }, it just throws.
                // "CallExecutionError: Execution reverted for an unknown reason." ... "Details: execution reverted".

                // what can _also_ happen is TransactionNotFoundError: Transaction with hash "0x____" could not be found
                // this seems to be a bug: the whole goal is to _wait_ for the transaction, not to throw, if it's not there yet.
                // in fact at one point i even confirmed with jxom that this is a bug, but he said it should be "fixed"
                // don't know (yet) how to detect this programmatically...
                console.error(error);
                return { status: "reverted", transactionHash: json.hash }; // if (error.details === "execution reverted")
              }),
              promise.then((block) => {
                // this guy handles the case where the relay _does_ respond with the tx hash, but then nobody mines it,
                // and we sit around waiting until we're sure that the thing has expired....
                return new Promise((resolve, reject) => {
                  setTimeout(() => {
                    reject({
                      statusText: "Took too long",
                      transactionHash: json.hash, // ...json
                    });
                  }, 15000);
                });
              }),
            ]);
          })
          .then((data) => {
            if (data.status === "success") {
              return data;
            }
            return promise.then((block) => {
              // this whole block is only for the extremely weird edge case where our thing got _certifiably_ reverted,
              // but we wait around anyway, in case someone else mined it, but we haven't received word of that yet.
              // warning: if `waitForTransaction` takes super-long, _and_ the thing fails (i.e., resolves with status === 0),
              // then code won't flow over the below until _after_ `nextBlock` has resolved (i.e., could be > 5 seconds after).
              // in this event, the below generic waiter could throw before this one does, even when our thing got reverted.
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  reject(data);
                }, 15000);
              });
            });
          }),
        alternative,
        promise.then((block) => {
          // start the process NOW for a full rejection...!!! in case relay takes forever.
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              reject({ statusText: "No response" });
            }, 20000);
          });
        }),
        // give a huge grace period here of 20 seconds _after_ next epoch starts. i guess the idea is that
        // the response can take a while to come back, even though the thing has actually successfully been mined.
        // i'd rather have the user wait a little longer than necessary before being notified of the failure,
        // than inappropriately alert them of a failure (false negative).
        new Promise((resolve, reject) => {
          setTimeout(() => {
            reject({ statusText: "Radio silence" });
          }, 180000);
        }),
      ]);
      toast.success(
        <span>
          Your {isTransfer ? "transfer" : "withdrawal"} of{" "}
          {(amount / 1000).toFixed(3)} ETH was successful! You can see your
          transaction at{" "}
          <ExplorerLink hash={transactionReceipt.transactionHash} />.
        </span>, // todo: different message when it gets sniped?
      );
      // it would have been cute if we could do the above ^ only once in the "finally" block,
      // instead of twice, once here and once in the cancel block. doesn't work to do that though,
      // because if we wait, then the account decrement will happen _before_ the amount and recipient field reset.
      // then it will show "not enough balance" in the intervening time. etc.
      client.state.available -= amount + fee + tip;
      // it's only pending at the moment, but the user ain't doing anything until the next epoch,
      // so it's irrelevant which we update. it's be just as good to set a timer to roll over.... but no need.
      client.state.update(); // update it now we're locked and waiting anyway.
      shadowBan(promise);
    } catch (error) {
      console.error(error);
      if (error.message === "Failed to fetch")
        toast.error(
          "We lost contact with the relay during your transaction; please try again.",
        );
      else if (error.status === "reverted")
        toast.error(
          <span>
            <ExplorerLink hash={error.transactionHash}>
              Your {isTransfer ? "transfer" : "withdrawal"} transaction
            </ExplorerLink>{" "}
            reverted! This may be a timing issue; please try again.
          </span>,
        );
      else if (error.statusText === "No response")
        toast.error(
          "The relay took too long to respond, and your transaction expired. This is probably a connectivity issue; please try again.",
        );
      else if (error.statusText === "Radio silence")
        toast.error(
          "We lost contact with the network while trying to broadcast your transaction; this is probably a connectivity issue.",
        );
      else if (error.statusText === "Took too long")
        toast.error(
          <span>
            <ExplorerLink hash={error.transactionHash}>
              Your {isTransfer ? "transfer" : "withdrawal"} transaction
            </ExplorerLink>{" "}
            took too long to mine, and expired; please try again.
          </span>,
        );
      else if (error.shortMessage === "HTTP request failed.")
        // ?
        toast.error("We were unable to reach the network.");
      else if (error.status === 500) {
        if (error.statusText === "Tip too low")
          toast.error(
            "The relay rejected your transaction's fee as excessively low; please try again.",
          );
        else if (error.statusText === "Wrong epoch")
          toast.error(
            "The relay reported a clock synchronization issue; please try again.",
          );
        else
          toast.error(
            <span>
              The relay's attempt to broadcast your transaction failed. Please
              report this bug directly in our{" "}
              <span className="underline">
                <a
                  href="https://discord.com/channels/957283352774344794/1035928340416180255"
                  target="_blank"
                  rel="noreferrer"
                >
                  support channel
                </a>
              </span>
              .
            </span>,
          );
      } else toast.error("An unknown error occurred.");
    } finally {
      setLocked(false);
      setAmount(0);
      setDisplay("");
      setRecipient("");
      setMaxEnabled(false);
      setRawDisplay("");
      setAbiInterfaceStr(""); // setData("0x");
    }
  }

  return firnRelayTransferWithdraw;
}
