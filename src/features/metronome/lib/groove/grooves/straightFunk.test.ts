import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '@/lib/steps'
import { DYNAMIC_RANGE_DB, gainFor } from '@/lib/velocity'
import type { Hit, VoiceName } from '../../transport/source'
import { BARS_PER_CYCLE, hitsAt } from '../cycle'
import { sixInvariantViolations } from '../invariants'
import { type KitVoiceName, layerFor } from '../kit'
import { GHOST_VELOCITY, STRAIGHT_FUNK, STRAIGHT_FUNK_HUMANIZE } from './straightFunk'

const STRAIGHT_FUNK_STEPS = STRAIGHT_FUNK.steps

/** The contract table in `specs/6-straight-funk-groove/tech-spec.md`. */
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

const bar = () => EXPECTED.map((_, step) => hitsAt(STRAIGHT_FUNK, step))

const stepsOf = (voice: string) =>
  bar().flatMap((hits, step) => (hits.some((h) => h.voice === voice) ? [step] : []))

describe('the straight funk figure', () => {
  it('is one bar of sixteen steps', () => {
    expect(STRAIGHT_FUNK.steps).toBe(STEPS_PER_BAR)
    expect(STRAIGHT_FUNK.steps).toBe(16)
  })

  it.each(EXPECTED.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(hitsAt(STRAIGHT_FUNK, step)).toEqual(hits)
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
      expect(hitsAt(STRAIGHT_FUNK, step)).toEqual(EXPECTED[step % 16])
    }
  })
})

const FILL_FROM_STEP = 8

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
    hitsAt(STRAIGHT_FUNK, barIndex * STRAIGHT_FUNK_STEPS + step, true),
  )

const stepsIn = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits, step) => (hits.some((h) => h.voice === voice) ? [step] : []))

const velocitiesIn = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits) => hits.filter((h) => h.voice === voice).map((h) => h.velocity))

describe('the four-bar cycle', () => {
  it('runs ordinary, light, ordinary, fill over the absolute step', () => {
    expect(BARS_PER_CYCLE).toBe(4)
    expect(BAR_SHAPES.map(([, barIndex]) => cycleBar(barIndex))).toEqual(
      BAR_SHAPES.map(([, , shape]) => shape),
    )
  })

  it('states the ordinary figure twice before anything changes', () => {
    expect(cycleBar(0)).toEqual(EXPECTED)
    expect(cycleBar(2)).toEqual(EXPECTED)
  })

  it('repeats the cycle, not the bar, for steps beyond it', () => {
    const period = STRAIGHT_FUNK_STEPS * BARS_PER_CYCLE

    for (let step = 0; step < period * 3; step += 1) {
      expect(hitsAt(STRAIGHT_FUNK, step, true)).toEqual(hitsAt(STRAIGHT_FUNK, step % period, true))
    }
  })
})

describe('bar 2, the light one', () => {
  const bar = () => cycleBar(1)

  it.each(LIGHT_EXPECTED.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(hitsAt(STRAIGHT_FUNK, STRAIGHT_FUNK_STEPS + step, true)).toEqual(hits)
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
      expect(hitsAt(STRAIGHT_FUNK, STRAIGHT_FUNK_STEPS * 3 + step, true)).toEqual(hits)
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

describe("the six invariants, in every bar of the cycle", () => {
  it('keeps all six, as ADR 0010 writes them for every groove', () => {
    expect(sixInvariantViolations(STRAIGHT_FUNK, { ghostVelocity: GHOST_VELOCITY })).toEqual([])
  })

  it('states its subdivision as the sixteenth, so all sixteen steps carry a hit', () => {
    expect(STRAIGHT_FUNK.subdivision).toBe(16)
    expect(STRAIGHT_FUNK.subdivision).toBe(STRAIGHT_FUNK.steps)

    for (const [, barIndex] of BAR_SHAPES) {
      for (const [step, hits] of cycleBar(barIndex).entries()) {
        expect(hits.length, `step ${step} is silent`).toBeGreaterThan(0)
      }
    }
  })

  it('6. designs its contours a full ladder step apart, which here is 3.2 dB', () => {
    const worstCaseJitterDb = 2 * DYNAMIC_RANGE_DB * STRAIGHT_FUNK_HUMANIZE.velocityJitter

    expect(worstCaseJitterDb).toBeCloseTo(3.2, 5)

    expect(velocitiesIn(cycleBar(0), 'kick')).toEqual([0.95, 0.82, 0.86])
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
      expect(hitsAt(STRAIGHT_FUNK, step, false), `step ${step}`).toEqual(EXPECTED[step % STRAIGHT_FUNK_STEPS])
    }
  })

  it('defaults to off, so a caller that never heard of variations gets V6', () => {
    for (let step = 0; step < STRAIGHT_FUNK_STEPS * BARS_PER_CYCLE; step += 1) {
      expect(hitsAt(STRAIGHT_FUNK, step)).toEqual(hitsAt(STRAIGHT_FUNK, step, false))
    }
  })
})
