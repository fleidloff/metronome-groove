import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR, stepSeconds } from '@/lib/steps'
import { DYNAMIC_RANGE_DB } from '@/lib/velocity'
import type { VoiceName } from '../transport/source'
import { STRAIGHT_FUNK_HUMANIZE } from './grooves/straightFunk'
import { gainTrim, roundRobinIndex, timingBound, timingOffset } from './humanize'

const VOICES: readonly VoiceName[] = ['kick', 'snare', 'hatClosed', 'hatOpen']

const SEED = 20260912

const at = (bpm: number) => stepSeconds(bpm, STEPS_PER_BAR)

const offsetsOver = (count: number, voice: VoiceName, seconds: number) =>
  Array.from({ length: count }, (_, step) =>
    timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, voice, step, seconds),
  )

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

describe('the humanize record', () => {
  it('carries the frozen numbers', () => {
    expect(STRAIGHT_FUNK_HUMANIZE).toEqual({
      timingFractionOfStep: 0.03,
      timingCeilingMs: 4,
      velocityJitter: 0.04,
    })
  })
})

describe('the timing bound', () => {
  it('is a fraction of the step with a millisecond ceiling', () => {
    expect(timingBound(STRAIGHT_FUNK_HUMANIZE, at(40))).toBeCloseTo(0.004, 12)
    expect(timingBound(STRAIGHT_FUNK_HUMANIZE, at(100))).toBeCloseTo(0.004, 12)
    expect(timingBound(STRAIGHT_FUNK_HUMANIZE, at(180))).toBeCloseTo(0.0025, 12)
  })

  it('lets the ceiling bind at the slow end, where 3% of a step is 11 ms', () => {
    expect(0.03 * at(40)).toBeGreaterThan(0.004)
    expect(timingBound(STRAIGHT_FUNK_HUMANIZE, at(40))).toBeLessThan(0.03 * at(40))
  })

  it('lets the fraction bind at the fast end, where 4 ms is 5% of a step', () => {
    expect(0.03 * at(180)).toBeLessThan(0.004)
    expect(timingBound(STRAIGHT_FUNK_HUMANIZE, at(180))).toBe(0.03 * at(180))
  })

  it('hands over from the ceiling to the fraction at 112.5 bpm', () => {
    expect(timingBound(STRAIGHT_FUNK_HUMANIZE, at(112.5))).toBeCloseTo(0.004, 12)
  })
})

describe('the timing offset', () => {
  it('is stateless: the same arguments give the same answer, in any order', () => {
    const first = timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, 'snare', 7, at(100))

    for (const step of [0, 9, 3, 7, 15, 7, 1, 7]) {
      for (const voice of VOICES) {
        timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, voice, step, at(100))
      }
    }

    expect(timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, 'snare', 7, at(100))).toBe(first)
    expect(timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, 'snare', 7, at(100))).toBe(first)
  })

  it('answers a late step the same whether or not the steps before it were asked for', () => {
    const cold = timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, 'kick', 9999, at(100))

    offsetsOver(9999, 'kick', at(100))

    expect(timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, 'kick', 9999, at(100))).toBe(cold)
  })

  it('stays inside the bound over ten thousand steps, at every tempo', () => {
    for (const bpm of [40, 100, 180]) {
      const bound = timingBound(STRAIGHT_FUNK_HUMANIZE, at(bpm))

      for (const voice of VOICES) {
        for (const offset of offsetsOver(10_000, voice, at(bpm))) {
          expect(Math.abs(offset)).toBeLessThanOrEqual(bound)
        }
      }
    }
  })

  it('uses the bound it is given rather than sitting near zero', () => {
    const bound = timingBound(STRAIGHT_FUNK_HUMANIZE, at(100))
    const reach = Math.max(...offsetsOver(10_000, 'hatClosed', at(100)).map(Math.abs))

    expect(reach).toBeGreaterThan(bound * 0.95)
  })

  it('leans on no voice: every voice averages the grid, so no backbeat moves', () => {
    const bound = timingBound(STRAIGHT_FUNK_HUMANIZE, at(100))

    for (const voice of VOICES) {
      expect(Math.abs(mean(offsetsOver(10_000, voice, at(100))))).toBeLessThan(bound * 0.05)
    }
  })

  it('never accumulates: the next step is not the previous one nudged', () => {
    const offsets = offsetsOver(2_000, 'hatClosed', at(100))
    const forward = offsets.slice(1).filter((o, i) => Math.sign(o) === Math.sign(offsets[i])).length

    expect(forward).toBeGreaterThan(800)
    expect(forward).toBeLessThan(1_200)
  })

  it('separates the voices and the seeds', () => {
    const step = 4
    const voices = VOICES.map((v) => timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, v, step, at(100)))

    expect(new Set(voices).size).toBe(VOICES.length)
    expect(timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED + 1, 'kick', step, at(100))).not.toBe(
      timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, 'kick', step, at(100)),
    )
  })
})

