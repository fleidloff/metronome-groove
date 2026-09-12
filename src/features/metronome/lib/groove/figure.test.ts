import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '@/lib/steps'
import { DYNAMIC_RANGE_DB, gainFor } from '@/lib/velocity'
import type { Hit, VoiceName } from '../transport/source'
import * as figure from './figure'
import { BARS_PER_CYCLE, GHOST_VELOCITY, STRAIGHT_FUNK_STEPS, barIndexFor, hitsAt } from './figure'
import { STRAIGHT_FUNK_HUMANIZE } from './humanize'
import { type KitVoiceName, layerFor } from './kit'

/** The contract table in `specs/6-straight-funk-groove/tech-spec.md`, written
 *  out step by step so the test states it rather than deriving it. */
const EXPECTED: readonly (readonly Hit[])[] = [
  [
    { voice: 'kick', velocity: 0.95 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [{ voice: 'hatClosed', velocity: 0.66 }],
  [{ voice: 'hatClosed', velocity: 0.78 }],
  [
    { voice: 'kick', velocity: 0.82 },
    { voice: 'hatClosed', velocity: 0.66 },
  ],
  [
    { voice: 'snare', velocity: 0.92 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [{ voice: 'hatClosed', velocity: 0.66 }],
  [{ voice: 'hatClosed', velocity: 0.78 }],
  [
    { voice: 'snare', velocity: 0.37 },
    { voice: 'hatClosed', velocity: 0.66 },
  ],
  [{ voice: 'hatClosed', velocity: 0.9 }],
  [
    { voice: 'snare', velocity: 0.37 },
    { voice: 'hatClosed', velocity: 0.66 },
  ],
  [
    { voice: 'kick', velocity: 0.86 },
    { voice: 'hatClosed', velocity: 0.78 },
  ],
  [{ voice: 'hatClosed', velocity: 0.66 }],
  [
    { voice: 'snare', velocity: 0.92 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [{ voice: 'hatClosed', velocity: 0.66 }],
  [{ voice: 'hatOpen', velocity: 0.88 }],
  [
    { voice: 'snare', velocity: 0.37 },
    { voice: 'hatClosed', velocity: 0.66 },
  ],
]

const bar = () => EXPECTED.map((_, step) => hitsAt(step))

const stepsOf = (voice: string) =>
  bar().flatMap((hits, step) => (hits.some((h) => h.voice === voice) ? [step] : []))

describe('the straight funk figure', () => {
  it('is one bar of sixteen steps', () => {
    expect(STRAIGHT_FUNK_STEPS).toBe(STEPS_PER_BAR)
    expect(STRAIGHT_FUNK_STEPS).toBe(16)
  })

  it.each(EXPECTED.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(hitsAt(step)).toEqual(hits)
    },
  )

  it('puts the kick on 0, 3 and 10, hardest on the downbeat', () => {
    expect(stepsOf('kick')).toEqual([0, 3, 10])
  })

  it('puts the backbeat on 4 and 12 and ghosts on 7, 9 and 15', () => {
    expect(stepsOf('snare')).toEqual([4, 7, 9, 12, 15])
  })

  it('keeps the ghosts 22 dB under the backbeat, not 28', () => {
    const dBUnder = 40 * (0.92 - GHOST_VELOCITY)

    expect(GHOST_VELOCITY).toBe(0.37)
    expect(dBUnder).toBeCloseTo(22, 0)
  })

  it('never sounds the closed and the open hat at the same instant', () => {
    for (const hits of bar()) {
      const voices = hits.map((h) => h.voice)

      expect(voices.includes('hatClosed') && voices.includes('hatOpen')).toBe(false)
    }
  })

  it('gives step 14 to the open hat alone, and the open hat nothing else', () => {
    expect(stepsOf('hatOpen')).toEqual([14])
    expect(stepsOf('hatClosed')).not.toContain(14)
  })

  it('states the subdivision on every step but 14', () => {
    expect(stepsOf('hatClosed')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15])
  })

  it('plays no voice this app may never reach for', () => {
    const voices = new Set(bar().flatMap((hits) => hits.map((h) => h.voice)))

    expect([...voices].sort()).toEqual(['hatClosed', 'hatOpen', 'kick', 'snare'])
  })

  it('repeats the bar for absolute steps beyond it', () => {
    for (let step = 0; step < 64; step += 1) {
      expect(hitsAt(step)).toEqual(EXPECTED[step % 16])
    }
  })
})

const FILL_FROM_STEP = 8

/** Bar 2 of the cycle: the ordinary bar with exactly two edits. Step 10's
 *  closed hat is **replaced**, never joined, by the open one. */
const LIGHT_EXPECTED: readonly (readonly Hit[])[] = EXPECTED.map((hits, step) => {
  if (step === 10) {
    return [
      { voice: 'kick', velocity: 0.86 },
      { voice: 'hatOpen', velocity: 0.76 },
    ]
  }
  if (step === 15) {
    return [
      { voice: 'snare', velocity: 0.66 },
      { voice: 'hatClosed', velocity: 0.66 },
    ]
  }
  return hits
})

/** Bar 4 of the cycle: steps 0–7 ordinary, steps 8–15 the fill. */
const FILL_EXPECTED: readonly (readonly Hit[])[] = [
  ...EXPECTED.slice(0, FILL_FROM_STEP),
  [
    { voice: 'snare', velocity: 0.78 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [{ voice: 'snare', velocity: 0.37 }],
  [{ voice: 'snare', velocity: 0.7 }],
  [{ voice: 'snare', velocity: 0.62 }],
  [{ voice: 'snare', velocity: 0.86 }],
  [{ voice: 'snare', velocity: 0.37 }],
  [{ voice: 'snare', velocity: 0.78 }],
  [{ voice: 'snare', velocity: 0.94 }],
]

const BAR_SHAPES = [
  ['bar 1, ordinary', 0, EXPECTED],
  ['bar 2, the light one', 1, LIGHT_EXPECTED],
  ['bar 3, ordinary', 2, EXPECTED],
  ['bar 4, the fill', 3, FILL_EXPECTED],
] as const

const cycleBar = (barIndex: number): readonly (readonly Hit[])[] =>
  Array.from({ length: STRAIGHT_FUNK_STEPS }, (_, step) =>
    hitsAt(barIndex * STRAIGHT_FUNK_STEPS + step, true),
  )

const stepsIn = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits, step) => (hits.some((h) => h.voice === voice) ? [step] : []))

const velocitiesIn = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits) => hits.filter((h) => h.voice === voice).map((h) => h.velocity))

describe('the four-bar cycle', () => {
  it('runs ordinary, light, ordinary, fill over the absolute step', () => {
    expect(BARS_PER_CYCLE).toBe(4)
    expect(Array.from({ length: 8 }, (_, bar) => barIndexFor(bar * STRAIGHT_FUNK_STEPS))).toEqual([
      0, 1, 2, 3, 0, 1, 2, 3,
    ])
  })

  it('holds the bar index for every step inside the bar', () => {
    for (let step = 0; step < STRAIGHT_FUNK_STEPS * BARS_PER_CYCLE * 2; step += 1) {
      expect(barIndexFor(step)).toBe(Math.floor(step / STRAIGHT_FUNK_STEPS) % BARS_PER_CYCLE)
    }
  })

  it('counts bars the same way at a four-step bar as at a sixteen-step one', () => {
    expect(Array.from({ length: 8 }, (_, step) => barIndexFor(step, 4))).toEqual([
      0, 0, 0, 0, 1, 1, 1, 1,
    ])
    expect(barIndexFor(16, 4)).toBe(0)
  })

  it('puts the step before the downbeat in the bar before it, never in bar -1', () => {
    expect(barIndexFor(-1)).toBe(3)
    expect(barIndexFor(-STRAIGHT_FUNK_STEPS)).toBe(3)
    expect(barIndexFor(-STRAIGHT_FUNK_STEPS - 1)).toBe(2)
    expect(barIndexFor(-STRAIGHT_FUNK_STEPS * BARS_PER_CYCLE)).toBe(0)
  })

  it('states the ordinary figure twice before anything changes', () => {
    expect(cycleBar(0)).toEqual(EXPECTED)
    expect(cycleBar(2)).toEqual(EXPECTED)
  })

  it('repeats the cycle, not the bar, for steps beyond it', () => {
    const period = STRAIGHT_FUNK_STEPS * BARS_PER_CYCLE

    for (let step = 0; step < period * 3; step += 1) {
      expect(hitsAt(step, true)).toEqual(hitsAt(step % period, true))
    }
  })
})

describe('bar 2, the light one', () => {
  const bar = () => cycleBar(1)

  it.each(LIGHT_EXPECTED.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(hitsAt(STRAIGHT_FUNK_STEPS + step, true)).toEqual(hits)
    },
  )

  it('substitutes the open hat on step 10 rather than adding it', () => {
    const voices = bar()[10].map((h) => h.voice)

    expect(voices).toContain('hatOpen')
    expect(voices).not.toContain('hatClosed')
  })

  it('raises the step-15 ghost to 0.66 without moving the backbeat', () => {
    expect(velocitiesIn([bar()[15]], 'snare')).toEqual([0.66])
    expect(velocitiesIn([bar()[4]], 'snare')).toEqual([0.92])
    expect(velocitiesIn([bar()[12]], 'snare')).toEqual([0.92])
  })

  it('changes exactly two steps and silences none of them', () => {
    const changed = bar().flatMap((hits, step) =>
      JSON.stringify(hits) === JSON.stringify(EXPECTED[step]) ? [] : [step],
    )

    expect(changed).toEqual([10, 15])
  })

  it('keeps the kick where the ordinary bar puts it', () => {
    expect(stepsIn(bar(), 'kick')).toEqual([0, 3, 10])
  })

  it('sits its step-10 open hat under its own step-14 one', () => {
    const [atTen, atFourteen] = [bar()[10], bar()[14]].map(
      (hits) => velocitiesIn([hits], 'hatOpen')[0],
    )

    expect(atTen).toBe(0.76)
    expect(DYNAMIC_RANGE_DB * (atFourteen - atTen)).toBeCloseTo(4.8, 5)
  })
})

describe('bar 4, the fill', () => {
  const bar = () => cycleBar(3)

  it.each(FILL_EXPECTED.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(hitsAt(STRAIGHT_FUNK_STEPS * 3 + step, true)).toEqual(hits)
    },
  )

  it('keeps steps 0-7 ordinary and fills only the second half', () => {
    expect(bar().slice(0, FILL_FROM_STEP)).toEqual(EXPECTED.slice(0, FILL_FROM_STEP))
  })

  it('stops the hat after step 8, which is the gesture', () => {
    expect(stepsIn(bar(), 'hatClosed')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, FILL_FROM_STEP])
    expect(stepsIn(bar(), 'hatOpen')).toEqual([])
  })

  it('takes the feet away for the last thirteen steps', () => {
    expect(stepsIn(bar(), 'kick')).toEqual([0, 3])
  })

  it('gives the fill a snare on every one of its eight steps', () => {
    expect(stepsIn(bar(), 'snare')).toEqual([4, 7, FILL_FROM_STEP, 9, 10, 11, 12, 13, 14, 15])
  })

  it('grows cell 2 one ladder step above cell 1 at every position', () => {
    const cells = [bar().slice(8, 12), bar().slice(12, 16)].map((cell) =>
      cell.map((hits) => velocitiesIn([hits], 'snare')[0]),
    )

    expect(cells[0]).toEqual([0.78, GHOST_VELOCITY, 0.7, 0.62])
    expect(cells[1]).toEqual([0.86, GHOST_VELOCITY, 0.78, 0.94])
  })

  it('makes step 15 the loudest snare in the bar and the phrase arrival', () => {
    const snares = velocitiesIn(bar(), 'snare')

    expect(Math.max(...snares)).toBe(0.94)
    expect(velocitiesIn([bar()[15]], 'snare')).toEqual([0.94])
    expect(DYNAMIC_RANGE_DB * (0.94 - 0.92)).toBeCloseTo(0.8, 5)
  })
})

