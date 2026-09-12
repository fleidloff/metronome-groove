import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import { DYNAMIC_RANGE_DB, gainFor } from '@/lib/velocity'
import type { Hit, VoiceName } from '../../transport/source'
import { BARS_PER_CYCLE, FILL_BAR, LIGHT_BAR, hitsAt, phaseFor } from '../cycle'
import { sixInvariantViolations } from '../invariants'
import { createGrooveSource } from '../source'
import { CLAVES_NOMINAL_VELOCITY } from '../../click/claves'
import { KIT_VOICES, type KitVoiceName, layerFor } from '../kit'
import * as bossaNova from './bossaNova'
import { BOSSA_NOVA } from './bossaNova'
import type { Line } from './definition'
import { KIT_HUMANIZE } from './shared'

// Unsorted: `VOICE_ORDER` does not name the clave, so sorting would bake that omission in.
const barOf = (lines: readonly Line[]): readonly (readonly Hit[])[] =>
  Array.from({ length: BOSSA_NOVA.steps }, (_, step) =>
    lines
      .filter((line) => line.steps.includes(step))
      .map(({ voice, velocity }) => ({ voice, velocity })),
  )

const byVoice = (hits: readonly Hit[]) =>
  [...hits].sort((a, b) => a.voice.localeCompare(b.voice) || a.velocity - b.velocity)

const sameHits = (a: readonly (readonly Hit[])[], b: readonly (readonly Hit[])[]) =>
  expect(a.map(byVoice)).toEqual(b.map(byVoice))

const played = (bar: number, variations: boolean): readonly (readonly Hit[])[] =>
  Array.from({ length: BOSSA_NOVA.steps }, (_, step) =>
    hitsAt(BOSSA_NOVA, bar * BOSSA_NOVA.steps + step, variations),
  )

const ordinaryOfPhase = (bar: number) => played(bar, false)

const stepsIn = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits, step) => (hits.some((h) => h.voice === voice) ? [step] : []))

const velocitiesIn = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.flatMap((hits) => hits.filter((h) => h.voice === voice).map((h) => h.velocity))

const only = (bar: readonly (readonly Hit[])[], voice: VoiceName) =>
  bar.map((hits) => hits.filter((h) => h.voice === voice))

const renderedDbfs = (voice: KitVoiceName, velocity: number) => {
  const layer = layerFor(voice, velocity)

  return layer.levelDbfs + 20 * Math.log10(gainFor(velocity, layer.nominalVelocity))
}

const EVEN = [0, 2, 4, 6, 8, 10, 12, 14]

const CLAVE: Hit = { voice: 'claves', velocity: 0.5 }
const KICK_1: Hit = { voice: 'kick', velocity: 0.95 }
const KICK_2: Hit = { voice: 'kick', velocity: 0.86 }
const KICK_3: Hit = { voice: 'kick', velocity: 0.78 }
const HAT: Hit = { voice: 'hatClosed', velocity: 0.66 }

/** `spec.md` § The four bars, "Ordinary, phase 0 — the 3-side". */
const PHASE_0: readonly (readonly Hit[])[] = [
  [CLAVE, KICK_1, HAT],
  [],
  [HAT],
  [],
  [HAT],
  [],
  [CLAVE, KICK_3, HAT],
  [],
  [KICK_2, HAT],
  [],
  [HAT],
  [],
  [CLAVE, HAT],
  [],
  [KICK_3, HAT],
  [],
]

const PHASE_1: readonly (readonly Hit[])[] = [
  [KICK_1, HAT],
  [],
  [HAT],
  [],
  [CLAVE, HAT],
  [],
  [KICK_3, HAT],
  [],
  [KICK_2, HAT],
  [],
  [CLAVE, HAT],
  [],
  [HAT],
  [],
  [KICK_3, HAT],
  [],
]

const LIGHT: readonly (readonly Hit[])[] = PHASE_1.map((hits, step) => {
  if (step === 12) return [HAT, KICK_2]
  if (step === 14) return [KICK_2, HAT]
  return hits
})

