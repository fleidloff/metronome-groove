import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Hit, SourceId } from '../transport/source'
import * as cycle from './cycle'
import { BARS_PER_CYCLE, barIndexFor, hitsAt } from './cycle'
import type { GrooveDefinition, Line } from './grooves/definition'
import { sixInvariantViolations, undeclaredVoices } from './invariants'
import { BOSSA_NOVA } from './grooves/bossaNova'
import { ROCK } from './grooves/rock'
import { SECOND_LINE } from './grooves/secondLine'
import { SHUFFLE } from './grooves/shuffle'
import { STRAIGHT_FUNK } from './grooves/straightFunk'

/** Typed as `useClickTransport`'s `GROOVES` is, so a groove the app can select
 *  and this file does not run the rulebook over is a compile error. */
const EVERY_GROOVE: Record<Exclude<SourceId, 'click'>, GrooveDefinition> = {
  'bossa-nova': BOSSA_NOVA,
  rock: ROCK,
  shuffle: SHUFFLE,
  'straight-funk': STRAIGHT_FUNK,
  'second-line': SECOND_LINE,
}

const EVERY_GROOVE_BY_NAME = Object.entries(EVERY_GROOVE)

const FIXTURE: GrooveDefinition = {
  id: 'straight-funk',
  steps: 4,
  subdivision: 4,
  seed: 7,
  swing: 0,
  humanize: {
    timingFractionOfStep: 0.03,
    timingCeilingMs: 4,
    velocityJitter: 0.04,
    exactVoices: [],
  },
  voices: ['kick', 'hatClosed'],
  ordinary: [
    [
      { voice: 'kick', velocity: 0.95, steps: [0] },
      { voice: 'hatClosed', velocity: 0.9, steps: [0, 2] },
      { voice: 'hatClosed', velocity: 0.82, steps: [1, 3] },
    ],
  ],
  light: [
    { voice: 'kick', velocity: 0.95, steps: [0] },
    { voice: 'hatClosed', velocity: 0.9, steps: [0] },
    { voice: 'hatClosed', velocity: 0.82, steps: [1, 3] },
    { voice: 'hatOpen', velocity: 0.8, steps: [2] },
  ],
  fill: [
    { voice: 'kick', velocity: 0.95, steps: [0] },
    { voice: 'hatClosed', velocity: 0.9, steps: [0] },
    { voice: 'hatClosed', velocity: 0.82, steps: [1] },
    { voice: 'snare', velocity: 0.7, steps: [2] },
    { voice: 'snare', velocity: 0.78, steps: [3] },
  ],
}

