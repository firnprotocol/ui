import { ButtonLoadingSpinner } from "@components/loading/ButtonLoadingSpinner";
import { FIRN_ABI } from "@constants/abis";
import { ADDRESSES } from "@constants/addresses";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { TextField } from "@tw/TextField";
import { useState } from "react";
import { toHex } from "viem";
import { useAccount, useConfig } from "wagmi";
import { readContract } from "wagmi/actions";

const HEX_REGEX = /^0x[a-fA-F0-9]{0,64}$/;
const FULL_HEX_REGEX = /^0x[a-fA-F0-9]{64}$/;

export const RecipientField = ({
  client,
  recipient,
  setRecipient,
  recipientHelper,
  setRecipientHelper,
  locked,
}) => {
  const config = useConfig();

  const { chain } = useAccount();

  const [error, setError] = useState(false);

  return (
    <div>
      <div className="font-telegrama text-sm text-zinc-500 pb-1">
        RECIPIENT PUBLIC KEY
      </div>
      <div>
        <TextField
          className="font-telegrama"
          placeholder={toHex("", { size: 32 })}
          value={recipient}
          onChange={(event) => {
            if (
              event.target.value !== "" &&
              event.target.value !== "0" &&
              !HEX_REGEX.test(event.target.value)
            ) {
              return;
            }
            setRecipient(event.target.value);
            let helper;
            if (event.target.value.length === 0)
              helper = "Please enter a recipient.";
            else if (event.target.value === client.pub)
              helper = "You can't send to yourself.";
            else if (FULL_HEX_REGEX.test(event.target.value)) {
              helper = "Loading recipient information; please wait.";

              readContract(config, {
                address: ADDRESSES[chain.name].FIRN,
                abi: FIRN_ABI,
                functionName: "info",
                args: [event.target.value],
              })
                .then((data) => {
                  let helper; // shadows
                  if (data[0] === 0n) {
                    // ["epoch"]
                    helper =
                      "This account hasn't made a deposit yet into Firn. Please instruct this account to make a deposit first.";
                  } else {
                    helper = "";
                  }
                  setRecipientHelper(helper);
                  setError(helper.length > 0);
                })
                .catch((error) => {
                  console.error(error);
                  const helper =
                    "Could not load recipient information; please try again.";
                  setRecipientHelper(helper);
                  setError(true);
                });
            } else {
              helper =
                "Recipient's public key must be a 0x-prefixed, 64-character hexadecimal string.";
            }
            setRecipientHelper(helper);
            setError(
              helper.length > 0 &&
                helper !== "Loading recipient information; please wait.",
            );
          }}
          disabled={locked}
          helperText={recipientHelper}
          error={error}
          label="RECIPIENT PUBLIC KEY"
          endAdornment={
            recipientHelper ===
            "Loading recipient information; please wait." ? (
              <div className="flex -mr-[3px] align-middle mt-[7px]">
                <ButtonLoadingSpinner className="!h-3.5 !w-3.5" />
                {/* why the fuck did these overrides suddenly become necessary---and _only_ on the deployed version, no less (can't reproduce locally)? */}
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
    </div>
  );
};
