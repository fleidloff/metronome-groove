import { describe, expect, it } from 'vitest'
import { BEATS_PER_BAR, STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import { STRAIGHT_FUNK_SWING } from './grooves/straightFunk'
import { swingOffset } from './swing'

const SECONDS_PER_STEP = stepSeconds(100, STEPS_PER_BAR)
const SECONDS_PER_BEAT = SECONDS_PER_STEP * (STEPS_PER_BAR / BEATS_PER_BAR)

const SIXTEENTHS = 1
const EIGHTHS = 2
const SHUFFLE = 2 / 3

function soundsAtBeat(swing: number, step: number, stride: number): number {
  return (
    (step * SECONDS_PER_STEP + swingOffset(swing, step, SECONDS_PER_STEP, stride)) /
    SECONDS_PER_BEAT
  )
}

describe('swing', () => {
  it('leaves a groove whose stated step is the grid step exactly where it was', () => {
    for (const swing of [0.18, 0.5, 0.67, 1]) {
      for (let step = 0; step < STEPS_PER_BAR; step += 1) {
        expect(swingOffset(swing, step, SECONDS_PER_STEP, SIXTEENTHS)).toBe(
          step % 2 === 0 ? 0 : swing * (SECONDS_PER_STEP / 2),
        )
      }
    }
  })

  it('is declared straight for this feel, not left out', () => {
    expect(STRAIGHT_FUNK_SWING).toBe(0)
  })

  it('moves nothing at all when it is zero, at either stride', () => {
    for (const stride of [SIXTEENTHS, EIGHTHS]) {
      for (let step = 0; step < STEPS_PER_BAR; step += 1) {
        expect(swingOffset(STRAIGHT_FUNK_SWING, step, SECONDS_PER_STEP, stride)).toBe(0)
      }
    }
  })

  it('delays the odd steps and leaves the even ones where they are', () => {
    const evens = [0, 2, 4, 6, 8, 10, 12, 14]
    const odds = [1, 3, 5, 7, 9, 11, 13, 15]

    for (const step of evens) {
      expect(swingOffset(0.18, step, SECONDS_PER_STEP, SIXTEENTHS)).toBe(0)
    }
    for (const step of odds) {
      expect(swingOffset(0.18, step, SECONDS_PER_STEP, SIXTEENTHS)).toBeCloseTo(
        0.18 * (SECONDS_PER_STEP / 2),
        12,
      )
    }
  })

  it('is the mechanism a later listening pass needs, so 0.18 is one value away', () => {
    expect(swingOffset(0.18, 1, SECONDS_PER_STEP, SIXTEENTHS) * 1000).toBeCloseTo(13.5, 1)
  })

  it('warps an eighth-note grid onto the triplet the shuffle is named for', () => {
    const landings: readonly (readonly [number, number])[] = [
      [0, 0],
      [2, 2 / 3],
      [8, 2],
      [9, 2 + 1 / 3],
      [10, 2 + 2 / 3],
      [13, 3 + 1 / 3],
      [15, 3 + 5 / 6],
    ]

    for (const [step, beat] of landings) {
      expect(soundsAtBeat(SHUFFLE, step, EIGHTHS)).toBeCloseTo(beat, 12)
    }
  })

  it('never lets a hit overtake the step that follows it', () => {
    let previous = -Infinity

    for (let step = 0; step < STEPS_PER_BAR; step += 1) {
      const sounding = soundsAtBeat(SHUFFLE, step, EIGHTHS)
      expect(sounding).toBeGreaterThan(previous)
      previous = sounding
    }
  })

  it('refuses to push an off-beat past the step that follows it', () => {
    expect(swingOffset(5, 1, SECONDS_PER_STEP, SIXTEENTHS)).toBe(SECONDS_PER_STEP / 2)
    expect(swingOffset(-5, 1, SECONDS_PER_STEP, SIXTEENTHS)).toBe(0)
  })
})