const FILL: readonly (readonly Hit[])[] = LIGHT.map((hits, step) => {
  if (step === 13) return [{ voice: 'snare' as VoiceName, velocity: 0.62 }]
  if (step === 15) return [{ voice: 'snare' as VoiceName, velocity: 0.7 }]
  return hits
})

const BARS = [
  ['ordinary, phase 0', PHASE_0, () => barOf(BOSSA_NOVA.ordinary[0])],
  ['ordinary, phase 1', PHASE_1, () => barOf(BOSSA_NOVA.ordinary[1])],
  ['the light bar', LIGHT, () => barOf(BOSSA_NOVA.light)],
  ['the fill bar', FILL, () => barOf(BOSSA_NOVA.fill)],
] as const

describe('bossa nova, as a definition', () => {
  it('is written on the sixteen-step grid and states eighths', () => {
    expect(BOSSA_NOVA.steps).toBe(STEPS_PER_BAR)
    expect(BOSSA_NOVA.steps).toBe(16)
    expect(BOSSA_NOVA.subdivision).toBe(8)
  })

  it('is straight, and seeded differently from funk and rock', () => {
    expect(BOSSA_NOVA.swing).toBe(0)
    expect(BOSSA_NOVA.seed).toBe(0x5f_62_6f_73)
    expect(BOSSA_NOVA.seed).not.toBe(0x5f_75_6e_6b)
    expect(BOSSA_NOVA.seed).not.toBe(0x5f_72_6f_63)
  })

  it('answers to the id the select box will ask for', () => {
    expect(BOSSA_NOVA.id).toBe('bossa-nova')
  })

  it('declares the kit voices it plays, and fetches no others', () => {
    expect(BOSSA_NOVA.voices).toEqual(['kick', 'snare', 'hatClosed'])
    expect(BOSSA_NOVA.voices).not.toContain('hatOpen')
    expect(BOSSA_NOVA.voices).not.toContain('claves')
  })

  it('shares funk three timing numbers but exempts the clave from displacement', () => {
    const { timingFractionOfStep, timingCeilingMs, velocityJitter } = BOSSA_NOVA.humanize

    expect(timingFractionOfStep).toBe(KIT_HUMANIZE.timingFractionOfStep)
    expect(timingCeilingMs).toBe(KIT_HUMANIZE.timingCeilingMs)
    expect(velocityJitter).toBe(KIT_HUMANIZE.velocityJitter)
    expect(BOSSA_NOVA.humanize.exactVoices).toEqual(['claves'])
  })

  it('displaces the clave by nothing once the source is built, and the kit by something', () => {
    const source = createGrooveSource(BOSSA_NOVA)
    const seconds = stepSeconds(120, BOSSA_NOVA.steps)
    const at = (step: number, voice: VoiceName) =>
      source.displace?.({ voice, velocity: 0.5 }, step, seconds) ?? 0

    for (const step of [0, 6, 12, 16, 20, 26]) {
      expect(at(step, 'claves'), `step ${step}`).toBe(0)
    }

    expect([0, 2, 4, 6, 8].some((step) => at(step, 'hatClosed') !== 0)).toBe(true)
  })

  it('is its own record, so the exemption cannot reach funk or rock', () => {
    expect(BOSSA_NOVA.humanize).not.toBe(KIT_HUMANIZE)
    expect(KIT_HUMANIZE.exactVoices).toEqual([])
  })
})

