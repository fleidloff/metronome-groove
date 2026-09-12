/**
 * Straight funk. The ordinary bar is `docs/music.md` §2's 16th funk with two
 * corrections V6 froze; V8 adds a four-bar cycle around it — see below.
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

const barOf = (lines: readonly Line[]): readonly (readonly Hit[])[] =>
  Array.from({ length: STRAIGHT_FUNK_STEPS }, (_, step) =>
    lines
      .filter((line) => line.steps.includes(step))
      .map(({ voice, velocity }) => ({ voice, velocity }))
      .sort((a, b) => VOICE_ORDER.indexOf(a.voice) - VOICE_ORDER.indexOf(b.voice)),
  )

const BAR = barOf(LINES)

/** Drops `[voice, step]` pairs from the lines, so an edit can take a step away
 *  from one voice and hand it to another in the same breath. */
const without = (
  lines: readonly Line[],
  dropped: readonly (readonly [VoiceName, number])[],
): readonly Line[] =>
  lines.map((line) => ({
    ...line,
    steps: line.steps.filter(
      (step) => !dropped.some(([voice, at]) => voice === line.voice && at === step),
    ),
  }))

/**
 * Bar 2, the light one. Two edits and nothing else: neither states a new
 * position, and no step falls silent.
 *
 * Step 10 is a **substitution**, not an addition — one hi-hat cannot be open
 * and closed at the same instant, so the closed hat gives up the step it held.
 * Step 15 raises a ghost that was going to sound anyway.
 */
const LIGHT_LINES: readonly Line[] = [
  ...without(LINES, [
    ['hatClosed', 10],
    ['snare', 15],
  ]),
  { voice: 'hatOpen', velocity: 0.76, steps: [10] },
  { voice: 'snare', velocity: 0.66, steps: [15] },
]

const LIGHT_BAR = barOf(LIGHT_LINES)

/** The bar's first half establishes; a one-bar fill lives in the second. */
const FILL_FROM_STEP = 8

/**
 * Bar 4, the fill. The hat stopping is the gesture: the only voice that plays
 * in nearly every step of every bar is absent for seven of them, which is the
 * largest signal a four-voice kit can make. The snare takes over the hat's own
 * dynamic hierarchy — beat > "&" > "a", ghost on the "e" — one ladder step
 * higher in cell 2 than in cell 1, and step 15 is the one note that breaks it.
 */
const FILL_LINES: readonly Line[] = [
  { voice: 'snare', velocity: 0.78, steps: [8, 14] },
  { voice: 'snare', velocity: GHOST_VELOCITY, steps: [9, 13] },
  { voice: 'snare', velocity: 0.7, steps: [10] },
  { voice: 'snare', velocity: 0.62, steps: [11] },
  { voice: 'snare', velocity: 0.86, steps: [12] },
  { voice: 'snare', velocity: 0.94, steps: [15] },
  { voice: 'hatClosed', velocity: 0.9, steps: [8] },
]

const FILL_BAR = barOf(FILL_LINES).map((hits, step) => (step < FILL_FROM_STEP ? BAR[step] : hits))

export const BARS_PER_CYCLE = 4

/**
 * Which bar of the cycle an absolute step falls in: 0 ordinary, 1 the light
 * one, 2 ordinary, 3 the fill. Derived from the step and never stored, which is
 * what keeps the figure stateless.
 */
export function barIndexFor(step: number, stepsPerBar = STRAIGHT_FUNK_STEPS): number {
  const bar = Math.floor(step / stepsPerBar)

  return ((bar % BARS_PER_CYCLE) + BARS_PER_CYCLE) % BARS_PER_CYCLE
}

/** Four bars of `source.steps`, never 64 hard-coded steps: `docs/music.md` §5
 *  Q5 asks whether meter becomes a variable, and this spelling keeps the answer
 *  cheap. */
const CYCLE: readonly (readonly (readonly Hit[])[])[] = [BAR, LIGHT_BAR, BAR, FILL_BAR]

const stepInBar = (step: number) =>
  ((step % STRAIGHT_FUNK_STEPS) + STRAIGHT_FUNK_STEPS) % STRAIGHT_FUNK_STEPS

/**
 * Takes the absolute step, so the caller never tracks where the bar started —
 * and so `variations` can change which hits a step carries without ever
 * touching the indexing that take selection and humanize both read.
 */
export function hitsAt(step: number, variations = false): readonly Hit[] {
  const bar = variations ? CYCLE[barIndexFor(step)] : BAR

  return bar[stepInBar(step)]
}
