import { describe, expect, it } from 'vitest'
import { MAX_BOOST, gainFor } from '@/lib/velocity'
import { CLAVES_NOMINAL_VELOCITY } from './claves'
import {
  ACCENT_VELOCITY,
  BEATS_PER_BAR,
  CLICK_PATTERN,
  EVEN_VELOCITY,
} from './pattern'

const dB = (gain: number) => 20 * Math.log10(gain)

describe('the click pattern', () => {
  it('is a bar of four that opens on the accent', () => {
    expect(BEATS_PER_BAR).toBe(4)
    expect(CLICK_PATTERN).toEqual([
      ACCENT_VELOCITY,
      EVEN_VELOCITY,
      EVEN_VELOCITY,
      EVEN_VELOCITY,
    ])
  })

  it('plays the even beats at the sample its own nominal level, untouched', () => {
    expect(EVEN_VELOCITY).toBe(CLAVES_NOMINAL_VELOCITY)
    expect(gainFor(EVEN_VELOCITY, CLAVES_NOMINAL_VELOCITY)).toBe(1)
  })

  it('puts the accent 6 dB over the even beats', () => {
    const gain = gainFor(ACCENT_VELOCITY, CLAVES_NOMINAL_VELOCITY)

    expect(dB(gain)).toBeCloseTo(6, 10)
    expect(gain).toBeLessThan(MAX_BOOST)
  })
})
