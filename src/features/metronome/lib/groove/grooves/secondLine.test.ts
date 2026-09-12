import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '@/lib/steps'
import { DYNAMIC_RANGE_DB, gainFor } from '@/lib/velocity'
import type { Hit, VoiceName } from '../../transport/source'
import { sixInvariantViolations, undeclaredVoices } from '../invariants'
import { type KitVoiceName, layerFor } from '../kit'
import { type Line, VOICE_ORDER } from './definition'
import { ROCK } from './rock'
import * as secondLine from './secondLine'
import { SECOND_LINE, SECOND_LINE_SWING, SECOND_LINE_TAP } from './secondLine'
import { SHUFFLE } from './shuffle'
import { GHOST_VELOCITY, STRAIGHT_FUNK, STRAIGHT_FUNK_HUMANIZE } from './straightFunk'

const renderedDbfs = (voice: KitVoiceName, velocity: number) => {
  const layer = layerFor(voice, velocity)

  return layer.levelDbfs + 20 * Math.log10(gainFor(velocity, layer.nominalVelocity))
}

const barOf = (lines: readonly Line[]): readonly (readonly Hit[])[] =>
  Array.from({ length: SECOND_LINE.steps }, (_, step) =>
    lines
      .filter((line) => line.steps.includes(step))
      .map(({ voice, velocity }) => ({ voice, velocity }))
      .sort((a, b) => VOICE_ORDER.indexOf(a.voice) - VOICE_ORDER.indexOf(b.voice)),
  )

const stepsIn = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits, step) => (hits.some((hit) => hit.voice === voice) ? [step] : []))

const velocitiesIn = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits) => hits.filter((hit) => hit.voice === voice).map((hit) => hit.velocity))

const HAT_QUARTER = { voice: 'hatClosed', velocity: 0.9 } as const
const HAT_EIGHTH = { voice: 'hatClosed', velocity: 0.78 } as const
const HAT_SIXTEENTH = { voice: 'hatClosed', velocity: 0.66 } as const

/** `specs/13-second-line/spec.md` § The three bars, ordinary. */
const ORDINARY: readonly (readonly Hit[])[] = [
  [{ voice: 'kick', velocity: 0.95 }, HAT_QUARTER],
  [HAT_SIXTEENTH],
  [HAT_EIGHTH],
  [{ voice: 'snare', velocity: 0.45 }, HAT_SIXTEENTH],
  [HAT_QUARTER],
  [HAT_SIXTEENTH],
  [
    { voice: 'kick', velocity: 0.86 },
    { voice: 'snare', velocity: 0.86 },
    HAT_EIGHTH,
  ],
  [HAT_SIXTEENTH],
  [HAT_QUARTER],
  [HAT_SIXTEENTH],
  [{ voice: 'snare', velocity: 0.7 }, HAT_EIGHTH],
  [{ voice: 'snare', velocity: 0.45 }, HAT_SIXTEENTH],
  [{ voice: 'kick', velocity: 0.86 }, HAT_QUARTER],
  [HAT_SIXTEENTH],
  [{ voice: 'snare', velocity: 0.86 }, HAT_EIGHTH],
  [HAT_SIXTEENTH],
]

const QUARTERS = [0, 4, 8, 12]

