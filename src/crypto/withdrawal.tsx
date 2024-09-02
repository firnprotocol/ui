import {
  ElGamal,
  FieldVector,
  FieldVectorPolynomial,
  M,
  N,
  n,
  PedersenCommitment,
  PedersenVectorCommitment,
  Polynomial,
  recursivePolynomials,
} from "@crypto/algebra";
import { BN128 } from "@crypto/bn128";
import { InnerProductProof } from "@crypto/innerproduct";
import * as mcl from "mcl-wasm/browser";
import { encodeAbiParameters, keccak256, toBytes, toHex } from "viem";

export class WithdrawalProof {
  serialize() {
    // please initialize this before calling this method...
    let result = "0x";
    result += BN128.toCompressed(this.BA.point).slice(2);
    result += BN128.toCompressed(this.BS.point).slice(2);
    result += BN128.toCompressed(this.A.point).slice(2);
    result += BN128.toCompressed(this.B.point).slice(2);

    this.CnG.forEach((CnG_k) => {
      result += BN128.toCompressed(CnG_k.left).slice(2);
    });
    this.CnG.forEach((CnG_k) => {
      result += BN128.toCompressed(CnG_k.right).slice(2);
    });
    this.y_0G.forEach((y_0G_k) => {
      result += BN128.toCompressed(y_0G_k.left).slice(2);
    });
    this.y_0G.forEach((y_0G_k) => {
      result += BN128.toCompressed(y_0G_k.right).slice(2);
    });
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

    result += BN128.toCompressed(this.T_1.point).slice(2);
    result += BN128.toCompressed(this.T_2.point).slice(2);
    result += toHex(this.tHat.serialize().reverse()).slice(2);
    result += toHex(this.mu.serialize().reverse()).slice(2);

    result += toHex(this.c.serialize().reverse()).slice(2);
    result += toHex(this.s_sk.serialize().reverse()).slice(2);
    result += toHex(this.s_r.serialize().reverse()).slice(2);
    result += toHex(this.s_b.serialize().reverse()).slice(2);
    result += toHex(this.s_tau.serialize().reverse()).slice(2);

    result += this.ipProof.serialize().slice(2);

    return result;
  }

