import {
  ClipboardIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { TextField } from "@tw/TextField";
import { useState } from "react";
import toast from "react-hot-toast";

export const CopyableField = ({ label, value, helperText }) => {
  const [copied, setCopied] = useState(false);
  const [cached, setCached] = useState(undefined);

  function onClick() {
    navigator.clipboard.writeText(value).then(() => {
      toast.success("Public key copied to clipboard.");
      setCopied(true);
    });
    if (cached !== undefined) clearTimeout(cached);
    setCached(
      setTimeout(() => {
        setCopied(false);
      }, 2000),
    );
  }

  const IconFunc = copied ? ClipboardIcon : DocumentDuplicateIcon;

  return (
    <TextField
      container="bg-stone-900" // containerClassName
      className="font-telegrama bg-stone-900 text-cyan-600 hover:text-cyan-500 focus-within:text-cyan-700 cursor-pointer break-words"
      value={value}
      label={label}
      onClick={onClick}
      readOnly
      helperText={helperText}
      endAdornment={
        <IconFunc
          className="h-4 w-4 inline flex -mr-1 align-middle mt-1.5 text-cyan-700 group-hover:text-cyan-500 group-focus:text-cyan-700 transition-all"
          onClick={onClick}
        />
      }
    />
  );
};
