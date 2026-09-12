import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import { hitsAt } from './figure'
import { STRAIGHT_FUNK_HUMANIZE, timingBound } from './humanize'
import { createStraightFunkSource } from './source'

const SECONDS_PER_STEP = stepSeconds(100, STEPS_PER_BAR)

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
    expect(source.hitsAt(0)).toEqual(hitsAt(0))
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
    const theirs = createStraightFunkSource(1)
    const [hit] = mine.hitsAt(4)

    expect(theirs.hitsAt(4)).toEqual(mine.hitsAt(4))
    expect(theirs.displace!(hit, 4, SECONDS_PER_STEP)).not.toBe(
      mine.displace!(hit, 4, SECONDS_PER_STEP),
    )
  })
})
