import { ExplorerLink } from "@components/ExplorerLink";
import { FIRN_ABI, READER_ABI } from "@constants/abis";
import { ADDRESSES } from "@constants/addresses";
import { ElGamal, ElGamalVector, N, PointVector } from "@crypto/algebra";
import { BN128 } from "@crypto/bn128";
import { DepositProof } from "@crypto/deposit";
import { TransferProof } from "@crypto/transfer";
import { WithdrawalProof } from "@crypto/withdrawal";
import * as mcl from "mcl-wasm/browser";
import toast from "react-hot-toast";
import { encodeAbiParameters, keccak256, toHex } from "viem";
import { getBlock, readContract } from "wagmi/actions";

import Worker from "./worker.js?worker&inline";

export const EPOCH_LENGTH = 60;

class State {
  constructor(setBalance) {
    // should i be using BNs?
    this.available = 0;
    this.pending = 0;
    this.update = () => {
      // this updates the _main_ form's listed balance.
      // probably here is not the right place for this. revisit...
      setBalance(this.available + this.pending);
    };
  }

  rollOver() {
    // is epoch necessary? will be called async.
    this.available += this.pending;
    this.pending = 0;
  }
}

export class Client {
  constructor({ setBalance, secret, nextEpoch, config }) {
    this.secret = secret;
    this.pub = BN128.toCompressed(mcl.mul(BN128.BASE, this.secret)); // we already computed this elsewhere, but...
    this.nextEpoch = nextEpoch;
    this.config = config;

    this.state = new State(setBalance);
    this.mine = new Set();
    this.banned = false;
    this.initialized = false;
  }

  async initialize(block, present, future) {
    // params won't be retained.
    this.blockNumber = block.number; // slightly after `present` and `future` were fetched?
    this.state.available += await this.readBalance(present);
    this.state.pending += await this.readBalance(future.sub(present));
    // +=, not equal, in case that reading takes long, and we receive funds in the mean time (possibly with a rollover).
    this.state.update(); // could go elsewhere (i.e. above one frame) but doesn't really matter
    this.nextEpoch(block).then((block) => {
      this.state.rollOver();
    });
  }

  async processTransfer({ args, blockNumber, transactionHash }) {
    const { Y, C, D } = args;
    const hash = keccak256(
      encodeAbiParameters(
        [
          { name: "", type: `bytes32[${N}]` },
          { name: "", type: `bytes32[${N}]` },
          { name: "", type: "bytes32" },
        ],
        [Y, C, D],
      ),
    );
    if (this.mine.has(hash)) return; // this.mine.delete(hash);
    this.mine.add(hash); // there seems to be an intermittent and hard-to-reproduce bug where the event fires twice.
    // hard to figure out what's going on---the number of listeners is certifiably 1 at all times.
    // this is basically a cheap measure to prevent it from happening.
    // spuriously picked up a past event!!!!! this happens. need to purposefully dodge it.
    if (blockNumber <= this.blockNumber) return; // or < ??? is state as of end of block, or beginning...?
    const block = await getBlock(this.config, { blockNumber });
    for (const pub of Y) {
      // just to avoid complaining about ignoring async in for each loop
      if (pub !== this.pub) continue;
      const i = Y.indexOf(pub);
      const amount = await this.readBalance(ElGamal.deserialize([C[i], D]));
      if (amount === 0) continue;
      this.state.pending += amount;
      this.state.update(); // update the displayed balance.
      toast.success(
        <span>
          You just received a transfer of {(amount / 1000).toFixed(3)} ETH! You
          can see the transaction at <ExplorerLink hash={transactionHash} />.
        </span>,
      );
      this.nextEpoch(block).then((block) => {
        this.state.rollOver();
      });
    }
  }

  readBalance(account) {
    const exponent = ElGamal.decrypt(account, this.secret);
    if (exponent.isZero()) return Promise.resolve(0);
    const block = 4; // go back to 4, now that we have eth.limo...
    const workers = Array.from({ length: (1 << block) - 1 }).map(
      () => new Worker(),
    );
    return new Promise((resolve) => {
      workers.forEach((worker, i) => {
        worker.onmessage = (event) => {
          workers.forEach((worker) => {
            worker.terminate();
          });
          resolve(event.data);
        };
        worker.postMessage({
          block,
          exponent: exponent.serializeToHexStr(),
          id: i + 1,
        });
      });
    });
  }

