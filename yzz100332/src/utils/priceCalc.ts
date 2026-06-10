import { toFixed2 } from "./id";

export function calcExpectedBoxPrice(
  jinPrice: number,
  boxSpec: number,
  memberDiscount = 1
): number {
  if (jinPrice <= 0 || boxSpec <= 0) return 0;
  return toFixed2(jinPrice * boxSpec * memberDiscount);
}

export function calcExpectedJinPrice(
  boxPrice: number,
  boxSpec: number,
  memberDiscount = 1
): number {
  if (boxPrice <= 0 || boxSpec <= 0) return 0;
  const denom = boxSpec * memberDiscount;
  if (denom <= 0) return 0;
  return toFixed2(boxPrice / denom);
}

export function calcMemberPrice(jinPrice: number, memberDiscount: number): number {
  if (jinPrice <= 0) return 0;
  return toFixed2(jinPrice * memberDiscount);
}

export function priceDiffPct(actual: number, expected: number): number {
  if (expected <= 0) return 0;
  return ((actual - expected) / expected) * 100;
}
