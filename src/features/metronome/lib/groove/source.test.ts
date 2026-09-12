import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import type { Hit, Source } from '../transport/source'
import { hitsAt } from './figure'
import { STRAIGHT_FUNK_HUMANIZE, timingBound } from './humanize'
import type { KitVoiceName } from './kit'
import { sampleUrlFor } from './kit'
import { createStraightFunkSource } from './source'

const SECONDS_PER_STEP = stepSeconds(100, STEPS_PER_BAR)

/** Round-robin is 3 bars and the variation cycle 4, so 12 is where they realign. */
const CYCLE_BARS = 12
const CYCLE_STEPS = STEPS_PER_BAR * CYCLE_BARS

const takeFor = (hit: Hit, step: number) =>
  sampleUrlFor(hit.voice as KitVoiceName, hit.velocity, step)

/** Bar 4 of each cycle in a twelve-bar run. Their residues mod 3 are 0, 1, 2,
 *  so a fill indexed on the absolute step sounds three distinct take sequences
 *  before it repeats; a phrase-local index would give one, forever. */
const FILL_BAR_STARTS = [48, 112, 176]

const sameHits = (a: readonly Hit[], b: readonly Hit[]) =>
  a.length === b.length &&
  a.every((hit, i) => hit.voice === b[i].voice && hit.velocity === b[i].velocity)

/** V6's one bar, looped — the reference the flag-off output must reproduce. */
const v6HitsAt = (step: number) => hitsAt(step % STEPS_PER_BAR, false)

const takesOver = (source: Source, from: number, count: number) =>
  Array.from({ length: count }, (_, offset) =>
    source.hitsAt(from + offset).map((hit) => takeFor(hit, from + offset)),
  )

/** One bar of takes, with the index the device would use left open — so a test
 *  can show what an absolute index buys over a phrase-local one. */
const takesFrom = (source: Source, from: number, indexOf: (from: number, offset: number) => number) =>
  Array.from({ length: STEPS_PER_BAR }, (_, offset) =>
    source.hitsAt(from + offset).map((hit) => takeFor(hit, indexOf(from, offset))),
  )

describe('the straight funk source', () => {
  it('is humanized, which is what separates it from the click', () => {
    const source = createStraightFunkSource()

    expect(source.humanize).toBe(STRAIGHT_FUNK_HUMANIZE)
    expect(source.displace).toBeDefined()
    expect(source.trim).toBeDefined()
  })

  it('plays the figure over sixteen steps', () => {
    const source = createStraightFunkSource()

    expect(source.steps).toBe(STEPS_PER_BAR)
    expect(source.hitsAt(0)).toEqual(hitsAt(0, true))
  })

  it('displaces every hit inside the bound, over a thousand bars', () => {
    const source = createStraightFunkSource()
    const bound = timingBound(STRAIGHT_FUNK_HUMANIZE, SECONDS_PER_STEP)

    for (let step = 0; step < STEPS_PER_BAR * 1000; step += 1) {
      for (const hit of source.hitsAt(step)) {
        expect(Math.abs(source.displace!(hit, step, SECONDS_PER_STEP))).toBeLessThanOrEqual(bound)
      }
    }
  })

  it('returns the same displacement however often it is asked, and in any order', () => {
    const source = createStraightFunkSource()
    const [hit] = source.hitsAt(7)

    const forwards = [5, 6, 7, 8].map((step) => source.displace!(hit, step, SECONDS_PER_STEP))
    const backwards = [8, 7, 6, 5].map((step) => source.displace!(hit, step, SECONDS_PER_STEP))

    expect(backwards.reverse()).toEqual(forwards)
    expect(source.displace!(hit, 7, SECONDS_PER_STEP)).toBe(forwards[2])
  })

  it('gives a different seed a different set of imperfections from the same figure', () => {
    const mine = createStraightFunkSource()
    const theirs = createStraightFunkSource({ seed: 1 })
    const [hit] = mine.hitsAt(4)

    expect(theirs.hitsAt(4)).toEqual(mine.hitsAt(4))
    expect(theirs.displace!(hit, 4, SECONDS_PER_STEP)).not.toBe(
      mine.displace!(hit, 4, SECONDS_PER_STEP),
    )
  })

  it('reads the variations flag per step, so a toggle lands on the next unqueued step', () => {
    const reads: boolean[] = []
    let fills = false
    const source = createStraightFunkSource({
      variations: () => {
        reads.push(fills)
        return fills
      },
    })

    const ordinary = source.hitsAt(63)
    fills = true
    const marked = source.hitsAt(63)

    expect(reads).toEqual([false, true])
    expect(ordinary).toEqual(hitsAt(63, false))
    expect(marked).toEqual(hitsAt(63, true))
    expect(marked).not.toEqual(ordinary)
  })

  it('is V6 over twelve bars with the flag off, round-robin sequence included', () => {
    const source = createStraightFunkSource({ variations: () => false })

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
    const off = createStraightFunkSource({ variations: () => false })
    const on = createStraightFunkSource({ variations: () => true })

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
