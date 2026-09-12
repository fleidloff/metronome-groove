/** ADR 0010's six invariants, executable. */

import { stepSeconds } from '@/lib/steps'
import { DYNAMIC_RANGE_DB, type Velocity } from '@/lib/velocity'
import type { Hit, VoiceName } from '../transport/source'
import { hitsAt } from './cycle'
import type { GrooveDefinition } from './grooves/definition'
import { createGrooveSource } from './source'

export interface InvariantOptions {
  readonly ghostVelocity?: Velocity
}

export const CYCLE_BARS: readonly (readonly [string, number])[] = [
  ['bar 1/3, ordinary', 0],
  ['bar 2, the light one', 1],
  ['bar 4, the fill', 3],
]

const FILL_BAR = 3

/**
 * Kit voices a groove's lines play but its `voices` does not declare. An
 * undeclared voice is never decoded, so `audioClock` drops the hit in silence:
 * no error, no failing type, no failing test.
 */
export function undeclaredVoices(groove: GrooveDefinition): readonly string[] {
  const declared = new Set<string>(groove.voices)
  const played = new Set<string>(
    [...groove.ordinary.flat(), ...groove.light, ...groove.fill]
      .map((line) => line.voice)
      .filter((voice) => voice !== 'claves'),
  )

  return [...played].filter((voice) => !declared.has(voice)).sort()
}

export function sixInvariantViolations(
  groove: GrooveDefinition,
  { ghostVelocity }: InvariantOptions = {},
): readonly string[] {
  const found: string[] = []

  for (const [name, index] of CYCLE_BARS) {
    const bar = barOf(groove, index)
    const ordinary = ordinaryBarOf(groove, index % groove.ordinary.length)

    found.push(
      ...downbeatKick(name, bar),
      ...noHoleInTheSubdivision(groove, name, bar),
      ...firstHalfOrdinary(groove, name, bar, ordinary),
      ...everyOpenHatClosed(name, bar),
      ...hatLadder(groove, name, bar),
    )
  }

  found.push(...contentNotGrid(groove), ...fillSnareLadder(groove, ghostVelocity))

  return found
}

const barOf = (groove: GrooveDefinition, barIndex: number): readonly (readonly Hit[])[] =>
  Array.from({ length: groove.steps }, (_, step) =>
    hitsAt(groove, barIndex * groove.steps + step, true),
  )

const ordinaryBarOf = (
  groove: GrooveDefinition,
  phase: number,
): readonly (readonly Hit[])[] =>
  Array.from({ length: groove.steps }, (_, step) =>
    hitsAt(groove, phase * groove.steps + step, false),
  )

const stepsOf = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits, step) => (hits.some((hit) => hit.voice === voice) ? [step] : []))

const velocitiesOf = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits) => hits.filter((hit) => hit.voice === voice).map((hit) => hit.velocity))

/** ADR 0010, invariant 1. */
function downbeatKick(name: string, bar: readonly (readonly Hit[])[]): readonly string[] {
  const sounds = bar[0].some((hit) => hit.voice === 'kick' && hit.velocity === 0.95)

  return sounds ? [] : [`1. ${name}: step 0 has no kick at 0.95`]
}

/** ADR 0010, invariant 2. */
function noHoleInTheSubdivision(
  groove: GrooveDefinition,
  name: string,
  bar: readonly (readonly Hit[])[],
): readonly string[] {
  const stride = groove.steps / groove.subdivision

  if (!Number.isInteger(stride) || stride < 1) {
    return [`2. ${name}: subdivision ${groove.subdivision} does not divide a ${groove.steps}-step bar`]
  }

  return bar.flatMap((hits, step) =>
    step % stride === 0 && hits.length === 0
      ? [`2. ${name}: step ${step} is a hole in the stated 1/${groove.subdivision}`]
      : [],
  )
}

