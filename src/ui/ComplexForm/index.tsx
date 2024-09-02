import { DestinationField } from "@components/fields/DestinationField";
import { RecipientField } from "@components/fields/RecipientField";
import { SubmitTxButton } from "@components/SubmitTxButton";
import {
  PaperAirplaneIcon,
  ReceiptRefundIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@tw/Card";
import { FEE, FormPortion } from "@ui/FormPortion";
import { useFirnRelay } from "hooks/useFirnRelay";
import { useState } from "react";
import { optimismTxCompressedSize } from "utils/gas";
import { formatUnits, parseGwei } from "viem";
import { useAccount } from "wagmi";

const BTN_ICON_CLASSNAME = "inline w-5 h-5 -mt-1";
export const TRANSFER_GAS = 6000000n;
export const WITHDRAWAL_GAS = 3850000n;
const TRANSFER_TX_COMPRESSED_SIZE = 3300n;
const WITHDRAWAL_TX_COMPRESSED_SIZE = 2900n;
const TRANSFER_CALLDATA_SIZE = 3396n;
const WITHDRAWAL_CALLDATA_SIZE = 3076n;

export const ComplexForm = ({
  client,
  isTransfer,
  balance,
  locked,
  health,
  calculators,
  ...props
}) => {
  const { chain } = useAccount();

  const [amount, setAmount] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [recipientHelper, setRecipientHelper] = useState("");
  const [data, setData] = useState("0x");
  const [display, setDisplay] = useState("");
  const [maxEnabled, setMaxEnabled] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [abiInterfaceStr, setAbiInterfaceStr] = useState("");
  const [rawDisplay, setRawDisplay] = useState("");
  const [payable, setPayable] = useState(true); // pain in the ass to have this way out here, but don't see a better way

  const firnRelayTransferWithdraw = useFirnRelay();
  const fee = isTransfer ? 0 : Math.floor(amount / FEE);
  let helper = "";
  let suppress = true;
  let gas = 0n;
  if (chain?.name === "Ethereum") {
    const l1Gas = isTransfer ? TRANSFER_GAS : WITHDRAWAL_GAS;
    const maxPriorityFeePerGas = parseGwei("0.001");
    gas = calculators.Ethereum(l1Gas, maxPriorityFeePerGas);
    // if (data !== "0x") increase tip somehow... TODO. revisit.
  } else if (chain?.name === "OP Mainnet" || chain?.name === "Base") {
    const l2Gas = isTransfer ? TRANSFER_GAS : WITHDRAWAL_GAS;
    const txCompressedSize = isTransfer
      ? TRANSFER_TX_COMPRESSED_SIZE
      : WITHDRAWAL_TX_COMPRESSED_SIZE + optimismTxCompressedSize(data);
    gas = calculators["OP Mainnet"](l2Gas, txCompressedSize);
  } else if (chain?.name === "Arbitrum One") {
    const l2Gas = isTransfer ? TRANSFER_GAS : WITHDRAWAL_GAS;
    const l1CalldataSize = isTransfer
      ? TRANSFER_CALLDATA_SIZE
      : WITHDRAWAL_CALLDATA_SIZE + BigInt((data.length - 2) >> 1);
    gas = calculators["Arbitrum One"](l2Gas, l1CalldataSize);
  }

  const tip = Math.ceil(parseFloat(formatUnits(gas, 15)));
  if (!isTransfer)
    helper = `A fee of 0.79% (${(fee / 1000).toFixed(3)} ETH for your entered amount) is assessed on Firn withdrawals.`;
  if (!payable)
    helper =
      "The function you've selected is non-payable; you can't provide a value.";
  if (display !== "" && !props.ready) {
    helper = "Your account is still loading; please wait.";
    suppress = false;
  } else if (display !== "" && amount === 0 && !advanced) {
    helper = `Please enter a nonzero amount of ETH to ${isTransfer ? "transfer" : "withdraw"}.`;
    suppress = false;
  } else if (display !== "" && balance < amount + fee + tip) {
    helper = `You don't have enough funds (including ${isTransfer ? "the fee of" : "total fees of"} ${((fee + tip) / 1000).toFixed(3)} ETH) to ${isTransfer ? "transfer" : advanced ? "transact" : "withdraw"} this amount.`;
    suppress = false;
  }
  // there is a slight bug here where when you lock and unlock metamask, and your `account !== undefined` but `chainId === undefined`,
  // then it still gives you the error message of "(including gas fees of ____)", which quotes it as 0.
  // so obscure that it's probably not worth bothering.
  const max = Math.max(
    0,
    isTransfer
      ? balance - tip
      : Math.ceil(((balance - tip) * FEE) / (FEE + 1)) -
          ((balance - tip + 1) % (FEE + 1) === 0 ? 1 : 0),
  );

  let title;
  let field;
  let btnContent;
  if (isTransfer) {
    title = "TRANSFER FUNDS PRIVATELY TO ANOTHER FIRN USER";
    field = (
      <RecipientField
        {...{
          client,
          recipient,
          setRecipient,
          recipientHelper,
          setRecipientHelper,
          locked,
        }}
      />
    );
    btnContent = (
      <>
        SEND PRIVATELY <PaperAirplaneIcon className={BTN_ICON_CLASSNAME} />
      </>
    );
  } else {
    title = "PRIVATELY SPEND FUNDS FROM YOUR FIRN WALLET";
    field = (
      <DestinationField
        {...{
          recipient,
          setRecipient,
          recipientHelper,
          setRecipientHelper,
          locked,
          data,
          setData,
          advanced,
          setAdvanced,
          abiInterfaceStr,
          setAbiInterfaceStr,
          rawDisplay,
          setRawDisplay,
          setPayable,
        }}
      />
    );
    btnContent = (
      <>
        SPEND PRIVATELY <ReceiptRefundIcon className={BTN_ICON_CLASSNAME} />
      </>
    );
  }
  return (
    <Card title={title}>
      {field}
      <FormPortion
        {...{
          amount,
          setAmount,
          max,
          maxEnabled,
          setMaxEnabled,
          helper,
          suppress,
          display,
          setDisplay,
          isTransfer,
          client,
          locked,
          tip,
          payable,
          health,
          calculators,
        }}
      />
      <SubmitTxButton
        disabled={
          recipient.length === 0 ||
          recipientHelper.length > 0 ||
          (!maxEnabled && display === "") ||
          (!advanced && amount === 0) ||
          (helper.length > 0 && !suppress) ||
          !health ||
          locked ||
          (advanced && (data === "" || data === "0x"))
        }
        label={btnContent}
        pendingLabel={`${isTransfer ? "SENDING" : "SPENDING"} PRIVATELY`}
        onClick={() => {
          return firnRelayTransferWithdraw({
            ...props,
            client,
            isTransfer,
            fee,
            tip,
            setDisplay,
            recipient,
            setRecipient,
            data,
            setRawDisplay,
            amount,
            setAmount,
            setMaxEnabled,
            setAbiInterfaceStr,
          });
        }}
      />
    </Card>
  );
};