describe('step 15 across the cycle, the spine of the design', () => {
  it('states one step at three levels, each at least seven times the jitter', () => {
    const spine = [0, 1, 2, 3].map((bar) => velocitiesIn([cycleBar(bar)[15]], 'snare')[0])

    expect(spine).toEqual([GHOST_VELOCITY, 0.66, GHOST_VELOCITY, 0.94])

    const jitterDb = DYNAMIC_RANGE_DB * STRAIGHT_FUNK_HUMANIZE.velocityJitter

    for (const [low, high] of [
      [spine[0], spine[1]],
      [spine[1], spine[3]],
    ]) {
      expect(DYNAMIC_RANGE_DB * (high - low)).toBeGreaterThanOrEqual(7 * jitterDb - 1e-9)
    }
  })
})

describe('the six invariants, in every bar of the cycle', () => {
  it.each(BAR_SHAPES)('1. sounds the kick on step 0 at 0.95 in %s', (_name, barIndex) => {
    expect(cycleBar(barIndex)[0]).toContainEqual({ voice: 'kick', velocity: 0.95 })
  })

  it.each(BAR_SHAPES)('2. carries a hit on all sixteen steps of %s', (_name, barIndex) => {
    for (const [step, hits] of cycleBar(barIndex).entries()) {
      expect(hits.length, `step ${step} is silent`).toBeGreaterThan(0)
    }
  })

  it.each(BAR_SHAPES)('3. plays the ordinary figure over steps 0-7 of %s', (_name, barIndex) => {
    expect(cycleBar(barIndex).slice(0, FILL_FROM_STEP)).toEqual(EXPECTED.slice(0, FILL_FROM_STEP))
  })

  it('4. reaches nothing that could change stepSeconds, swing, the seed or the humanize bound', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/metronome/lib/groove/figure.ts'),
      'utf8',
    )
    const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, path]) => path)

    expect(imports.sort()).toEqual(['../transport/source', '@/lib/steps', '@/lib/velocity'])
    expect(Object.keys(figure).sort()).toEqual([
      'BARS_PER_CYCLE',
      'GHOST_VELOCITY',
      'STRAIGHT_FUNK_STEPS',
      'barIndexFor',
      'hitsAt',
    ])
  })

  it.each(BAR_SHAPES)(
    '5. closes every open hat inside %s, so none rings into the next downbeat',
    (_name, barIndex) => {
      const bar = cycleBar(barIndex)
      const closed = stepsIn(bar, 'hatClosed')

      for (const open of stepsIn(bar, 'hatOpen')) {
        expect(
          closed.some((step) => step > open),
          `open hat on ${open} is never closed`,
        ).toBe(true)
      }
    },
  )

  it('6. keeps every designed contour a ladder step apart, so jitter can flatten it but never reverse it', () => {
    // gainTrim is ±40 · velocityJitter dB, so the worst case closes twice that
    // between two hits. A contour step below it can swap order on a pass.
    const worstCaseJitterDb = 2 * DYNAMIC_RANGE_DB * STRAIGHT_FUNK_HUMANIZE.velocityJitter
    const fill = cycleBar(3)

    // Scoped to the contours V8 designs, and V6's kick line is deliberately
    // not one of them: 0.95 / 0.86 / 0.82 puts 0.82 -> 0.86 at half a ladder
    // step. That pair is frozen twice over — by V6 and by the toggle-off
    // guarantee that variations off renders V6 exactly — so it cannot be moved,
    // and a blanket rule here would fail the ordinary bar rather than protect
    // anything.
    const contours: readonly (readonly [string, readonly number[]])[] = [
      [
        "the fill's snare, rising to step 15",
        velocitiesIn(fill.slice(FILL_FROM_STEP), 'snare').filter((v) => v !== GHOST_VELOCITY),
      ],
      ...BAR_SHAPES.map(
        ([name, barIndex]) =>
          [
            `the hat ladder in ${name}`,
            [...new Set(velocitiesIn(cycleBar(barIndex), 'hatClosed'))].sort((a, b) => a - b),
          ] as const,
      ),
    ]

    expect(worstCaseJitterDb).toBeCloseTo(3.2, 5)

    for (const [name, contour] of contours) {
      expect(contour.length, name).toBeGreaterThan(1)

      for (let i = 1; i < contour.length; i += 1) {
        const stepDb = Math.abs(DYNAMIC_RANGE_DB * (contour[i] - contour[i - 1]))

        // ≥ rather than > : the designed step is exactly the worst case, and
        // binary floating point puts 40 · (0.7 − 0.62) a hair under 3.2.
        expect(stepDb, `${name}: ${contour[i - 1]} -> ${contour[i]}`).toBeGreaterThanOrEqual(
          worstCaseJitterDb - 1e-9,
        )
      }
    }
  })
})

