import { NavBar } from "@components/navbar";
import { StandardPageContainer } from "@components/StandardPageContainer";
import { CustomToaster } from "@components/toasts/CustomToaster";
import { PageFooter } from "@layouts/PageFooter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Grid } from "@tw/Grid";
import { MainPanel } from "@ui/MainPanel";
import { Splash } from "@ui/Splash";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { http, toHex, webSocket } from "viem";
import { arbitrum, base, mainnet, optimism } from "viem/chains";
import {
  createConfig,
  fallback,
  unstable_connector,
  useAccount,
  WagmiProvider,
} from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

export const Main = () => {
  const { address, chain } = useAccount();

  const [pub, setPub] = useState(toHex("", { size: 32 }));
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [secret, setSecret] = useState(undefined);
  const [registered, setRegistered] = useState(false);

  const logOut = () => {
    setPub(toHex("", { size: 32 }));
    setSecret(undefined);
    setReady(false);
    setRegistered(true); // hard to imagine a case where this is necessary.
  };

  // really the below two useEffects can (apparently) go essentially anywhere.
  useEffect(() => {
    // watchChainId
    if (chain === undefined)
      toast.error("Switched to an unsupported chain."); // Your wallet has been disconnected.
    else
      toast(
        <span>
          Switched the chain to <b>{chain.name}</b>.
        </span>,
      );
    logOut();
  }, [chain]);

  useEffect(() => {
    // watchAccount
    if (address)
      toast(
        <span>
          Switched account to{" "}
          <code>
            {address.slice(0, 6)}...{address.slice(-4)}
          </code>
          .
        </span>,
      );
  }, [address]);

  return (
    <div className="text-slate-400 bg-black min-h-screen overflow-hidden">
      <NavBar {...{ logOut, pub, locked, setLocked }} />
      <StandardPageContainer>
        <Grid
          cols={{ xs: 1 }}
          className="justify-center place-content-center place-items-center"
        >
          <div className="max-w-[46.3rem] w-full">
            {secret === undefined ? (
              <Splash
                {...{ setSecret, setPub, locked, setLocked, setRegistered }}
              />
            ) : (
              <MainPanel
                {...{
                  pub,
                  secret,
                  locked,
                  setLocked,
                  ready,
                  setReady,
                  registered,
                  setRegistered,
                }}
              />
            )}
          </div>
        </Grid>
      </StandardPageContainer>
      <PageFooter locked={locked} setLocked={setLocked} />
    </div>
  );
};

const queryClient = new QueryClient();

const config = createConfig({
  chains: [mainnet, arbitrum, optimism, base],
  pollingInterval: 10000,
  connectors: [
    walletConnect({ projectId: "0123456789abcdef0123456789abcdef" }), // your walletconnect project ID
  ],
  transports: {
    [mainnet.id]: fallback([
      webSocket(
        "wss://eth-mainnet.g.alchemy.com/v2/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef",
      ),
      http(
        "https://eth-mainnet.g.alchemy.com/v2/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef",
      ),
      http(),
      unstable_connector(injected),
    ]),
    [arbitrum.id]: fallback([
      webSocket(
        "wss://arb-mainnet.g.alchemy.com/v2/ghijklmnopqrstuvwxyz0123456789-_",
      ),
      http(
        "https://arb-mainnet.g.alchemy.com/v2/ghijklmnopqrstuvwxyz0123456789-_",
      ),
      http(),
      unstable_connector(injected),
    ]),
    [optimism.id]: fallback([
      webSocket(
        "wss://opt-mainnet.g.alchemy.com/v2/firnfirnfirnfirnfirnfirnfirnfirn",
      ),
      http(
        "https://opt-mainnet.g.alchemy.com/v2/firnfirnfirnfirnfirnfirnfirnfirn",
      ),
      http(),
      unstable_connector(injected),
    ]),
    [base.id]: fallback([
      webSocket(
        "wss://base-mainnet.g.alchemy.com/v2/protocolprotocolprotocolprotocol",
      ),
      http(
        "https://base-mainnet.g.alchemy.com/v2/protocolprotocolprotocolprotocol",
      ),
      http(),
      unstable_connector(injected),
    ]),
  },
});

const App = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <CustomToaster />
        <Main />
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
