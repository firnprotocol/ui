import { ButtonLoadingSpinner } from "@components/loading/ButtonLoadingSpinner";
import { CHAIN_PARAMS } from "@constants/networks";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { TextField } from "@tw/TextField";
import { ToggleSwitch } from "@tw/ToggleSwitch";
import { isAddress, zeroAddress } from "viem";
import { useAccount } from "wagmi";

import { AdvancedFields } from "./AdvancedFields";

const HEX_REGEX = /^0x[a-fA-F0-9]{0,40}$/;

export const DestinationField = ({
  recipient,
  recipientHelper,
  setRecipient,
  setRecipientHelper,
  locked,
  data,
  setData,
  advanced,
  setAdvanced,
  abiInterfaceStr,
  setAbiInterfaceStr,
  setPayable,
  rawDisplay,
  setRawDisplay,
}) => {
  const { chain } = useAccount();
  return (
    <div>
      <div className="font-telegrama text-sm text-zinc-500 pb-1">
        <div className="inline sm:hidden">ADDRESS</div>
        <div className="inline hidden sm:inline-block">TARGET ADDRESS</div>
        <div className="inline float-right">
          <ToggleSwitch
            className="!h-5"
            label="God Mode"
            value={advanced}
            disabled={locked}
            onChange={() => {
              setAdvanced((advanced) => !advanced); // shadow?
              setRecipient(""); // cheap way to avoid failure to auto-trigger load if an address is entered and then toggle is flipped
              setAbiInterfaceStr("");
              setData("0x");
              setPayable(true);
            }}
          />
        </div>
      </div>
      <div>
        <TextField
          className="font-telegrama"
          error={recipientHelper.length > 0}
          onChange={(event) => {
            if (
              event.target.value !== "" &&
              event.target.value !== "0" &&
              !HEX_REGEX.test(event.target.value)
            ) {
              return;
            }
            setRecipient(event.target.value); // it's valid.
            let recipientHelper;
            if (event.target.value.length === 0)
              recipientHelper = "Please enter a destination address.";
            else if (!isAddress(event.target.value))
              // can use validator
              recipientHelper = "Entered text is not a valid Ethereum address.";
            else if (advanced) {
              // todo: we need to auto-trigger this when they flip advanced from on to off?
              recipientHelper =
                "Attempting to auto-load contract ABI; please wait.";
              fetch(
                `${CHAIN_PARAMS[chain.name].etherscanApiUrl}/api?module=contract&action=getabi&address=${event.target.value}`,
              )
                .then((response) => {
                  if (!response.ok) throw response; // does this ever happen?
                  return response.json();
                })
                .then((json) => {
                  if (json.status === "0") throw json;
                  setAbiInterfaceStr(json.result);
                })
                .catch((error) => {
                  console.error(error);
                })
                .finally(() => {
                  setRecipientHelper("");
                });
            } else {
              recipientHelper = "";
            }
            setRecipientHelper(recipientHelper);
          }}
          value={recipient}
          disabled={locked}
          helperText={recipientHelper}
          placeholder={zeroAddress}
          endAdornment={
            recipientHelper ===
            "Attempting to auto-load contract ABI; please wait." ? (
              <div className="flex -mr-[3px] align-middle mt-[7px]">
                <ButtonLoadingSpinner className="!h-3.5 !w-3.5" />
              </div>
            ) : recipientHelper === "" && recipient !== "" ? (
              <div className="flex -mr-1 align-middle mt-1.5">
                <CheckCircleIcon className="h-4 w-4 text-green-700" />
              </div>
            ) : recipientHelper !== "" ? (
              <div className="flex -mr-1 align-middle mt-1.5">
                <XCircleIcon className="h-4 w-4 text-red-700" />
              </div>
            ) : undefined
          }
        />
      </div>
      {advanced ? (
        <div>
          <AdvancedFields
            {...{
              locked,
              abiInterfaceStr,
              setAbiInterfaceStr,
              data,
              setData,
              rawDisplay,
              setRawDisplay,
              setPayable,
            }}
          />
        </div>
      ) : (
        <div className="text-sm text-yellow-600 pb-2">
          Always withdraw to a fresh Ethereum address, which hasn't appeared
          on-chain before. Create one in MetaMask following{" "}
          <a
            href="https://metamask.zendesk.com/hc/en-us/articles/360015289452-How-to-create-an-additional-account-in-your-MetaMask-wallet"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            these instructions
          </a>
          . Always wait between depositing and withdrawing. Avoid withdrawing{" "}
          <span className="italic">the same amount</span> you deposited. If you
          break any of these rules, you may lose privacy.
        </div>
      )}
    </div>
  );
};