describe('bar 1 / 3, the ordinary bar', () => {
  const bar = () => barOf(SECOND_LINE.ordinary[0])

  it.each(ORDINARY.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(bar()[step]).toEqual(hits)
    },
  )

  it('syncopates the kick on the and of 2 and states the big four', () => {
    expect(stepsIn(bar(), 'kick')).toEqual([0, 6, 12])
    expect(velocitiesIn(bar(), 'kick')).toEqual([0.95, 0.86, 0.86])
  })

  it('answers every beat half a beat late, the taps between', () => {
    expect(stepsIn(bar(), 'snare')).toEqual([3, 6, 10, 11, 14])
    expect(velocitiesIn(bar(), 'snare')).toEqual([
      SECOND_LINE_TAP,
      0.86,
      0.7,
      SECOND_LINE_TAP,
      0.86,
    ])
  })

  it('rides the hat on all sixteen steps in three rungs', () => {
    expect(stepsIn(bar(), 'hatClosed')).toHaveLength(SECOND_LINE.steps)
    expect(velocitiesIn([bar()[0], bar()[4], bar()[8], bar()[12]], 'hatClosed')).toEqual([
      0.9, 0.9, 0.9, 0.9,
    ])
    expect(velocitiesIn([bar()[2], bar()[6], bar()[10], bar()[14]], 'hatClosed')).toEqual([
      0.78, 0.78, 0.78, 0.78,
    ])
    expect(
      velocitiesIn(
        bar().filter((_, step) => step % 2 === 1),
        'hatClosed',
      ),
    ).toEqual(Array.from({ length: 8 }, () => 0.66))
  })

  it('opens no hat, because step 14 is where the displaced backbeat lives', () => {
    expect(stepsIn(bar(), 'hatOpen')).toEqual([])
    expect(stepsIn(bar(), 'snare')).toContain(14)
  })

  it('sounds twenty-four events, funk’s own density', () => {
    expect(bar().flat()).toHaveLength(24)
  })
})

describe('the snare states no quarter, which is the whole idiom', () => {
  const bar = () => barOf(SECOND_LINE.ordinary[0])

  it.each(QUARTERS)('rests the snare on step %i', (step) => {
    expect(velocitiesIn([bar()[step]], 'snare')).toEqual([])
  })

  it('lands its strong notes exactly one eighth after the backbeat would be', () => {
    const loudest = Math.max(...velocitiesIn(bar(), 'snare'))
    const strong = stepsIn(bar(), 'snare').filter(
      (step) => velocitiesIn([bar()[step]], 'snare')[0] === loudest,
    )

    expect(strong).toEqual([6, 14])
    expect(strong.map((step) => step - 2)).toEqual([4, 12])
  })

  it('leaves beats 2 and 3 to the hat’s top rung alone', () => {
    for (const step of [4, 8]) {
      expect(bar()[step]).toEqual([HAT_QUARTER])
    }
  })
})

describe('second line, as a definition', () => {
  it('is written on the sixteen-step grid and states sixteenths', () => {
    expect(SECOND_LINE.steps).toBe(STEPS_PER_BAR)
    expect(SECOND_LINE.subdivision).toBe(STEPS_PER_BAR)
  })

  it('states one ordinary bar, so the figure repeats every bar', () => {
    expect(SECOND_LINE.ordinary).toHaveLength(1)
  })

  it('is the first groove in the tree to lilt, at a fifth rather than a fifth and a bit', () => {
    expect(SECOND_LINE.swing).toBe(SECOND_LINE_SWING)
    expect(SECOND_LINE_SWING).toBe(0.2)
    expect(SECOND_LINE_SWING).not.toBe(0.22)
    expect(STRAIGHT_FUNK.swing).toBe(0)
    expect(ROCK.swing).toBe(0)
  })

  it('taps at 0.45, which clears the hat’s own sixteenths funk’s ghost sinks under', () => {
    const sixteenth = renderedDbfs('hatClosed', 0.66)

    expect(SECOND_LINE_TAP).toBe(0.45)
    expect(renderedDbfs('snare', SECOND_LINE_TAP) - sixteenth).toBeCloseTo(2.47, 2)
    expect(renderedDbfs('snare', GHOST_VELOCITY) - sixteenth).toBeCloseTo(-0.73, 2)
  })

  it('is seeded apart from every groove it shares a kit with', () => {
    expect(SECOND_LINE.seed).toBe(0x5f_32_6e_64)
    expect(new Set([STRAIGHT_FUNK.seed, ROCK.seed, SHUFFLE.seed])).not.toContain(SECOND_LINE.seed)
  })

  it('shares the funk humanize record, exact voices and all', () => {
    expect(SECOND_LINE.humanize).toBe(STRAIGHT_FUNK_HUMANIZE)
    expect(SECOND_LINE.humanize.exactVoices).toEqual([])
  })

  it('declares the four voices its lines play and no more', () => {
    expect(SECOND_LINE.voices).toEqual(['kick', 'snare', 'hatClosed', 'hatOpen'])
    expect(undeclaredVoices(SECOND_LINE)).toEqual([])
  })

  it('answers to the id the select box will ask for', () => {
    expect(SECOND_LINE.id).toBe('second-line')
  })
})

