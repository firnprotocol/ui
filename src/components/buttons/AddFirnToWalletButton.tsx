import { Button } from "@tw/Button";
import FIRN_LOGO from "assets/firn.svg";
import { useAddToWallet } from "hooks/useAddToWallet";

export const AddFirnToWalletButton = ({ className, locked, setLocked }) => {
  const { onClick, adding, added } = useAddToWallet({ setLocked });

  return (
    <Button
      onClick={onClick}
      disabled={added || adding || locked}
      outline
      className={`
        px-2 !pt-0 !pb-0.5 group
        !border-transparent hover:border hover:bg-white/10
        !rounded-full focus:ring-0 active:ring-0 outline-none
        transform-gpu transition duration-200 ease-in-out ${className}
      `}
    >
      <img
        src={FIRN_LOGO}
        className="h-5 w-5 inline opacity-50 group-hover:opacity-95 transition-all  ease-in-out mr-1"
      />
      <small className="hidden group-hover:md:inline-block transition ease-in-out mr-1 -mt-0.5">
        {added ? "TOKEN ADDED" : adding ? "ADDING FIRN" : "ADD TO WALLET"}
      </small>
    </Button>
  );
};
