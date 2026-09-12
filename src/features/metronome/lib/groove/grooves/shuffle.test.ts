import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '@/lib/steps'
import { DYNAMIC_RANGE_DB, gainFor } from '@/lib/velocity'
import type { Hit, VoiceName } from '../../transport/source'
import { hitsAt } from '../cycle'
import { sixInvariantViolations } from '../invariants'
import { type KitVoiceName, layerFor } from '../kit'
import { type Line, VOICE_ORDER } from './definition'
import { ROCK } from './rock'
import * as shuffle from './shuffle'
import { SHUFFLE } from './shuffle'
import { STRAIGHT_FUNK_HUMANIZE } from './straightFunk'

const barOf = (lines: readonly Line[]): readonly (readonly Hit[])[] =>
  Array.from({ length: SHUFFLE.steps }, (_, step) =>
    lines
      .filter((line) => line.steps.includes(step))
      .map(({ voice, velocity }) => ({ voice, velocity }))
      .sort((a, b) => VOICE_ORDER.indexOf(a.voice) - VOICE_ORDER.indexOf(b.voice)),
  )

/** `specs/12-shuffle/spec.md` § The musician's findings, the ordinary bar. */
const ORDINARY: readonly (readonly Hit[])[] = [
  [
    { voice: 'kick', velocity: 0.95 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [],
  [{ voice: 'hatClosed', velocity: 0.78 }],
  [],
  [
    { voice: 'snare', velocity: 0.95 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [],
  [{ voice: 'hatClosed', velocity: 0.78 }],
  [],
  [
    { voice: 'kick', velocity: 0.86 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [],
  [
    { voice: 'kick', velocity: 0.78 },
    { voice: 'hatClosed', velocity: 0.78 },
  ],
  [],
  [
    { voice: 'snare', velocity: 0.95 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [],
  [{ voice: 'hatClosed', velocity: 0.78 }],
  [],
]

const LIGHT: readonly (readonly Hit[])[] = ORDINARY.map((hits, step) =>
  step === 10
    ? [
        { voice: 'kick' as VoiceName, velocity: 0.78 },
        { voice: 'hatOpen' as VoiceName, velocity: 0.76 },
      ]
    : hits,
)

const FILL: readonly (readonly Hit[])[] = [
  ...ORDINARY.slice(0, 9),
  [{ voice: 'snare', velocity: 0.62 }],
  [
    { voice: 'snare', velocity: 0.7 },
    { voice: 'hatOpen', velocity: 0.76 },
  ],
  [],
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
  ['the ordinary bar', ORDINARY, () => barOf(SHUFFLE.ordinary[0])],
  ['the light bar', LIGHT, () => barOf(SHUFFLE.light)],
  ['the fill bar', FILL, () => barOf(SHUFFLE.fill)],
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

describe('shuffle, as a definition', () => {
  it('is written on the sixteen-step grid and states eighths', () => {
    expect(SHUFFLE.steps).toBe(STEPS_PER_BAR)
    expect(SHUFFLE.steps).toBe(16)
    expect(SHUFFLE.subdivision).toBe(8)
  })

  it('swings the stated eighth two thirds of the way through the beat', () => {
    expect(SHUFFLE.swing).toBe(2 / 3)
    expect(SHUFFLE.swing).not.toBe(0.667)
    expect(SHUFFLE.swing).toBeGreaterThan(0)
  })

  it('is seeded apart from every groove it shares a kit with', () => {
    expect(SHUFFLE.seed).toBe(0x5f_73_68_75)
    expect(SHUFFLE.seed).not.toBe(ROCK.seed)
  })

  it('shares the funk humanize record rather than copying its three numbers', () => {
    expect(SHUFFLE.humanize).toBe(STRAIGHT_FUNK_HUMANIZE)
    expect(SHUFFLE.humanize).toEqual({
      timingFractionOfStep: 0.03,
      timingCeilingMs: 4,
      velocityJitter: 0.04,
      exactVoices: [],
    })
  })

  it('answers to the id the select box will ask for', () => {
    expect(SHUFFLE.id).toBe('shuffle')
  })

  it('states one ordinary bar, so the phase answers zero forever', () => {
    expect(SHUFFLE.ordinary).toHaveLength(1)
  })

  it('declares rock’s four voices, which is what makes the switch free', () => {
    expect(SHUFFLE.voices).toEqual(ROCK.voices)
  })
})

describe('the ordinary bar', () => {
  const bar = () => barOf(SHUFFLE.ordinary[0])

  it.each(ORDINARY.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(bar()[step]).toEqual(hits)
    },
  )

  it('rests on every odd step, which is what stating eighths means', () => {
    for (let step = 1; step < SHUFFLE.steps; step += 2) {
      expect(bar()[step], `step ${step} sounds`).toEqual([])
    }
  })

  it('puts the backbeat on 4 and 12 at rock’s velocity', () => {
    expect(stepsIn(bar(), 'snare')).toEqual([4, 12])
    expect(velocitiesIn(bar(), 'snare')).toEqual([0.95, 0.95])
    expect(velocitiesIn(barOf(ROCK.ordinary[0]), 'snare')).toEqual(velocitiesIn(bar(), 'snare'))
  })

  it('plays the hat on every stated eighth, accented on the quarters', () => {
    expect(stepsIn(bar(), 'hatClosed')).toEqual([0, 2, 4, 6, 8, 10, 12, 14])
    expect(velocitiesIn(bar(), 'hatClosed')).toEqual([0.9, 0.78, 0.9, 0.78, 0.9, 0.78, 0.9, 0.78])
  })

  it('opens no hat and plays no ghost', () => {
    expect(stepsIn(bar(), 'hatOpen')).toEqual([])
    expect(new Set(velocitiesIn(bar(), 'snare'))).toEqual(new Set([0.95]))
  })

  it('spaces the hat ladder 4.79 dB, wider than the 3.19 rock reads as even', () => {
    const [low, high] = [...new Set(velocitiesIn(bar(), 'hatClosed'))].sort((a, b) => a - b)
    const rockRungs = [...new Set(velocitiesIn(barOf(ROCK.ordinary[0]), 'hatClosed'))]

    expect(renderedDbfs('hatClosed', high) - renderedDbfs('hatClosed', low)).toBeCloseTo(4.79, 2)
    expect(rockRungs).toContain(0.82)
    expect(rockRungs).not.toContain(low)
  })
})

describe('the kick on step 10, which is what makes it a shuffle', () => {
  const bar = () => barOf(SHUFFLE.ordinary[0])

  it('states the kick on 0, 8 and 10, where rock states only 0 and 8', () => {
    expect(stepsIn(bar(), 'kick')).toEqual([0, 8, 10])
    expect(stepsIn(barOf(ROCK.ordinary[0]), 'kick')).toEqual([0, 8])
  })

  it('sounds it at 0.78, under the half-bar kick it follows', () => {
    expect(velocitiesIn([bar()[10]], 'kick')).toEqual([0.78])
    expect(velocitiesIn([bar()[8]], 'kick')).toEqual([0.86])
  })

  it.each([0, 2, 4, 6])('sounds it on step 10 of unmarked bar %i of the cycle', (barIndex) => {
    expect(hitsAt(SHUFFLE, barIndex * SHUFFLE.steps + 10, true)).toContainEqual({
      voice: 'kick',
      velocity: 0.78,
    })
  })

  it('keeps it out of the fill, where the kick steps aside to 8 and 12', () => {
    expect(velocitiesIn([barOf(SHUFFLE.fill)[10]], 'kick')).toEqual([])
    expect(stepsIn(barOf(SHUFFLE.fill), 'kick')).toEqual([0, 8, 12])
  })
})

describe('the bar line, which is structural here rather than a velocity', () => {
  const bar = () => barOf(SHUFFLE.ordinary[0])

  it('is not invariant under a shift of half a bar, kick velocities aside', () => {
    const flattened = bar().map((hits) =>
      hits.map((hit) => (hit.voice === 'kick' ? { ...hit, velocity: 0.9 } : hit)),
    )

    expect(shiftedBy(flattened, 8)).not.toEqual(flattened)
  })

  it('finds the downbeat from position: step 2 carries no kick', () => {
    expect(shiftedBy(bar(), 8).map((hits) => hits.some((h) => h.voice === 'kick'))[2]).toBe(true)
    expect(bar()[2].some((hit) => hit.voice === 'kick')).toBe(false)
  })
})

describe('the light bar', () => {
  const bar = () => barOf(SHUFFLE.light)

  it.each(LIGHT.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(bar()[step]).toEqual(hits)
    },
  )

  it('changes exactly one step of the ordinary bar', () => {
    expect(differingSteps(bar(), barOf(SHUFFLE.ordinary[0]))).toEqual([10])
  })

  it('substitutes the open hat rather than adding it, and leaves the kick', () => {
    const voices = bar()[10].map((hit) => hit.voice)

    expect(voices).toContain('hatOpen')
    expect(voices).not.toContain('hatClosed')
    expect(velocitiesIn([bar()[10]], 'kick')).toEqual([0.78])
  })

  it('lands the open hat on the same step the signature kick states', () => {
    expect(stepsIn(bar(), 'hatOpen')).toEqual([10])
    expect(stepsIn(bar(), 'kick')).toContain(10)
  })

  it('leaves step 14 closed, which is the only other place it could have gone', () => {
    expect(bar()[14]).toEqual([{ voice: 'hatClosed', velocity: 0.78 }])
  })

  it('lifts the open hat 6.26 dB over the closed hat it displaces, as funk does', () => {
    const lift = renderedDbfs('hatOpen', 0.76) - renderedDbfs('hatClosed', 0.78)

    expect(lift).toBeCloseTo(6.26, 2)
  })
})

describe('the fill bar', () => {
  const bar = () => barOf(SHUFFLE.fill)

  it.each(FILL.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(bar()[step]).toEqual(hits)
    },
  )

  it('states the groove verbatim through step 8 before it departs', () => {
    expect(bar().slice(0, 9)).toEqual(barOf(SHUFFLE.ordinary[0]).slice(0, 9))
  })

  it('adds its first note on step 9, where rock adds on 11', () => {
    expect(bar()[9]).toEqual([{ voice: 'snare', velocity: 0.62 }])
    expect(barOf(ROCK.fill)[9]).toEqual([])
    expect(stepsIn(barOf(ROCK.fill), 'snare')).toContain(11)
  })

  it('rests on step 11, which the warped grid cannot reach as a triplet', () => {
    expect(bar()[11]).toEqual([])
  })

  it('runs seven snares over 9-15 at the velocities the table gives', () => {
    expect(stepsIn(bar(), 'snare')).toEqual([4, 9, 10, 12, 13, 14, 15])
    expect(velocitiesIn(bar().slice(9), 'snare')).toEqual([0.62, 0.7, 0.78, 0.7, 0.86, 0.78])
  })

  it('keeps time underneath on 8 and 12, equal', () => {
    expect(velocitiesIn([bar()[8], bar()[12]], 'kick')).toEqual([0.86, 0.86])
  })

  it('rides the hat through the departure rather than stopping it', () => {
    expect(stepsIn(bar(), 'hatClosed')).toEqual([0, 2, 4, 6, 8, 12])
    expect(stepsIn(bar(), 'hatOpen')).toEqual([10])
  })

  it('opens the hat at the level the light bar opens it, so the preview matches', () => {
    expect(velocitiesIn([bar()[10]], 'hatOpen')).toEqual(
      velocitiesIn([barOf(SHUFFLE.light)[10]], 'hatOpen'),
    )
    expect(velocitiesIn([bar()[10]], 'hatOpen')).toEqual([0.76])
  })

  it('closes it again on step 12, which is what invariant 5 requires', () => {
    expect(velocitiesIn([bar()[12]], 'hatClosed')).toEqual([0.9])
  })

  it('adds no new hat rung, so the ladder is the one the groove already states', () => {
    const rungs = [...new Set(velocitiesIn(bar(), 'hatClosed'))].sort()
    expect(rungs).toEqual([...new Set(velocitiesIn(barOf(SHUFFLE.ordinary[0]), 'hatClosed'))].sort())
  })

  it('crescendos as two interleaved ladders, the accents on the stated eighths', () => {
    const eighths = [10, 12, 14].map((step) => velocitiesIn([bar()[step]], 'snare')[0])
    const added = [9, 13, 15].map((step) => velocitiesIn([bar()[step]], 'snare')[0])

    expect(eighths).toEqual([0.7, 0.78, 0.86])
    expect(added).toEqual([0.62, 0.7, 0.78])

    for (const [eighth, note] of eighths.map((v, i) => [v, added[i]] as const)) {
      expect(DYNAMIC_RANGE_DB * (eighth - note)).toBeCloseTo(3.2, 5)
    }
  })

  it('takes rock’s velocity set, so what differs is the rhythm', () => {
    const rock = barOf(ROCK.fill)
    const ascending = (velocities: readonly number[]) => [...velocities].sort((a, b) => a - b)

    expect(ascending(velocitiesIn(bar(), 'snare'))).toEqual(ascending(velocitiesIn(rock, 'snare')))
    expect(velocitiesIn(bar(), 'kick')).toEqual(velocitiesIn(rock, 'kick'))
    expect(stepsIn(bar(), 'snare')).not.toEqual(stepsIn(rock, 'snare'))
  })

  it('peaks on step 14, so it crescendos into the downbeat that follows', () => {
    const peak = Math.max(...velocitiesIn(bar().slice(9), 'snare'))

    expect(peak).toBe(0.86)
    expect(velocitiesIn([bar()[14]], 'snare')).toEqual([peak])
    expect(DYNAMIC_RANGE_DB * (0.95 - peak)).toBeCloseTo(3.6, 5)
  })
})

describe('the three departures from rock, each of them derived', () => {
  it('moves the added snare note from step 11 to step 9', () => {
    expect(stepsIn(barOf(SHUFFLE.fill), 'snare')).toContain(9)
    expect(stepsIn(barOf(SHUFFLE.fill), 'snare')).not.toContain(11)
    expect(stepsIn(barOf(ROCK.fill), 'snare')).toContain(11)
  })

  it.each([
    ['the light bar', () => barOf(SHUFFLE.light), () => barOf(ROCK.light)],
    ['the fill bar', () => barOf(SHUFFLE.fill), () => barOf(ROCK.fill)],
  ])('drops the hat rung to 0.78 and the open hat to 0.76 in %s', (_name, mine, theirs) => {
    expect(new Set(velocitiesIn(mine(), 'hatClosed'))).toEqual(new Set([0.9, 0.78]))
    expect(new Set(velocitiesIn(theirs(), 'hatClosed'))).toEqual(new Set([0.9, 0.82]))
    expect(velocitiesIn(mine(), 'hatOpen')).toEqual([0.76])
    expect(velocitiesIn(theirs(), 'hatOpen')).toEqual([0.8])
  })
})

describe('every velocity renders at the level the table states', () => {
  const RENDERED: readonly (readonly [KitVoiceName, number, number])[] = [
    ['kick', 0.95, -18.21],
    ['kick', 0.86, -21.81],
    ['kick', 0.78, -25.01],
    ['snare', 0.95, -17.67],
    ['snare', 0.86, -21.27],
    ['snare', 0.78, -24.49],
    ['snare', 0.7, -27.69],
    ['snare', 0.62, -30.89],
    ['hatClosed', 0.9, -30.54],
    ['hatClosed', 0.78, -35.33],
    ['hatOpen', 0.76, -29.07],
  ]

  it.each(RENDERED)('renders %s at %f as %f dBFS', (voice, velocity, dbfs) => {
    expect(renderedDbfs(voice, velocity)).toBeCloseTo(dbfs, 2)
  })
})

describe('the six invariants, under the amended reading', () => {
  it('keeps all six, with no ghost velocity to exempt', () => {
    expect(sixInvariantViolations(SHUFFLE)).toEqual([])
  })

  const stated = Array.from(
    { length: SHUFFLE.subdivision },
    (_, i) => (i * SHUFFLE.steps) / SHUFFLE.subdivision,
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

    expect(odd(barOf(SHUFFLE.ordinary[0]))).toEqual([])
    expect(odd(barOf(SHUFFLE.light))).toEqual([])
    expect(odd(barOf(SHUFFLE.fill))).toEqual([9, 13, 15])
  })

  it.each(BARS)('3. plays the ordinary figure over steps 0-7 of %s', (_name, _table, bar) => {
    expect(bar().slice(0, 8)).toEqual(barOf(SHUFFLE.ordinary[0]).slice(0, 8))
  })

  it('4. reaches for nothing beyond its own data and the step grid', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/metronome/lib/groove/grooves/shuffle.ts'),
      'utf8',
    )
    const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, path]) => path)

    expect([...new Set(imports)].sort()).toEqual(['./definition', './straightFunk', '@/lib/steps'])
    expect(Object.keys(shuffle)).toEqual(['SHUFFLE'])
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
    const worstCaseJitterDb = 2 * DYNAMIC_RANGE_DB * SHUFFLE.humanize.velocityJitter
    const fill = barOf(SHUFFLE.fill)

    const contours: readonly (readonly [string, readonly number[]])[] = [
      ["the fill's stated eighths", [10, 12, 14].map((s) => velocitiesIn([fill[s]], 'snare')[0])],
      ["the fill's added triplets", [9, 13, 15].map((s) => velocitiesIn([fill[s]], 'snare')[0])],
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

        expect(stepDb, `${name}: ${contour[i - 1]} -> ${contour[i]}`).toBeGreaterThanOrEqual(
          worstCaseJitterDb - 1e-9,
        )
      }
    }
  })
})
