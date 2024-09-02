import { Button } from "@tw/Button";
import { TextField } from "@tw/TextField";
import { useEffect } from "react";

export const NumericField = ({
  error,
  helper,
  setAmount,
  display,
  setDisplay,
  locked,
  units,
  max,
  maxEnabled,
  setMaxEnabled,
  payable,
}) => {
  useEffect(() => {
    if (maxEnabled) {
      if (max <= 0) {
        setMaxEnabled(false);
        setDisplay("");
        setAmount(0);
      } else {
        setAmount(max);
      }
    }
  }, [maxEnabled, max]);
  // there's a subtlety where when maxEnabled is _on_, and max goes from something nonzero to 0
  // (say because they switched to the wrong chain or something), then `amount` also goes to 0.
  // in this case we also want to manually clear display and reset it to "".

  useEffect(() => {
    if (!payable) {
      setMaxEnabled(false);
      setAmount(0);
      setDisplay("0.000");
    } else {
      setDisplay("");
    }
  }, [payable]);

  const disabled = max === 0 || locked || !payable;
  return (
    <TextField
      className="font-telegrama"
      endAdornment={
        <div className="flex -mr-2 align-middle mt-0.5">
          <div className="text-eth-400 font-telegrama flex-0 pt-0.5">
            {units}
          </div>
          <div className="pr-2">
            <Button
              fancy={maxEnabled}
              outline={!maxEnabled}
              type="button"
              className={`"font-telegrama rounded-lg" inline-block !py-1 ml-2.5 text-xs flex-0 border ${maxEnabled || disabled ? "!border-transparent" : ""}`}
              disabled={disabled}
              onClick={() => {
                setAmount(0); // even when we're turning it _on_. will overwrite in useEffect
                setDisplay(""); // do this so there isn't some spurious display value lurking somewhere.
                setMaxEnabled((maxEnabled) => !maxEnabled); // used to not have function, might not be necessary
              }}
            >
              MAX
            </Button>
          </div>
        </div>
      }
      placeholder="0.000"
      value={maxEnabled ? (max / 1000).toFixed(3) : display}
      onChange={(event) => {
        if (maxEnabled) setDisplay((max / 1000).toFixed(3));
        setMaxEnabled(false);
        if (
          event.target.value.length > 12 ||
          !/^[\d.]*$/.test(event.target.value)
        )
          return;
        const split = event.target.value.split("."); // .replace(/\.+/, '.') // unnecessary except for weird inputs
        if (split.length > 1) {
          split[1] = split[1].slice(0, 3);
        }
        const display = split.slice(0, 2).join("."); // shadow
        setDisplay(display);
        setAmount(Math.floor(display === "." ? 0 : Number(display) * 1000));
      }}
      disabled={locked || !payable}
      helperText={helper}
      error={error}
    />
  );
};
