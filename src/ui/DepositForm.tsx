import { NumericField } from "@components/NumericField";
import { SubmitTxButton } from "@components/SubmitTxButton";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@tw/Card";
import { useFirnDeposit } from "hooks/useFirnDeposit";
import { useEffect, useState } from "react";
import { formatUnits, parseGwei } from "viem";
import { useAccount, useBalance, useBlockNumber } from "wagmi";

const BTN_ICON_CLASSNAME = "inline w-5 h-5 -mt-1";
const REGISTER_GAS = 350000n; // overestimate, but this is what metamask is using... // 240000n;
const DEPOSIT_GAS = 3600000n; // 2400000n; // way higher than necessary; metamask is overestimating.
const DEPOSIT_TX_COMPRESSED_SIZE = 1620n; // for optimism
const REGISTER_TX_COMPRESSED_SIZE = 100n; // for optimism
const REGISTER_CALLDATA_SIZE = 100n; // for arbitrum
const DEPOSIT_CALLDATA_SIZE = 1668n; // for arbitrum

export const DepositForm = ({
  ready,
  locked,
  setLocked,
  client,
  registered,
  setRegistered,
  calculators,
}) => {
  const queryClient = useQueryClient();

  const { address, chain } = useAccount();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { data, isSuccess, queryKey } = useBalance({ address }); // watch: true
  useEffect(() => {
    if (!locked) queryClient.invalidateQueries({ queryKey }); // refresh balance on every block?
  }, [blockNumber, locked]);

  const [amount, setAmount] = useState(0);
  const [display, setDisplay] = useState("");
  const [maxEnabled, setMaxEnabled] = useState(false);

  const depositIntoFirn = useFirnDeposit();

  const anon = registered; // used to use setState

  let gas = 0n;
  if (chain?.name === "Ethereum") {
    const l1Gas = anon ? DEPOSIT_GAS : REGISTER_GAS;
    const estimatePadding = parseGwei("8");
    // even this massive buffer is (often) not sufficient for metamask... extremely confusing how it's doing it.
    gas = calculators.Ethereum(l1Gas, estimatePadding);
  } else if (chain?.name === "OP Mainnet" || chain?.name === "Base") {
    // no need for `anon ?` etc. since always registered
    const l2Gas = anon ? DEPOSIT_GAS : REGISTER_GAS;
    const txDataGas = anon
      ? DEPOSIT_TX_COMPRESSED_SIZE
      : REGISTER_TX_COMPRESSED_SIZE;
    gas = calculators["OP Mainnet"](l2Gas, txDataGas);
  } else if (chain?.name === "Arbitrum One") {
    const l2Gas = anon ? DEPOSIT_GAS : REGISTER_GAS;
    const l1CalldataSize = anon
      ? DEPOSIT_CALLDATA_SIZE
      : REGISTER_CALLDATA_SIZE;
    gas = calculators["Arbitrum One"](l2Gas, l1CalldataSize);
  }

  const result = isSuccess ? Number((data.value - gas) / 1000000000000000n) : 0; // 10n ** 15n
  const max = Math.max(0, result); // balance.sub(gas)

  let helper = "";
  if (display !== "" && !ready)
    helper = "Your account is still loading; please wait.";
  else if (chain === undefined)
    helper = "Please connect to a supported network.";
  else if (display !== "" && amount === 0)
    helper = "Please enter a nonzero amount of ETH to deposit.";
  else if (display !== "" && !registered && amount < 10)
    //  || maxEnabled) // whytf did i have that?
    helper =
      "For technical reasons, your first deposit must be at least 0.010 ETH.";
  else if (amount > max)
    helper = `You don't have enough funds (including gas fees of ${(Math.ceil(Number(formatUnits(gas, 15))) / 1000).toFixed(3)} ETH) to deposit this amount.`;

  return (
    <Card title="ADD FUNDS TO YOUR PRIVATE FIRN ACCOUNT">
      <div className="font-telegrama text-sm text-zinc-500 pb-1">
        DEPOSIT AMOUNT
      </div>
      <NumericField
        max={max}
        maxEnabled={maxEnabled}
        setMaxEnabled={setMaxEnabled}
        error={helper.length > 0}
        helper={helper}
        amount={amount}
        setAmount={setAmount}
        display={display}
        setDisplay={setDisplay}
        locked={locked}
        units="ETH"
        label="Deposit Amount"
        payable
      />
      <SubmitTxButton
        disabled={
          !ready || !address || locked || helper.length > 0 || amount === 0
        }
        pendingLabel="TOPPING UP PRIVATELY"
        label={
          <>
            TOP UP PRIVATELY <BanknotesIcon className={BTN_ICON_CLASSNAME} />
          </>
        }
        onClick={() => {
          return depositIntoFirn({
            amount,
            setAmount,
            setDisplay,
            setLocked,
            setMaxEnabled,
            client,
            anon,
            setRegistered,
          });
        }}
      />
    </Card>
  );
};
