/**
 * Timing and gain displacement for a groove. The click never reaches this.
 *
 * Every value is a pure hash of `(seed, voice, step)` — never a walk, never an
 * accumulator, never a stateful stream. That is what holds the user's one
 * condition, that the beat "is not completely drifting apart but always coming
 * back together": each hit is computed from its own true grid position, so the
 * groove is pulled back to the grid on every note rather than wandering from
 * it. It is also what makes a run identical under any lookahead windowing and
 * across a backgrounded tab, which a walk is not.
 */

import { DYNAMIC_RANGE_DB } from '@/lib/velocity'
import type { Humanize, VoiceName } from '../transport/source'

export const STRAIGHT_FUNK_HUMANIZE: Humanize = {
  timingFractionOfStep: 0.03,
  timingCeilingMs: 4,
  velocityJitter: 0.04,
}

/** Seconds. A fraction of the step, capped: 3% is 11 ms at 40 bpm and 2.5 ms
 *  at 180, so the fraction alone would be loose where a step is long. */
export function timingBound(humanize: Humanize, stepSeconds: number): number {
  return Math.min(humanize.timingFractionOfStep * stepSeconds, humanize.timingCeilingMs / 1000)
}

/** Seconds, in [−bound, +bound]. Pure in its arguments. */
export function timingOffset(
  humanize: Humanize,
  seed: number,
  voice: VoiceName,
  step: number,
  stepSeconds: number,
): number {
  return signedUnit(seed, voice, step, 0) * timingBound(humanize, stepSeconds)
}

/**
 * A gain multiplier, applied *after* the layer has been selected. Jittering
 * the velocity instead would let a hit near a layer boundary flicker between
 * timbres from bar to bar. The jitter is a velocity displacement read through
 * the same decibel-linear curve as every other velocity in this repo, so 0.04
 * means here what it means everywhere.
 */
export function gainTrim(
  humanize: Humanize,
  seed: number,
  voice: VoiceName,
  step: number,
): number {
  const displacement = signedUnit(seed, voice, step, 1) * humanize.velocityJitter

  return 10 ** ((DYNAMIC_RANGE_DB * displacement) / 20)
}

/**
 * Which alternate of `count` a hit takes. Indexes the **absolute** step: a
 * bar-local index would make a one-bar loop bit-identical every bar forever,
 * where absolute gives three alternates on a 16-step bar a period of
 * lcm(3, 16) = 48 steps, three bars.
 */
export function roundRobinIndex(step: number, count: number): number {
  return ((step % count) + count) % count
}

/** [−1, 1), uniform. `stream` separates the timing draw from the gain draw. */
function signedUnit(seed: number, voice: VoiceName, step: number, stream: number): number {
  return (hash(seed, voice, step, stream) / 0x100000000) * 2 - 1
}

function hash(seed: number, voice: VoiceName, step: number, stream: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b)

  for (let i = 0; i < voice.length; i += 1) {
    h = Math.imul(h ^ voice.charCodeAt(i), 0xc2b2ae35)
  }

  h = Math.imul(h ^ step, 0x27d4eb2f)
  h = Math.imul(h ^ stream, 0x165667b1)
  h ^= h >>> 15
  h = Math.imul(h, 0x2545f491)
  h ^= h >>> 13

  return h >>> 0
}
