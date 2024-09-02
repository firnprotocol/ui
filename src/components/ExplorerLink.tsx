import { CHAIN_PARAMS } from "@constants/networks";
import { useAccount } from "wagmi";

export const ExplorerLink = ({ hash, children, className }) => {
  const { chain } = useAccount();
  return (
    <a
      href={`${CHAIN_PARAMS[chain?.name]?.blockExplorerUrl}/tx/${hash}`}
      target="_blank"
      className={`${className} underline`}
      rel="noreferrer"
    >
      {children ?? (
        <code>
          {hash.slice(0, 6)}...{hash.slice(-4)}
        </code>
      )}
    </a>
  );
};