const differingSteps = (a: readonly (readonly Hit[])[], b: readonly (readonly Hit[])[]) =>
  a.flatMap((hits, step) => (JSON.stringify(hits) === JSON.stringify(b[step]) ? [] : [step]))

/** `specs/13-second-line/spec.md` § The three bars, bar 2. */
const LIGHT: readonly (readonly Hit[])[] = ORDINARY.map((hits, step) => {
  if (step === 12) return [{ voice: 'kick', velocity: 0.86 }, { voice: 'hatOpen', velocity: 0.8 }]
  if (step === 14)
    return [
      { voice: 'kick', velocity: 0.78 },
      { voice: 'snare', velocity: 0.86 },
      HAT_EIGHTH,
    ]
  return hits
})

describe('bar 2, the light one', () => {
  const bar = () => barOf(SECOND_LINE.light)

  it.each(LIGHT.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(bar()[step]).toEqual(hits)
    },
  )

  it('edits exactly two steps of the ordinary bar', () => {
    expect(differingSteps(bar(), barOf(SECOND_LINE.ordinary[0]))).toEqual([12, 14])
  })

  it('substitutes the open hat on step 12, leaving no closed hat there', () => {
    const voices = bar()[12].map((hit) => hit.voice)

    expect(voices).toContain('hatOpen')
    expect(voices).not.toContain('hatClosed')
    expect(stepsIn(bar(), 'hatOpen')).toEqual([12])
  })

  it('opens it on the big four, the quarter the snare deliberately avoids', () => {
    expect(stepsIn(bar(), 'hatOpen')[0]).toBe(QUARTERS[3])
    expect(velocitiesIn([bar()[12]], 'snare')).toEqual([])
  })

  it('adds a kick under the displaced backbeat, softer than the big four', () => {
    expect(stepsIn(bar(), 'kick')).toEqual([0, 6, 12, 14])
    expect(velocitiesIn([bar()[14]], 'kick')).toEqual([0.78])
    expect(velocitiesIn([bar()[14]], 'snare')).toEqual([0.86])
  })

  it('keeps the closed hat everywhere else, so the grid survives the edit', () => {
    expect(stepsIn(bar(), 'hatClosed')).toHaveLength(SECOND_LINE.steps - 1)
  })
})

/** `specs/13-second-line/spec.md` § The three bars, bar 4. */
const FILLED_IN: Record<number, number> = { 8: 0.62, 9: 0.45, 12: 0.78, 13: 0.45, 15: 0.45 }

const FILL: readonly (readonly Hit[])[] = ORDINARY.map((hits, step) => {
  const velocity = FILLED_IN[step]

  if (velocity === undefined) return hits

  return [...hits, { voice: 'snare' as VoiceName, velocity }].sort(
    (a, b) => VOICE_ORDER.indexOf(a.voice) - VOICE_ORDER.indexOf(b.voice),
  )
})

