import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import type { Hit, Source } from '../transport/source'
import { BARS_PER_CYCLE, FILL_BAR, barIndexFor, hitsAt } from './cycle'
import { BOSSA_NOVA } from './grooves/bossaNova'
import type { GrooveDefinition } from './grooves/definition'
import { ROCK } from './grooves/rock'
import { SHUFFLE } from './grooves/shuffle'
import { KIT_HUMANIZE } from './grooves/shared'
import { STRAIGHT_FUNK, STRAIGHT_FUNK_SEED } from './grooves/straightFunk'
import { timingBound, timingOffset } from './humanize'
import type { KitVoiceName } from './kit'
import { sampleUrlFor } from './kit'
import { createGrooveSource } from './source'

const SECONDS_PER_STEP = stepSeconds(100, STEPS_PER_BAR)

const CYCLE_BARS = 12
const CYCLE_STEPS = STEPS_PER_BAR * CYCLE_BARS

const takeFor = (hit: Hit, step: number) =>
  sampleUrlFor(hit.voice as KitVoiceName, hit.velocity, step)

/**
 * The first step of three fill bars. Derived rather than written: at four bars
 * these were 48, 112 and 176, and a wrong literal would still pass the
 * assertion below — ordinary bars draw distinct take sets too. The guard is the
 * test that each of these really is a fill bar.
 */
const FILL_BAR_STARTS = [0, 1, 2].map(
  (cycle) => (cycle * BARS_PER_CYCLE + FILL_BAR) * STEPS_PER_BAR,
)

const sameHits = (a: readonly Hit[], b: readonly Hit[]) =>
  a.length === b.length &&
  a.every((hit, i) => hit.voice === b[i].voice && hit.velocity === b[i].velocity)

const v6HitsAt = (step: number) => hitsAt(STRAIGHT_FUNK, step % STEPS_PER_BAR, false)

const takesOver = (source: Source, from: number, count: number) =>
  Array.from({ length: count }, (_, offset) =>
    source.hitsAt(from + offset).map((hit) => takeFor(hit, from + offset)),
  )

const takesFrom = (source: Source, from: number, indexOf: (from: number, offset: number) => number) =>
  Array.from({ length: STEPS_PER_BAR }, (_, offset) =>
    source.hitsAt(from + offset).map((hit) => takeFor(hit, indexOf(from, offset))),
  )

