import type { Hit } from '../transport/source'
import { type GrooveDefinition, type Line, VOICE_ORDER } from './grooves/definition'

export const BARS_PER_CYCLE = 4

const absoluteBar = (step: number, stepsPerBar: number) =>
  Math.floor(step / stepsPerBar)

const wrap = (value: number, modulus: number) => ((value % modulus) + modulus) % modulus

export function barIndexFor(step: number, stepsPerBar: number): number {
  return wrap(absoluteBar(step, stepsPerBar), BARS_PER_CYCLE)
}

export function phaseFor(step: number, groove: GrooveDefinition): number {
  return wrap(absoluteBar(step, groove.steps), groove.ordinary.length)
}

const barOf = (lines: readonly Line[], steps: number): readonly (readonly Hit[])[] =>
  Array.from({ length: steps }, (_, step) =>
    lines
      .filter((line) => line.steps.includes(step))
      .map(({ voice, velocity }) => ({ voice, velocity }))
      .sort((a, b) => VOICE_ORDER.indexOf(a.voice) - VOICE_ORDER.indexOf(b.voice)),
  )

type Cycle = readonly (readonly (readonly Hit[])[])[]

const cycles = new WeakMap<GrooveDefinition, Bars>()

interface Bars {
  readonly ordinary: Cycle
  readonly light: readonly (readonly Hit[])[]
  readonly fill: readonly (readonly Hit[])[]
}

function barsFor(groove: GrooveDefinition): Bars {
  const cached = cycles.get(groove)
  if (cached) return cached

  const bars: Bars = {
    ordinary: groove.ordinary.map((lines) => barOf(lines, groove.steps)),
    light: barOf(groove.light, groove.steps),
    fill: barOf(groove.fill, groove.steps),
  }

  cycles.set(groove, bars)

  return bars
}

export function hitsAt(
  groove: GrooveDefinition,
  step: number,
  variations = false,
): readonly Hit[] {
  const bars = barsFor(groove)
  const stated = bars.ordinary[phaseFor(step, groove)]

  const marked = [stated, bars.light, stated, bars.fill]
  const bar = variations ? marked[barIndexFor(step, groove.steps)] : stated
  const inBar = wrap(step, groove.steps)

  return bar[inBar]
}