describe('bar 4, the fill, which fills the figure’s gaps in', () => {
  const bar = () => barOf(SECOND_LINE.fill)

  it.each(FILL.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(bar()[step]).toEqual(hits)
    },
  )

  it('rides the hat through all sixteen steps, unchanged', () => {
    expect(velocitiesIn(bar(), 'hatClosed')).toEqual(
      velocitiesIn(barOf(SECOND_LINE.ordinary[0]), 'hatClosed'),
    )
    expect(stepsIn(bar(), 'hatClosed')).toHaveLength(SECOND_LINE.steps)
    expect(stepsIn(bar(), 'hatOpen')).toEqual([])
  })

  it('leaves the kick where the ordinary bar states it', () => {
    expect(stepsIn(bar(), 'kick')).toEqual(stepsIn(barOf(SECOND_LINE.ordinary[0]), 'kick'))
    expect(velocitiesIn(bar(), 'kick')).toEqual(
      velocitiesIn(barOf(SECOND_LINE.ordinary[0]), 'kick'),
    )
  })

  it.each([3, 6, 10, 11, 14])('keeps the ordinary snare velocity on step %i', (step) => {
    expect(velocitiesIn([bar()[step]], 'snare')).toEqual(
      velocitiesIn([barOf(SECOND_LINE.ordinary[0])[step]], 'snare'),
    )
  })

  it('adds rather than subtracts, so every ordinary hit is still there', () => {
    for (const [step, hits] of barOf(SECOND_LINE.ordinary[0]).entries()) {
      for (const hit of hits) {
        expect(bar()[step], `step ${step}`).toContainEqual(hit)
      }
    }
  })

  it('crescendos over the second half, the taps between', () => {
    expect([8, 10, 12, 14].map((step) => velocitiesIn([bar()[step]], 'snare')[0])).toEqual([
      0.62, 0.7, 0.78, 0.86,
    ])
    expect([9, 11, 13, 15].map((step) => velocitiesIn([bar()[step]], 'snare')[0])).toEqual([
      SECOND_LINE_TAP,
      SECOND_LINE_TAP,
      SECOND_LINE_TAP,
      SECOND_LINE_TAP,
    ])
  })

  it('closes the hinted roll into a real one, a snare on every step from 8', () => {
    expect(stepsIn(bar(), 'snare')).toEqual([3, 6, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('arrives on step 14, under the downbeat kick rather than over it', () => {
    const downbeat = renderedDbfs('kick', velocitiesIn([bar()[0]], 'kick')[0])
    const loudest = Math.max(
      ...bar()
        .slice(SECOND_LINE.steps / 2)
        .flat()
        .map((hit) => renderedDbfs(hit.voice as KitVoiceName, hit.velocity)),
    )

    expect(velocitiesIn([bar()[14]], 'snare')).toEqual([Math.max(...velocitiesIn(bar(), 'snare'))])
    expect(loudest).toBeLessThan(downbeat)
    expect(downbeat - loudest).toBeCloseTo(3.06, 2)
  })
})

const BARS = [
  ['bar 1 / 3, ordinary', () => barOf(SECOND_LINE.ordinary[0])],
  ['bar 2, the light one', () => barOf(SECOND_LINE.light)],
  ['bar 4, the fill', () => barOf(SECOND_LINE.fill)],
] as const

describe('the six invariants, which ADR 0010 needs no amendment to keep', () => {
  it('keeps all six, the tap exempted from the fill’s contour', () => {
    expect(sixInvariantViolations(SECOND_LINE, { ghostVelocity: SECOND_LINE_TAP })).toEqual([])
  })

  it.each(BARS)('1. sounds the kick on step 0 at 0.95 in %s', (_name, bar) => {
    expect(bar()[0]).toContainEqual({ voice: 'kick', velocity: 0.95 })
  })

  it.each(BARS)('2. leaves no hole in the stated sixteenths of %s', (_name, bar) => {
    for (const [step, hits] of bar().entries()) {
      expect(hits.length, `step ${step}`).toBeGreaterThan(0)
    }
  })

  it.each(BARS)('3. plays the ordinary figure over steps 0-7 of %s', (_name, bar) => {
    expect(bar().slice(0, 8)).toEqual(barOf(SECOND_LINE.ordinary[0]).slice(0, 8))
  })

  it('4. reaches for nothing beyond its own data and the step grid', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/metronome/lib/groove/grooves/secondLine.ts'),
      'utf8',
    )
    const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, path]) => path)

    expect([...new Set(imports)].sort()).toEqual(['./definition', './straightFunk', '@/lib/steps'])
    expect([...Object.keys(secondLine)].sort()).toEqual([
      'SECOND_LINE',
      'SECOND_LINE_SWING',
      'SECOND_LINE_TAP',
    ])
  })

  it.each(BARS)('5. closes every open hat inside %s', (_name, bar) => {
    const closed = stepsIn(bar(), 'hatClosed')

    for (const open of stepsIn(bar(), 'hatOpen')) {
      expect(closed.some((step) => step > open), `step ${open}`).toBe(true)
    }
  })

  it('6. keeps the hat ladder and the fill’s crescendo a ladder step apart', () => {
    const worstCaseJitterDb = 2 * DYNAMIC_RANGE_DB * SECOND_LINE.humanize.velocityJitter
    const fill = barOf(SECOND_LINE.fill)

    const contours: readonly (readonly [string, readonly number[]])[] = [
      ['the crescendo', [8, 10, 12, 14].map((s) => velocitiesIn([fill[s]], 'snare')[0])],
      ...BARS.map(
        ([name, bar]) =>
          [name, [...new Set(velocitiesIn(bar(), 'hatClosed'))].sort((a, b) => a - b)] as const,
      ),
    ]

    expect(worstCaseJitterDb).toBeCloseTo(3.2, 5)

    for (const [name, contour] of contours) {
      expect(contour.length, name).toBeGreaterThan(1)

      for (let i = 1; i < contour.length; i += 1) {
        const stepDb = Math.abs(DYNAMIC_RANGE_DB * (contour[i] - contour[i - 1]))

        expect(stepDb, `${name}: ${contour[i - 1]}`).toBeGreaterThanOrEqual(
          worstCaseJitterDb - 1e-9,
        )
      }
    }
  })
})