describe('the groove source, over straight funk', () => {
  it('is humanized, which is what separates it from the click', () => {
    const source = createGrooveSource(STRAIGHT_FUNK)

    expect(source.humanize).toBe(KIT_HUMANIZE)
    expect(source.displace).toBeDefined()
    expect(source.trim).toBeDefined()
  })

  it('carries the groove id and the seed the definition names', () => {
    expect(createGrooveSource(STRAIGHT_FUNK).id).toBe('straight-funk')
    expect(STRAIGHT_FUNK.seed).toBe(STRAIGHT_FUNK_SEED)

    const [hit] = createGrooveSource(STRAIGHT_FUNK).hitsAt(4)

    expect(createGrooveSource(STRAIGHT_FUNK).displace!(hit, 4, SECONDS_PER_STEP)).toBe(
      createGrooveSource(STRAIGHT_FUNK, { seed: STRAIGHT_FUNK_SEED }).displace!(
        hit,
        4,
        SECONDS_PER_STEP,
      ),
    )
  })

  it('states a take step, which a count-in maps back — without it a wrapped groove draws the wrong samples', () => {
    const source = createGrooveSource(STRAIGHT_FUNK)

    expect(source.takeStep).toBeDefined()

    for (const step of [0, 1, 15, 48, 1_000]) {
      expect(source.takeStep!(step)).toBe(step)
    }
  })

  it('plays the figure over sixteen steps', () => {
    const source = createGrooveSource(STRAIGHT_FUNK)

    expect(source.steps).toBe(STEPS_PER_BAR)
    expect(source.hitsAt(0)).toEqual(hitsAt(STRAIGHT_FUNK, 0, true))
  })

  it('displaces every hit inside the bound, over a thousand bars', () => {
    const source = createGrooveSource(STRAIGHT_FUNK)
    const bound = timingBound(KIT_HUMANIZE, SECONDS_PER_STEP)

    for (let step = 0; step < STEPS_PER_BAR * 1000; step += 1) {
      for (const hit of source.hitsAt(step)) {
        expect(Math.abs(source.displace!(hit, step, SECONDS_PER_STEP))).toBeLessThanOrEqual(bound)
      }
    }
  })

  it('returns the same displacement however often it is asked, and in any order', () => {
    const source = createGrooveSource(STRAIGHT_FUNK)
    const [hit] = source.hitsAt(7)

    const forwards = [5, 6, 7, 8].map((step) => source.displace!(hit, step, SECONDS_PER_STEP))
    const backwards = [8, 7, 6, 5].map((step) => source.displace!(hit, step, SECONDS_PER_STEP))

    expect(backwards.reverse()).toEqual(forwards)
    expect(source.displace!(hit, 7, SECONDS_PER_STEP)).toBe(forwards[2])
  })

  it('gives a different seed a different set of imperfections from the same figure', () => {
    const mine = createGrooveSource(STRAIGHT_FUNK)
    const theirs = createGrooveSource(STRAIGHT_FUNK, { seed: 1 })
    const [hit] = mine.hitsAt(4)

    expect(theirs.hitsAt(4)).toEqual(mine.hitsAt(4))
    expect(theirs.displace!(hit, 4, SECONDS_PER_STEP)).not.toBe(
      mine.displace!(hit, 4, SECONDS_PER_STEP),
    )
  })

  it('reads the variations flag per step, so a toggle lands on the next unqueued step', () => {
    const reads: boolean[] = []
    let fills = false
    const source = createGrooveSource(STRAIGHT_FUNK, {
      variations: () => {
        reads.push(fills)
        return fills
      },
    })

    const ordinary = source.hitsAt(63)
    fills = true
    const marked = source.hitsAt(63)

    expect(reads).toEqual([false, true])
    expect(ordinary).toEqual(hitsAt(STRAIGHT_FUNK, 63, false))
    expect(marked).toEqual(hitsAt(STRAIGHT_FUNK, 63, true))
    expect(marked).not.toEqual(ordinary)
  })

  it('is V6 over twelve bars with the flag off, round-robin sequence included', () => {
    const source = createGrooveSource(STRAIGHT_FUNK, { variations: () => false })

    for (let step = 0; step < CYCLE_STEPS; step += 1) {
      expect(source.hitsAt(step)).toEqual(v6HitsAt(step))
      expect(source.hitsAt(step).map((hit) => takeFor(hit, step))).toEqual(
        v6HitsAt(step).map((hit) => takeFor(hit, step)),
      )
    }

    expect(takesOver(source, 0, 48)).toEqual(takesOver(source, 48, 48))
    expect(takesOver(source, 0, STEPS_PER_BAR)).not.toEqual(
      takesOver(source, STEPS_PER_BAR, STEPS_PER_BAR),
    )
  })

  it('keeps the flag out of take selection and out of humanize', () => {
    const off = createGrooveSource(STRAIGHT_FUNK, { variations: () => false })
    const on = createGrooveSource(STRAIGHT_FUNK, { variations: () => true })

    const probes: readonly Hit[] = [
      { voice: 'kick', velocity: 0.95 },
      { voice: 'snare', velocity: 0.92 },
      { voice: 'snare', velocity: 0.37 },
      { voice: 'hatClosed', velocity: 0.66 },
      { voice: 'hatOpen', velocity: 0.88 },
    ]

    let differingSteps = 0

    for (let step = 0; step < CYCLE_STEPS; step += 1) {
      for (const hit of probes) {
        expect(on.displace!(hit, step, SECONDS_PER_STEP)).toBe(
          off.displace!(hit, step, SECONDS_PER_STEP),
        )
        expect(on.trim!(hit, step)).toBe(off.trim!(hit, step))
      }

      const ordinary = off.hitsAt(step)
      const marked = on.hitsAt(step)
      if (!sameHits(marked, ordinary)) differingSteps += 1

      for (const hit of marked) {
        const shared = ordinary.find(
          (other) => other.voice === hit.voice && other.velocity === hit.velocity,
        )
        if (shared) expect(takeFor(hit, step)).toBe(takeFor(shared, step))
      }
    }

    expect(differingSteps).toBeGreaterThan(0)

    const absolute = FILL_BAR_STARTS.map((start) =>
      JSON.stringify(takesFrom(on, start, (_, offset) => start + offset)),
    )
    const phraseLocal = FILL_BAR_STARTS.map((start) =>
      JSON.stringify(takesFrom(on, start, (_, offset) => offset)),
    )

    expect(new Set(absolute).size).toBe(FILL_BAR_STARTS.length)
    expect(new Set(phraseLocal).size).toBe(1)

    // The assertion above passes on any three bar starts — ordinary bars draw
    // distinct take sets too — so the literal is what holds it to fill bars.
    // `barIndexFor` of a derived start is FILL_BAR by construction and would
    // prove nothing; that these bars actually depart from the figure does.
    expect(FILL_BAR_STARTS).toEqual([112, 240, 368])

    for (const start of FILL_BAR_STARTS) {
      const played = Array.from({ length: STEPS_PER_BAR }, (_, step) => on.hitsAt(start + step))
      const ordinary = Array.from({ length: STEPS_PER_BAR }, (_, step) =>
        off.hitsAt(start + step),
      )

      expect(barIndexFor(start, STEPS_PER_BAR), `step ${start}`).toBe(FILL_BAR)
      expect(played, `step ${start} is not a fill bar`).not.toEqual(ordinary)
    }
  })
})