  async deposit(amount, name) {
    // only need epoch for simulate accounts?
    const random = new Uint8Array(32);
    self.crypto.getRandomValues(random);
    const anonset = await readContract(this.config, {
      address: ADDRESSES[name].READER,
      abi: READER_ABI,
      functionName: "sampleAnonset",
      args: [toHex(random), 0],
    });

    self.crypto.getRandomValues(random); // below only reads from {1, ..., N - 1}. relying on N ≤ 32?
    for (let i = N - 1; i > 0; i--) {
      const j = random[i] % (i + 1);
      const swap = anonset[j];
      anonset[j] = anonset[i];
      anonset[i] = swap;
    }
    let index;
    for (let i = 0; i < N; i++) {
      // am i or the recipient already in the anonset?
      if (anonset[i] === this.pub) index = i;
    }
    if (index === undefined) {
      index = random[0] & (N - 1);
      anonset[index] = this.pub; // is this secure?
    }
    const Y = new PointVector(anonset.map(BN128.fromCompressed));
    const r = BN128.randomScalar();
    const D = mcl.mul(BN128.BASE, r);
    const C = new ElGamalVector(
      Y.vector.map((pub, i) => {
        let message = new mcl.G1();
        if (i === index) {
          const exponent = new mcl.Fr();
          exponent.setInt(amount);
          message = mcl.mul(ElGamal.base.g, exponent);
        }
        return new ElGamal(mcl.add(message, mcl.mul(pub, r)), D); // wastes a curve addition
      }),
    );
    const proof = DepositProof.prove(Y, C, r, amount, index);
    const hash = keccak256(
      encodeAbiParameters(
        [
          { name: "", type: `bytes32[${N}]` },
          { name: "", type: `bytes32[${N}]` },
          { name: "", type: "bytes32" },
        ],
        [
          Y.vector.map(BN128.toCompressed),
          C.vector.map((ciphertext) => BN128.toCompressed(ciphertext.left)),
          BN128.toCompressed(D),
        ],
      ),
    );
    this.mine.add(hash);
    // outrageous bug where a deposit was picked up as a transfer event on optimism
    // as a workaround, add the above block of code here
    return [
      Y.vector.map(BN128.toCompressed),
      C.vector.map((ciphertext) => BN128.toCompressed(ciphertext.left)),
      BN128.toCompressed(D),
      proof.serialize(),
    ];
  }

