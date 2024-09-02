import { namer, parser, placeholder, stringifier } from "@constants/validation";
import { Transition } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/24/solid";
import { TextField } from "@tw/TextField";
import { ToggleSwitch } from "@tw/ToggleSwitch";
import { formatAbiItem } from "abitype";
import { useEffect, useState } from "react";
import {
  decodeFunctionData,
  encodeFunctionData,
  isHex,
  toFunctionSelector,
} from "viem";

import { FunctionInputField } from "./FunctionInputField";

export const AdvancedFields = ({
  locked,
  abiInterfaceStr,
  setAbiInterfaceStr,
  data,
  setData,
  rawDisplay,
  setRawDisplay,
  setPayable,
}) => {
  const [abiHelper, setAbiHelper] = useState(""); // start it as "", in order to have space before entering anything.
  const [abiInputs, setAbiInputs] = useState({});
  const [openSelector, setOpenSelector] = useState("0x00000000");
  const [overallHelper, setOverallHelper] = useState("");

  // the system is pretty darn good, but there are a few quirks.
  // the main one is that when you have _incorrect_ manual input, and switch to raw hex, and _back_, the input lingers.
  // this gets wiped if you input anything into raw hex---whether something valid or not! so that's good i suppose.
  // if the selected function is nonpayable, the 0.000 lock also remains, though this too gets wiped upon data entry.
  // a bit of an edge case whether this should be considered a "bug" or not---arguably it's convenient (save your data)
  useEffect(
    () => {
      setAbiInputs({});
      setPayable(true);
      setOverallHelper("");
      setOpenSelector("");
      setData("0x");
      if (abiInterfaceStr === "") {
        setAbiHelper("Please enter a contract ABI.");
        return;
      }
      let abi = [];
      try {
        abi = JSON.parse(abiInterfaceStr);
      } catch (error) {
        setAbiHelper("The ABI you entered could not be parsed.");
        return;
      }
      setAbiHelper(undefined); // NOT ""; here we purposefully want to get rid of the space when it's successful!!!
      try {
        abi
          .filter((fragment) => {
            return (
              fragment.type === "function" &&
              fragment.stateMutability !== "view" &&
              fragment.stateMutability !== "pure"
            );
          })
          .forEach((fragment) => {
            const types = [];
            const placeholders = [];
            const values = [];
            const empties = [];
            fragment.inputs.forEach((input) => {
              placeholders.push(placeholder(input));
              types.push(namer(input));
              values.push("");
              empties.push("");
            });
            const definition = formatAbiItem(fragment);
            const selector = toFunctionSelector(definition);
            setAbiInputs((abiInputs) => {
              return {
                ...abiInputs,
                [selector]: {
                  fragment,
                  types,
                  placeholders,
                  values,
                  empties,
                },
              };
            });
          });
      } catch (error) {
        setAbiHelper(error);
      }
    },
    [abiInterfaceStr], // can i just move this into the text field?
  );

  useEffect(() => {
    if (abiInterfaceStr === "") return;
    try {
      const data = encodeFunctionData({
        abi: [abiInputs[openSelector].fragment],
        args: abiInputs[openSelector].fragment.inputs.map((input, i) =>
          parser(input, abiInputs[openSelector].values[i]),
        ),
      });
      setData(data);
      setOverallHelper("");
      console.log(data);
    } catch (error) {
      setData("0x");
      setOverallHelper("The data you've inputted is malformed or incomplete.");
    }
  }, [abiInputs, openSelector]);

  useEffect(() => {
    if (abiInterfaceStr === "") {
      if (data === "") setData("0x");
      return;
    }
    if (data === "0x") return;
    // this path comes from when, while inputting data manually, they go from valid to invalid.
    // the effect is that right above, an error will be thrown and caught, data will be changed to 0x, and we will wind up here.
    // the point is that we can get here through two different paths: either they _manually_ change the raw hex,
    // or they change the inputs in such a way as to get an indirect change to the raw hex.
    try {
      const abi = JSON.parse(abiInterfaceStr); // i claim that this will never throw...
      let newAbiInputs = { ...abiInputs };
      Object.keys(abiInputs).forEach((selector) => {
        newAbiInputs[selector].values = abiInputs[selector].empties.slice();
      });
      setAbiInputs(newAbiInputs);
      const { args } = decodeFunctionData({ abi, data }); // functionName
      const selector = data.slice(0, 10);
      setOpenSelector(selector);
      setOverallHelper("");
      setPayable(abiInputs[selector].fragment.stateMutability === "payable");
      newAbiInputs = { ...abiInputs };
      newAbiInputs[selector].values = abiInputs[selector].fragment.inputs.map(
        (input, i) => stringifier(input, args[i]),
      );
      setAbiInputs(newAbiInputs);
    } catch (error) {
      setData("0x");
      setOpenSelector("");
      setPayable(true);
    }
  }, [data]);

  return (
    <div>
      <div className="font-telegrama text-sm text-zinc-500 pb-1">
        CONTRACT ABI
      </div>
      <TextField
        value={abiInterfaceStr}
        label="Contract ABI"
        helperText={abiHelper}
        disabled={locked}
        onChange={(event) => {
          setAbiInterfaceStr(event.target.value);
        }}
      />
      <div>
        <ContractFunctions
          {...{
            locked,
            abiInputs,
            setAbiInputs,
            openSelector,
            setOpenSelector,
            setPayable,
            data,
            setData,
            setOverallHelper,
            rawDisplay,
            setRawDisplay,
          }}
        />
        <div className="-mt-1 text-sm pb-2 text-red-600">
          {overallHelper !== "" ? overallHelper : "\xa0"}
        </div>
      </div>
    </div>
  );
};

