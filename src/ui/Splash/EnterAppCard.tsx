import { SubmitTxButton } from "@components/SubmitTxButton";
import { FIRN_ABI } from "@constants/abis";
import { ADDRESSES } from "@constants/addresses";
import { BN128 } from "@crypto/bn128";
import { Card } from "@tw/Card";
import * as mcl from "mcl-wasm/browser";
import { useState } from "react";
import toast from "react-hot-toast";
import { keccak256, toBytes, toHex } from "viem";
import { useAccount, useConfig, useSignMessage } from "wagmi";
import { readContract } from "wagmi/actions";

const message = "This message will log you into your Firn account.";

export const EnterAppCard = ({
  disabled,
  setLocked,
  setSecret,
  setPub,
  setRegistered,
}) => {
  const config = useConfig();

  const { address, connector, chain } = useAccount();
  const { signMessageAsync } = useSignMessage(); // data, isError, isLoading, isSuccess, signMessage

  const [firstTime, setFirstTime] = useState(false);

  let text;
  if (!address) text = "Connect a wallet to use Firn.";
  else if (!chain) text = "Please switch to a supported chain.";
  else if (firstTime) text = "Please sign once more, just this time...";
  else text = "Create or log into your Firn account.";

  return (
    <Card title="ACCESS YOUR FIRN ACCOUNT">
      <div className="pb-3">{text}</div>

      <SubmitTxButton
        disabled={disabled || !address || !connector || !chain}
        pendingLabel="ENTERING APP"
        label="ENTER APP"
        onClick={async () => {
          setLocked(true);
          try {
            const signature = await signMessageAsync({ message });
            const plaintext = keccak256(signature);
            const secret = new mcl.Fr();
            secret.setBigEndianMod(toBytes(plaintext));
            const pub = BN128.toCompressed(mcl.mul(BN128.BASE, secret));

            const data = await readContract(config, {
              address: ADDRESSES[chain.name].FIRN,
              abi: FIRN_ABI,
              functionName: "simulateAccounts",
              args: [[pub], Date.parse("01 Jan 2100 00:00:00 GMT") / 1000 / 60],
            });
            const registered =
              data[0][0] !== toHex("", { size: 32 }) ||
              data[0][1] !== toHex("", { size: 32 });
            setRegistered(registered);
            if (!registered) {
              setFirstTime(true);
              const signature = await signMessageAsync({ message });
              if (plaintext !== keccak256(signature)) {
                toast.error(
                  "Your wallet is producing non-deterministic signatures, and can't be used to log into Firn!",
                );
                return;
              }
            }
            setPub(pub); // success; set it here only.
            setSecret(secret);
            // toast.success("You have successfully created an account!")
          } catch (error) {
            console.error(error);
            if (
              error.code === 4001 ||
              error.details === "User cancelled the request" ||
              error.details ===
                "MetaMask Personal Message Signature: User denied message signature."
            )
              toast.error("You declined the login prompt."); // signup?
            else if (
              error.details === "Ledger: Unknown error while signing message"
            )
              toast.error("You declined the signature in your Ledger.");
            else if (error.shortMessage === "HTTP request failed.")
              toast.error("We were unable to reach the network.");
            else toast.error("An unknown error occurred.");
          } finally {
            setLocked(false);
            setFirstTime(false);
          }
        }}
      />
    </Card>
  );
};
