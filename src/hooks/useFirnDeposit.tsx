import { ExplorerLink } from "@components/ExplorerLink";
import { FIRN_ABI } from "@constants/abis";
import { ADDRESSES } from "@constants/addresses";
import { BN128 } from "@crypto/bn128";
import { useEpoch } from "hooks/useEpoch";
import toast from "react-hot-toast";
import { parseUnits } from "viem";
import { useAccount, useConfig } from "wagmi";
import {
  getBlock,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";

export function useFirnDeposit() {
  const config = useConfig();

  const nextEpoch = useEpoch();
  const { chain } = useAccount();

  async function depositIntoFirn({
    amount,
    setAmount,
    setDisplay,
    setLocked,
    setMaxEnabled,
    client,
    anon,
    setRegistered,
  }) {
    setLocked(true);
    try {
      let hash;
      if (anon) {
        const [Y, C, D, proof] = await client.deposit(amount, chain.name);
        hash = await writeContract(config, {
          address: ADDRESSES[chain.name].FIRN,
          abi: FIRN_ABI,
          functionName: "deposit",
          args: [Y, C, D, proof],
          value: parseUnits(amount.toString(), 15),
        });
      } else {
        const signature = BN128.sign(ADDRESSES[chain.name].FIRN, client.secret); // necessary, chainId === CHAIN_ID.ETHEREUM here.
        hash = await writeContract(config, {
          address: ADDRESSES[chain.name].FIRN,
          abi: FIRN_ABI,
          functionName: "register",
          args: [client.pub, signature],
          value: parseUnits(amount.toString(), 15),
        });
      }
      toast(
        <span>
          <ExplorerLink hash={hash}>Your deposit transaction</ExplorerLink> was
          successfully submitted, and is now pending; please wait.
        </span>,
      );

      const data = await waitForTransactionReceipt(config, { hash });
      toast.success(
        <span>
          Your deposit of {(amount / 1000).toFixed(3)} ETH was successful! You
          can see your transaction at <ExplorerLink hash={hash} />.
        </span>,
      );

      const block = await getBlock(config, { blockNumber: data.blockNumber });
      client.state.pending += amount;
      client.state.update(); // update the displayed balance....
      nextEpoch(block).then((block) => {
        // launch the callback, but don't wait for it!
        client.state.rollOver();
        // passing it in directly didn't work when this was a timeout i'm not going to try this time around.
      });
      setRegistered(true);
    } catch (error) {
      console.error(error);
      if (error.shortMessage === "User rejected the request.")
        toast.error("You declined the deposit prompt.");
      else if (
        error.details === "Ledger: Unknown error while signing transaction"
      )
        toast.error("You rejected the transaction in your Ledger.");
      else if (
        error.shortMessage ===
        "The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account."
      )
        toast.error(
          "Our gas cost estimate overshot; please try again with a smaller amount.",
        );
      else if (
        error.shortMessage === "Execution reverted for an unknown reason."
      )
        // (error.details === "execution reverted")
        toast.error(
          <span>
            Your deposit transaction reverted. Please report this bug directly
            in our{" "}
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
      else if (error.shortMessage === "HTTP request failed.")
        toast.error("We were unable to reach the network.");
      else toast.error("An unknown error occurred.");
    } finally {
      setLocked(false);
      setAmount(0);
      setDisplay("");
      setMaxEnabled(false);
    }
  }

  return depositIntoFirn;
}
