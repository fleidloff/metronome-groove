import { describe, expect, it } from 'vitest'
import { BEATS_PER_BAR, STEPS_PER_BAR, isQuarter, stepSeconds } from '@/lib/steps'
import type { SourceId } from '../transport/source'
import { MAX_BPM, MIN_BPM } from '../transport/tempo'
import { BOSSA_NOVA } from './grooves/bossaNova'
import type { GrooveDefinition } from './grooves/definition'
import { ROCK } from './grooves/rock'
import { SECOND_LINE } from './grooves/secondLine'
import { SHUFFLE as SHUFFLE_GROOVE } from './grooves/shuffle'
import {
  STRAIGHT_FUNK,
  STRAIGHT_FUNK_HUMANIZE,
  STRAIGHT_FUNK_SWING,
} from './grooves/straightFunk'
import { timingBound } from './humanize'
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

/** Typed as `cycle.test.ts`'s twin is, so a groove the app can select and this
 *  block does not run the guarantee over is a compile error. */
const EVERY_GROOVE: Record<Exclude<SourceId, 'click'>, GrooveDefinition> = {
  'bossa-nova': BOSSA_NOVA,
  rock: ROCK,
  shuffle: SHUFFLE_GROOVE,
  'straight-funk': STRAIGHT_FUNK,
  'second-line': SECOND_LINE,
}

/** `specs/13-second-line/spec.md` § Decided. */
const LILT = 0.2

const TEMPOS = [40, 88, 92, 96, 180]
const SWINGS = [0, LILT, 0.26, SHUFFLE, 1]
const SWEEP_BARS = 3

const LATE_BY_AT_LEAST_MS = 3.3

describe('the quarters, which is what a swung groove rests on', () => {
  it.each(Object.entries(EVERY_GROOVE))(
    'leaves every quarter of %s where it always lands, at every tempo and every swing',
    (_id, groove) => {
      const stride = groove.steps / groove.subdivision

      for (const bpm of TEMPOS) {
        const seconds = stepSeconds(bpm, groove.steps)

        for (let step = 0; step < groove.steps * SWEEP_BARS; step += 1) {
          if (!isQuarter(step, groove.steps)) continue

          for (const swing of SWINGS) {
            expect(swingOffset(swing, step, seconds, stride)).toBe(0)
          }
        }
      }
    },
  )

  it('moves no even step at all at stride 1, which is the guarantee second line relies on', () => {
    for (const bpm of TEMPOS) {
      const seconds = stepSeconds(bpm, STEPS_PER_BAR)

      for (let step = 0; step < STEPS_PER_BAR * SWEEP_BARS; step += 2) {
        for (const swing of SWINGS) {
          expect(swingOffset(swing, step, seconds, SIXTEENTHS)).toBe(0)
        }
      }
    }
  })

  /** `specs/13-second-line/spec.md` § Swing, proved rather than asserted. */
  it('lilts a sixteenth by the widths the spec tabulates', () => {
    for (const [tempo, ms] of [
      [88, 17.05],
      [92, 16.3],
      [96, 15.62],
    ]) {
      expect(swingOffset(LILT, 1, stepSeconds(tempo, STEPS_PER_BAR), SIXTEENTHS) * 1000).toBeCloseTo(
        ms,
        1,
      )
    }
  })

  it('lands a swung odd step late everywhere the app offers, and never early', () => {
    for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 1) {
      const seconds = stepSeconds(bpm, STEPS_PER_BAR)
      const worstCaseJitter = 2 * timingBound(STRAIGHT_FUNK_HUMANIZE, seconds)

      for (let step = 1; step < STEPS_PER_BAR; step += 2) {
        const lag = swingOffset(LILT, step, seconds, SIXTEENTHS)

        expect(lag).toBeGreaterThan(0)
        expect((lag - worstCaseJitter) * 1000).toBeGreaterThanOrEqual(LATE_BY_AT_LEAST_MS)
      }
    }
  })
})
