/**
 * Straight funk, one bar, no variations. The figure is `docs/music.md` §2's
 * 16th funk with two corrections the tech spec froze — see below.
 */

import { STEPS_PER_BAR } from '@/lib/steps'
import type { Velocity } from '@/lib/velocity'
import type { Hit, VoiceName } from '../transport/source'

export const STRAIGHT_FUNK_STEPS = STEPS_PER_BAR

/**
 * 22 dB under the backbeat. `docs/music.md`'s 0.15–0.25 is calibrated for a
 * linear gain law; on this repo's decibel-linear curve 0.20 is 28 dB down,
 * past where a ghost still carries information.
 */
export const GHOST_VELOCITY = 0.37

interface Line {
  readonly voice: VoiceName
  readonly velocity: Velocity
  readonly steps: readonly number[]
}

/** The order the voices are written in is the order a step hands them out. */
const VOICE_ORDER: readonly VoiceName[] = ['kick', 'snare', 'hatClosed', 'hatOpen']

/**
 * The closed hat sits out step 14, which is the open hat's: one hi-hat cannot
 * be open and closed at the same instant.
 */
const LINES: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [10] },
  { voice: 'kick', velocity: 0.82, steps: [3] },
  { voice: 'snare', velocity: 0.92, steps: [4, 12] },
  { voice: 'snare', velocity: GHOST_VELOCITY, steps: [7, 9, 15] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6, 10] },
  { voice: 'hatClosed', velocity: 0.66, steps: [1, 3, 5, 7, 9, 11, 13, 15] },
  { voice: 'hatOpen', velocity: 0.88, steps: [14] },
]

const BAR: readonly (readonly Hit[])[] = Array.from(
  { length: STRAIGHT_FUNK_STEPS },
  (_, step) =>
    LINES.filter((line) => line.steps.includes(step))
      .map(({ voice, velocity }) => ({ voice, velocity }))
      .sort((a, b) => VOICE_ORDER.indexOf(a.voice) - VOICE_ORDER.indexOf(b.voice)),
)

/** Takes the absolute step, so the caller never tracks where the bar started. */
export function hitsAt(step: number): readonly Hit[] {
  return BAR[((step % STRAIGHT_FUNK_STEPS) + STRAIGHT_FUNK_STEPS) % STRAIGHT_FUNK_STEPS]
}
