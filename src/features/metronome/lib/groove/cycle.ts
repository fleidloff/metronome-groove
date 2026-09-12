/**
 * The four-bar cycle, over any groove's data. Nothing here knows which groove
 * it is reading: the lines, the swing, the seed and the humanize record all
 * live in `grooves/`, and this file only says how a bar becomes hits and which
 * bar an absolute step falls in.
 */

import type { Hit } from '../transport/source'
import { type GrooveDefinition, type Line, VOICE_ORDER } from './grooves/definition'

export const BARS_PER_CYCLE = 4

/**
 * Which bar of the cycle an absolute step falls in: 0 ordinary, 1 the light
 * one, 2 ordinary, 3 the fill. Derived from the step and never stored, which is
 * what keeps the figure stateless.
 */
export function barIndexFor(step: number, stepsPerBar: number): number {
  const bar = Math.floor(step / stepsPerBar)

  return ((bar % BARS_PER_CYCLE) + BARS_PER_CYCLE) % BARS_PER_CYCLE
}

const barOf = (lines: readonly Line[], steps: number): readonly (readonly Hit[])[] =>
  Array.from({ length: steps }, (_, step) =>
    lines
      .filter((line) => line.steps.includes(step))
      .map(({ voice, velocity }) => ({ voice, velocity }))
      .sort((a, b) => VOICE_ORDER.indexOf(a.voice) - VOICE_ORDER.indexOf(b.voice)),
  )

type Cycle = readonly (readonly (readonly Hit[])[])[]

/** Built once per definition. The scheduler asks for every step of every bar,
 *  and a definition is a frozen constant, so the bars are worth keeping. */
const cycles = new WeakMap<GrooveDefinition, Cycle>()

function cycleFor(groove: GrooveDefinition): Cycle {
  const cached = cycles.get(groove)
  if (cached) return cached

  const ordinary = barOf(groove.ordinary, groove.steps)
  const cycle: Cycle = [
    ordinary,
    barOf(groove.light, groove.steps),
    ordinary,
    barOf(groove.fill, groove.steps),
  ]

  cycles.set(groove, cycle)

  return cycle
}

/**
 * Takes the absolute step, so the caller never tracks where the bar started —
 * and so `variations` can change which hits a step carries without ever
 * touching the indexing that take selection and humanize both read.
 */
export function hitsAt(
  groove: GrooveDefinition,
  step: number,
  variations = false,
): readonly Hit[] {
  const cycle = cycleFor(groove)
  const bar = variations ? cycle[barIndexFor(step, groove.steps)] : cycle[0]
  const inBar = ((step % groove.steps) + groove.steps) % groove.steps

  return bar[inBar]
}