/** ADR 0010, invariant 3. */
function firstHalfOrdinary(
  groove: GrooveDefinition,
  name: string,
  bar: readonly (readonly Hit[])[],
  ordinary: readonly (readonly Hit[])[],
): readonly string[] {
  const half = groove.steps / 2

  return bar.slice(0, half).flatMap((hits, step) =>
    JSON.stringify(hits) === JSON.stringify(ordinary[step])
      ? []
      : [`3. ${name}: step ${step} departs from the ordinary figure before the half bar`],
  )
}

/** ADR 0010, invariant 4. */
function contentNotGrid(groove: GrooveDefinition): readonly string[] {
  const on = createGrooveSource(groove, { variations: () => true })
  const off = createGrooveSource(groove, { variations: () => false })
  const seconds = stepSeconds(100, groove.steps)
  const found: string[] = []

  if (on.steps !== off.steps || on.steps !== groove.steps) {
    found.push('4. the variations flag changes the step count')
  }

  for (let step = 0; step < groove.steps * 4; step += 1) {
    for (const hit of on.hitsAt(step)) {
      if (on.displace?.(hit, step, seconds) !== off.displace?.(hit, step, seconds)) {
        found.push(`4. step ${step}: the variations flag moves ${hit.voice} in time`)
      }
      if (on.trim?.(hit, step) !== off.trim?.(hit, step)) {
        found.push(`4. step ${step}: the variations flag changes ${hit.voice}'s trim`)
      }
      if (on.takeStep?.(step) !== off.takeStep?.(step)) {
        found.push(`4. step ${step}: the variations flag changes which take sounds`)
      }
    }
  }

  return found
}

/** ADR 0010, invariant 5. */
function everyOpenHatClosed(name: string, bar: readonly (readonly Hit[])[]): readonly string[] {
  const closed = stepsOf(bar, 'hatClosed')

  return stepsOf(bar, 'hatOpen').flatMap((open) =>
    closed.some((step) => step > open)
      ? []
      : [`5. ${name}: the open hat on step ${open} is never closed inside the bar`],
  )
}

/** ADR 0010, invariant 6, for the hat. */
function hatLadder(
  groove: GrooveDefinition,
  name: string,
  bar: readonly (readonly Hit[])[],
): readonly string[] {
  const rungs = [...new Set(velocitiesOf(bar, 'hatClosed'))].sort((a, b) => a - b)

  if (rungs.length === 1) return []

  if (rungs.length === 0) {
    return [`6. ${name}: the closed hat states no rung at all, so the bar has no ladder`]
  }

  return ladderViolations(groove, `6. ${name}: the hat ladder`, rungs)
}

/** ADR 0010, invariant 6, for the fill. */
function fillSnareLadder(
  groove: GrooveDefinition,
  ghostVelocity: Velocity | undefined,
): readonly string[] {
  const bar = barOf(groove, FILL_BAR)
  const contour = velocitiesOf(bar.slice(groove.steps / 2), 'snare').filter(
    (velocity) => velocity !== ghostVelocity,
  )

  if (contour.length < 2) {
    return ['6. bar 4, the fill: the snare states no contour in the second half of the bar']
  }

  return ladderViolations(groove, "6. the fill's snare", contour)
}

function ladderViolations(
  groove: GrooveDefinition,
  what: string,
  contour: readonly number[],
): readonly string[] {
  const worstCaseJitterDb = 2 * DYNAMIC_RANGE_DB * groove.humanize.velocityJitter

  return contour.flatMap((velocity, i) => {
    if (i === 0) return []

    const stepDb = Math.abs(DYNAMIC_RANGE_DB * (velocity - contour[i - 1]))

    // Binary floating point puts 40 × (0.7 − 0.62) a hair under 3.2.
    return stepDb >= worstCaseJitterDb - 1e-9
      ? []
      : [`${what}: ${contour[i - 1]} -> ${velocity} is ${stepDb.toFixed(2)} dB, under a ladder step`]
  })
}
