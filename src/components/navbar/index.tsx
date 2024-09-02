import { ButtonLoadingSpinner } from "@components/loading/ButtonLoadingSpinner";
import { AvatarDropdownMenu } from "@components/navbar/AvatarDropdownMenu";
import { NetworkDropdownMenu } from "@components/navbar/NetworkDropdownMenu";
import { WalletDropdownMenu } from "@components/navbar/WalletDropdownMenu";
import { CHAIN_PARAMS } from "@constants/networks";
import FIRN_ICON from "assets/firn.svg";
import QUESTION_ICON from "assets/icons/question.svg";
import Avatar from "boring-avatars";
import { useState } from "react";
import { toHex } from "viem";
import { useAccount } from "wagmi";

export const NavBar = ({ logOut, pub, locked, setLocked }) => {
  const { chain } = useAccount();

  const [switching, setSwitching] = useState(false);

  return (
    <div className="flex justify-between items-center py-1 md:justify-start md:space-x-2">
      <div className="flex justify-start flex-1">
        <span className="text-[#00BEF6] font-telegrama text-xl ml-4">
          FIRN <span className="hidden md:inline">PROTOCOL</span>
        </span>
      </div>
      <div className="pl-2 pr-5 pt-2.5 pb-1">
        <NetworkDropdownMenu {...{ locked, setLocked, setSwitching }}>
          {switching ? (
            <ButtonLoadingSpinner className="h-7 w-7 -mt-2.5" />
          ) : (
            <img
              src={
                chain === undefined
                  ? QUESTION_ICON
                  : CHAIN_PARAMS[chain.name].image
              }
              className="h-7 w-7"
            />
          )}
        </NetworkDropdownMenu>
      </div>
      <WalletDropdownMenu {...{ locked, setLocked, switching, setSwitching }} />
      {pub !== toHex("", { size: 32 }) ? (
        <div className="pl-3 pr-5 pt-3 pb-1.5">
          <AvatarDropdownMenu logOut={logOut} pub={pub} locked={locked}>
            <Avatar size={28} name={pub} variant="bauhaus" />
          </AvatarDropdownMenu>
        </div>
      ) : (
        <div className="pl-3 pr-5 py-3">
          <img src={FIRN_ICON} className="h-7 w-7" />
        </div>
      )}
    </div>
  );
};
