// https://docs.optimism.io/stack/transactions/fees#ecotone

export function optimismTxCompressedSize(data) {
  // assumes txData isBytesLike
  data = data.slice(2); // cut off 0x
  let zeroBytes = 0;
  let nonZeroBytes = 0;
  for (let i = 0; i < data.length; i += 2) {
    if (data.slice(i, i + 2) === "00") zeroBytes++;
    else nonZeroBytes++;
  }
  return BigInt((zeroBytes * 4 + nonZeroBytes * 16) >> 4); // floor div by 16
}
