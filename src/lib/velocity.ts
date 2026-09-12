/**
 * What a velocity means, in gain.
 *
 * This is domain rather than product: a velocity scale is true of struck
 * instruments whether or not this app exists, which is the bar `src/lib/` sets.
 */

/** Decibels between silence and full scale. A struck percussion instrument
 *  covers roughly this from a ghost tap to a hard stroke. */
export const DYNAMIC_RANGE_DB = 40

/** Gain ceiling over a sample's recorded level: +6.02 dB. Above this you are
 *  faking a dynamic the sample does not contain — a harder strike is brighter,
 *  not merely louder, and gain cannot produce that. */
export const MAX_BOOST = 2.0

export type Velocity = number

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/**
 * Raw curve, relative to full scale. Decibel-linear, so every +0.1 of velocity
 * is the same perceived step — the sampler-convention square law spends only
 * 12 dB on the whole upper half of the range.
 */
export function curve(v: Velocity): number {
  if (v <= 0) return 0
  return 10 ** ((DYNAMIC_RANGE_DB * (clamp01(v) - 1)) / 20)
}

/**
 * Gain for a note, relative to the nominal velocity of the layer selected.
 * Depends only on the distance `v - vRef`, which is what makes it compose once
 * voices with several velocity layers arrive: layers carry timbre and the
 * recorded level difference, and this only trims.
 */
export function gainFor(v: Velocity, vRef: Velocity): number {
  if (v <= 0) return 0
  const reference = curve(vRef)
  if (reference <= 0) return 0
  return Math.min(curve(v) / reference, MAX_BOOST)
}
