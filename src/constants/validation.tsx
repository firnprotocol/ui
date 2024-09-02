import { isAddress, isHex } from "viem";

export const DEFAULT_VALUES = {
  // todo: handle tuples...
  bool: {
    placeholder: "false", // we could even do a checkbox for this one...
    validator: (value) => {
      if (value === "false" || value === "true") return "";
      return "Entered value is not a boolean.";
    },
    parser: (value) => value === "true",
    stringifier: (value) => (value ? "true" : "false"),
  },
  address: {
    placeholder: "0x0000000000000000000000000000000000000000",
    validator: (value) => {
      if (isAddress(value)) return "";
      return "Entered text is not a valid Ethereum address.";
    },
    parser: (value) => value,
    stringifier: (value) => value,
  },
  string: {
    placeholder: "a string",
    validator: (value) => {
      return ""; // currently do no validation.
    },
    parser: (value) => value,
    stringifier: (value) => value,
  },
  bytes: {
    placeholder: "0x",
    validator: (value) => {
      if (isHex(value) && (value.length & 1) === 0) return "";
      return "Value must be a 0x-prefixed hex string with an even number of hexits.";
    },
    parser: (value) => value,
    stringifier: (value) => value,
  },
};

for (let i = 1; i <= 32; i++) {
  DEFAULT_VALUES[`uint${i * 8}`] = {
    placeholder: "0",
    validator: (value) => {
      if (!/^\d+$/.test(value)) return "Value must be a nonnegative integer.";
      if (BigInt(value) >= 1n << (BigInt(i) * 8n))
        return "The value you've inputted overflows this integer type.";
      return "";
    },
    parser: (value) => value,
    stringifier: (value) => value.toString(),
  };
  DEFAULT_VALUES[`int${i * 8}`] = {
    placeholder: "0",
    validator: (value) => {
      if (!/^-?\d+$/.test(value)) return "Value must be an integer.";
      if (BigInt(value) >= 1n << (BigInt(i) * 8n - 1n))
        return "The value you've inputted overflows this integer type.";
      if (BigInt(value) + (1n << (BigInt(i) * 8n - 1n)) < 0)
        return "The value you've inputted underflows this integer type.";
      return "";
    },
    parser: (value) => value,
    stringifier: (value) => value.toString(),
  };
  DEFAULT_VALUES[`bytes${i}`] = {
    placeholder: `0x${"00".repeat(i)}`,
    validator: (value) => {
      const regexp = new RegExp(`^0x[a-fA-F0-9]{${2 * i}}$`);
      if (regexp.test(value)) return "";
      return `Must be a 0x-prefixed, ${2 * i}-character hex string.`;
    },
    parser: (value) => value,
    stringifier: (value) => value,
  };
}

DEFAULT_VALUES.uint = DEFAULT_VALUES.uint256;
DEFAULT_VALUES.int = DEFAULT_VALUES.int256;
DEFAULT_VALUES.function = DEFAULT_VALUES.bytes24;

const parseArray = (input) => {
  // false (not array), true (var-length array) or length
  const match = input.type.match(/\[\d*?]$/g);
  if (match === null) return { result: false };
  const baseType = input.type.slice(0, input.type.length - match[0].length);
  const result = {
    result: true,
    baseType: { type: baseType, components: input.components },
    length: -1,
  };
  const number = match[0].slice(1, match[0].length - 1);
  if (number !== "") result.length = Number(number);
  return result;
};

export function placeholder(input) {
  const { result, baseType, length } = parseArray(input);
  if (result) {
    const child = placeholder(baseType);
    if (length === -1) return `[${child}, ..., ${child}]`;
    return `[${Array.from({ length })
      .map(() => child)
      .join(", ")}]`;
  }
  if (input.type === "tuple") {
    return `(${input.components.map((component) => placeholder(component)).join(", ")})`;
  }
  if (!(input.type in DEFAULT_VALUES))
    throw `The type "${input.type}" is unrecognized.`;

  return DEFAULT_VALUES[input.type].placeholder;
}

export function namer(input) {
  // gives a "fancy" type name for tuples and whatnot.
  const { result, baseType, length } = parseArray(input);
  if (result) {
    const child = namer(baseType);
    if (length === -1) return `${child}[]`;
    return `${child}[${length}]`;
  }
  if (input.type === "tuple") {
    return `tuple(${input.components.map((component) => namer(component)).join(", ")})`;
  }
  return input.type;
}

export function parser(input, value) {
  const { result, baseType, length } = parseArray(input);
  if (result) {
    if (value[0] !== "[" || value[value.length - 1] !== "]") {
      throw "Input must be an array.";
    }
    const array = splitter(value.slice(1, value.length - 1).replace(/\s/g, ""));
    if (length !== -1 && array.length !== length)
      throw "Array is of the wrong length.";
    return array.map((element) => parser(baseType, element));
  }
  if (input.type === "tuple") {
    if (value[0] !== "(" || value[value.length - 1] !== ")") {
      throw "Input must be a tuple.";
    }
    const tuple = splitter(value.slice(1, value.length - 1).replace(/\s/g, ""));
    if (tuple.length !== input.components.length)
      throw "Tuple has the wrong number of components.";
    return tuple.map((element, index) =>
      parser(input.components[index], element),
    );
  }
  if (!(input.type in DEFAULT_VALUES))
    throw `The type "${input.type}" is unrecognized.`; // this can prob never execute, since we check first

  if (input.type !== "string" && value.length === 0)
    throw "Input must be nonempty.";
  const helper = DEFAULT_VALUES[input.type].validator(value);
  if (helper !== "") throw helper;
  return DEFAULT_VALUES[input.type].parser(value); // shit that we need this, only nontrivial for bool
}

export function stringifier(input, value) {
  const { result, baseType, length } = parseArray(input);
  if (result) {
    return `[${value.map((element) => stringifier(baseType, element)).join(", ")}]`;
  }
  if (input.type === "tuple") {
    return `(${input.components.map((component) => stringifier(component, value[component.name])).join(", ")})`;
  }
  return DEFAULT_VALUES[input.type].stringifier(value);
}

function splitter(value) {
  if (value === "") return [];
  const counts = { parenthesis: 0, bracket: 0 };
  let alternate = value;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") counts.parenthesis++;
    if (value[i] === ")") counts.parenthesis--;
    if (value[i] === "[") counts.bracket++;
    if (value[i] === "]") counts.bracket--;
    if (counts.parenthesis < 0 || counts.bracket < 0)
      throw "Input is malformed.";
    if (counts.parenthesis === 0 && counts.bracket === 0 && value[i] === ",") {
      alternate = `${alternate.slice(0, i)}|${alternate.slice(i + 1)}`; // trouble if this shows up in the value...
    }
  }
  return alternate.split("|");
}
