import { ARB_GAS_INFO_ABI, FIRN_ABI, ORACLE_ABI } from "@constants/abis";
import { ADDRESSES } from "@constants/addresses";
import { ElGamal } from "@crypto/algebra";
import { BN128 } from "@crypto/bn128";
import { Client, EPOCH_LENGTH } from "@crypto/client";
import { useQueryClient } from "@tanstack/react-query";
import { Grid } from "@tw/Grid";
import { TokenPanel } from "@ui/MainPanel/TokenPanel";
import { useEpoch } from "hooks/useEpoch";
import * as mcl from "mcl-wasm/browser";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { relayFetch } from "utils/relay";
import {
  useAccount,
  useBlockNumber,
  useConfig,
  useEstimateFeesPerGas,
  useReadContract,
  useReadContracts,
  useWatchContractEvent,
} from "wagmi";
import { getBlock, readContracts } from "wagmi/actions";

import { ActionSelectorTabs } from "./ActionSelectorTabs";

const BLOB_BASE_FEE_SCALAR = 810949n;
const BASE_FEE_SCALAR = 1368n;

export const MainPanel = ({
  secret,
  locked,
  setLocked,
  ready,
  setReady,
  ...props
}) => {
  const config = useConfig();
  const queryClient = useQueryClient();

  const { chain } = useAccount();
  const nextEpoch = useEpoch();

  const [balance, setBalance] = useState(0); // firn balance
  const [panel, setPanel] = useState(false);
  const [health, setHealth] = useState(true); // true makes it show up at first even before first fetch.

  const client = useRef(new Client({ setBalance, secret, nextEpoch, config }));

  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { data, isFetched, queryKey } = useEstimateFeesPerGas();

  const optimism = useReadContracts({
    contracts: [
      {
        address: ADDRESSES[chain?.name]?.ORACLE,
        abi: ORACLE_ABI,
        functionName: "l1BaseFee",
      },
      {
        address: ADDRESSES[chain?.name]?.ORACLE,
        abi: ORACLE_ABI,
        functionName: "blobBaseFee",
      },
      // {
      //   address: ADDRESSES[chain?.name]?.ORACLE,
      //   abi: ORACLE_ABI,
      //   functionName: "baseFee", // this seems to be 0????
      // },
    ],
    query: { enabled: chain?.name === "OP Mainnet" || chain?.name === "Base" },
  });

  const arbitrum = useReadContract({
    address: ADDRESSES["Arbitrum One"].ARB_GAS_INFO,
    abi: ARB_GAS_INFO_ABI,
    functionName: "getPricesInWei",
    query: { enabled: chain?.name === "Arbitrum One" }, // kosher to have this inside?
  });

  useEffect(() => {
    if (!locked) {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: optimism.queryKey }); // (oracle)
      queryClient.invalidateQueries({ queryKey: arbitrum.queryKey });
    } // refresh balance on every block?
  }, [blockNumber, locked]);

  const calculators = {
    l1GasPrice: data?.maxFeePerGas, // will only be read from in case of mainnet.
    Ethereum: (l1Gas, estimatePadding) => {
      if (!isFetched) return 0n;
      const maxFeePerGas = data.maxFeePerGas + estimatePadding;
      return l1Gas * maxFeePerGas; // onl other field it contains is maxPriorityFeePerGas. dumped base fee
    },
    "OP Mainnet": (l2Gas, txCompressedSize) => {
      if (!isFetched || !optimism.isFetched) return 0n; // || data.gasPrice === null
      const weightedGasPrice =
        (16n * BASE_FEE_SCALAR * optimism.data[0].result +
          BLOB_BASE_FEE_SCALAR * optimism.data[1].result) /
        1000000n;
      const l1DataFee = txCompressedSize * weightedGasPrice;
      const l2ExecutionFee = data.maxFeePerGas * l2Gas;
      return l1DataFee + l2ExecutionFee;
    },
    "Arbitrum One": (l2Gas, l1CalldataSize) => {
      if (!isFetched || !arbitrum.isFetched) return 0n;
      const l1GasPrice = arbitrum.data[1];
      return l2Gas * data.maxFeePerGas + l1GasPrice * l1CalldataSize;
    },
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      if (locked) return;
      try {
        await relayFetch("health", {}); // const json =
        setHealth(true);
      } catch (error) {
        console.error(error);
        setHealth(false);
      }
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [locked]);

  function shadowBan(promise) {
    client.current.banned = true;
    promise.then((block) => {
      client.current.banned = false;
    });
  }

  useEffect(() => {
    const pub = BN128.toCompressed(mcl.mul(BN128.BASE, secret));

    getBlock(config).then((block) => {
      const epoch = Math.floor(Number(block.timestamp) / EPOCH_LENGTH);
      readContracts(config, {
        contracts: [
          // need ?s to handle case of logout
          {
            address: ADDRESSES[chain?.name]?.FIRN,
            abi: FIRN_ABI,
            functionName: "simulateAccounts",
            args: [[pub], epoch],
          },
          {
            address: ADDRESSES[chain?.name]?.FIRN,
            abi: FIRN_ABI,
            functionName: "simulateAccounts",
            args: [[pub], epoch + 1],
          },
        ],
        blockNumber: block.number,
      }).then((data) => {
        const present = ElGamal.deserialize(data[0].result[0]);
        const future = ElGamal.deserialize(data[1].result[0]);
        client.current
          .initialize(block, present, future)
          .then(() => {
            toast.success("Your account has been loaded!");
            setReady(true);
          })
          .catch((error) => {
            console.error(error);
            toast.error(
              "We were unable to retrieve your account! Please try logging in again.",
            );
          });
      });
    });
  }, []);

  useWatchContractEvent({
    // chainId: ?
    address: ADDRESSES[chain?.name]?.FIRN,
    abi: FIRN_ABI,
    eventName: "TransferOccurred",
    onLogs(logs) {
      logs.forEach((log) => {
        client.current.processTransfer(log); // todo: this can throw...
      });
    },
  });

  return (
    <Grid gap={2} cols={{ xs: 1 }}>
      {panel ? (
        <TokenPanel
          {...{
            setPanel,
            locked,
            setLocked,
          }}
        />
      ) : (
        <ActionSelectorTabs
          {...props}
          {...{
            ready,
            locked,
            setLocked,
            client: client.current,
            balance,
            shadowBan,
            health,
            calculators,
            setPanel,
          }}
        />
      )}
    </Grid>
  );
};
