import ARBITRUM_ICON from "assets/icons/arbitrum.png";
import BASE_ICON from "assets/icons/base.png";
import ETHEREUM_ICON from "assets/icons/ethereum.png";
import OPTIMISM_ICON from "assets/icons/optimism.png";

export const CHAIN_PARAMS = {
  Ethereum: {
    name: "Ethereum",
    blockExplorerUrl: "https://etherscan.io",
    image: ETHEREUM_ICON,
    etherscanApiUrl: "https://api.etherscan.io",
  },
  "OP Mainnet": {
    name: "Optimism",
    blockExplorerUrl: "https://optimistic.etherscan.io",
    image: OPTIMISM_ICON,
    etherscanApiUrl: "https://api-optimistic.etherscan.io",
  },
  "Arbitrum One": {
    name: "Arbitrum",
    blockExplorerUrl: "https://arbiscan.io",
    image: ARBITRUM_ICON,
    etherscanApiUrl: "https://api.arbiscan.io",
  },
  Base: {
    name: "Base",
    blockExplorerUrl: "https://basescan.org",
    image: BASE_ICON,
    etherscanApiUrl: "https://api.basescan.org",
  },
};