describe("the fill's ladder against the kit's velocity layers", () => {
  const renderedDbfs = (voice: KitVoiceName, velocity: number) => {
    const layer = layerFor(voice, velocity)

    return layer.levelDbfs + 20 * Math.log10(gainFor(velocity, layer.nominalVelocity))
  }

  it('still measures a full ladder step where 0.78 -> 0.86 crosses a layer boundary', () => {
    expect(layerFor('snare', 0.78).layer).not.toBe(layerFor('snare', 0.86).layer)

    const rise = renderedDbfs('snare', 0.86) - renderedDbfs('snare', 0.78)

    expect(rise).toBeCloseTo(2 * DYNAMIC_RANGE_DB * STRAIGHT_FUNK_HUMANIZE.velocityJitter, 1)
  })

  it('renders step 15 above an ordinary backbeat', () => {
    expect(renderedDbfs('snare', 0.94)).toBeCloseTo(-18.1, 1)
    expect(renderedDbfs('snare', 0.94)).toBeGreaterThan(renderedDbfs('snare', 0.92))
  })
})

describe('with variations off', () => {
  it('reproduces V6 single bar for every step of all four bar positions', () => {
    for (let step = 0; step < STRAIGHT_FUNK_STEPS * BARS_PER_CYCLE * 3; step += 1) {
      expect(hitsAt(step, false), `step ${step}`).toEqual(EXPECTED[step % STRAIGHT_FUNK_STEPS])
    }
  })

  it('defaults to off, so a caller that never heard of variations gets V6', () => {
    for (let step = 0; step < STRAIGHT_FUNK_STEPS * BARS_PER_CYCLE; step += 1) {
      expect(hitsAt(step)).toEqual(hitsAt(step, false))
    }
  })
})
