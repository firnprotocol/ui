import {
  ElGamal,
  FieldVector,
  N,
  n,
  PedersenVectorCommitment,
  Polynomial,
  recursivePolynomials,
} from "@crypto/algebra";
import { BN128 } from "@crypto/bn128";
import * as mcl from "mcl-wasm/browser";
import { encodeAbiParameters, keccak256, toBytes, toHex } from "viem";

export class DepositProof {
  serialize() {
    // please initialize this before calling this method...
    let result = "0x";
    result += BN128.toCompressed(this.A.point).slice(2);
    result += BN128.toCompressed(this.B.point).slice(2);

    this.C_XG.forEach((C_XG_k) => {
      result += BN128.toCompressed(C_XG_k.left).slice(2);
    });
    this.C_XG.forEach((C_XG_k) => {
      result += BN128.toCompressed(C_XG_k.right).slice(2);
    });
    this.f.vector.forEach((f_k) => {
      result += toHex(f_k.serialize().reverse()).slice(2);
    });

    result += toHex(this.z_A.serialize().reverse()).slice(2);

    result += toHex(this.c.serialize().reverse()).slice(2);
    result += toHex(this.s_r.serialize().reverse()).slice(2);

    return result;
  }

  static prove(Y, C, r, bTransfer, index) {
    const result = new DepositProof();

    const D = C.vector[0].right;

    const a = new FieldVector(
      Array.from({ length: n }).map(BN128.randomScalar),
    );
    const b = new FieldVector(
      Array.from({ length: n }).map((_, i) => {
        const bit = new mcl.Fr();
        bit.setInt((index >> i) & 0x01);
        return bit;
      }),
    );
    const c = new FieldVector(
      a.vector.map((elem, i) => {
        return b.vector[i].isOne() ? mcl.neg(elem) : elem;
      }),
    );
    const d = a.hadamard(a).negate();
    result.A = PedersenVectorCommitment.commit(a, d); // warning: semantic change for contract
    result.B = PedersenVectorCommitment.commit(b, c); // warning: semantic change for contract

    const v = new mcl.Fr();
    v.setBigEndianMod(
      toBytes(
        keccak256(
          encodeAbiParameters(
            [
              { name: "", type: "uint256" },
              { name: "", type: `bytes32[2][${N}]` },
              { name: "", type: `bytes32[2][${N}]` },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
            ],
            [
              bTransfer,
              Y.vector.map(BN128.toETH),
              C.vector.map((C_i) => BN128.toETH(C_i.left)),
              BN128.toETH(D),
              BN128.toETH(result.A.point),
              BN128.toETH(result.B.point),
            ],
          ),
        ),
      ),
    );

    // ugly, but whatever
    const bTransferMCL = new mcl.Fr();
    bTransferMCL.setInt(bTransfer);
    const vPow = new FieldVector([v]); // used to be BN128.ONE
    for (let i = 1; i < N; i++) {
      // it would be nice to have a nifty functional way of doing this.
      vPow.push(mcl.mul(vPow.vector[i - 1], v));
    }

    const polyL = recursivePolynomials(
      [new Polynomial([BN128.ONE])],
      a.vector.slice(),
      b.vector.slice(),
    );
    const poly = Array.from({ length: n }).map(
      (_, k) => new FieldVector(polyL.map((P_i) => P_i.coefficients[k])),
    );

    result.C_XG = Array.from({ length: n }).map((_, k) => {
      const result = ElGamal.commit(D);
      return result.plus(
        mcl.mul(
          mcl.sub(BN128.ONE, vPow.vector[index]),
          mcl.mul(poly[k].vector[index], bTransferMCL),
        ),
      );
    });

    const w = new mcl.Fr(); // locals.v, proof.C_XG, proof.y_XG
    w.setBigEndianMod(
      toBytes(
        keccak256(
          encodeAbiParameters(
            [
              { name: "", type: "bytes32" },
              { name: "", type: `bytes32[2][${n}]` },
              { name: "", type: `bytes32[2][${n}]` },
            ],
            [
              toHex(v.serialize().reverse()),
              result.C_XG.map((C_XG_k) => BN128.toETH(C_XG_k.left)),
              result.C_XG.map((C_XG_k) => BN128.toETH(C_XG_k.right)),
            ],
          ),
        ),
      ),
    );

    result.f = b.times(w).add(a);
    result.z_A = mcl.add(result.A.randomness, mcl.mul(result.B.randomness, w));

    let y_XR = new mcl.G1();
    let p = new FieldVector(Array.from({ length: N }).map(() => new mcl.Fr())); // evaluations of poly_0 and poly_1 at w.

    let wPow = BN128.ONE;
    for (let k = 0; k < n; k++) {
      y_XR = mcl.sub(y_XR, mcl.mul(result.C_XG[k].right, wPow));
      p = p.add(poly[k].times(wPow));
      wPow = mcl.mul(wPow, w);
    }
    p.vector[index] = mcl.add(p.vector[index], wPow);

    y_XR = mcl.add(
      y_XR,
      Y.multiExponentiate(p.add(p.negate().plus(wPow).hadamard(vPow))),
    ); // only need the RHS

    const k_r = BN128.randomScalar();

    const A_D = mcl.mul(BN128.BASE, k_r);
    const A_X = mcl.mul(y_XR, k_r); // y_XR.mul(k_r);

    result.c = new mcl.Fr(); // locals.v, locals.A_D, locals.A_X
    result.c.setBigEndianMod(
      toBytes(
        keccak256(
          encodeAbiParameters(
            [
              { name: "", type: "bytes32" },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
            ],
            [
              toHex(v.serialize().reverse()),
              BN128.toETH(A_D),
              BN128.toETH(A_X),
            ],
          ),
        ),
      ),
    );

    result.s_r = mcl.add(k_r, mcl.mul(result.c, r));

    return result;
  }
}
