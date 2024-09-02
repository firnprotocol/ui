import { parser } from "@constants/validation";
import { TextField } from "@tw/TextField";
import { useState } from "react";

export const FunctionInputField = ({
  selector,
  input,
  locked,
  abiInputs,
  setAbiInputs,
  index,
  type,
  value,
  placeholder,
}) => {
  const [helper, setHelper] = useState("");
  return (
    <>
      <div className="text-sm w-full flex">
        {input.name}{" "}
        <span className="float-right w-full ml-2">
          <input
            spellCheck="false"
            className={`
            text-zinc-600
            ml-auto sm:mr-2
            focus:outline-none
            bg-transparent
            h-full
            w-full
            flex-grow
            text-right
          `}
            value={type}
            readOnly
          />
        </span>
      </div>
      <TextField
        value={value}
        helperText={helper}
        disabled={locked}
        onChange={(event) => {
          let helper = "";
          try {
            parser(input, event.target.value); // ignore return value?!?
          } catch (error) {
            helper = error;
          }
          setHelper(helper);
          const newAbiInputs = { ...abiInputs };
          newAbiInputs[selector].values[index] = event.target.value; // no-op if helper is present
          setAbiInputs(newAbiInputs);
        }}
        placeholder={placeholder}
        container="!py-0 !h-9"
        className="text-sm"
      />
    </>
  );
};