const ORDINARY_BAR: readonly (readonly Hit[])[] = [
  [
    { voice: 'kick', velocity: 0.95 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [{ voice: 'hatClosed', velocity: 0.82 }],
  [{ voice: 'hatClosed', velocity: 0.9 }],
  [{ voice: 'hatClosed', velocity: 0.82 }],
]

const barAt = (groove: GrooveDefinition, barIndex: number) =>
  Array.from({ length: groove.steps }, (_, step) =>
    hitsAt(groove, barIndex * groove.steps + step, true),
  )

const mutated = (
  changes: Partial<Pick<GrooveDefinition, 'ordinary' | 'light' | 'fill' | 'subdivision'>>,
): GrooveDefinition => ({ ...FIXTURE, ...changes })

const without = (lines: readonly Line[], voice: string, at: number): readonly Line[] =>
  lines.map((line) =>
    line.voice === voice ? { ...line, steps: line.steps.filter((step) => step !== at) } : line,
  )

const numbered = (violations: readonly string[], invariant: number) =>
  violations.filter((violation) => violation.startsWith(`${invariant}.`))

describe('the four-bar cycle', () => {
  it('runs ordinary, light, ordinary, fill over the absolute step', () => {
    expect(BARS_PER_CYCLE).toBe(4)
    expect(Array.from({ length: 8 }, (_, bar) => barIndexFor(bar * 16, 16))).toEqual([
      0, 1, 2, 3, 0, 1, 2, 3,
    ])
  })

  it('holds the bar index for every step inside the bar', () => {
    for (let step = 0; step < 16 * BARS_PER_CYCLE * 2; step += 1) {
      expect(barIndexFor(step, 16)).toBe(Math.floor(step / 16) % BARS_PER_CYCLE)
    }
  })

  it('counts bars the same way at a four-step bar as at a sixteen-step one', () => {
    expect(Array.from({ length: 8 }, (_, step) => barIndexFor(step, 4))).toEqual([
      0, 0, 0, 0, 1, 1, 1, 1,
    ])
    expect(barIndexFor(16, 4)).toBe(0)
  })

  it('puts the step before the downbeat in the bar before it, never in bar -1', () => {
    expect(barIndexFor(-1, 16)).toBe(3)
    expect(barIndexFor(-16, 16)).toBe(3)
    expect(barIndexFor(-17, 16)).toBe(2)
    expect(barIndexFor(-16 * BARS_PER_CYCLE, 16)).toBe(0)
  })

  it('hands a step its hits in voice order, whatever order the lines are written in', () => {
    expect(barAt(FIXTURE, 0)).toEqual(ORDINARY_BAR)
    expect(hitsAt(FIXTURE, FIXTURE.steps * 3 + 2, true)).toEqual([
      { voice: 'snare', velocity: 0.7 },
    ])
  })

  it('states the ordinary figure twice before anything changes', () => {
    expect(barAt(FIXTURE, 0)).toEqual(ORDINARY_BAR)
    expect(barAt(FIXTURE, 2)).toEqual(ORDINARY_BAR)
    expect(barAt(FIXTURE, 1)).not.toEqual(ORDINARY_BAR)
    expect(barAt(FIXTURE, 3)).not.toEqual(ORDINARY_BAR)
  })

  it('repeats the cycle, not the bar, for steps beyond it', () => {
    const period = FIXTURE.steps * BARS_PER_CYCLE

    for (let step = -period; step < period * 3; step += 1) {
      expect(hitsAt(FIXTURE, step, true)).toEqual(
        hitsAt(FIXTURE, ((step % period) + period) % period, true),
      )
    }
  })

  it('plays the ordinary bar forever with variations off, and defaults to off', () => {
    for (let step = 0; step < FIXTURE.steps * BARS_PER_CYCLE * 3; step += 1) {
      expect(hitsAt(FIXTURE, step, false), `step ${step}`).toEqual(
        ORDINARY_BAR[((step % FIXTURE.steps) + FIXTURE.steps) % FIXTURE.steps],
      )
      expect(hitsAt(FIXTURE, step)).toEqual(hitsAt(FIXTURE, step, false))
    }
  })

  it('reaches nothing that could change stepSeconds, swing, the seed or the humanize bound', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/metronome/lib/groove/cycle.ts'),
      'utf8',
    )
    const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, path]) => path)

    expect([...new Set(imports)].sort()).toEqual(['../transport/source', './grooves/definition'])
    expect(Object.keys(cycle).sort()).toEqual([
      'BARS_PER_CYCLE',
      'barIndexFor',
      'hitsAt',
      'phaseFor',
    ])
  })
})

