import { describe, expect, it } from 'vitest'
import { BEATS_PER_BAR, STEPS_PER_BAR, isQuarter, stepSeconds } from './steps'

const ms = (seconds: number) => seconds * 1000

describe('the step grid', () => {
  it('divides a bar of four into sixteen', () => {
    expect([BEATS_PER_BAR, STEPS_PER_BAR]).toEqual([4, 16])
  })
})

describe('stepSeconds on the sixteenth grid', () => {
  it('is 375 ms at the bottom of the range', () => {
    expect(stepSeconds(40, STEPS_PER_BAR)).toBe(0.375)
    expect(ms(stepSeconds(40, STEPS_PER_BAR))).toBe(375)
  })

  it('is 150 ms at 100 bpm', () => {
    expect(stepSeconds(100, STEPS_PER_BAR)).toBe(0.15)
    expect(ms(stepSeconds(100, STEPS_PER_BAR))).toBe(150)
  })

  it('is 83.3 ms at the top of the range', () => {
    expect(stepSeconds(180, STEPS_PER_BAR)).toBeCloseTo(1 / 12, 12)
    expect(ms(stepSeconds(180, STEPS_PER_BAR))).toBeCloseTo(83.333, 3)
  })

  it('spans the 4.5:1 the humanize bound has to survive', () => {
    // A flat millisecond figure means 2.4% of a step at 40 bpm and 10.8% at
    // 180, which is why the bound is a fraction of this number.
    expect(stepSeconds(40, STEPS_PER_BAR) / stepSeconds(180, STEPS_PER_BAR)).toBe(
      4.5,
    )
  })
})

describe('stepSeconds on the click four-step grid', () => {
  it('is one beat, because four steps a bar is four quarters', () => {
    expect(stepSeconds(40, BEATS_PER_BAR)).toBe(1.5)
    expect(stepSeconds(100, BEATS_PER_BAR)).toBe(0.6)
    expect(stepSeconds(180, BEATS_PER_BAR)).toBeCloseTo(1 / 3, 12)
  })

  it('is four sixteenths, at every tempo in the range', () => {
    for (const bpm of [40, 100, 180]) {
      expect(stepSeconds(bpm, BEATS_PER_BAR)).toBeCloseTo(
        4 * stepSeconds(bpm, STEPS_PER_BAR),
        12,
      )
    }
  })
})

describe('isQuarter', () => {
  it('is every step of the click grid', () => {
    const steps = [0, 1, 2, 3, 4, 5, 6, 7]

    expect(steps.map((step) => isQuarter(step, BEATS_PER_BAR))).toEqual(
      steps.map(() => true),
    )
  })

  it('is one step in four of the sixteenth grid', () => {
    const bar = Array.from({ length: STEPS_PER_BAR }, (_, step) => step)

    expect(bar.filter((step) => isQuarter(step, STEPS_PER_BAR))).toEqual([
      0, 4, 8, 12,
    ])
  })

  it('keeps saying quarter past the end of the first bar', () => {
    // The scheduler counts absolute steps and never wraps them, so step 64 is
    // beat 1 of bar 5 and step 66 is not a quarter at all.
    expect(isQuarter(64, STEPS_PER_BAR)).toBe(true)
    expect(isQuarter(66, STEPS_PER_BAR)).toBe(false)
    expect(isQuarter(100, BEATS_PER_BAR)).toBe(true)
  })
})
