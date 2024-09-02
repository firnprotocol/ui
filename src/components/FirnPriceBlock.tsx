import { AddFirnToWalletButton } from "@components/buttons/AddFirnToWalletButton";
import { ButtonLoadingSpinner } from "@components/loading/ButtonLoadingSpinner";
import { ADDRESSES } from "@constants/addresses";
import IUniswapV3Pool from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { useAccount, useReadContracts } from "wagmi";

const USDC_POOL = "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640";

const converter = (sqrtPriceX96) => {
  // https://docs.uniswap.org/sdk/guides/creating-a-pool
  return (sqrtPriceX96 * sqrtPriceX96) / (1n << 192n); // sqrtPriceX96 ** 2n doesn't work?!?
};

export const FirnPriceBlock = ({ locked, setLocked }) => {
  const { chain } = useAccount();
  const { data, isLoading, isSuccess } = useReadContracts({
    contracts: [
      {
        address: ADDRESSES.Ethereum.POOL,
        abi: IUniswapV3Pool.abi,
        functionName: "slot0",
      },
      {
        address: USDC_POOL,
        abi: IUniswapV3Pool.abi,
        functionName: "slot0",
      },
    ],
    query: { enabled: chain?.name === "Ethereum" },
  });

  let price = "";
  if (chain?.name === "Ethereum" && isSuccess) {
    const firn = converter(data[0].result[0]);
    const usdc = converter(data[1].result[0]);
    price = `$${(Number(100000000000000n / usdc / firn) / 100).toFixed(2)}`; // 10n ** 14n doesn't work???
  }

  return (
    <div className="inline-block">
      <div className="text-sm sm:dark:font-light text-slate-500 font-telegrama">
        FIRN{" "}
        {isLoading ? (
          <ButtonLoadingSpinner className="-mt-1 !h-4 !w-4" />
        ) : (
          price
        )}
        <AddFirnToWalletButton
          className="float-right inline-block ml-1 -mt-1"
          locked={locked}
          setLocked={setLocked}
        />
      </div>
    </div>
  );
};