  async transfer(recipient, amount, epoch, fee, name) {
    const random = new Uint8Array(32);
    self.crypto.getRandomValues(random);
    const anonset = await readContract(this.config, {
      address: ADDRESSES[name].READER,
      abi: READER_ABI,
      functionName: "sampleAnonset",
      args: [toHex(random), 0],
    });

    self.crypto.getRandomValues(random); // below only reads from {1, ..., N - 1}. relying on N ≤ 32?
    for (let i = N - 1; i > 0; i--) {
      const j = random[i] % (i + 1);
      const swap = anonset[j];
      anonset[j] = anonset[i];
      anonset[i] = swap;
    }
    const index = [];
    for (let i = 0; i < N; i++) {
      // am i or the recipient already in the anonset?
      if (anonset[i] === this.pub) index[0] = i;
      else if (anonset[i] === recipient) index[1] = i;
    }
    if (index[0] === undefined) {
      index[0] = random[0] & (N - 1);
      anonset[index[0]] = this.pub; // is this secure?
    }
    if (index[1] === undefined) {
      while (true) {
        self.crypto.getRandomValues(random); // TODO: only need one byte of randomnesss
        index[1] = random[0] & (N - 1);
        if (index[1] === index[0]) continue;
        anonset[index[1]] = recipient;
        break;
      }
    }
    const accounts = await readContract(this.config, {
      address: ADDRESSES[name].FIRN,
      abi: FIRN_ABI,
      functionName: "simulateAccounts",
      args: [anonset, epoch],
    });
    const Y = new PointVector(anonset.map(BN128.fromCompressed));
    const r = BN128.randomScalar();
    const D = mcl.mul(BN128.BASE, r);
    const C = new ElGamalVector(
      Y.vector.map((y, i) => {
        let message = new mcl.G1();
        if (i === index[0]) {
          const exponent = new mcl.Fr();
          exponent.setInt(-amount - fee);
          message = mcl.mul(ElGamal.base.g, exponent);
        } else if (i === index[1]) {
          const exponent = new mcl.Fr();
          exponent.setInt(amount);
          message = mcl.mul(ElGamal.base.g, exponent);
        }
        return new ElGamal(mcl.add(message, mcl.mul(y, r)), D); // wastes a curve addition
      }),
    );
    const Cn = new ElGamalVector(
      accounts.map((account, i) =>
        ElGamal.deserialize(account).add(C.vector[i]),
      ),
    );
    const u = mcl.mul(BN128.gEpoch(epoch), this.secret);
    const proof = TransferProof.prove(
      Y,
      Cn,
      C,
      epoch,
      this.secret,
      r,
      amount,
      this.state.available - amount - fee,
      index,
      fee,
    );
    const hash = keccak256(
      encodeAbiParameters(
        [
          { name: "", type: `bytes32[${N}]` },
          { name: "", type: `bytes32[${N}]` },
          { name: "", type: "bytes32" },
        ],
        [
          Y.vector.map(BN128.toCompressed),
          C.vector.map((ciphertext) => BN128.toCompressed(ciphertext.left)),
          BN128.toCompressed(D),
        ],
      ),
    );
    this.mine.add(hash);
    // this is a cheap way to "fingerprint" the transactions which are ours, before we release them.
    // it does NOT work to wait until the thing gets submitted, and then to get the hash,
    // because there's a race condition in which the event listener fires first.
    return [
      Y.vector.map(BN128.toCompressed),
      C.vector.map((ciphertext) => BN128.toCompressed(ciphertext.left)),
      BN128.toCompressed(D),
      BN128.toCompressed(u),
      proof.serialize(),
    ];
  }

  async withdraw(amount, epoch, fee, destination, data, name) {
    const random = new Uint8Array(32);
    self.crypto.getRandomValues(random);
    const anonset = await readContract(this.config, {
      address: ADDRESSES[name].READER,
      abi: READER_ABI,
      functionName: "sampleAnonset",
      args: [toHex(random), amount],
    });

    self.crypto.getRandomValues(random); // below only reads from {1, ..., N - 1}. relying on N ≤ 32?
    for (let i = N - 1; i > 0; i--) {
      const j = random[i] % (i + 1);
      const swap = anonset[j];
      anonset[j] = anonset[i];
      anonset[i] = swap;
    }
    let index;
    for (let i = 0; i < N; i++) {
      // am i or the recipient already in the anonset?
      if (anonset[i] === this.pub) index = i;
    }
    if (index === undefined) {
      index = random[0] & (N - 1);
      anonset[index] = this.pub; // is this secure?
    }
    const accounts = await readContract(this.config, {
      address: ADDRESSES[name].FIRN,
      abi: FIRN_ABI,
      functionName: "simulateAccounts",
      args: [anonset, epoch],
    });
    const Y = new PointVector(anonset.map(BN128.fromCompressed));
    const r = BN128.randomScalar();
    const D = mcl.mul(BN128.BASE, r);
    const C = new ElGamalVector(
      Y.vector.map((pub, i) => {
        let message = new mcl.G1();
        if (i === index) {
          const exponent = new mcl.Fr();
          exponent.setInt(-amount - fee);
          message = mcl.mul(ElGamal.base.g, exponent);
        }
        return new ElGamal(mcl.add(message, mcl.mul(pub, r)), D); // wastes a curve addition
      }),
    );
    const Cn = new ElGamalVector(
      accounts.map((account, i) =>
        ElGamal.deserialize(account).add(C.vector[i]),
      ),
    );
    const u = mcl.mul(BN128.gEpoch(epoch), this.secret);
    const proof = WithdrawalProof.prove(
      Y,
      Cn,
      C,
      epoch,
      this.secret,
      r,
      amount,
      this.state.available - amount - fee,
      index,
      fee,
      destination,
      data,
    );
    return [
      Y.vector.map(BN128.toCompressed),
      C.vector.map((ciphertext) => BN128.toCompressed(ciphertext.left)),
      BN128.toCompressed(D),
      BN128.toCompressed(u),
      proof.serialize(),
    ];
  }
}
