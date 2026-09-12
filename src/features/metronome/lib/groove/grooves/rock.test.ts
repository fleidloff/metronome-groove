import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '@/lib/steps'
import { DYNAMIC_RANGE_DB, gainFor } from '@/lib/velocity'
import type { Hit, VoiceName } from '../../transport/source'
import { sixInvariantViolations } from '../invariants'
import { type KitVoiceName, layerFor } from '../kit'
import { type Line, VOICE_ORDER } from './definition'
import * as rock from './rock'
import { ROCK } from './rock'
import { KIT_HUMANIZE } from './shared'

const barOf = (lines: readonly Line[]): readonly (readonly Hit[])[] =>
  Array.from({ length: ROCK.steps }, (_, step) =>
    lines
      .filter((line) => line.steps.includes(step))
      .map(({ voice, velocity }) => ({ voice, velocity }))
      .sort((a, b) => VOICE_ORDER.indexOf(a.voice) - VOICE_ORDER.indexOf(b.voice)),
  )

/** `specs/10-rock-groove/spec.md` § The three bars, the ordinary bar, step by step. */
const ORDINARY: readonly (readonly Hit[])[] = [
  [
    { voice: 'kick', velocity: 0.95 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [],
  [{ voice: 'hatClosed', velocity: 0.82 }],
  [],
  [
    { voice: 'snare', velocity: 0.95 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [],
  [{ voice: 'hatClosed', velocity: 0.82 }],
  [],
  [
    { voice: 'kick', velocity: 0.86 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [],
  [{ voice: 'hatClosed', velocity: 0.82 }],
  [],
  [
    { voice: 'snare', velocity: 0.95 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [],
  [{ voice: 'hatClosed', velocity: 0.82 }],
  [],
]

const LIGHT: readonly (readonly Hit[])[] = ORDINARY.map((hits, step) =>
  step === 10 ? [{ voice: 'hatOpen' as VoiceName, velocity: 0.8 }] : hits,
)

const FILL: readonly (readonly Hit[])[] = [
  ...ORDINARY.slice(0, 9),
  [],
  [
    { voice: 'snare', velocity: 0.7 },
    { voice: 'hatOpen', velocity: 0.8 },
  ],
  [{ voice: 'snare', velocity: 0.62 }],
  [
    { voice: 'kick', velocity: 0.86 },
    { voice: 'snare', velocity: 0.78 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [{ voice: 'snare', velocity: 0.7 }],
  [{ voice: 'snare', velocity: 0.86 }],
  [{ voice: 'snare', velocity: 0.78 }],
]

const BARS = [
  ['the ordinary bar', ORDINARY, () => barOf(ROCK.ordinary[0])],
  ['the light bar', LIGHT, () => barOf(ROCK.light)],
  ['the fill bar', FILL, () => barOf(ROCK.fill)],
] as const

const stepsIn = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits, step) => (hits.some((h) => h.voice === voice) ? [step] : []))

const velocitiesIn = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits) => hits.filter((h) => h.voice === voice).map((h) => h.velocity))

const differingSteps = (a: readonly (readonly Hit[])[], b: readonly (readonly Hit[])[]) =>
  a.flatMap((hits, step) => (JSON.stringify(hits) === JSON.stringify(b[step]) ? [] : [step]))

const shiftedBy = (bar: readonly (readonly Hit[])[], offset: number) =>
  bar.map((_, step) => bar[(step + offset) % bar.length])

const renderedDbfs = (voice: KitVoiceName, velocity: number) => {
  const layer = layerFor(voice, velocity)

  return layer.levelDbfs + 20 * Math.log10(gainFor(velocity, layer.nominalVelocity))
}

describe('rock, as a definition', () => {
  it('is written on the sixteen-step grid and states eighths', () => {
    expect(ROCK.steps).toBe(STEPS_PER_BAR)
    expect(ROCK.steps).toBe(16)
    expect(ROCK.subdivision).toBe(8)
  })

  it('is straight, and seeded differently from funk', () => {
    expect(ROCK.swing).toBe(0)
    expect(ROCK.seed).toBe(0x5f_72_6f_63)
    expect(ROCK.seed).not.toBe(0x5f_75_6e_6b)
  })

  it('shares the funk humanize record rather than copying its three numbers', () => {
    expect(ROCK.humanize).toBe(KIT_HUMANIZE)
    expect(ROCK.humanize).toEqual({
      timingFractionOfStep: 0.03,
      timingCeilingMs: 4,
      velocityJitter: 0.04,
      exactVoices: [],
    })
  })

  it('answers to the id the select box will ask for', () => {
    expect(ROCK.id).toBe('rock')
  })
})

describe('the ordinary bar', () => {
  const bar = () => barOf(ROCK.ordinary[0])

  it.each(ORDINARY.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(bar()[step]).toEqual(hits)
    },
  )

  it('rests on every odd step, which is what stating eighths means', () => {
    for (let step = 1; step < ROCK.steps; step += 2) {
      expect(bar()[step], `step ${step} sounds`).toEqual([])
    }
  })

  it('puts the kick on both quarters 1 and 3, and nowhere else', () => {
    expect(stepsIn(bar(), 'kick')).toEqual([0, 8])
  })

  it('puts the backbeat on 4 and 12 at one velocity', () => {
    expect(stepsIn(bar(), 'snare')).toEqual([4, 12])
    expect(velocitiesIn(bar(), 'snare')).toEqual([0.95, 0.95])
  })

  it('plays even eighths on the hat, accented on the quarters', () => {
    expect(stepsIn(bar(), 'hatClosed')).toEqual([0, 2, 4, 6, 8, 10, 12, 14])
    expect(velocitiesIn(bar(), 'hatClosed')).toEqual([0.9, 0.82, 0.9, 0.82, 0.9, 0.82, 0.9, 0.82])
  })

  it('opens no hat and plays no ghost', () => {
    expect(stepsIn(bar(), 'hatOpen')).toEqual([])
    expect(new Set(velocitiesIn(bar(), 'snare'))).toEqual(new Set([0.95]))
  })
})

describe('the bar line, which is the kick velocity and nothing else', () => {
  const bar = () => barOf(ROCK.ordinary[0])

  it('is not invariant under a shift of half a bar', () => {
    const shifted = shiftedBy(bar(), 8)

    expect(shifted).not.toEqual(bar())
    expect(differingSteps(bar(), shifted)).toEqual([0, 8])
  })

  it('would state a two-beat loop with the two kicks equal', () => {
    const flattened = bar().map((hits) =>
      hits.map((hit) => (hit.voice === 'kick' ? { ...hit, velocity: 0.9 } : hit)),
    )

    expect(shiftedBy(flattened, 8)).toEqual(flattened)
  })

  it('carries the whole cue on 3.60 dB, wider than jitter can close', () => {
    const [downbeat, half] = [0, 8].map((step) => velocitiesIn([bar()[step]], 'kick')[0])
    const worstCaseJitterDb = 2 * DYNAMIC_RANGE_DB * ROCK.humanize.velocityJitter

    expect(downbeat).toBe(0.95)
    expect(half).toBe(0.86)
    expect(DYNAMIC_RANGE_DB * (downbeat - half)).toBeCloseTo(3.6, 5)
    expect(DYNAMIC_RANGE_DB * (downbeat - half)).toBeGreaterThan(worstCaseJitterDb)
  })
})

describe('the light bar', () => {
  const bar = () => barOf(ROCK.light)

  it.each(LIGHT.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(bar()[step]).toEqual(hits)
    },
  )

  it('changes exactly one step of the ordinary bar', () => {
    expect(differingSteps(bar(), barOf(ROCK.ordinary[0]))).toEqual([10])
  })

  it('substitutes the open hat on step 10 rather than adding it', () => {
    const voices = bar()[10].map((hit) => hit.voice)

    expect(voices).toContain('hatOpen')
    expect(voices).not.toContain('hatClosed')
    expect(velocitiesIn([bar()[10]], 'hatOpen')).toEqual([0.8])
    expect(velocitiesIn([bar()[10]], 'hatClosed')).toEqual([])
  })

  it('leaves step 14 closed, which is the only other place it could have gone', () => {
    expect(bar()[14]).toEqual([{ voice: 'hatClosed', velocity: 0.82 }])
    expect(stepsIn(bar(), 'hatOpen')).toEqual([10])
  })

  it('lifts the open hat 6.26 dB over the closed hat it displaces, as funk does', () => {
    const lift = renderedDbfs('hatOpen', 0.8) - renderedDbfs('hatClosed', 0.82)

    expect(lift).toBeCloseTo(6.26, 2)
  })
})

describe('the fill bar', () => {
  const bar = () => barOf(ROCK.fill)

  it.each(FILL.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(bar()[step]).toEqual(hits)
    },
  )

  it('states the groove verbatim through step 8 before it departs', () => {
    expect(bar().slice(0, 9)).toEqual(barOf(ROCK.ordinary[0]).slice(0, 9))
  })

  it('rests on step 9, so the doubling starts on the "and" of 3', () => {
    expect(bar()[9]).toEqual([])
  })

  it('runs six snares over 10-15 at the velocities the table gives', () => {
    expect(stepsIn(bar(), 'snare')).toEqual([4, 10, 11, 12, 13, 14, 15])
    expect(velocitiesIn(bar().slice(10), 'snare')).toEqual([0.7, 0.62, 0.78, 0.7, 0.86, 0.78])
  })

  it('keeps time underneath on 8 and 12, equal', () => {
    expect(stepsIn(bar(), 'kick')).toEqual([0, 8, 12])
    expect(velocitiesIn([bar()[8], bar()[12]], 'kick')).toEqual([0.86, 0.86])
  })

  it('opens the hat on step 10, the same event the light bar fires', () => {
    expect(stepsIn(bar(), 'hatOpen')).toEqual([10])
    expect(velocitiesIn([bar()[10]], 'hatOpen')).toEqual(
      velocitiesIn([barOf(ROCK.light)[10]], 'hatOpen'),
    )
  })

  it('closes it again on step 12, which is what invariant 5 requires', () => {
    expect(stepsIn(bar(), 'hatClosed')).toEqual([0, 2, 4, 6, 8, 12])
    expect(velocitiesIn([bar()[12]], 'hatClosed')).toEqual([0.9])
  })

  it('adds no new hat rung, so the ladder is the one the groove already states', () => {
    const rungs = [...new Set(velocitiesIn(bar(), 'hatClosed'))].sort()
    expect(rungs).toEqual([...new Set(velocitiesIn(barOf(ROCK.ordinary[0]), 'hatClosed'))].sort())
  })

  it('crescendos as two interleaved ladders, the accents on the stated eighths', () => {
    const eighths = [10, 12, 14].map((step) => velocitiesIn([bar()[step]], 'snare')[0])
    const sixteenths = [11, 13, 15].map((step) => velocitiesIn([bar()[step]], 'snare')[0])

    expect(eighths).toEqual([0.7, 0.78, 0.86])
    expect(sixteenths).toEqual([0.62, 0.7, 0.78])

    for (const [eighth, sixteenth] of eighths.map((v, i) => [v, sixteenths[i]] as const)) {
      expect(DYNAMIC_RANGE_DB * (eighth - sixteenth)).toBeCloseTo(3.2, 5)
    }
  })

  it('demotes the backbeat rather than removing it, 6.82 dB down', () => {
    const backbeat = renderedDbfs('snare', 0.95)

    expect(backbeat - renderedDbfs('snare', 0.78)).toBeCloseTo(6.82, 2)
    expect(velocitiesIn([bar()[12]], 'snare')).toEqual([0.78])
  })

  it('arrives on the next downbeat, out-shouted by both the backbeat and the kick', () => {
    const peak = Math.max(...velocitiesIn(bar().slice(10), 'snare'))

    expect(peak).toBe(0.86)
    expect(DYNAMIC_RANGE_DB * (0.95 - peak)).toBeCloseTo(3.6, 5)
  })
})

describe('every velocity renders at the level the table states', () => {
  const RENDERED: readonly (readonly [KitVoiceName, number, number])[] = [
    ['kick', 0.95, -18.21],
    ['kick', 0.86, -21.81],
    ['snare', 0.95, -17.67],
    ['snare', 0.86, -21.27],
    ['snare', 0.78, -24.49],
    ['snare', 0.7, -27.69],
    ['snare', 0.62, -30.89],
    ['hatClosed', 0.9, -30.54],
    ['hatClosed', 0.82, -33.73],
    ['hatOpen', 0.8, -27.47],
  ]

  it.each(RENDERED)('renders %s at %f as %f dBFS', (voice, velocity, dbfs) => {
    expect(renderedDbfs(voice, velocity)).toBeCloseTo(dbfs, 2)
  })
})

describe('the six invariants, under the amended reading', () => {
  it('keeps all six, as ADR 0010 writes them for every groove', () => {
    expect(sixInvariantViolations(ROCK)).toEqual([])
  })

  const stated = Array.from(
    { length: ROCK.subdivision },
    (_, i) => (i * ROCK.steps) / ROCK.subdivision,
  )

  it.each(BARS)('1. sounds the kick on step 0 at 0.95 in %s', (_name, _table, bar) => {
    expect(bar()[0]).toContainEqual({ voice: 'kick', velocity: 0.95 })
  })

  it.each(BARS)('2. carries a hit on every stated eighth of %s', (_name, _table, bar) => {
    expect(stated).toEqual([0, 2, 4, 6, 8, 10, 12, 14])

    for (const step of stated) {
      expect(bar()[step].length, `step ${step} is a hole in the eighths`).toBeGreaterThan(0)
    }
  })

  it('2. leaves the positions between them rests, except where the fill adds', () => {
    const odd = (bar: readonly (readonly Hit[])[]) =>
      bar.flatMap((hits, step) => (step % 2 === 1 && hits.length > 0 ? [step] : []))

    expect(odd(barOf(ROCK.ordinary[0]))).toEqual([])
    expect(odd(barOf(ROCK.light))).toEqual([])
    expect(odd(barOf(ROCK.fill))).toEqual([11, 13, 15])
  })

  it.each(BARS)('3. plays the ordinary figure over steps 0-7 of %s', (_name, _table, bar) => {
    expect(bar().slice(0, 8)).toEqual(barOf(ROCK.ordinary[0]).slice(0, 8))
  })

  it('4. reaches for nothing beyond its own data and the step grid', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/metronome/lib/groove/grooves/rock.ts'),
      'utf8',
    )
    const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, path]) => path)

    expect([...new Set(imports)].sort()).toEqual(['./definition', './shared', '@/lib/steps'])
    expect(Object.keys(rock)).toEqual(['ROCK'])
  })

  it.each(BARS)('5. closes every open hat inside %s', (_name, _table, bar) => {
    const closed = stepsIn(bar(), 'hatClosed')

    for (const open of stepsIn(bar(), 'hatOpen')) {
      expect(
        closed.some((step) => step > open),
        `open hat on ${open} is never closed inside the bar`,
      ).toBe(true)
    }
  })

  it('6. keeps every designed contour a ladder step apart', () => {
    const worstCaseJitterDb = 2 * DYNAMIC_RANGE_DB * ROCK.humanize.velocityJitter
    const fill = barOf(ROCK.fill)

    const contours: readonly (readonly [string, readonly number[]])[] = [
      ["the fill's stated eighths", [10, 12, 14].map((s) => velocitiesIn([fill[s]], 'snare')[0])],
      ["the fill's added sixteenths", [11, 13, 15].map((s) => velocitiesIn([fill[s]], 'snare')[0])],
      ...BARS.map(
        ([name, , bar]) =>
          [
            `the hat ladder in ${name}`,
            [...new Set(velocitiesIn(bar(), 'hatClosed'))].sort((a, b) => a - b),
          ] as const,
      ),
    ]

    expect(worstCaseJitterDb).toBeCloseTo(3.2, 5)

    for (const [name, contour] of contours) {
      expect(contour.length, name).toBeGreaterThan(1)

      for (let i = 1; i < contour.length; i += 1) {
        const stepDb = Math.abs(DYNAMIC_RANGE_DB * (contour[i] - contour[i - 1]))

        // 40 × 0.08 lands a hair under 3.2 in binary floating point.
        expect(stepDb, `${name}: ${contour[i - 1]} -> ${contour[i]}`).toBeGreaterThanOrEqual(
          worstCaseJitterDb - 1e-9,
        )
      }
    }
  })
})
