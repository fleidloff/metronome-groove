import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import type { Hit, Source } from '../transport/source'
import { hitsAt } from './cycle'
import {
  STRAIGHT_FUNK,
  STRAIGHT_FUNK_HUMANIZE,
  STRAIGHT_FUNK_SEED,
} from './grooves/straightFunk'
import { timingBound } from './humanize'
import type { KitVoiceName } from './kit'
import { sampleUrlFor } from './kit'
import { createGrooveSource } from './source'

const SECONDS_PER_STEP = stepSeconds(100, STEPS_PER_BAR)

const CYCLE_BARS = 12
const CYCLE_STEPS = STEPS_PER_BAR * CYCLE_BARS

const takeFor = (hit: Hit, step: number) =>
  sampleUrlFor(hit.voice as KitVoiceName, hit.velocity, step)

const FILL_BAR_STARTS = [48, 112, 176]

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

    expect(source.humanize).toBe(STRAIGHT_FUNK_HUMANIZE)
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
    const bound = timingBound(STRAIGHT_FUNK_HUMANIZE, SECONDS_PER_STEP)

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
  })
})
