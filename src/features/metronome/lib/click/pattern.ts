import type { Velocity } from '@/lib/velocity'

export const ACCENT_VELOCITY = 0.65

/** Matches `CLAVES_NOMINAL_VELOCITY`, so an even beat plays the sample untouched. */
export const EVEN_VELOCITY = 0.5

export const CLICK_PATTERN: readonly Velocity[] = [
  ACCENT_VELOCITY,
  EVEN_VELOCITY,
  EVEN_VELOCITY,
  EVEN_VELOCITY,
]

export const BEATS_PER_BAR = CLICK_PATTERN.length