describe('the velocity jitter', () => {
  it('is a gain trim, so it can only be applied after the layer is chosen', () => {
    const trim = gainTrim(STRAIGHT_FUNK_HUMANIZE, SEED, 'snare', 7)

    expect(trim).toBeGreaterThan(0)
    expect(typeof trim).toBe('number')
  })

  it('stays inside the jitter read through this repo own decibel curve', () => {
    const ceiling = DYNAMIC_RANGE_DB * STRAIGHT_FUNK_HUMANIZE.velocityJitter

    for (const voice of VOICES) {
      for (let step = 0; step < 10_000; step += 1) {
        const dB = 20 * Math.log10(gainTrim(STRAIGHT_FUNK_HUMANIZE, SEED, voice, step))

        expect(Math.abs(dB)).toBeLessThanOrEqual(ceiling + 1e-9)
      }
    }
  })

  it('is stateless too, and independent of the timing offset', () => {
    const first = gainTrim(STRAIGHT_FUNK_HUMANIZE, SEED, 'hatOpen', 14)

    timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, 'hatOpen', 14, at(100))

    expect(gainTrim(STRAIGHT_FUNK_HUMANIZE, SEED, 'hatOpen', 14)).toBe(first)
    expect(gainTrim(STRAIGHT_FUNK_HUMANIZE, SEED, 'hatOpen', 15)).not.toBe(first)
  })

  it('draws separately from the timing, so a late hit is not also a loud one', () => {
    const steps = Array.from({ length: 10_000 }, (_, step) => step)
    const timing = steps.map((s) => timingOffset(STRAIGHT_FUNK_HUMANIZE, SEED, 'kick', s, at(100)))
    const gain = steps.map((s) => 20 * Math.log10(gainTrim(STRAIGHT_FUNK_HUMANIZE, SEED, 'kick', s)))
    const centred = (xs: readonly number[]) => xs.map((x) => x - mean(xs))
    const dot = (a: readonly number[], b: readonly number[]) =>
      a.reduce((sum, x, i) => sum + x * b[i], 0)
    const [t, g] = [centred(timing), centred(gain)]
    const correlation = dot(t, g) / Math.sqrt(dot(t, t) * dot(g, g))

    expect(Math.abs(correlation)).toBeLessThan(0.1)
  })

  it('averages out rather than pushing a voice up or down', () => {
    const trims = Array.from({ length: 10_000 }, (_, step) =>
      gainTrim(STRAIGHT_FUNK_HUMANIZE, SEED, 'hatClosed', step),
    )

    expect(mean(trims.map((t) => 20 * Math.log10(t)))).toBeCloseTo(0, 1)
  })
})

describe('the round robin', () => {
  const barOf = (bar: number, count: number) =>
    Array.from({ length: STEPS_PER_BAR }, (_, i) => roundRobinIndex(bar * STEPS_PER_BAR + i, count))

  const periodInBars = (count: number) => {
    for (let p = 1; p <= 64; p += 1) {
      const repeats = Array.from({ length: 20 }, (_, bar) =>
        barOf(bar + p, count).every((v, i) => v === barOf(bar, count)[i]),
      ).every(Boolean)

      if (repeats) return p
    }

    throw new Error('no period found')
  }

  it('indexes on the absolute step, so a three-way alternate runs 48 steps', () => {
    expect(periodInBars(3) * STEPS_PER_BAR).toBe(48)
  })

  it('does not repeat the same bar twice running', () => {
    expect(barOf(0, 3)).not.toEqual(barOf(1, 3))
    expect(barOf(1, 3)).not.toEqual(barOf(2, 3))
    expect(barOf(3, 3)).toEqual(barOf(0, 3))
  })

  it('walks the alternates in order and stays in range', () => {
    expect(Array.from({ length: 7 }, (_, s) => roundRobinIndex(s, 3))).toEqual([
      0, 1, 2, 0, 1, 2, 0,
    ])
    expect(roundRobinIndex(9_999, 1)).toBe(0)
  })
})
