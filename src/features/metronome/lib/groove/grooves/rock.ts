/**
 * Rock. `docs/music.md` §2's straight 8th rock, written out in
 * `specs/10-rock-groove/spec.md` § The three bars — the frozen tables this
 * file transcribes.
 *
 * It is written on the sixteen-step grid and **states eighths**: the odd steps
 * are rests by declaration, which is what `subdivision` records. The eight
 * empty steps are free capacity only bar 4 spends, so the fill doubles the
 * subdivision without touching the grid — ADR 0010's invariant 4.
 */

import { STEPS_PER_BAR } from '@/lib/steps'
import type { GrooveDefinition, Line } from './definition'
import { STRAIGHT_FUNK_HUMANIZE } from './straightFunk'

/**
 * The whole bar line is `kick` 0.95 against 0.86 — 3.60 dB. Every other
 * element repeats at half a bar, so with the two equal the figure states a
 * two-beat loop and the downbeat is inaudible.
 */
const ORDINARY: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [8] },
  { voice: 'snare', velocity: 0.95, steps: [4, 12] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.82, steps: [2, 6, 10, 14] },
]

/**
 * Bar 2, the light one. One edit: step 10 is a **substitution**, since one
 * hi-hat cannot be open and closed at the same instant. Step 14 is not
 * available — rock's step 15 is empty, so an open hat there would have no
 * closed hat after it inside the bar and invariant 5 would fail.
 */
const LIGHT: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [8] },
  { voice: 'snare', velocity: 0.95, steps: [4, 12] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.82, steps: [2, 6, 14] },
  { voice: 'hatOpen', velocity: 0.8, steps: [10] },
]

/**
 * Bar 4, the fill. Where funk subtracts, rock **adds**: the subdivision
 * doubles to sixteenths over the last six steps. The kick keeps time
 * underneath on 8 and 12, and the arrival is the next downbeat rather than
 * step 15 — the backbeat at 0.95 leaves no rung above it.
 *
 * The crescendo is two interleaved ladders a rung apart, the accents landing
 * on the eighths the groove states.
 *
 * The hat rides the departure rather than sitting out: step 10 fires the same
 * `hatOpen` at the same level as bar 2's, so the light bar reads as a one-note
 * preview of the fill. The closed hat on step 12 is **not** decoration — ADR
 * 0010's invariant 5 requires an open hat to be followed by a closed one inside
 * its own bar, and step 12 is the only position that keeps the ring to one
 * eighth, as bar 2's is. Step 14 would give the longest open hat in the app.
 */
const FILL: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [8, 12] },
  { voice: 'snare', velocity: 0.95, steps: [4] },
  { voice: 'snare', velocity: 0.7, steps: [10, 13] },
  { voice: 'snare', velocity: 0.62, steps: [11] },
  { voice: 'snare', velocity: 0.78, steps: [12, 15] },
  { voice: 'snare', velocity: 0.86, steps: [14] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.82, steps: [2, 6] },
  { voice: 'hatOpen', velocity: 0.8, steps: [10] },
]

export const ROCK: GrooveDefinition = {
  id: 'rock',
  steps: STEPS_PER_BAR,
  subdivision: 8,
  /** Differs from funk's `0x5f_75_6e_6b`; only its being fixed is musical. */
  seed: 0x5f_72_6f_63,
  swing: 0,
  humanize: STRAIGHT_FUNK_HUMANIZE,
  ordinary: ORDINARY,
  light: LIGHT,
  fill: FILL,
}
