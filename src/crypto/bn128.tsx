import * as mcl from "mcl-wasm/browser";
import {
  encodeAbiParameters,
  encodePacked,
  keccak256,
  stringToHex,
  toBytes,
  toHex,
} from "viem";

export const BN128 = {};

BN128.promise = mcl.init(mcl.BN_SNARK1).then(() => {
  const ONE = mcl.deserializeHexStrToFp(
    "0100000000000000000000000000000000000000000000000000000000000000",
  ); // this is Fp, while below is Fr
  const THREE = mcl.deserializeHexStrToFp(
    "0300000000000000000000000000000000000000000000000000000000000000",
  );
  const PPLUS1DIV4 = toBytes(
    "0x0c19139cb84c680a6e14116da060561765e05aa45a1c72a34f082305b61f3f52",
  ); // big-endian.
  const sqrt = (input) => {
    // _attempts_ to square root a field element mod p
    let result = ONE; // really y, but the linter is complaining
    for (let i = 0; i < 256; i++) {
      result = mcl.sqr(result);
      if (PPLUS1DIV4[i >> 3] & (0x80 >> (i & 0x07))) {
        result = mcl.mul(result, input);
      }
    }
    return result;
  };
  BN128.ONE = mcl.deserializeHexStrToFr(
    "0100000000000000000000000000000000000000000000000000000000000000",
  );
  BN128.mapInto = (seed) => {
    // i guess seed here is a hex digest (with "0x")?
    let start = new mcl.Fp();
    start.setBigEndianMod(toBytes(seed));
    while (true) {
      const y2 = mcl.add(mcl.mul(mcl.sqr(start), start), THREE);
      const y = sqrt(y2);
      if (mcl.sqr(y).isEqual(y2)) {
        const result = new mcl.G1();
        result.setX(start);
        result.setY(y);
        result.setZ(ONE);
        return result;
      }
      start = mcl.add(start, ONE);
    }
  };

  BN128.BASE = BN128.mapInto(keccak256(stringToHex("g")));

  BN128.randomScalar = () => {
    const result = new mcl.Fr();
    result.setByCSPRNG();
    return result;
  };
  BN128.toCompressed = (point) => {
    return toHex(point.serialize().reverse());
  };
  BN128.fromCompressed = (input) => {
    const result = new mcl.G1();
    result.deserialize(toBytes(input).reverse());
    return result;
  };
  BN128.toETH = (point) => {
    // will kill this
    if (point.isZero()) {
      return [toHex("", { size: 32 }), toHex("", { size: 32 })];
    }
    const serialized = point.serialize();
    const x = new mcl.Fp();
    const sign = (serialized[31] & 0x80) >> 7;
    serialized[31] &= 0x7f;
    x.deserialize(serialized);
    // slight amount of repeated code here, but it really doesn't gel if you try to refactor
    const y2 = mcl.add(mcl.mul(mcl.sqr(x), x), THREE);
    let y = sqrt(y2);
    if (sign !== (y.serialize()[0] & 0x01)) {
      y = mcl.neg(y);
    }
    return [toHex(x.serialize().reverse()), toHex(y.serialize().reverse())];
  };
  BN128.sign = (address, secret) => {
    // i guess `message` is a string and `secret` is a uint8array...
    const pub = mcl.mul(BN128.BASE, secret);
    // https://datatracker.ietf.org/doc/html/rfc6979#section-3.2
    const k = BN128.randomScalar();
    const K = mcl.mul(BN128.BASE, k);
    // weirdly, i guess we will be verifying these locally now, so there's not much need to use ETH encoding + hashes.
    const c = new mcl.Fr();
    c.setBigEndianMod(
      toBytes(
        keccak256(
          encodeAbiParameters(
            [
              { name: "", type: "string" },
              { name: "", type: "address" },
              { name: "", type: "bytes32" },
              { name: "", type: "bytes32[2]" },
            ],
            [
              "Welcome to Firn.",
              address,
              BN128.toCompressed(pub),
              BN128.toETH(K),
            ],
          ),
        ),
      ),
    );
    const s = mcl.add(mcl.mul(c, secret), k);
    return [toHex(c.serialize().reverse()), toHex(s.serialize().reverse())];
  };
  BN128.gEpoch = (epoch) => {
    return BN128.mapInto(
      keccak256(encodePacked(["string", "uint256"], ["Firn Epoch", epoch])),
    );
  };
});
