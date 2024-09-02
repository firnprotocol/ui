import { ButtonLoadingSpinner } from "@components/loading/ButtonLoadingSpinner";
import { Button } from "@tw/Button";
import { useState } from "react";

export const SubmitTxButton = ({
  className,
  onClick,
  pendingLabel,
  label,
  ...props
}) => {
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      fancy
      className={`w-full font-telegrama rounded-lg ${className}`}
      onClick={async () => {
        setIsPending(true);
        try {
          await onClick();
        } finally {
          setIsPending(false);
        }
      }}
      {...props}
    >
      {isPending ? (
        <>
          <span className="animate-pulse">{pendingLabel}</span>{" "}
          <ButtonLoadingSpinner className="-mt-1" />
        </>
      ) : (
        <span>{label}</span>
      )}
    </Button>
  );
};
