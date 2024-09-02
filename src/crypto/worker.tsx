import * as mcl from "mcl-wasm/browser";

onmessage = (event) => {
  mcl.init(mcl.BN_SNARK1).then(() => {
    // do i need to re-init?
    // the below is essentially a cheat in that we're not using "mapInto", but a hardcoded thing instead.
    // really doesn't matter, and can definitely "fix" this later if necessary.
    const base = mcl.deserializeHexStrToG1(
      "4847bef62a701ae333f8be86b8f54ec425eb2f76f93797180d139df435c4bc14",
    );
    const exponent = mcl.deserializeHexStrToG1(event.data.exponent);
    let initial = new mcl.G1();
    for (let i = 0; i < event.data.id; i++) {
      initial = mcl.add(initial, base);
    }
    for (let i = 0; i < 32 / event.data.block; i++) {
      let accumulator = initial; // ok to alias, we'll copy
      for (let j = 0; j < 1 << (event.data.block * i); j++) {
        if (accumulator.isEqual(exponent)) {
          postMessage((event.data.id << (event.data.block * i)) + j);
          return;
        }
        accumulator = mcl.add(accumulator, base);
      }
      for (let j = 0; j < event.data.block; j++) {
        initial = mcl.dbl(initial);
      }
    }
  });
};