describe("ADR 0010's six invariants, as a check any groove can run", () => {
  it('passes a figure that keeps all six', () => {
    expect(sixInvariantViolations(FIXTURE)).toEqual([])
  })

  it('1. fails a bar that loses the downbeat kick', () => {
    const violations = sixInvariantViolations(mutated({ fill: without(FIXTURE.fill, 'kick', 0) }))

    expect(numbered(violations, 1)).toEqual(['1. bar 4, the fill: step 0 has no kick at 0.95'])
  })

  it('2. fails a bar that opens a hole in the subdivision it states', () => {
    const violations = sixInvariantViolations(
      mutated({ fill: without(FIXTURE.fill, 'snare', 3) }),
    )

    expect(numbered(violations, 2)).toEqual([
      '2. bar 4, the fill: step 3 is a hole in the stated 1/4',
    ])
  })

  it('2. calls a position between the stated steps a rest, not a hole', () => {
    const eighths = mutated({
      subdivision: 2,
      ordinary: [without(FIXTURE.ordinary[0], 'hatClosed', 1)],
      light: without(FIXTURE.light, 'hatClosed', 1),
      fill: without(FIXTURE.fill, 'hatClosed', 1),
    })

    expect(numbered(sixInvariantViolations(eighths), 2)).toEqual([])
    expect(numbered(sixInvariantViolations({ ...eighths, subdivision: 4 }), 2)).toHaveLength(3)
  })

  it('2. refuses a subdivision the bar cannot state', () => {
    expect(numbered(sixInvariantViolations(mutated({ subdivision: 3 })), 2)).toHaveLength(3)
  })

  it('3. fails a bar that departs before the half bar', () => {
    const violations = sixInvariantViolations(mutated({ fill: without(FIXTURE.fill, 'hatClosed', 1) }))

    expect(numbered(violations, 3)).toEqual([
      '3. bar 4, the fill: step 1 departs from the ordinary figure before the half bar',
    ])
  })

  it('4. holds the grid, the swing, the seed and the take across the flag', () => {
    expect(numbered(sixInvariantViolations(FIXTURE), 4)).toEqual([])
  })

  it('5. fails an open hat that is never closed inside its bar', () => {
    const violations = sixInvariantViolations(
      mutated({
        light: [
          ...without(FIXTURE.light, 'hatOpen', 2),
          { voice: 'hatOpen', velocity: 0.8, steps: [3] },
        ],
      }),
    )

    expect(numbered(violations, 5)).toEqual([
      '5. bar 2, the light one: the open hat on step 3 is never closed inside the bar',
    ])
  })

  it('6. fails a contour jitter could reverse', () => {
    const violations = sixInvariantViolations(
      mutated({
        fill: [
          ...without(FIXTURE.fill, 'snare', 2),
          { voice: 'snare', velocity: 0.76, steps: [2] },
        ],
      }),
    )

    expect(numbered(violations, 6)).toEqual([
      "6. the fill's snare: 0.76 -> 0.78 is 0.80 dB, under a ladder step",
    ])
  })

  it('6. fails a hat that states no ladder at all, rather than passing an empty one', () => {
    const violations = sixInvariantViolations(
      mutated({ ordinary: [[{ voice: 'kick', velocity: 0.95, steps: [0, 1, 2, 3] }]] }),
    )

    expect(numbered(violations, 6)).toContain(
      '6. bar 1/3, ordinary: the closed hat states no rung at all, so the bar has no ladder',
    )
  })

  it('6. passes a flat hat, because one value has no adjacent pair to compare', () => {
    const flat = (lines: readonly Line[]): readonly Line[] => [
      ...lines.filter((line) => line.voice !== 'hatClosed'),
      { voice: 'hatClosed', velocity: 0.9, steps: [0, 1, 2, 3] },
    ]

    const violations = sixInvariantViolations(
      mutated({
        ordinary: [flat(FIXTURE.ordinary[0])],
        light: flat(FIXTURE.light),
        fill: flat(FIXTURE.fill),
      }),
    )

    expect(numbered(violations, 6)).toEqual([])
  })

  it('3. measures a marked bar against the ordinary bar of its own phase', () => {
    const twoPhase: GrooveDefinition = {
      ...FIXTURE,
      ordinary: [
        FIXTURE.ordinary[0],
        [
          { voice: 'kick', velocity: 0.95, steps: [0] },
          { voice: 'hatClosed', velocity: 0.9, steps: [0, 2] },
          { voice: 'hatClosed', velocity: 0.82, steps: [1, 3] },
          { voice: 'snare', velocity: 0.7, steps: [1] },
        ],
      ],
    }

    const right = { ...twoPhase, light: twoPhase.ordinary[1], fill: twoPhase.ordinary[1] }
    expect(numbered(sixInvariantViolations(right), 3)).toEqual([])

    const wrong = { ...right, light: twoPhase.ordinary[0] }
    const violations = numbered(sixInvariantViolations(wrong), 3)

    expect(violations.length).toBeGreaterThan(0)
    expect(violations.every((violation) => violation.includes('bar 2'))).toBe(true)
  })
})

describe('the rulebook holds for every groove the app can select', () => {
  it.each(EVERY_GROOVE_BY_NAME)('keeps all six invariants in %s', (_id, groove) => {
    expect(sixInvariantViolations(groove)).toEqual([])
  })

  it.each(EVERY_GROOVE_BY_NAME)('answers to the id it is keyed by, in %s', (id, groove) => {
    expect(groove.id).toBe(id)
  })
})

describe('a groove declares every voice it plays', () => {
  it.each(EVERY_GROOVE_BY_NAME)('holds for %s', (_id, groove) => {
    expect(undeclaredVoices(groove)).toEqual([])
  })

  it('names a voice the lines play and the declaration leaves out', () => {
    const underDeclared = { ...ROCK, voices: ['kick', 'snare'] as const }

    expect(undeclaredVoices(underDeclared)).toEqual(['hatClosed', 'hatOpen'])
  })

  it('ignores the claves, which no groove declares and every bank holds', () => {
    expect(undeclaredVoices(BOSSA_NOVA)).toEqual([])
    expect(BOSSA_NOVA.voices).not.toContain('claves')
  })
})