const ContractFunctions = ({
  locked,
  abiInputs,
  setAbiInputs,
  openSelector,
  setOpenSelector,
  setPayable,
  data,
  setData,
  rawDisplay,
  setRawDisplay,
  setOverallHelper,
}) => {
  const [raw, setRaw] = useState(false);

  return (
    <div className="w-full py-2">
      <div className="font-telegrama text-sm text-zinc-500 pb-1">
        {raw ? "HEX INPUT" : "CONTRACT FUNCTIONS"}
        <div className="inline float-right">
          <ToggleSwitch
            className="!h-5"
            label="Raw Hex"
            value={raw}
            disabled={locked}
            onChange={() => {
              setRaw((raw) => !raw); // shadow?
              if (raw && Object.keys(abiInputs).length === 0) setData("0x");
              // this is bad hack: only for the specific case where they have _no_ abi; they have raw hex inputted, then they toggle off raw hex.
              // the point is that this should have the effect of clearing the data. we can't just clear it all the time, since...
              // this has two weird effects. first, when you go from raw to back, it clears the data, even though you still have "phantom" inputs.
              // more problematically, when you switch _back_ to raw, you have nothing there.
              setRawDisplay(data === "0x" ? "" : data); // really a bad hack honestly.
            }}
          />
        </div>
      </div>
      <div className="mx-auto w-full rounded-2xl">
        {raw ? (
          <TextField
            value={rawDisplay}
            placeholder="0x"
            disabled={locked}
            onChange={(event) => {
              setRawDisplay(event.target.value);
              if (
                !isHex(event.target.value) ||
                (event.target.value.length & 1) !== 0 ||
                event.target.value === "0x"
              ) {
                setOverallHelper(
                  event.target.value === "" || event.target.value === "0x"
                    ? "Hex data must be nonempty in advanced mode."
                    : "The raw hex you've inputted is malformed.",
                );
                setData(""); // force refresh.
                return;
              }
              setOverallHelper("");
              setData(event.target.value);
            }}
          />
        ) : (
          Object.keys(abiInputs).map((selector, index) => {
            const { fragment, types, placeholders, values, empties } =
              abiInputs[selector];
            return (
              <FunctionPanel
                key={index}
                {...{
                  locked,
                  abiInputs,
                  setAbiInputs,
                  openSelector,
                  setOpenSelector,
                  setPayable,
                  selector,
                  fragment,
                  types,
                  placeholders,
                  values,
                  empties,
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

const FunctionPanel = ({
  locked,
  abiInputs,
  setAbiInputs,
  openSelector,
  setOpenSelector,
  setPayable,
  selector,
  fragment,
  types,
  placeholders,
  values,
  empties,
}) => {
  const open = selector === openSelector;
  return (
    <div>
      <div
        onClick={() => {
          if (locked) return;
          const newAbiInputs = { ...abiInputs };
          if (openSelector !== "")
            newAbiInputs[openSelector].values = empties.slice();
          setAbiInputs(newAbiInputs); // reset values... whatever's open is getting closed
          if (open) {
            setOpenSelector("");
            setPayable(true);
          } else {
            setOpenSelector(selector);
            setPayable(fragment.stateMutability === "payable");
          }
        }}
        className={`
          flex w-full justify-between rounded-t-lg
          px-4 py-2 text-left text-sm font-medium
          ${open ? "text-zinc-300 bg-black/20 " : ""}
          text-zinc-500
          hover:text-zinc-300 hover:bg-black/20
          focus:outline-none font-light
        `}
      >
        {fragment.name}
        <ChevronUpIcon
          className={`
            ${open ? "rotate-180 transform text-zinc-300" : ""}
            h-5 w-5 text-zinc-500
          `}
        />
      </div>
      <Transition
        show={open}
        enter="transition duration-100 ease-out origin-top"
        enterFrom="transform scale-y-0 opacity-0"
        enterTo="transform scale-y-100 opacity-100"
        leave="transition duration-75 ease-out origin-top"
        leaveFrom="transform scale-y-100 opacity-100"
        leaveTo="transform scale-y-0 opacity-0"
      >
        <div className="px-4 space-y-1 bg-black/20 rounded-b-lg">
          {fragment.inputs.map((input, index) => {
            return (
              <FunctionInputField
                {...{
                  selector,
                  input,
                  locked,
                  abiInputs,
                  setAbiInputs,
                  index,
                }}
                type={types[index]}
                value={values[index]}
                placeholder={placeholders[index]}
                key={index}
              />
            );
          })}
        </div>
      </Transition>
    </div>
  );
};
