import { CHAIN_PARAMS } from "@constants/networks";
import { Popover } from "@headlessui/react";
import QUESTION_ICON from "assets/icons/question.svg";
import toast from "react-hot-toast";
import { useAccount, useConfig, useSwitchChain } from "wagmi";

export const NetworkDropdownMenu = ({
  children,
  locked,
  setLocked,
  setSwitching,
}) => {
  const config = useConfig();

  const { chain, connector } = useAccount();
  const { chains, switchChainAsync } = useSwitchChain(config);
  const id = chain?.id;

  return (
    <Popover className="relative">
      <Popover.Button disabled={locked}>{children}</Popover.Button>
      <Popover.Panel className="bg-zinc-800 rounded-lg absolute z-10 w-[160px] md:left-[-130px]">
        <div className="pt-1 px-3 pb-2 w-full bg-zinc-900 font-telegrama rounded-t-lg">
          <small className="text-slate-500">CURRENT NETWORK</small>
          <div className="text-cyan-600 flex justify-between items-center py-1 md:justify-start md:space-x-2">
            <div className="flex justify-start flex-1">
              {chain === undefined ? "Unknown" : CHAIN_PARAMS[chain.name].name}
            </div>
            <img
              src={
                chain === undefined
                  ? QUESTION_ICON
                  : CHAIN_PARAMS[chain.name].image
              }
              className="h-5 w-5"
            />
          </div>
        </div>
        {chains.map(
          (
            chain, // shadow
          ) => (
            <div className="p-1" key={chain.name}>
              <Popover.Button
                className="text-left p-2 w-full text-slate-400 hover:text-slate-300 hover:bg-zinc-900 font-telegrama text-sm rounded"
                onClick={() => {
                  // could consider setLocked while chain switching...?
                  if (chain.id === id) {
                    toast("You're already connected to this network.");
                    return;
                  }
                  if (!connector) {
                    toast.error("Please connect a wallet first.");
                    return;
                  }
                  setSwitching(true);
                  setLocked(true);
                  switchChainAsync({ chainId: chain.id })
                    .catch((error) => {
                      console.error(error);
                      if (error.code === 4001)
                        toast.error("You declined the chain switch request.");
                      else if (error.code === 4902)
                        // last is for Opera
                        toast.error(
                          "You must manually add this network, in your wallet's settings, before you can switch to it.",
                        );
                      else if (error.shortMessage === "Chain not configured.")
                        toast.error("Please connect a wallet first."); // this happens in incognito when nothing is connected
                      else toast.error("An unknown error occurred.");
                    })
                    .finally(() => {
                      setSwitching(false);
                      setLocked(false);
                    });
                }}
              >
                <div className="flex justify-between items-center py-1 md:justify-start md:space-x-2">
                  <div className="flex justify-start flex-1">
                    {CHAIN_PARAMS[chain.name]?.name}
                  </div>
                  <img
                    src={CHAIN_PARAMS[chain.name].image}
                    className="h-5 w-5"
                  />
                </div>
              </Popover.Button>
            </div>
          ),
        )}
      </Popover.Panel>
    </Popover>
  );
};
