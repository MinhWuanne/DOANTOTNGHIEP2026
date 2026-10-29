
export function parsePositiveId(
  id: string,
): bigint {
  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error("INVALID_ID");
  }

  return BigInt(id);
}

