import { ExplorerLink } from "@components/ExplorerLink";
import { ButtonLoadingSpinner } from "@components/loading/ButtonLoadingSpinner";
import { SubmitTxButton } from "@components/SubmitTxButton";
import { TREASURY_ABI } from "@constants/abis";
import { ADDRESSES } from "@constants/addresses";
import {
  ArrowLongLeftIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  InboxArrowDownIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@tw/Button";
import { Card } from "@tw/Card";
import { Grid } from "@tw/Grid";
import { useAddToWallet } from "hooks/useAddToWallet";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { UNISWAP_URL } from "utils/urls";
import { erc20Abi, formatEther, parseEther } from "viem";
import { useAccount, useBalance, useConfig, useReadContract } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";

const BTN_ICON_CLASSNAME = "inline w-5 h-5 -mt-1";

export const TokenPanel = ({ setPanel, locked, setLocked }) => {
  const config = useConfig();
  const queryClient = useQueryClient();

  const { address } = useAccount();

  const { data, isLoading, isSuccess, refetch, queryKey } = useBalance({
    address: ADDRESSES.Ethereum.TREASURY,
  });
  const balance = useReadContract({
    address: ADDRESSES.Ethereum.ERC20,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  });

  useEffect(() => {
    if (!locked) {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: balance.queryKey });
    } // refresh balance on every block?
  }, [locked]);

  let entitlement = 0n;
  if (address && isSuccess && balance.isSuccess) {
    const circulating = parseEther("1000000"); // hardcode
    entitlement = (balance.data * data.value) / circulating;
  }

  const { onClick, adding, added } = useAddToWallet({ setLocked });

  return (
    <Grid cols={{ xs: 1 }}>
      <div className="w-full transition-all shadow pt-3 bg-blue-900/20 rounded-lg mb-4">
        <div className="font-medium font-telegrama text-lg mb-2 text-stone-300 opacity-90 px-6">
          <div className="inline italic text-stone-400">Main Panel</div>
          <div className="inline float-right">FIRN Balance</div>
        </div>
        <div className="text-2xl text-slate-400 font-telegrama px-6 mb-4 text-right">
          <div className="inline float-left">
            <Button
              className="w-12 my-0 px-2 !py-0 hover:bg-white/20 hover:text-white"
              disabled={adding || locked}
              outline
              type="button"
              onClick={() => {
                setPanel(false);
              }}
            >
              <ArrowLongLeftIcon className="h-full w-full align-middle" />
            </Button>
          </div>
          {balance.isLoading ? (
            <ButtonLoadingSpinner className="h-5 w-5" />
          ) : address ? (
            Number(formatEther(balance.data)).toFixed(3)
          ) : (
            "0.000"
          )}
          <span className="text-lg text-eth-400"> FIRN</span>
        </div>
        <div
          className={`
            justify-center place-items-center
            flex rounded-lg
            p-1.5 px-1 sm:px-7 space-x-1 sm:space-x-6
            bg-blue-900/20
          `}
        >
          {[
            <SubmitTxButton
              key={0}
              className="w-full"
              outline
              disabled={adding || added || locked}
              pendingLabel="Adding FIRN To Wallet"
              label={
                added ? (
                  <>
                    FIRN Token Added{" "}
                    <CheckCircleIcon className={BTN_ICON_CLASSNAME} />
                  </>
                ) : (
                  <>
                    Add FIRN To Wallet{" "}
                    <PlusCircleIcon className={BTN_ICON_CLASSNAME} />
                  </>
                )
              }
              onClick={onClick}
            />,
            <Button
              key={1}
              className="w-full"
              outline
              disabled={adding || locked} // really not necessary to disable this, but slightly cleaner
              onClick={() => {
                window.open(UNISWAP_URL);
              }}
            >
              Trade FIRN Token{" "}
              <ArrowsRightLeftIcon className={BTN_ICON_CLASSNAME} />
            </Button>,
          ]}
        </div>
      </div>
      <Card title="EARN FEES BY HOLDING FIRN TOKEN">
        <div className="pb-2 text-sm text-zinc-500">
          Holding FIRN entitles you to a corresponding proportion of the fees
          generated by the Firn protocol.
        </div>
        <div className="font-medium font-telegrama text-lg mb-2 text-stone-400 opacity-90">
          <div className="hidden sm:block">
            Current Fee Pool
            <div className="inline float-right">Your Current Entitlement</div>
          </div>
          <div className="sm:hidden">
            Pool
            <div className="inline float-right">Your Entitlement</div>
          </div>
        </div>
        <div className="text-2xl text-slate-400 font-telegrama mb-4">
          {isLoading ? (
            <ButtonLoadingSpinner className="h-5 w-5" />
          ) : (
            Number(formatEther(data.value)).toFixed(3)
          )}
          <span className="text-lg text-eth-400"> ETH</span>
          <div className="inline float-right">
            {isLoading || balance.isLoading ? (
              <ButtonLoadingSpinner className="h-5 w-5" />
            ) : (
              Number(formatEther(entitlement)).toFixed(5)
            )}
            <span className="text-lg text-eth-400"> ETH</span>
          </div>
        </div>
        <div className="text-sm text-yellow-600 pb-2">
          Please note that this operation will flush the{" "}
          <span className="italic">entire</span> current fee pool, and can be
          expensive (in gas). <span className="italic">Anyone</span> can carry
          out this operation. In most cases, you don't need to perform this
          operation yourself; it may be more cost-effective to wait. Please
          proceed only if you understand this.
        </div>
        <SubmitTxButton // todo: arguably should "disable" the button if they don't have enough gas?!
          pendingLabel="CLAIMING FEES"
          disabled={adding || locked} //  || account === undefined || chain === undefined
          label={
            <>
              CLAIM FEES <InboxArrowDownIcon className={BTN_ICON_CLASSNAME} />
            </>
          }
          onClick={async () => {
            try {
              setLocked(true);
              const hash = await writeContract(config, {
                address: ADDRESSES.Ethereum.TREASURY,
                abi: TREASURY_ABI,
                functionName: "payout",
              });
              toast(
                <span>
                  <ExplorerLink hash={hash}>
                    Your redemption transaction
                  </ExplorerLink>{" "}
                  was successfully submitted, and is now pending; please wait.
                </span>,
              );
              await waitForTransactionReceipt(config, { hash });
              toast.success(
                <span>
                  Your claim of {Number(formatEther(entitlement)).toFixed(3)}{" "}
                  ETH was successful! You can see your transaction at{" "}
                  <ExplorerLink hash={hash} />.
                </span>,
              );
              await refetch();
              await balance.refetch();
            } catch (error) {
              console.error(error);
              if (error.shortMessage === "User rejected the request.")
                toast.error("You declined the redemption prompt.");
              else if (
                error.details ===
                "Ledger device: Condition of use not satisfied (denied by the user?) (0x6985)"
              )
                // shortMessage === "An internal error was received."
                toast.error("You rejected the transaction in your Ledger.");
              else toast.error("An unknown error occurred.");
            } finally {
              setLocked(false);
            }
          }}
        />
      </Card>
    </Grid>
  );
};