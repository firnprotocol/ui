import { PedersenVectorCommitment } from "@crypto/algebra";
import { BN128 } from "@crypto/bn128";
import * as mcl from "mcl-wasm/browser";
import { encodeAbiParameters, keccak256, toBytes, toHex } from "viem";

export class InnerProductProof {
  serialize() {
    let result = "0x";
    this.L.forEach((l) => {
      result += BN128.toCompressed(l).slice(2);
    });
    this.R.forEach((r) => {
      result += BN128.toCompressed(r).slice(2);
    });
    result += toHex(this.a.serialize().reverse()).slice(2);
    result += toHex(this.b.serialize().reverse()).slice(2);
    return result;
  }

  static prove(commitment, salt) {
    // arg: a vector commitment which was decommited.
    const result = new InnerProductProof();
    result.L = [];
    result.R = [];

    const recursiveProof = (result, as, bs, previousChallenge) => {
      // ref to result
      const M = as.length();
      if (M === 1) {
        result.a = as.vector[0];
        result.b = bs.vector[0];
        return;
      }
      const MPrime = M >> 1; // what if this is not an integer?!?
      const asLeft = as.slice(0, MPrime);
      const asRight = as.slice(MPrime);
      const bsLeft = bs.slice(0, MPrime);
      const bsRight = bs.slice(MPrime);
      const gsLeft = PedersenVectorCommitment.base.gs.slice(0, MPrime);
      const gsRight = PedersenVectorCommitment.base.gs.slice(MPrime);
      const hsLeft = PedersenVectorCommitment.base.hs.slice(0, MPrime);
      const hsRight = PedersenVectorCommitment.base.hs.slice(MPrime);

      const cL = asLeft.innerProduct(bsRight);
      const cR = asRight.innerProduct(bsLeft);
      const L = mcl.add(
        mcl.add(
          gsRight.multiExponentiate(asLeft),
          hsLeft.multiExponentiate(bsRight),
        ),
        mcl.mul(PedersenVectorCommitment.base.h, cL),
      );
      const R = mcl.add(
        mcl.add(
          gsLeft.multiExponentiate(asRight),
          hsRight.multiExponentiate(bsLeft),
        ),
        mcl.mul(PedersenVectorCommitment.base.h, cR),
      );
      result.L.push(L);
      result.R.push(R);

      const x = new mcl.Fr();
      x.setBigEndianMod(
        toBytes(
          keccak256(
            encodeAbiParameters(
              [
                { name: "", type: "bytes32" },
                { name: "", type: "bytes32[2]" },
                { name: "", type: "bytes32[2]" },
              ],
              [
                toHex(previousChallenge.serialize().reverse()),
                BN128.toETH(L),
                BN128.toETH(R),
              ],
            ),
          ),
        ),
      );

      const xInv = mcl.inv(x);
      PedersenVectorCommitment.base.gs = gsLeft
        .times(xInv)
        .add(gsRight.times(x));
      PedersenVectorCommitment.base.hs = hsLeft
        .times(x)
        .add(hsRight.times(xInv));
      const asPrime = asLeft.times(x).add(asRight.times(xInv));
      const bsPrime = bsLeft.times(xInv).add(bsRight.times(x));

      recursiveProof(result, asPrime, bsPrime, x);

      PedersenVectorCommitment.base.gs = gsLeft.concat(gsRight);
      PedersenVectorCommitment.base.hs = hsLeft.concat(hsRight); // clean up
    };
    recursiveProof(result, commitment.gValues, commitment.hValues, salt);
    return result;
  }
}
