import type { Velocity } from '@/lib/velocity'

/** +6.0 dB over the even beats: a doubling of amplitude, the canonical accent. */
export const ACCENT_VELOCITY = 0.65

/** Claves' own nominal velocity, so an even beat plays the sample untouched. */
export const EVEN_VELOCITY = 0.5

/** The accent is a pattern against the curve, never a branch on beat number.
 *  A groove later passes a different array and nothing else changes. */
export const CLICK_PATTERN: readonly Velocity[] = [
  ACCENT_VELOCITY,
  EVEN_VELOCITY,
  EVEN_VELOCITY,
  EVEN_VELOCITY,
]

export const BEATS_PER_BAR = CLICK_PATTERN.length
