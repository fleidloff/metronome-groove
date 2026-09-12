export const DYNAMIC_RANGE_DB = 40

export const MAX_BOOST = 2.0

export type Velocity = number

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function curve(v: Velocity): number {
  if (v <= 0) return 0
  return 10 ** ((DYNAMIC_RANGE_DB * (clamp01(v) - 1)) / 20)
}

export function gainFor(v: Velocity, vRef: Velocity): number {
  if (v <= 0) return 0
  const reference = curve(vRef)
  if (reference <= 0) return 0
  return Math.min(curve(v) / reference, MAX_BOOST)
}