describe('the two ordinary bars', () => {
  it('is a two-bar figure, which is what P = 2 means', () => {
    expect(BOSSA_NOVA.ordinary).toHaveLength(2)
  })

  it.each(
    PHASE_0.map((hits, step) => [step, hits] as const),
  )('plays step %i of the 3-side exactly as the table writes it', (step, hits) => {
    expect(barOf(BOSSA_NOVA.ordinary[0])[step]).toEqual(hits)
  })

  it.each(
    PHASE_1.map((hits, step) => [step, hits] as const),
  )('plays step %i of the 2-side exactly as the table writes it', (step, hits) => {
    expect(barOf(BOSSA_NOVA.ordinary[1])[step]).toEqual(hits)
  })

  it('states the clave on 0, 6, 12 for phase 0 and on 4, 10 for phase 1', () => {
    expect(stepsIn(barOf(BOSSA_NOVA.ordinary[0]), 'claves')).toEqual([0, 6, 12])
    expect(stepsIn(barOf(BOSSA_NOVA.ordinary[1]), 'claves')).toEqual([4, 10])
  })

  it('holds the clave flat at the claves nominal, so the sample plays untouched', () => {
    for (const phase of BOSSA_NOVA.ordinary) {
      expect(new Set(velocitiesIn(barOf(phase), 'claves'))).toEqual(new Set([0.5]))
    }

    expect(CLAVES_NOMINAL_VELOCITY).toBe(0.5)
  })

  it('gives the kit one bar: only the clave differs between the phases', () => {
    const kitOf = (bar: readonly (readonly Hit[])[]) =>
      bar.map((hits) => byVoice(hits.filter((hit) => hit.voice !== 'claves')))

    expect(kitOf(barOf(BOSSA_NOVA.ordinary[1]))).toEqual(kitOf(barOf(BOSSA_NOVA.ordinary[0])))
  })

  it('differs between the phases on the clave alone', () => {
    const a = barOf(BOSSA_NOVA.ordinary[0])
    const b = barOf(BOSSA_NOVA.ordinary[1])
    const differing = a.flatMap((hits, step) =>
      JSON.stringify(byVoice(hits)) === JSON.stringify(byVoice(b[step])) ? [] : [step],
    )

    expect(differing).toEqual([0, 4, 6, 10, 12])
  })

  it('rests on every odd step, which is what stating eighths means', () => {
    for (const phase of BOSSA_NOVA.ordinary) {
      for (let step = 1; step < BOSSA_NOVA.steps; step += 2) {
        expect(barOf(phase)[step], `step ${step} sounds`).toEqual([])
      }
    }
  })

  it('runs the kick on 0, 6, 8, 14 with the downbeat loudest', () => {
    for (const phase of BOSSA_NOVA.ordinary) {
      expect(stepsIn(barOf(phase), 'kick')).toEqual([0, 6, 8, 14])
      expect(velocitiesIn(barOf(phase), 'kick')).toEqual([0.95, 0.78, 0.86, 0.78])
    }
  })

  it('lays the hat flat on all eight even steps at 0.66', () => {
    for (const phase of BOSSA_NOVA.ordinary) {
      expect(stepsIn(barOf(phase), 'hatClosed')).toEqual(EVEN)
      expect(new Set(velocitiesIn(barOf(phase), 'hatClosed'))).toEqual(new Set([0.66]))
    }
  })

  it('plays no snare and no open hat in either ordinary bar', () => {
    for (const phase of BOSSA_NOVA.ordinary) {
      expect(stepsIn(barOf(phase), 'snare')).toEqual([])
      expect(stepsIn(barOf(phase), 'hatOpen')).toEqual([])
    }
  })
})

describe('the light bar, which is written against phase 1', () => {
  const bar = () => barOf(BOSSA_NOVA.light)

  it.each(LIGHT.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(byVoice(bar()[step])).toEqual(byVoice(hits))
    },
  )

  it('carries the 2-side clave, on 4 and 10 and never on 0, 6, 12', () => {
    expect(stepsIn(bar(), 'claves')).toEqual([4, 10])
  })

  it('edits two steps of the phase-1 bar and nothing else', () => {
    const phase1 = barOf(BOSSA_NOVA.ordinary[1])
    const differing = bar().flatMap((hits, step) =>
      JSON.stringify(byVoice(hits)) === JSON.stringify(byVoice(phase1[step])) ? [] : [step],
    )

    expect(differing).toEqual([12, 14])
  })

  it('adds the kick on 12 and raises 14 by exactly one ladder step', () => {
    expect(velocitiesIn([bar()[12]], 'kick')).toEqual([0.86])
    expect(velocitiesIn([barOf(BOSSA_NOVA.ordinary[1])[12]], 'kick')).toEqual([])
    expect(velocitiesIn([bar()[14]], 'kick')).toEqual([0.86])
    expect(DYNAMIC_RANGE_DB * (0.86 - 0.78)).toBeCloseTo(3.2, 5)
  })

  it('silences no step and states no new voice', () => {
    expect(bar().map((hits) => hits.length > 0)).toEqual(
      barOf(BOSSA_NOVA.ordinary[1]).map((hits) => hits.length > 0),
    )
    expect(new Set(bar().flatMap((hits) => hits.map((hit) => hit.voice)))).toEqual(
      new Set(barOf(BOSSA_NOVA.ordinary[1]).flatMap((hits) => hits.map((hit) => hit.voice))),
    )
  })
})

