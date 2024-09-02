import { ButtonLoadingSpinner } from "@components/loading/ButtonLoadingSpinner";
import { Tab } from "@headlessui/react";
import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import { Button } from "@tw/Button";
import { Grid } from "@tw/Grid";
import { ComplexForm } from "@ui/ComplexForm";
import { DepositForm } from "@ui/DepositForm";
import { PublicKeyForm } from "@ui/PublicKeyForm";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";

export const ActionSelectorTabs = ({ ready, locked, ...props }) => {
  const tabs = ["TOP UP", "SEND", "RECEIVE", "SPEND"];

  const { chain } = useAccount();

  return (
    <Grid cols={{ xs: 1 }}>
      <Tab.Group>
        <div className="transition-all shadow pt-3 bg-blue-900/20 rounded-lg mb-4">
          <div className="font-medium font-telegrama text-lg mb-2 text-stone-300 opacity-90 px-6">
            Account Balance
            <div className="inline float-right italic text-stone-400">
              FIRN Token
            </div>
          </div>
          <div className="text-2xl text-slate-400 font-telegrama px-6 mb-4">
            {ready ? (
              (props.balance / 1000).toFixed(3)
            ) : (
              <ButtonLoadingSpinner className="h-5 w-5" />
            )}
            <span className="text-lg text-eth-400"> ETH</span>
            <div className="inline float-right">
              <Button
                className="w-12 my-0 px-2 !py-0 hover:bg-white/20 hover:text-white"
                outline
                disabled={locked}
                type="button"
                onClick={() => {
                  if (chain.name !== "Ethereum") {
                    toast.error(
                      "You must switch to Ethereum to access this feature.",
                    );
                    return;
                  }
                  props.setPanel(true);
                }}
              >
                <ArrowLongRightIcon className="h-full w-full align-middle" />
              </Button>
            </div>
          </div>
          <Tab.List
            className={`
              justify-center place-items-center
              flex rounded-lg
              p-[0.5625rem] px-1 sm:px-7 space-x-1 sm:space-x-6
              bg-blue-900/20
            `}
          >
            {tabs.map((name) => {
              return (
                <Tab
                  key={name}
                  disabled={locked} // used to be locked !== true && locked !== false
                  className={({ selected }) => {
                    return `
                      w-full px-2 py-2 text-sm leading-5 rounded tracking-wide
                      focus:outline-none ring-offset-blue-400 ring-white ring-opacity-60
                      font-telegrama bg-gradient-to-r
                      active:from-cyan-800 active:to-blue-800
                      ${selected ? "from-cyan-600 to-blue-600 shadow-xl !text-gray-200" : "text-gray-400 hover:bg-white/20 hover:text-white"}
                    `;
                  }}
                >
                  <span>{name}</span>
                </Tab>
              );
            })}
          </Tab.List>
        </div>
        <Tab.Panels>
          <Tab.Panel key={0}>
            <DepositForm {...{ locked, ready }} {...props} />
          </Tab.Panel>
          <Tab.Panel key={1}>
            <ComplexForm isTransfer locked={locked} ready={ready} {...props} />
          </Tab.Panel>
          <Tab.Panel key={2}>
            <PublicKeyForm {...props} />
          </Tab.Panel>
          <Tab.Panel key={3}>
            <ComplexForm
              isTransfer={false}
              locked={locked}
              ready={ready}
              {...props}
            />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </Grid>
  );
};
