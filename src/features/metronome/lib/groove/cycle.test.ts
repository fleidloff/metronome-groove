import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Hit, SourceId } from '../transport/source'
import * as cycle from './cycle'
import { BARS_PER_CYCLE, FILL_BAR, LIGHT_BAR, barIndexFor, hitsAt } from './cycle'
import { type GrooveDefinition, type Line, VOICE_ORDER } from './grooves/definition'
import { CYCLE_BARS, sixInvariantViolations, undeclaredVoices } from './invariants'
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

describe('the eight-bar cycle', () => {
  it('runs three ordinary bars, the light one, three more, then the fill', () => {
    expect(BARS_PER_CYCLE).toBe(8)
    expect(LIGHT_BAR).toBe(3)
    expect(FILL_BAR).toBe(7)
    expect(Array.from({ length: 16 }, (_, bar) => barIndexFor(bar * 16, 16))).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7,
    ])
  })

  it('marks the fourth and eighth bars, and leaves the other six ordinary', () => {
    const ordinaryBars = Array.from({ length: BARS_PER_CYCLE }, (_, bar) => bar).filter(
      (bar) => bar !== LIGHT_BAR && bar !== FILL_BAR,
    )

    expect(ordinaryBars).toEqual([0, 1, 2, 4, 5, 6])

    for (const bar of ordinaryBars) {
      expect(barAt(FIXTURE, bar), `bar ${bar} departs from the figure`).toEqual(ORDINARY_BAR)
    }

    expect(barAt(FIXTURE, LIGHT_BAR)).not.toEqual(ORDINARY_BAR)
    expect(barAt(FIXTURE, FILL_BAR)).not.toEqual(ORDINARY_BAR)
    expect(barAt(FIXTURE, LIGHT_BAR)).not.toEqual(barAt(FIXTURE, FILL_BAR))
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
    expect(barIndexFor(16, 4)).toBe(4)
    expect(barIndexFor(4 * BARS_PER_CYCLE, 4)).toBe(0)
  })

  it('puts the step before the downbeat in the bar before it, never in bar -1', () => {
    expect(barIndexFor(-1, 16)).toBe(BARS_PER_CYCLE - 1)
    expect(barIndexFor(-16, 16)).toBe(BARS_PER_CYCLE - 1)
    expect(barIndexFor(-17, 16)).toBe(BARS_PER_CYCLE - 2)
    expect(barIndexFor(-16 * BARS_PER_CYCLE, 16)).toBe(0)
  })

  it('hands a step its hits in voice order, whatever order the lines are written in', () => {
    expect(barAt(FIXTURE, 0)).toEqual(ORDINARY_BAR)
    expect(hitsAt(FIXTURE, FIXTURE.steps * FILL_BAR + 2, true)).toEqual([
      { voice: 'snare', velocity: 0.7 },
    ])
  })

  it('states the ordinary figure three times before anything changes', () => {
    for (let bar = 0; bar < LIGHT_BAR; bar += 1) {
      expect(barAt(FIXTURE, bar), `bar ${bar}`).toEqual(ORDINARY_BAR)
    }

    expect(barAt(FIXTURE, LIGHT_BAR)).not.toEqual(ORDINARY_BAR)
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
      'FILL_BAR',
      'LIGHT_BAR',
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

    expect(numbered(violations, 1)).toEqual([`1. bar ${FILL_BAR + 1}, the fill: step 0 has no kick at 0.95`])
  })

  it('2. fails a bar that opens a hole in the subdivision it states', () => {
    const violations = sixInvariantViolations(
      mutated({ fill: without(FIXTURE.fill, 'snare', 3) }),
    )

    expect(numbered(violations, 2)).toEqual([
      `2. bar ${FILL_BAR + 1}, the fill: step 3 is a hole in the stated 1/4`,
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
      `3. bar ${FILL_BAR + 1}, the fill: step 1 departs from the ordinary figure before the half bar`,
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
      `5. bar ${LIGHT_BAR + 1}, the light one: the open hat on step 3 is never closed inside the bar`,
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
      `6. the ordinary bars: the closed hat states no rung at all, so the bar has no ladder`,
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
    expect(
      violations.every((violation) => violation.includes(`bar ${LIGHT_BAR + 1}`)),
    ).toBe(true)
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


describe('the eight-bar cycle, over every groove the app can select', () => {
  const barOfGroove = (groove: GrooveDefinition, bar: number, variations: boolean) =>
    Array.from({ length: groove.steps }, (_, step) =>
      hitsAt(groove, bar * groove.steps + step, variations),
    )

  const ordinaryOf = (groove: GrooveDefinition, bar: number) =>
    barOfGroove(groove, bar, false)

  it.each(EVERY_GROOVE_BY_NAME)('marks bars %s at the light bar and the fill, nowhere else', (_id, groove) => {
    for (let bar = 0; bar < BARS_PER_CYCLE * 2; bar += 1) {
      const index = bar % BARS_PER_CYCLE
      const played = barOfGroove(groove, bar, true)

      if (index === LIGHT_BAR || index === FILL_BAR) {
        expect(played, `bar ${bar} should depart`).not.toEqual(ordinaryOf(groove, bar))
      } else {
        expect(played, `bar ${bar} should be ordinary`).toEqual(ordinaryOf(groove, bar))
      }
    }
  })

  /**
   * V8's guarantee, and the one this change must not spend. The expected bar is
   * built straight from the definition's `Line`s rather than fetched back
   * through `hitsAt`, so this is a golden rather than a restatement: comparing
   * `hitsAt` against itself would prove only that the off render is periodic,
   * and would still pass if the phase it reads were wrong.
   */
  it.each(EVERY_GROOVE_BY_NAME)('renders %s from its own definition with variations off', (_id, groove) => {
    const fromDefinition = groove.ordinary.map((lines) =>
      Array.from({ length: groove.steps }, (_, step) =>
        lines
          .filter((line) => line.steps.includes(step))
          .map(({ voice, velocity }) => ({ voice, velocity }))
          .sort((a, b) => VOICE_ORDER.indexOf(a.voice) - VOICE_ORDER.indexOf(b.voice)),
      ),
    )

    for (let step = 0; step < groove.steps * BARS_PER_CYCLE * 2; step += 1) {
      const phase = Math.floor(step / groove.steps) % groove.ordinary.length
      const inBar = step % groove.steps

      expect(hitsAt(groove, step, false), `step ${step}`).toEqual(fromDefinition[phase][inBar])
    }
  })

  it.each(EVERY_GROOVE_BY_NAME)('gives %s two marked bars in eight, not four', (_id, groove) => {
    const departures = Array.from({ length: BARS_PER_CYCLE }, (_, bar) => bar).filter(
      (bar) => JSON.stringify(barOfGroove(groove, bar, true)) !== JSON.stringify(ordinaryOf(groove, bar)),
    )

    expect(departures).toEqual([LIGHT_BAR, FILL_BAR])
  })

  it('reads the two indices from cycle.ts rather than keeping a second copy', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/metronome/lib/groove/invariants.ts'),
      'utf8',
    )

    expect(source).toMatch(/import \{[^}]*FILL_BAR[^}]*\} from '.\/cycle'/u)
    expect(source).toMatch(/import \{[^}]*LIGHT_BAR[^}]*\} from '.\/cycle'/u)
    expect(source).not.toMatch(/^const (FILL|LIGHT)_BAR = /mu)

    expect(CYCLE_BARS.map(([, index]) => index)).toEqual([0, LIGHT_BAR, FILL_BAR])
    expect(CYCLE_BARS[1][0]).toContain(String(LIGHT_BAR + 1))
    expect(CYCLE_BARS[2][0]).toContain(String(FILL_BAR + 1))
  })
})