describe('the fill bar, which is written against phase 1', () => {
  const bar = () => barOf(BOSSA_NOVA.fill)

  it.each(FILL.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(byVoice(bar()[step])).toEqual(byVoice(hits))
    },
  )

  it('carries the 2-side clave, on 4 and 10 and never on 0, 6, 12', () => {
    expect(stepsIn(bar(), 'claves')).toEqual([4, 10])
  })

  it('takes the light bar kick edits verbatim', () => {
    expect(only(bar(), 'kick')).toEqual(only(barOf(BOSSA_NOVA.light), 'kick'))
    expect(stepsIn(bar(), 'kick')).toEqual([0, 6, 8, 12, 14])
    expect(velocitiesIn(bar(), 'kick')).toEqual([0.95, 0.78, 0.86, 0.86, 0.86])
  })

  it('states the snare on 13 and 15 only, and crescendos 0.62 to 0.70', () => {
    expect(stepsIn(bar(), 'snare')).toEqual([13, 15])
    expect(velocitiesIn(bar(), 'snare')).toEqual([0.62, 0.7])
  })

  it('puts every snare on an odd step, a position bossa never states', () => {
    for (const step of stepsIn(bar(), 'snare')) {
      expect(step % 2, `snare on step ${step} is a stated eighth`).toBe(1)
    }
    expect(stepsIn(bar(), 'snare')).not.toContain(4)
    expect(stepsIn(bar(), 'snare')).not.toContain(12)
  })

  it('keeps the hat flat and unbroken, so no step is opened up', () => {
    expect(stepsIn(bar(), 'hatClosed')).toEqual(EVEN)
    expect(new Set(velocitiesIn(bar(), 'hatClosed'))).toEqual(new Set([0.66]))
  })

  it('opens no hat anywhere in the groove', () => {
    for (const [, , bar] of BARS) {
      expect(stepsIn(bar(), 'hatOpen')).toEqual([])
    }
  })

  it('keeps the crescendo a ladder step wide, so jitter cannot reverse it', () => {
    const worstCaseJitterDb = 2 * DYNAMIC_RANGE_DB * BOSSA_NOVA.humanize.velocityJitter

    expect(worstCaseJitterDb).toBeCloseTo(3.2, 5)
    expect(DYNAMIC_RANGE_DB * (0.7 - 0.62)).toBeGreaterThanOrEqual(worstCaseJitterDb - 1e-9)
  })
})

describe('invariant 3, against the ordinary bar of the same phase', () => {
  it.each([0, 1, 2, 3])('plays the phase ordinary figure over steps 0-7 of bar %i', (bar) => {
    sameHits(played(bar, true).slice(0, 8), ordinaryOfPhase(bar).slice(0, 8))
  })

  it('would fail if the marked bars had been built from phase 0', () => {
    const phase0 = barOf(BOSSA_NOVA.ordinary[0])

    for (const marked of [barOf(BOSSA_NOVA.light), barOf(BOSSA_NOVA.fill)]) {
      expect(marked.slice(0, 8).map(byVoice)).not.toEqual(phase0.slice(0, 8).map(byVoice))
    }
  })

  it('lands both marked bars on the 2-side, which is where the room is', () => {
    for (const bar of [1, 3]) {
      expect(phaseFor(bar * BOSSA_NOVA.steps, BOSSA_NOVA)).toBe(1)
      expect(stepsIn(played(bar, true), 'claves')).toEqual([4, 10])
    }
  })
})

