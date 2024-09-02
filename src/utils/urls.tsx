import { ADDRESSES } from "@constants/addresses";
import { CHAIN_PARAMS } from "@constants/networks";

export const DOCS_URL = "https://firn.io/whitepaper.pdf";
export const GITBOOK_URL = "https://docs.firn.io";
export const MEDIUM_URL = "https://medium.com/@firnprotocol";
export const DISCORD_URL = "https://discord.gg/2TPJE7CMdu";
export const TELEGRAM_URL = "#";
export const EMAIL_URL = "mailto:firnprotocol@proton.me";
export const TWITTER_URL = "https://twitter.com/firnprotocol";
export const GITHUB_URL = "https://github.com/firnprotocol";
export const REDDIT_URL = "https://www.reddit.com/r/firnprotocol/";

export const TOKEN_URL = `${CHAIN_PARAMS.Ethereum.blockExplorerUrl}/token/${ADDRESSES.Ethereum.ERC20}`;
export const UNISWAP_URL = `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${ADDRESSES.Ethereum.ERC20}`;
