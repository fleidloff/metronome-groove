/**
 * Straight funk, as data. The ordinary bar is `docs/music.md` §2's 16th funk
 * with two corrections V6 froze; V8 added the light bar and the fill around it.
 * Every number here is V6's and V8's unchanged — V10 moved the file, not the
 * sound.
 */

import { STEPS_PER_BAR } from '@/lib/steps'
import type { Humanize } from '../../transport/source'
import type { GrooveDefinition, Line } from './definition'

/**
 * 22 dB under the backbeat. `docs/music.md`'s 0.15–0.25 is calibrated for a
 * linear gain law; on this repo's decibel-linear curve 0.20 is 28 dB down,
 * past where a ghost still carries information.
 */
export const GHOST_VELOCITY = 0.37

/**
 * Shared by every groove, and named for the one it was written for. Rock uses
 * the same three numbers — on a 16-step bar its bound is funk's arithmetic
 * exactly — so a second record would be a second thing to drift.
 */
export const STRAIGHT_FUNK_HUMANIZE: Humanize = {
  timingFractionOfStep: 0.03,
  timingCeilingMs: 4,
  velocityJitter: 0.04,
}

/**
 * Zero, and declared rather than omitted.
 *
 * *Straight* is the antonym of *swung*, so a feel named straight funk that
 * swung would contradict its own name — and at 0.18 on a sixteenth grid every
 * odd step moves, which is all three ghosts, the kick on step 3 and eight of
 * the hats. The constant exists so that trying 0.18 by ear is a value change
 * and a test rather than a new mechanism.
 */
export const STRAIGHT_FUNK_SWING = 0

/**
 * Fixed rather than drawn at start-up. The displacement of every hit is a pure
 * function of `(seed, voice, step)`, so a constant seed is what makes the
 * groove sound the same on Tuesday as it did on Monday — which is what a
 * listening pass needs in order to be worth anything. A caller may pass its
 * own to hear a different set of imperfections from the same figure.
 */
export const STRAIGHT_FUNK_SEED = 0x5f_75_6e_6b

/**
 * The closed hat sits out step 14, which is the open hat's: one hi-hat cannot
 * be open and closed at the same instant.
 */
const ORDINARY: readonly Line[] = [
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

/**
 * Bar 2, the light one. Two edits and nothing else: neither states a new
 * position, and no step falls silent.
 *
 * Step 10 is a **substitution**, not an addition — one hi-hat cannot be open
 * and closed at the same instant, so the closed hat gives up the step it held.
 * Step 15 raises a ghost that was going to sound anyway.
 */
const LIGHT: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [10] },
  { voice: 'kick', velocity: 0.82, steps: [3] },
  { voice: 'snare', velocity: 0.92, steps: [4, 12] },
  { voice: 'snare', velocity: GHOST_VELOCITY, steps: [7, 9] },
  { voice: 'snare', velocity: 0.66, steps: [15] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6] },
  { voice: 'hatClosed', velocity: 0.66, steps: [1, 3, 5, 7, 9, 11, 13, 15] },
  { voice: 'hatOpen', velocity: 0.88, steps: [14] },
  { voice: 'hatOpen', velocity: 0.76, steps: [10] },
]

/**
 * Bar 4, the fill. Steps 0–7 are the ordinary figure, written out rather than
 * spliced in: a bar is one set of lines, and the invariant that keeps the first
 * half ordinary is asserted rather than arranged.
 *
 * The hat stopping is the gesture: the only voice that plays in nearly every
 * step of every bar is absent for seven of them, which is the largest signal a
 * four-voice kit can make. The snare takes over the hat's own dynamic
 * hierarchy — beat > "&" > "a", ghost on the "e" — one ladder step higher in
 * cell 2 than in cell 1, and step 15 is the one note that breaks it.
 */
const FILL: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.82, steps: [3] },
  { voice: 'snare', velocity: 0.92, steps: [4] },
  { voice: 'snare', velocity: GHOST_VELOCITY, steps: [7, 9, 13] },
  { voice: 'snare', velocity: 0.78, steps: [8, 14] },
  { voice: 'snare', velocity: 0.7, steps: [10] },
  { voice: 'snare', velocity: 0.62, steps: [11] },
  { voice: 'snare', velocity: 0.86, steps: [12] },
  { voice: 'snare', velocity: 0.94, steps: [15] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6] },
  { voice: 'hatClosed', velocity: 0.66, steps: [1, 3, 5, 7] },
]

export const STRAIGHT_FUNK: GrooveDefinition = {
  id: 'straight-funk',
  steps: STEPS_PER_BAR,
  subdivision: STEPS_PER_BAR,
  seed: STRAIGHT_FUNK_SEED,
  swing: STRAIGHT_FUNK_SWING,
  humanize: STRAIGHT_FUNK_HUMANIZE,
  ordinary: ORDINARY,
  light: LIGHT,
  fill: FILL,
}
