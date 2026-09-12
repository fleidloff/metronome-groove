import { describe, expect, it } from 'vitest'
import { MAX_BPM, MIN_BPM, clampTempo, isTempo, secondsPerBeat } from './tempo'

describe('tempo', () => {
  it('spans 40 to 180 bpm inclusive', () => {
    expect([MIN_BPM, MAX_BPM]).toEqual([40, 180])
    expect([MIN_BPM, 120, MAX_BPM].map(isTempo)).toEqual([true, true, true])
    expect([39.9, 180.1, Number.NaN, Infinity].map(isTempo)).toEqual([
      false,
      false,
      false,
      false,
    ])
  })

  it('holds a tempo outside the range to the nearest end', () => {
    expect([0, 39, 181, 1000].map(clampTempo)).toEqual([40, 40, 180, 180])
  })

  it('turns bpm into the seconds between beats', () => {
    expect(secondsPerBeat(120)).toBe(0.5)
    expect(secondsPerBeat(60)).toBe(1)
    expect(secondsPerBeat(MIN_BPM)).toBe(1.5)
  })
})
