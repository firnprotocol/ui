import { NumericField } from "@components/NumericField";
import { parseGwei } from "viem";
import { useAccount } from "wagmi";

export const FEE = 128;

export const FormPortion = ({
  amount,
  isTransfer,
  tip,
  health,
  calculators,
  ...props
}) => {
  const { chain } = useAccount();

  const fee = Math.floor(amount / FEE); // recalculate
  let message;
  if (health) {
    message = `At current gas levels, your transaction will cost ${(
      tip / 1000
    ).toFixed(3)} ETH in gas.`;
    if (!isTransfer) {
      message += ` Your total fee will be ${((tip + fee) / 1000).toFixed(3)} ETH.`;
    }
  } else
    message =
      "We're currently unable to reach the Firn relay. Stand by; we'll keep trying to reach it in the meantime."; // could also be optimism down
  const high =
    chain?.name === "Ethereum" && calculators.l1GasPrice >= parseGwei("10");

  return (
    <div>
      <div className="font-telegrama text-sm text-zinc-500 pb-1">
        {isTransfer ? "TRANSFER AMOUNT" : "SPEND AMOUNT"}
      </div>
      <div>
        <NumericField
          {...props}
          error={props.helper.length > 0 && !props.suppress}
          units="ETH"
        />
      </div>
      <div
        className={`pb-2 text-sm ${!health ? "text-yellow-600" : "text-zinc-500"}`}
      >
        {message}{" "}
        {high && health && (
          <span className="text-yellow-600">
            Please be advised that network fees are high right now; consider
            waiting.
          </span>
        )}
      </div>
    </div>
  );
};
