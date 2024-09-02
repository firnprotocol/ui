export const FIRN_ABI = [
  {
    inputs: [
      { internalType: "address", name: "deposit_", type: "address" },
      { internalType: "address", name: "transfer_", type: "address" },
      { internalType: "address", name: "withdrawal_", type: "address" },
      { internalType: "address", name: "treasury_", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32[16]",
        name: "Y",
        type: "bytes32[16]",
      },
      {
        indexed: false,
        internalType: "bytes32[16]",
        name: "C",
        type: "bytes32[16]",
      },
      { indexed: false, internalType: "bytes32", name: "D", type: "bytes32" },
      {
        indexed: true,
        internalType: "address",
        name: "source",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "amount",
        type: "uint32",
      },
    ],
    name: "DepositOccurred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "account",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint32",
        name: "amount",
        type: "uint32",
      },
    ],
    name: "RegisterOccurred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32[16]",
        name: "Y",
        type: "bytes32[16]",
      },
      {
        indexed: false,
        internalType: "bytes32[16]",
        name: "C",
        type: "bytes32[16]",
      },
      { indexed: false, internalType: "bytes32", name: "D", type: "bytes32" },
    ],
    name: "TransferOccurred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32[16]",
        name: "Y",
        type: "bytes32[16]",
      },
      {
        indexed: false,
        internalType: "bytes32[16]",
        name: "C",
        type: "bytes32[16]",
      },
      { indexed: false, internalType: "bytes32", name: "D", type: "bytes32" },
      {
        indexed: false,
        internalType: "uint32",
        name: "amount",
        type: "uint32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "destination",
        type: "address",
      },
      { indexed: false, internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "WithdrawalOccurred",
    type: "event",
  },
  {
    inputs: [],
    name: "blackHeight",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32[16]", name: "Y", type: "bytes32[16]" },
      { internalType: "bytes32[16]", name: "C", type: "bytes32[16]" },
      { internalType: "bytes32", name: "D", type: "bytes32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint64", name: "key", type: "uint64" }],
    name: "exists",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "info",
    outputs: [
      { internalType: "uint64", name: "epoch", type: "uint64" },
      { internalType: "uint64", name: "index", type: "uint64" },
      { internalType: "uint64", name: "amount", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint64", name: "epoch", type: "uint64" }],
    name: "lengths",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "", type: "uint64" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "lists",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    name: "nodes",
    outputs: [
      { internalType: "uint64", name: "parent", type: "uint64" },
      { internalType: "uint64", name: "left", type: "uint64" },
      { internalType: "uint64", name: "right", type: "uint64" },
      { internalType: "bool", name: "red", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "Y", type: "bytes32" },
      { internalType: "bytes32[2]", name: "signature", type: "bytes32[2]" },
    ],
    name: "register",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "root",
    outputs: [{ internalType: "uint64", name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32[]", name: "Y", type: "bytes32[]" },
      { internalType: "uint32", name: "epoch", type: "uint32" },
    ],
    name: "simulateAccounts",
    outputs: [
      { internalType: "bytes32[2][]", name: "result", type: "bytes32[2][]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32[16]", name: "Y", type: "bytes32[16]" },
      { internalType: "bytes32[16]", name: "C", type: "bytes32[16]" },
      { internalType: "bytes32", name: "D", type: "bytes32" },
      { internalType: "bytes32", name: "u", type: "bytes32" },
      { internalType: "uint64", name: "epoch", type: "uint64" },
      { internalType: "uint32", name: "tip", type: "uint32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
    ],
    name: "transfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32[16]", name: "Y", type: "bytes32[16]" },
      { internalType: "bytes32[16]", name: "C", type: "bytes32[16]" },
      { internalType: "bytes32", name: "D", type: "bytes32" },
      { internalType: "bytes32", name: "u", type: "bytes32" },
      { internalType: "uint64", name: "epoch", type: "uint64" },
      { internalType: "uint32", name: "amount", type: "uint32" },
      { internalType: "uint32", name: "tip", type: "uint32" },
      { internalType: "bytes", name: "proof", type: "bytes" },
      { internalType: "address", name: "destination", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const READER_ABI = [
  {
    inputs: [{ internalType: "address", name: "firn_", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "seed", type: "bytes32" },
      { internalType: "uint32", name: "amount", type: "uint32" },
    ],
    name: "sampleAnonset",
    outputs: [
      { internalType: "bytes32[16]", name: "result", type: "bytes32[16]" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const TREASURY_ABI = [
  {
    inputs: [{ internalType: "address", name: "erc20_", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Payout",
    type: "event",
  },
  {
    inputs: [],
    name: "payout",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { stateMutability: "payable", type: "receive" },
] as const;

export const ORACLE_ABI = [
  {
    inputs: [],
    name: "blobBaseFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "l1BaseFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ARB_GAS_INFO_ABI = [
  {
    inputs: [],
    name: "getPricesInWei",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