describe('the cycle against the clave', () => {
  it('alternates the two halves forever with variations off', () => {
    for (let bar = 0; bar < 8; bar += 1) {
      sameHits(played(bar, false), barOf(BOSSA_NOVA.ordinary[bar % 2]))
    }
  })

  it('locks the even bars to the 3-side and the odd ones to the 2-side', () => {
    expect(BARS_PER_CYCLE % BOSSA_NOVA.ordinary.length).toBe(0)

    for (let bar = 0; bar < BARS_PER_CYCLE; bar += 1) {
      expect(phaseFor(bar * BOSSA_NOVA.steps, BOSSA_NOVA), `bar ${bar}`).toBe(bar % 2)
    }
  })

  /**
   * The whole reason a longer cycle is safe for this groove: both marked bars
   * must keep landing on one side of the clave, or the light bar and the fill
   * would be written against a figure they do not sit on. 2 divides 8 as it
   * divided 4, so they stay on the 2-side exactly as at four bars.
   */
  it('keeps both marked bars on the answering side, as they were at four bars', () => {
    expect(phaseFor(LIGHT_BAR * BOSSA_NOVA.steps, BOSSA_NOVA)).toBe(1)
    expect(phaseFor(FILL_BAR * BOSSA_NOVA.steps, BOSSA_NOVA)).toBe(1)
    expect(LIGHT_BAR % BOSSA_NOVA.ordinary.length).toBe(FILL_BAR % BOSSA_NOVA.ordinary.length)
  })

  it('never crosses the clave, over eight cycles', () => {
    for (let bar = 0; bar < BARS_PER_CYCLE * 8; bar += 1) {
      const expected = bar % 2 === 0 ? [0, 6, 12] : [4, 10]

      expect(stepsIn(played(bar, true), 'claves'), `bar ${bar}, variations on`).toEqual(expected)
      expect(stepsIn(played(bar, false), 'claves'), `bar ${bar}, variations off`).toEqual(expected)
    }
  })

  it('plays the marked bars only with variations on', () => {
    sameHits(played(LIGHT_BAR, true), barOf(BOSSA_NOVA.light))
    sameHits(played(FILL_BAR, true), barOf(BOSSA_NOVA.fill))
    sameHits(played(LIGHT_BAR, false), barOf(BOSSA_NOVA.ordinary[LIGHT_BAR % 2]))
    sameHits(played(FILL_BAR, false), barOf(BOSSA_NOVA.ordinary[FILL_BAR % 2]))
  })
})

