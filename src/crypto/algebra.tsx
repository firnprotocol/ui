import { BN128 } from "@crypto/bn128";
import * as mcl from "mcl-wasm/browser";
import { encodePacked, keccak256, stringToHex } from "viem";

export const n = 4;
export const N = 1 << n;
export const m = 5;
export const M = 1 << m;

export class PedersenCommitment {
  static base = {
    g: undefined,
    h: undefined,
  };

  // point = BN128.zero
  static commit(value) {
    // an already-reduced BN
    const result = new PedersenCommitment();
    result.randomness = BN128.randomScalar(); // feels weirdly asymmetric that we have to stash this, and not the randomnesss
    result.point = mcl.add(
      mcl.mul(PedersenCommitment.base.g, value),
      mcl.mul(PedersenCommitment.base.h, result.randomness),
    );
    return result; // i guess????
  }
}

export class FieldVector {
  constructor(vector) {
    this.vector = vector;
  }

  length() {
    return this.vector.length;
  }

  slice(begin, end) {
    return new FieldVector(this.vector.slice(begin, end));
  }

  flip() {
    return new FieldVector(
      Array.from({ length: this.length() }).map(
        (_, i) => this.vector[(this.length() - i) % this.length()],
      ),
    );
  }

  add(other) {
    return new FieldVector(
      other.vector.map((elem, i) => mcl.add(this.vector[i], elem)),
    );
  }

  negate() {
    return new FieldVector(this.vector.map((elem) => mcl.neg(elem)));
  }

  plus(constant) {
    return new FieldVector(this.vector.map((elem) => mcl.add(elem, constant)));
  }

  push(constant) {
    this.vector.push(constant);
  }

  sum() {
    return this.vector.reduce(
      (accum, cur) => mcl.add(accum, cur),
      new mcl.Fr(),
    );
  }

  hadamard(other) {
    return new FieldVector(
      other.vector.map((elem, i) => mcl.mul(this.vector[i], elem)),
    );
  }

  invert() {
    return new FieldVector(this.vector.map((elem) => mcl.inv(elem)));
  }

  times(constant) {
    return new FieldVector(this.vector.map((elem) => mcl.mul(elem, constant)));
  }

  innerProduct(other) {
    return other.vector.reduce(
      (accum, cur, i) => mcl.add(accum, mcl.mul(this.vector[i], cur)),
      new mcl.Fr(),
    );
  }

  concat(other) {
    return new FieldVector(this.vector.concat(other.vector));
  }
}

export class PointVector {
  constructor(vector) {
    this.vector = vector;
  }

  length() {
    return this.vector.length;
  }

  slice(begin, end) {
    return new PointVector(this.vector.slice(begin, end));
  }

  flip() {
    return new PointVector(
      Array.from({ length: this.length() }).map(
        (_, i) => this.vector[(this.length() - i) % this.length()],
      ),
    );
  }

  negate() {
    return new PointVector(this.vector.map((elem) => mcl.neg(elem)));
  }

  multiExponentiate(exponents) {
    return mcl.mulVec(this.vector, exponents.vector);
  }

  sum() {
    return this.vector.reduce(
      (accum, cur) => mcl.add(accum, cur),
      new mcl.G1(),
    );
  }

  add(other) {
    return new PointVector(
      other.vector.map((elem, i) => mcl.add(this.vector[i], elem)),
    );
  }

  hadamard(exponents) {
    return new PointVector(
      exponents.vector.map((elem, i) => mcl.mul(this.vector[i], elem)),
    );
  }

  times(constant) {
    return new PointVector(this.vector.map((elem) => mcl.mul(elem, constant)));
  }

  concat(other) {
    return new PointVector(this.vector.concat(other.vector));
  }
}

export class PedersenVectorCommitment {
  static base = {
    // hardcode length 64 for zether
    gs: undefined,
    hs: undefined,
    h: undefined,
  };

  static commit(gValues, hValues) {
    // vectors of already-reduced BNs
    const result = new PedersenVectorCommitment();
    result.gValues = gValues;
    result.hValues = hValues;
    result.randomness = BN128.randomScalar();
    result.point = mcl.mul(PedersenVectorCommitment.base.h, result.randomness);
    result.point = mcl.add(
      result.point,
      PedersenVectorCommitment.base.gs
        .slice(0, gValues.length())
        .multiExponentiate(gValues),
    );
    result.point = mcl.add(
      result.point,
      PedersenVectorCommitment.base.hs
        .slice(0, hValues.length())
        .multiExponentiate(hValues),
    );
    // the hacky-ass slices are necessary for the case of withdrawals, where gValues and hValues are shorter.
    return result;
  }
}

