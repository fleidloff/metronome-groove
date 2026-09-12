import { describe, expect, it } from 'vitest'
import { curve, gainFor, MAX_BOOST, type Velocity } from './velocity'

const dB = (gain: number) => 20 * Math.log10(gain)

/** Tighter than the 0.01 dB the tech spec asks for. */
const DB_PRECISION = 4

/** The pack gives claves one velocity layer, nominalVelocity 0.5.
 *  Written here rather than imported: `src/lib/` is a leaf and may not reach
 *  into the feature that owns these. Source: tech-spec.md `## Contracts`. */
const CLAVES_NOMINAL = 0.5
const CLICK_ACCENT = 0.65
const CLICK_EVEN = 0.5

describe('curve', () => {
  it('is decibel-linear over a 40 dB range', () => {
    const table: ReadonlyArray<readonly [Velocity, number]> = [
      [0.25, -30],
      [0.5, -20],
      [0.75, -10],
      [1, 0],
    ]

    for (const [v, expected] of table) {
      expect(dB(curve(v))).toBeCloseTo(expected, DB_PRECISION)
    }
  })

  it('is exactly 0 at velocity 0 — a rest is a rest, not something 60 dB down', () => {
    expect(curve(0)).toBe(0)
  })

  it('clamps below 0 and above 1', () => {
    expect(curve(-0.5)).toBe(0)
    expect(curve(-1000)).toBe(0)
    expect(curve(1.5)).toBe(curve(1))
    expect(curve(1000)).toBe(curve(1))
  })
})

describe('gainFor', () => {
  it('is exactly 1 at the layer nominal — the sample plays untouched', () => {
    for (const v of [0.1, 0.25, CLAVES_NOMINAL, 0.65, 0.9, 1]) {
      expect(gainFor(v, v)).toBe(1)
    }
  })

  it('clamps at MAX_BOOST', () => {
    expect(gainFor(0.75, CLAVES_NOMINAL)).toBe(MAX_BOOST)
    expect(gainFor(1, CLAVES_NOMINAL)).toBe(MAX_BOOST)
  })

  it('does not clamp the click accent — +6.0 dB sits just under the ceiling', () => {
    const accent = gainFor(CLICK_ACCENT, CLAVES_NOMINAL)

    expect(accent).toBeLessThan(MAX_BOOST)
    expect(accent).toBeCloseTo(1.995, 3)
    expect(dB(accent)).toBeCloseTo(6, DB_PRECISION)
  })

  it('depends only on the distance v - vRef, anywhere on the scale', () => {
    const distances = [0.1, 0.05, 0.2, -0.1, -0.25]
    const pairs: ReadonlyArray<readonly [Velocity, Velocity]> = [
      [0.5, 0.4],
      [0.9, 0.8],
      [0.35, 0.25],
      [0.7, 0.6],
    ]

    for (const [a, b] of pairs) {
      expect(dB(gainFor(a, b))).toBeCloseTo(dB(gainFor(0.5, 0.4)), DB_PRECISION)
    }

    for (const distance of distances) {
      const reference = dB(gainFor(0.5 + distance, 0.5))

      for (const vRef of [0.3, 0.45, 0.6, 0.75]) {
        expect(dB(gainFor(vRef + distance, vRef))).toBeCloseTo(
          reference,
          DB_PRECISION,
        )
      }
    }
  })

  it('spends 2 dB per 0.05 of velocity — the 40 dB range, spread evenly', () => {
    expect(dB(gainFor(0.55, CLAVES_NOMINAL))).toBeCloseTo(2, DB_PRECISION)
    expect(dB(gainFor(0.45, CLAVES_NOMINAL))).toBeCloseTo(-2, DB_PRECISION)
  })
})

describe('the click, against claves', () => {
  it('puts the accent exactly 6.0 dB over the even beats', () => {
    const accent = dB(gainFor(CLICK_ACCENT, CLAVES_NOMINAL))
    const even = dB(gainFor(CLICK_EVEN, CLAVES_NOMINAL))

    expect(accent - even).toBeCloseTo(6, DB_PRECISION)
  })

  it('leaves the even beats at gain 1.0 — three beats in four are untouched', () => {
    expect(gainFor(CLICK_EVEN, CLAVES_NOMINAL)).toBe(1)
  })
})
