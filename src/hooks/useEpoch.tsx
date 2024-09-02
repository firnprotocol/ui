import { EPOCH_LENGTH } from "@crypto/client";
import { useConfig } from "wagmi";
import { watchBlocks } from "wagmi/actions";

export function useEpoch() {
  const config = useConfig();

  async function nextEpoch(block) {
    const epoch = Math.floor(Number(block.timestamp) / EPOCH_LENGTH);
    return new Promise((resolve) => {
      const unwatch = watchBlocks(config, {
        // listen: true
        onBlock(block) {
          if (Math.floor(Number(block.timestamp) / EPOCH_LENGTH) > epoch) {
            unwatch();
            resolve(block);
          }
        },
      });
    });
  }
  return nextEpoch;
}