export class ElGamal {
  static base = {
    g: undefined,
  };

  constructor(left, right) {
    this.left = left;
    this.right = right;
  }

  static deserialize(account) {
    return new ElGamal(
      BN128.fromCompressed(account[0]),
      BN128.fromCompressed(account[1]),
    );
  }

  static commit(pub) {
    // this is only ever called with value 0! save a mul and an add.
    const result = new ElGamal(new mcl.G1(), new mcl.G1());
    result.randomness = BN128.randomScalar();
    result.left = mcl.mul(pub, result.randomness);
    result.right = mcl.mul(BN128.BASE, result.randomness);
    return result;
  }

  static decrypt(account, secret) {
    return mcl.sub(account.left, mcl.mul(account.right, secret));
  }

  zero() {
    return this.left.isZero() && this.right.isZero();
  }

  add(other) {
    return new ElGamal(
      this.left === undefined ? undefined : mcl.add(this.left, other.left),
      mcl.add(this.right, other.right),
    );
  }

  sub(other) {
    return this.add(other.neg());
  }

  mul(scalar) {
    return new ElGamal(mcl.mul(this.left, scalar), mcl.mul(this.right, scalar));
  }

  neg() {
    return new ElGamal(mcl.neg(this.left), mcl.neg(this.right));
  }

  plus(constant) {
    return new ElGamal(
      mcl.add(this.left, mcl.mul(ElGamal.base.g, constant)),
      this.right,
    );
  }
}

export class ElGamalVector {
  constructor(vector) {
    this.vector = vector;
  }

  multiExponentiate(exponents) {
    return new ElGamal(
      mcl.mulVec(
        this.vector.map((elem) => elem.left),
        exponents.vector,
      ),
      mcl.mulVec(
        this.vector.map((elem) => elem.right),
        exponents.vector,
      ),
    );
  }
}

export class Polynomial {
  constructor(coefficients) {
    this.coefficients = coefficients; // vector of coefficients, _little_ endian.
  }

  mul(other) {
    // i assume that other has coeffs.length == 2, and monic if linear.
    const result = this.coefficients.map((coefficient) =>
      mcl.mul(coefficient, other.coefficients[0]),
    );
    result.push(new mcl.Fr());
    if (other.coefficients[1].isOne())
      this.coefficients.forEach(
        (elem, i) => (result[i + 1] = mcl.add(result[i + 1], elem)),
      );
    return new Polynomial(result);
  }
}

export class FieldVectorPolynomial {
  constructor(...coefficients) {
    // an array of fieldvectors (2 in practice, but could be arbitrary).
    this.coefficients = coefficients; // this can be made private
  }

  evaluate(x) {
    let result = this.coefficients[0];
    let accumulator = x;
    this.coefficients.slice(1).forEach((coefficient) => {
      result = result.add(coefficient.times(accumulator));
      accumulator = mcl.mul(accumulator, x);
    });
    return result;
  }

  innerProduct(other) {
    const result = Array(
      this.coefficients.length + other.coefficients.length - 1,
    ).fill(new mcl.Fr());
    this.coefficients.forEach((mine, i) => {
      other.coefficients.forEach((theirs, j) => {
        result[i + j] = mcl.add(result[i + j], mine.innerProduct(theirs));
      });
    });
    return result; // just a plain array?
  }
}

export function recursivePolynomials(list, a, b) {
  if (a.length === 0) return list;
  const aTop = a.pop();
  const bTop = b.pop();
  const left = new Polynomial([mcl.neg(aTop), mcl.sub(BN128.ONE, bTop)]); // X - f_k(X)
  const right = new Polynomial([aTop, bTop]); // f_k(X)
  for (let i = 0; i < list.length; i++)
    list[i] = [list[i].mul(left), list[i].mul(right)];
  return recursivePolynomials(list.flat(), a, b);
}

export const algebra = BN128.promise.then(() => {
  PedersenCommitment.base.g = BN128.BASE;
  PedersenCommitment.base.h = BN128.mapInto(keccak256(stringToHex("h")));
  PedersenVectorCommitment.base.gs = new PointVector(
    Array.from({ length: M << 1 }).map((_, i) =>
      BN128.mapInto(keccak256(encodePacked(["string", "uint256"], ["g", i]))),
    ),
  );
  PedersenVectorCommitment.base.hs = new PointVector(
    Array.from({ length: M << 1 }).map((_, i) =>
      BN128.mapInto(keccak256(encodePacked(["string", "uint256"], ["h", i]))),
    ),
  );
  PedersenVectorCommitment.base.h = BN128.mapInto(keccak256(stringToHex("h")));
  ElGamal.base.g = PedersenCommitment.base.g;
});