describe('the clave never stops and is never alone', () => {
  it('is bit-identical across every cycle bar, for its phase', () => {
    for (let bar = 0; bar < BARS_PER_CYCLE; bar += 1) {
      expect(only(played(bar, true), 'claves'), `bar ${bar}`).toEqual(
        only(barOf(BOSSA_NOVA.ordinary[bar % 2]), 'claves'),
      )
    }
  })

  it('is untouched by the Fills toggle, step for step, over two cycles', () => {
    for (let step = 0; step < BOSSA_NOVA.steps * BARS_PER_CYCLE * 2; step += 1) {
      const rimOf = (variations: boolean) =>
        hitsAt(BOSSA_NOVA, step, variations).filter((hit) => hit.voice === 'claves')

      expect(rimOf(true), `step ${step}`).toEqual(rimOf(false))
    }
  })

  it('keeps the hat on all eight even steps of every bar, both ways', () => {
    for (let bar = 0; bar < BARS_PER_CYCLE; bar += 1) {
      for (const variations of [true, false]) {
        expect(stepsIn(played(bar, variations), 'hatClosed'), `bar ${bar}`).toEqual(EVEN)
      }
    }
  })

  it('keeps the kick on at least four steps of every bar, both ways', () => {
    for (let bar = 0; bar < BARS_PER_CYCLE; bar += 1) {
      for (const variations of [true, false]) {
        expect(
          stepsIn(played(bar, variations), 'kick').length,
          `bar ${bar}, variations ${variations}`,
        ).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('never sounds the clave alone in a step, anywhere in the cycle', () => {
    for (let step = 0; step < BOSSA_NOVA.steps * BARS_PER_CYCLE; step += 1) {
      for (const variations of [true, false]) {
        const hits = hitsAt(BOSSA_NOVA, step, variations)

        if (hits.some((hit) => hit.voice === 'claves')) {
          expect(hits.length, `step ${step} is the clave alone`).toBeGreaterThan(1)
        }
      }
    }
  })
})

describe('every clave step is also a hat step', () => {
  it.each([0, 1, 2, 3])('doubles the clave on the hat in bar %i', (bar) => {
    for (const variations of [true, false]) {
      const played_ = played(bar, variations)

      for (const step of stepsIn(played_, 'claves')) {
        expect(
          played_[step].some((hit) => hit.voice === 'hatClosed'),
          `bar ${bar}, step ${step} has a clave with no hat`,
        ).toBe(true)
      }
    }
  })

  it('is why the clave is exempt from displacement and nothing else is', () => {
    expect(BOSSA_NOVA.humanize.exactVoices).toEqual(['claves'])

    for (const voice of ['kick', 'snare', 'hatClosed'] as const) {
      expect(BOSSA_NOVA.humanize.exactVoices).not.toContain(voice)
    }
  })
})

describe('every velocity renders at the level the table states', () => {
  const RENDERED: readonly (readonly [KitVoiceName, number, number])[] = [
    ['kick', 0.95, -18.21],
    ['kick', 0.86, -21.81],
    ['kick', 0.78, -25.01],
    ['hatClosed', 0.66, -40.16],
    ['snare', 0.62, -30.89],
    ['snare', 0.7, -27.69],
  ]

  it.each(RENDERED)('renders %s at %f as %f dBFS', (voice, velocity, dbfs) => {
    expect(renderedDbfs(voice, velocity)).toBeCloseTo(dbfs, 2)
  })

  it('plays the clave on a voice no kit layer covers, so nothing stretches it', () => {
    expect(KIT_VOICES).not.toContain('claves')
    expect(BOSSA_NOVA.voices).not.toContain('claves')
  })
})

describe('the six invariants, under the amended reading', () => {
  it('keeps all six, as ADR 0010 writes them for every groove', () => {
    expect(sixInvariantViolations(BOSSA_NOVA)).toEqual([])
  })

  it.each(BARS)('1. sounds the kick on step 0 at 0.95 in %s', (_name, _table, bar) => {
    expect(bar()[0]).toContainEqual({ voice: 'kick', velocity: 0.95 })
  })

  it.each(BARS)('2. carries a hit on every stated eighth of %s', (_name, _table, bar) => {
    for (const step of EVEN) {
      expect(bar()[step].length, `step ${step} is a hole in the eighths`).toBeGreaterThan(0)
    }
  })

  it('2. leaves the odd positions rests, except the two snares of the fill', () => {
    const odd = (bar: readonly (readonly Hit[])[]) =>
      bar.flatMap((hits, step) => (step % 2 === 1 && hits.length > 0 ? [step] : []))

    expect(odd(barOf(BOSSA_NOVA.ordinary[0]))).toEqual([])
    expect(odd(barOf(BOSSA_NOVA.ordinary[1]))).toEqual([])
    expect(odd(barOf(BOSSA_NOVA.light))).toEqual([])
    expect(odd(barOf(BOSSA_NOVA.fill))).toEqual([13, 15])
  })

  it('4. reaches for nothing beyond its own data and the step grid', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/metronome/lib/groove/grooves/bossaNova.ts'),
      'utf8',
    )
    const imports = [...source.matchAll(/from '([^']+)'/g)].map(([, path]) => path)

    expect([...new Set(imports)].sort()).toEqual(['./definition', './shared', '@/lib/steps'])
    expect(Object.keys(bossaNova)).toEqual(['BOSSA_NOVA'])
  })
})