/**
 * The one line joining the warp to the groove that needs it. `createGrooveSource`
 * computes `stride` inline, and every other test here runs straight funk, whose
 * stride is 1 — so a literal `1` in its place passes the whole suite while every
 * shuffle in the app silently stops swinging. ADR 0014 says that failure has no
 * other catch.
 *
 * Swing is isolated by differencing against the same groove at swing 0: seed,
 * voice and step are identical, so humanize cancels exactly.
 */
describe('the stride the source hands the warp', () => {
  const PROBE: Hit = { voice: 'hatClosed', velocity: 0.78 }
  const STEPS_PER_BEAT = STEPS_PER_BAR / 4

  const soundsAtBeat = (groove: typeof SHUFFLE, step: number) => {
    const swung = createGrooveSource(groove)
    const straight = createGrooveSource({ ...groove, swing: 0 })

    const delta =
      swung.displace!(PROBE, step, SECONDS_PER_STEP) -
      straight.displace!(PROBE, step, SECONDS_PER_STEP)

    return step / STEPS_PER_BEAT + delta / (STEPS_PER_BEAT * SECONDS_PER_STEP)
  }

  /** `specs/12-shuffle/tech-spec.md` § Where the warp lands, verified. */
  it.each([
    [0, 'beat 1', 0],
    [2, 'the third triplet of beat 1', 2 / 3],
    [8, 'beat 3', 2],
    [9, 'beat 3 + 1/3', 2 + 1 / 3],
    [10, 'beat 3 + 2/3', 2 + 2 / 3],
    [13, 'beat 4 + 1/3', 3 + 1 / 3],
    [15, 'beat 4 + 5/6', 3 + 5 / 6],
  ])('sounds shuffle step %i at %s, which needs stride 2', (step, _reads, beat) => {
    expect(soundsAtBeat(SHUFFLE, step as number)).toBeCloseTo(beat as number, 12)
  })

  it('reaches a position an unwarped grid cannot, which is what the fill is built on', () => {
    expect(soundsAtBeat(SHUFFLE, 2)).not.toBeCloseTo(2 / 4 + 0.25, 6)
  })

  /**
   * Against humanize alone rather than against a swing-0 twin: rock already
   * declares swing 0, so differencing it against itself asserts nothing and
   * nothing would ever report it broken.
   */
  it('leaves a straight groove alone at stride 2, which is rock and bossa', () => {
    for (const groove of [ROCK, BOSSA_NOVA]) {
      const source = createGrooveSource(groove)

      expect(groove.steps / groove.subdivision).toBe(2)

      for (let step = 0; step < STEPS_PER_BAR; step += 1) {
        expect(source.displace!(PROBE, step, SECONDS_PER_STEP)).toBe(
          timingOffset(groove.humanize, groove.seed, PROBE.voice, step, SECONDS_PER_STEP),
        )
      }
    }
  })
})

/**
 * `swingOffset` is added outside `timingOffset`, so `exactVoices` cannot zero
 * it and must never be extended to. Every shipped groove declares
 * `exactVoices: []`, so nothing else in the app reaches this path.
 * `specs/13-second-line/tech-spec.md` § The trap.
 */
describe('an exact voice under a swung groove', () => {
  const LILT = 0.2

  const EXACT_HAT: GrooveDefinition = {
    ...STRAIGHT_FUNK,
    swing: LILT,
    humanize: { ...KIT_HUMANIZE, exactVoices: ['hatClosed'] },
  }

  const HAT: Hit = { voice: 'hatClosed', velocity: 0.66 }
  const KICK: Hit = { voice: 'kick', velocity: 0.95 }

  const jitteredTwin = () =>
    createGrooveSource({
      ...EXACT_HAT,
      humanize: { ...KIT_HUMANIZE, exactVoices: [] },
    })

  it('still swings that voice, because swing is where the grid is', () => {
    const source = createGrooveSource(EXACT_HAT)

    for (let step = 0; step < STEPS_PER_BAR; step += 1) {
      expect(source.displace!(HAT, step, SECONDS_PER_STEP)).toBe(
        step % 2 === 1 ? LILT * (SECONDS_PER_STEP / 2) : 0,
      )
    }
  })

  it('zeroes that voice\'s jitter and leaves every other voice jittered', () => {
    const source = createGrooveSource(EXACT_HAT)
    const twin = jitteredTwin()

    expect(
      timingOffset(EXACT_HAT.humanize, EXACT_HAT.seed, HAT.voice, 3, SECONDS_PER_STEP),
    ).toBe(0)
    expect(source.displace!(HAT, 3, SECONDS_PER_STEP)).not.toBe(
      twin.displace!(HAT, 3, SECONDS_PER_STEP),
    )

    expect(source.displace!(KICK, 3, SECONDS_PER_STEP)).toBe(
      twin.displace!(KICK, 3, SECONDS_PER_STEP),
    )
    expect(source.displace!(KICK, 3, SECONDS_PER_STEP)).not.toBe(LILT * (SECONDS_PER_STEP / 2))
  })
})
