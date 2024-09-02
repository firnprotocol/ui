import { Popover } from "@headlessui/react";
import Avatar from "boring-avatars";

export const AvatarDropdownMenu = ({ logOut, pub, locked, children }) => {
  return (
    <Popover className="relative">
      <Popover.Button disabled={locked}>{children}</Popover.Button>
      <Popover.Panel className="bg-zinc-800 rounded-lg absolute z-10 w-[210px] left-[-180px]">
        <div className="pt-1 px-3 pb-2 w-full bg-zinc-900 font-telegrama rounded-t-lg">
          <small className="text-slate-500">FIRN ACCOUNT</small>
          <div className="text-cyan-600  flex justify-between items-center py-1 md:justify-start md:space-x-2">
            <div className="flex justify-start flex-1">
              {pub.slice(0, 6)}...{pub.slice(-4)}
            </div>
            <Avatar size={20} name={pub} variant="bauhaus" />
          </div>
        </div>
        <div className="p-1">
          <div
            className="p-2 w-full text-slate-400 hover:text-slate-300 hover:bg-zinc-900 font-telegrama rounded"
            onClick={() => {
              logOut();
            }}
          >
            <div>LOG OUT</div>
          </div>
        </div>
      </Popover.Panel>
    </Popover>
  );
};
