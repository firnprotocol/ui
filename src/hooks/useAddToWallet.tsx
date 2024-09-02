import { ADDRESSES } from "@constants/addresses";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { watchAsset } from "viem/actions";
import { useAccount, useConnectorClient } from "wagmi";

export function useAddToWallet({ setLocked }) {
  const { data: walletClient } = useConnectorClient();

  const { address, chain } = useAccount();

  const [adding, setAdding] = useState(false); // need to keep this around, i.e., can't _just_ use `locked`,
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
  }, [address, chain?.id]); // need ? for logout

  async function onClick() {
    if (chain?.name !== "Ethereum") {
      toast.error("In order to add FIRN Token, please connect to Ethereum.");
      return;
    }
    setAdding(true);
    setLocked(true);
    try {
      const result = await watchAsset(walletClient, {
        type: "ERC20",
        options: {
          address: ADDRESSES.Ethereum.ERC20,
          symbol: "FIRN", // A ticker symbol or shorthand, up to 5 chars.
          decimals: 18, // The number of decimals in the token
          image: `${window.location.href}/assets/android-chrome-256x256.png`,
        },
      });
      if (result) setAdded(true);
    } catch (error) {
      console.error(error);
      if (error.code === 4001)
        toast.error("You declined the token addition prompt.");
      else if (
        error.details ===
        "Missing or invalid. request() method: wallet_watchAsset"
      )
        toast.error(
          "Your currently selected wallet doesn't support this action.",
        );
      else toast.error("An unknown error occurred.");
    } finally {
      // equivalent to doing it afterwards, since we never throw during catch
      setAdding(false);
      setLocked(false);
    }
  }

  return { onClick, adding, added };
}
