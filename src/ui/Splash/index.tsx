import { algebra } from "@crypto/algebra";
import { Grid } from "@tw/Grid";
import { About } from "@ui/About";
import { useEffect, useState } from "react";
import { useSwitchChain } from "wagmi";

import { EnterAppCard } from "./EnterAppCard";

export const Splash = ({
  setSecret,
  setPub,
  locked,
  setLocked,
  setRegistered,
}) => {
  const { isLoading } = useSwitchChain();

  const [algebraReady, setAlgebraReady] = useState(false);

  useEffect(() => {
    algebra.then(() => {
      setAlgebraReady(true);
    });
  }, []);

  return (
    <Grid gap={6} cols={{ xs: 1 }}>
      <EnterAppCard
        disabled={!algebraReady || locked || isLoading}
        {...{ setLocked, setSecret, setPub, setRegistered }}
      />
      <About />
    </Grid>
  );
};
