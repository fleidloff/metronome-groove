import { describe, expect, it } from 'vitest'
import { STEPS_PER_BAR } from '@/lib/steps'
import type { Hit } from '../transport/source'
import { GHOST_VELOCITY, STRAIGHT_FUNK_STEPS, hitsAt } from './figure'

/** The contract table in `specs/6-straight-funk-groove/tech-spec.md`, written
 *  out step by step so the test states it rather than deriving it. */
const EXPECTED: readonly (readonly Hit[])[] = [
  [
    { voice: 'kick', velocity: 0.95 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [{ voice: 'hatClosed', velocity: 0.66 }],
  [{ voice: 'hatClosed', velocity: 0.78 }],
  [
    { voice: 'kick', velocity: 0.82 },
    { voice: 'hatClosed', velocity: 0.66 },
  ],
  [
    { voice: 'snare', velocity: 0.92 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [{ voice: 'hatClosed', velocity: 0.66 }],
  [{ voice: 'hatClosed', velocity: 0.78 }],
  [
    { voice: 'snare', velocity: 0.37 },
    { voice: 'hatClosed', velocity: 0.66 },
  ],
  [{ voice: 'hatClosed', velocity: 0.9 }],
  [
    { voice: 'snare', velocity: 0.37 },
    { voice: 'hatClosed', velocity: 0.66 },
  ],
  [
    { voice: 'kick', velocity: 0.86 },
    { voice: 'hatClosed', velocity: 0.78 },
  ],
  [{ voice: 'hatClosed', velocity: 0.66 }],
  [
    { voice: 'snare', velocity: 0.92 },
    { voice: 'hatClosed', velocity: 0.9 },
  ],
  [{ voice: 'hatClosed', velocity: 0.66 }],
  [{ voice: 'hatOpen', velocity: 0.88 }],
  [
    { voice: 'snare', velocity: 0.37 },
    { voice: 'hatClosed', velocity: 0.66 },
  ],
]

const bar = () => EXPECTED.map((_, step) => hitsAt(step))

const stepsOf = (voice: string) =>
  bar().flatMap((hits, step) => (hits.some((h) => h.voice === voice) ? [step] : []))

describe('the straight funk figure', () => {
  it('is one bar of sixteen steps', () => {
    expect(STRAIGHT_FUNK_STEPS).toBe(STEPS_PER_BAR)
    expect(STRAIGHT_FUNK_STEPS).toBe(16)
  })

  it.each(EXPECTED.map((hits, step) => [step, hits] as const))(
    'plays step %i exactly as the table writes it',
    (step, hits) => {
      expect(hitsAt(step)).toEqual(hits)
    },
  )

  it('puts the kick on 0, 3 and 10, hardest on the downbeat', () => {
    expect(stepsOf('kick')).toEqual([0, 3, 10])
  })

  it('puts the backbeat on 4 and 12 and ghosts on 7, 9 and 15', () => {
    expect(stepsOf('snare')).toEqual([4, 7, 9, 12, 15])
  })

  it('keeps the ghosts 22 dB under the backbeat, not 28', () => {
    const dBUnder = 40 * (0.92 - GHOST_VELOCITY)

    expect(GHOST_VELOCITY).toBe(0.37)
    expect(dBUnder).toBeCloseTo(22, 0)
  })

  it('never sounds the closed and the open hat at the same instant', () => {
    for (const hits of bar()) {
      const voices = hits.map((h) => h.voice)

      expect(voices.includes('hatClosed') && voices.includes('hatOpen')).toBe(false)
    }
  })

  it('gives step 14 to the open hat alone, and the open hat nothing else', () => {
    expect(stepsOf('hatOpen')).toEqual([14])
    expect(stepsOf('hatClosed')).not.toContain(14)
  })

  it('states the subdivision on every step but 14', () => {
    expect(stepsOf('hatClosed')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15])
  })

  it('plays no voice this app may never reach for', () => {
    const voices = new Set(bar().flatMap((hits) => hits.map((h) => h.voice)))

    expect([...voices].sort()).toEqual(['hatClosed', 'hatOpen', 'kick', 'snare'])
  })

  it('repeats the bar for absolute steps beyond it', () => {
    for (let step = 0; step < 64; step += 1) {
      expect(hitsAt(step)).toEqual(EXPECTED[step % 16])
    }
  })
})