  static prove(
    Y,
    Cn,
    C,
    epoch,
    sk,
    r,
    bTransfer,
    bDiff,
    index,
    fee,
    destination,
    data,
  ) {
    const result = new WithdrawalProof();

    const D = C.vector[0].right;
    const pub = Y.vector[index];
    const aL = new FieldVector(
      Array.from({ length: M }).map((_, i) => {
        const bit = new mcl.Fr();
        bit.setInt((bDiff >> i) & 0x01);
        return bit;
      }),
    );
    const aR = aL.plus(mcl.neg(BN128.ONE));
    result.BA = PedersenVectorCommitment.commit(aL, aR);
    const sL = new FieldVector(
      Array.from({ length: M }).map(BN128.randomScalar),
    );
    const sR = new FieldVector(
      Array.from({ length: M }).map(BN128.randomScalar),
    );
    result.BS = PedersenVectorCommitment.commit(sL, sR);

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

    const salt = keccak256(
      encodeAbiParameters(
        [
          { name: "", type: "address" },
          { name: "", type: "bytes" },
        ],
        [destination, data],
      ),
    ); // NOT modding, here or in the contract...!

    const v = new mcl.Fr();
    v.setBigEndianMod(
      toBytes(
        keccak256(
          encodeAbiParameters(
            [
              { name: "", type: "uint256" },
              { name: "", type: "uint256" },
              { name: "", type: `bytes32[2][${N}]` },
              { name: "", type: `bytes32[2][${N}]` },
              { name: "", type: `bytes32[2][${N}]` },
              { name: "", type: `bytes32[2][${N}]` },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "uint256" },
              { name: "", type: "uint256" },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
            ],
            [
              salt,
              bTransfer,
              Y.vector.map(BN128.toETH),
              Cn.vector.map((Cn_i) => BN128.toETH(Cn_i.left)),
              Cn.vector.map((Cn_i) => BN128.toETH(Cn_i.right)),
              C.vector.map((C_i) => BN128.toETH(C_i.left)),
              BN128.toETH(D),
              epoch,
              fee,
              BN128.toETH(result.BA.point),
              BN128.toETH(result.BS.point),
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
    const bDiffMCL = new mcl.Fr();
    bDiffMCL.setInt(bDiff);
    const feeMCL = new mcl.Fr();
    feeMCL.setInt(fee);
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

    const Phi = Array.from({ length: n }).map(() => ElGamal.commit(pub));

    result.CnG = Array.from({ length: n }).map((_, k) =>
      Cn.multiExponentiate(poly[k]).add(Phi[k]),
    );
    result.y_0G = Array.from({ length: n }).map((_, k) => {
      const result = ElGamal.commit(pub);
      result.left = mcl.add(result.left, Y.multiExponentiate(poly[k]));
      return result;
    });
    result.C_XG = Array.from({ length: n }).map((_, k) => {
      const result = ElGamal.commit(D);
      return result.plus(
        mcl.mul(
          mcl.sub(vPow.vector[index], BN128.ONE),
          mcl.mul(poly[k].vector[index], mcl.add(bTransferMCL, feeMCL)),
        ),
      );
    });

    const w = new mcl.Fr();
    w.setBigEndianMod(
      toBytes(
        keccak256(
          encodeAbiParameters(
            [
              { name: "", type: "bytes32" },
              { name: "", type: `bytes32[2][${n}]` },
              { name: "", type: `bytes32[2][${n}]` },
              { name: "", type: `bytes32[2][${n}]` },
              { name: "", type: `bytes32[2][${n}]` },
              { name: "", type: `bytes32[2][${n}]` },
              { name: "", type: `bytes32[2][${n}]` },
            ],
            [
              toHex(v.serialize().reverse()),
              result.CnG.map((CnG_k) => BN128.toETH(CnG_k.left)),
              result.CnG.map((CnG_k) => BN128.toETH(CnG_k.right)),
              result.y_0G.map((y_0G_k) => BN128.toETH(y_0G_k.left)),
              result.y_0G.map((y_0G_k) => BN128.toETH(y_0G_k.right)),
              result.C_XG.map((C_XG_k) => BN128.toETH(C_XG_k.left)),
              result.C_XG.map((C_XG_k) => BN128.toETH(C_XG_k.right)),
            ],
          ),
        ),
      ),
    );

    result.f = b.times(w).add(a);
    result.z_A = mcl.add(result.A.randomness, mcl.mul(result.B.randomness, w));

    const y = new mcl.Fr();
    y.setBigEndianMod(toBytes(keccak256(toHex(w.serialize().reverse()))));

    const ys = new FieldVector([BN128.ONE]);
    for (let i = 1; i < M; i++) {
      // it would be nice to have a nifty functional way of doing this.
      ys.push(mcl.mul(ys.vector[i - 1], y));
    }
    const z = new mcl.Fr();
    z.setBigEndianMod(toBytes(keccak256(toHex(y.serialize().reverse()))));
    const zs = [mcl.sqr(z)];
    const twos = [];
    for (let i = 0; i < M; i++) {
      twos[i] = BN128.ONE;
      for (let j = 0; j < i; j++) twos[i] = mcl.add(twos[i], twos[i]); // 1 << 31 fails.
    }
    const twoTimesZs = new FieldVector(twos).times(zs[0]);

    const lPoly = new FieldVectorPolynomial(aL.plus(mcl.neg(z)), sL);
    const rPoly = new FieldVectorPolynomial(
      ys.hadamard(aR.plus(z)).add(twoTimesZs),
      sR.hadamard(ys),
    );
    const tPolyCoefficients = lPoly.innerProduct(rPoly); // just an array of BN Reds... should be length 3
    result.T_1 = PedersenCommitment.commit(tPolyCoefficients[1]);
    result.T_2 = PedersenCommitment.commit(tPolyCoefficients[2]);

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
              toHex(z.serialize().reverse()),
              BN128.toETH(result.T_1.point),
              BN128.toETH(result.T_2.point),
            ],
          ),
        ),
      ),
    );

    result.tHat = mcl.add(
      mcl.add(tPolyCoefficients[0], mcl.mul(tPolyCoefficients[1], x)),
      mcl.mul(tPolyCoefficients[2], mcl.sqr(x)),
    );
    const tauX = mcl.add(
      mcl.mul(result.T_1.randomness, x),
      mcl.mul(result.T_2.randomness, mcl.sqr(x)),
    );
    result.mu = mcl.add(result.BA.randomness, mcl.mul(result.BS.randomness, x));

