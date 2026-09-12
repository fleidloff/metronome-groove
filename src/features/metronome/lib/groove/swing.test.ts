import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import { STRAIGHT_FUNK_SWING } from './grooves/straightFunk'
import { swingOffset } from './swing'

const SECONDS_PER_STEP = stepSeconds(100, STEPS_PER_BAR)

describe('swing', () => {
  it('is declared straight for this feel, not left out', () => {
    expect(STRAIGHT_FUNK_SWING).toBe(0)
  })

  it('moves nothing at all when it is zero', () => {
    for (let step = 0; step < STEPS_PER_BAR; step += 1) {
      expect(swingOffset(STRAIGHT_FUNK_SWING, step, SECONDS_PER_STEP)).toBe(0)
    }
  })

  it('delays the odd steps and leaves the even ones where they are', () => {
    const evens = [0, 2, 4, 6, 8, 10, 12, 14]
    const odds = [1, 3, 5, 7, 9, 11, 13, 15]

    for (const step of evens) {
      expect(swingOffset(0.18, step, SECONDS_PER_STEP)).toBe(0)
    }
    for (const step of odds) {
      expect(swingOffset(0.18, step, SECONDS_PER_STEP)).toBeCloseTo(
        0.18 * (SECONDS_PER_STEP / 2),
        12,
      )
    }
  })

  it('is the mechanism a later listening pass needs, so 0.18 is one value away', () => {
    // 13.5 ms at 100 bpm, which is the figure the spec weighs against the grid.
    expect(swingOffset(0.18, 1, SECONDS_PER_STEP) * 1000).toBeCloseTo(13.5, 1)
  })

  it('puts a triplet shuffle two thirds of the way to the next step', () => {
    expect(swingOffset(0.67, 1, SECONDS_PER_STEP)).toBeCloseTo(
      0.67 * (SECONDS_PER_STEP / 2),
      12,
    )
  })

  it('refuses to push an off-beat past the step that follows it', () => {
    expect(swingOffset(5, 1, SECONDS_PER_STEP)).toBe(SECONDS_PER_STEP / 2)
    expect(swingOffset(-5, 1, SECONDS_PER_STEP)).toBe(0)
  })
})