describe('every velocity renders at the level the table states', () => {
  const RENDERED: readonly (readonly [KitVoiceName, number, number])[] = [
    ['kick', 0.95, -18.21],
    ['kick', 0.86, -21.81],
    ['kick', 0.78, -25.01],
    ['snare', 0.86, -21.27],
    ['snare', 0.78, -24.49],
    ['snare', 0.7, -27.69],
    ['snare', 0.62, -30.89],
    ['snare', 0.45, -37.69],
    ['hatClosed', 0.9, -30.54],
    ['hatClosed', 0.78, -35.33],
    ['hatClosed', 0.66, -40.16],
    ['hatOpen', 0.8, -27.47],
  ]

  it.each(RENDERED)('renders %s at %f as %f dBFS', (voice, velocity, dbfs) => {
    expect(renderedDbfs(voice, velocity)).toBeCloseTo(dbfs, 2)
  })

  it('separates the hat’s three rungs by 4.8 dB each', () => {
    expect(renderedDbfs('hatClosed', 0.9) - renderedDbfs('hatClosed', 0.78)).toBeCloseTo(4.79, 2)
    expect(renderedDbfs('hatClosed', 0.78) - renderedDbfs('hatClosed', 0.66)).toBeCloseTo(4.83, 2)
  })

  it('puts the displaced backbeat 16.4 dB over the tap', () => {
    expect(renderedDbfs('snare', 0.86) - renderedDbfs('snare', SECOND_LINE_TAP)).toBeCloseTo(
      16.42,
      2,
    )
  })
})


/**
 * `docs/music.md` §2 writes this groove's figure out, and V13's fifth
 * `## Done when` bullet is the reason it exists. Every step list below is
 * derived from the definition rather than typed, so the document cannot drift
 * away from what the app plays without this going red.
 */
describe('the figure docs/music.md §2 publishes', () => {
  const doc = readFileSync(join(process.cwd(), 'docs/music.md'), 'utf8')

  const written = (voice: VoiceName, velocity: number) =>
    SECOND_LINE.ordinary[0]
      .filter((line) => line.voice === voice && line.velocity === velocity)
      .flatMap((line) => [...line.steps])
      .sort((a, b) => a - b)
      .join(' ')

  it.each([
    ['kick', 0.95 as const],
    ['kick', 0.86 as const],
    ['snare', 0.86 as const],
    ['snare', 0.7 as const],
    ['snare', SECOND_LINE_TAP],
  ] as const)('publishes %s at %f on the steps the definition names', (voice, velocity) => {
    const steps = written(voice, velocity)

    expect(steps).not.toBe('')
    expect(doc).toContain(steps)
  })

  it('publishes the hat as stating every step, which is why subdivision is 16', () => {
    const hat = SECOND_LINE.ordinary[0]
      .filter((line) => line.voice === 'hatClosed')
      .flatMap((line) => [...line.steps])

    expect(new Set(hat).size).toBe(STEPS_PER_BAR)
    expect(doc).toContain(`hatClosed  all ${STEPS_PER_BAR} steps`)
  })
})