    let CRnR = new mcl.G1(); // only need the RHS. this will give us CRnR
    let y_XR = new mcl.G1();
    let psi = new mcl.Fr(); // for gR
    let p = new FieldVector(Array.from({ length: N }).map(() => new mcl.Fr())); // evaluations of poly_0 and poly_1 at w.

    let wPow = BN128.ONE;
    for (let k = 0; k < n; k++) {
      CRnR = mcl.sub(CRnR, mcl.mul(Phi[k].right, wPow));
      psi = mcl.add(psi, mcl.mul(result.y_0G[k].randomness, wPow));
      y_XR = mcl.sub(y_XR, mcl.mul(result.C_XG[k].right, wPow));
      p = p.add(poly[k].times(wPow));
      wPow = mcl.mul(wPow, w);
    }
    p.vector[index] = mcl.add(p.vector[index], wPow);

    CRnR = mcl.add(CRnR, mcl.mul(Cn.vector[index].right, wPow)); // wasting a mult on the left
    const gR = mcl.mul(BN128.BASE, mcl.sub(wPow, psi));
    y_XR = mcl.add(
      y_XR,
      Y.multiExponentiate(p.add(p.negate().plus(wPow).hadamard(vPow))),
    ); // only need the RHS

    const k_sk = BN128.randomScalar();
    const k_r = BN128.randomScalar();
    const k_b = BN128.randomScalar();
    const k_tau = BN128.randomScalar();

    const A_y = mcl.mul(gR, k_sk);
    const A_D = mcl.mul(BN128.BASE, k_r);
    const A_b = mcl.add(
      mcl.mul(ElGamal.base.g, k_b),
      mcl.mul(CRnR, mcl.mul(zs[0], k_sk)),
    ); // el gamal???
    const A_X = mcl.mul(y_XR, k_r); // y_XR.mul(k_r);
    const A_t = mcl.add(
      mcl.mul(PedersenCommitment.base.g, mcl.neg(k_b)),
      mcl.mul(PedersenCommitment.base.h, k_tau),
    );
    const A_u = mcl.mul(BN128.gEpoch(epoch), k_sk);

    result.c = new mcl.Fr();
    result.c.setBigEndianMod(
      toBytes(
        keccak256(
          encodeAbiParameters(
            [
              { name: "", type: "bytes32" },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
              { name: "", type: "bytes32[2]" },
            ],
            [
              toHex(x.serialize().reverse()),
              BN128.toETH(A_y),
              BN128.toETH(A_D),
              BN128.toETH(A_b),
              BN128.toETH(A_X),
              BN128.toETH(A_t),
              BN128.toETH(A_u),
            ],
          ),
        ),
      ),
    );

    result.s_sk = mcl.add(k_sk, mcl.mul(result.c, sk));
    result.s_r = mcl.add(k_r, mcl.mul(result.c, r));
    result.s_b = mcl.add(
      k_b,
      mcl.mul(result.c, mcl.mul(mcl.mul(bDiffMCL, zs[0]), wPow)),
    );
    result.s_tau = mcl.add(k_tau, mcl.mul(result.c, mcl.mul(tauX, wPow)));

    const hOld = PedersenVectorCommitment.base.h;
    const gsOld = PedersenVectorCommitment.base.gs; // horrible hack, but works.
    const hsOld = PedersenVectorCommitment.base.hs;

    const o = new mcl.Fr();
    o.setBigEndianMod(
      toBytes(keccak256(toHex(result.c.serialize().reverse()))),
    );

    PedersenVectorCommitment.base.h = mcl.mul(
      PedersenVectorCommitment.base.h,
      o,
    );
    PedersenVectorCommitment.base.gs = PedersenVectorCommitment.base.gs.slice(
      0,
      32,
    ); // horrible hack, but works.
    PedersenVectorCommitment.base.hs = PedersenVectorCommitment.base.hs
      .slice(0, 32)
      .hadamard(ys.invert());

    const P = new PedersenVectorCommitment(); // P._commit(lPoly.evaluate(x), rPoly.evaluate(x), result.tHat);
    P.gValues = lPoly.evaluate(x);
    P.hValues = rPoly.evaluate(x);
    P.randomness = result.tHat;
    result.ipProof = InnerProductProof.prove(P, o);

    PedersenVectorCommitment.base.h = hOld;
    PedersenVectorCommitment.base.gs = gsOld;
    PedersenVectorCommitment.base.hs = hsOld;
    return result;
  }
}
