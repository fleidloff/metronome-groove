import { describe, expect, it } from 'vitest'
import { MAX_BPM, MIN_BPM } from '../click/tempo'
import {
  addTap,
  commit,
  EMPTY_TAPS,
  hasExpired,
  OPENING_WINDOW_S,
  OUTLIER_RATIO,
  TAPS_FOR_A_TEMPO,
  windowFor,
} from './tapTempo'

/** Taps at a steady interval, starting at 10 s. */
const taps = (interval: number, count: number) =>
  Array.from({ length: count }, (_, index) => 10 + index * interval)

const tapAll = (times: readonly number[]) =>
  times.reduce((state, at) => addTap(state, at), EMPTY_TAPS)

const tempoFrom = (times: readonly number[]) => commit(tapAll(times))

describe('recording taps', () => {
  it('decides nothing while the player is still tapping', () => {
    expect(tapAll(taps(0.5, 3)).taps).toHaveLength(3)
    expect(tapAll(taps(0.5, 9)).taps).toHaveLength(9)
  })

  it('starts a fresh attempt once the old one has gone quiet', () => {
    const stale = tapAll([10, 10.5])
    const fresh = addTap(stale, 10.5 + windowFor(stale) + 0.1)

    expect(fresh.taps).toHaveLength(1)
  })

  it('keeps an attempt alive right up to its window', () => {
    const live = tapAll([10, 10.5])
    const next = addTap(live, 10.5 + windowFor(live) - 0.1)

    expect(next.taps).toHaveLength(3)
  })
})

describe('what the silence commits', () => {
  it('reads a tempo from as few as two taps', () => {
    expect(TAPS_FOR_A_TEMPO).toBe(2)
    expect(tempoFrom([10, 10.5])).toEqual({ kind: 'tempo', bpm: 120 })
  })

  it('reads the same tempo however long the player keeps tapping', () => {
    for (const count of [2, 3, 4, 5, 8, 16]) {
      expect(tempoFrom(taps(0.5, count)), `${count} taps`).toEqual({
        kind: 'tempo',
        bpm: 120,
      })
    }
  })

  it('commits nothing from a single tap, so a stray press changes no tempo', () => {
    expect(commit(EMPTY_TAPS)).toEqual({ kind: 'none' })
    expect(tempoFrom([10])).toEqual({ kind: 'none' })
  })

  it('reads the tempo back for any legal tapped tempo', () => {
    for (const bpm of [40, 60, 97, 120, 150, 180]) {
      expect(tempoFrom(taps(60 / bpm, 5)), `${bpm} bpm`).toEqual({
        kind: 'tempo',
        bpm,
      })
    }
  })

  it('keeps the legal edges themselves legal', () => {
    expect(tempoFrom(taps(60 / MIN_BPM, 4)).kind).toBe('tempo')
    expect(tempoFrom(taps(60 / MAX_BPM, 4)).kind).toBe('tempo')
  })
})

describe('a fumbled tap', () => {
  it('is dropped when there are enough taps to tell', () => {
    // Steady 0.5 s, but the third tap lands late and the player carries on.
    expect(tempoFrom([10, 10.5, 11.4, 11.9])).toEqual({
      kind: 'tempo',
      bpm: 120,
    })
  })

  it('is dropped when it is the early one', () => {
    expect(tempoFrom([10, 10.5, 10.7, 11.2])).toEqual({
      kind: 'tempo',
      bpm: 120,
    })
  })

  it('is dropped when it is the very first interval', () => {
    expect(tempoFrom([10, 11.4, 11.9, 12.4])).toEqual({
      kind: 'tempo',
      bpm: 120,
    })
  })

  it('is averaged in when it is close enough to be a real beat', () => {
    // Inside OUTLIER_RATIO of the median, so it is playing, not fumbling.
    const nudged = 0.5 * (1 + OUTLIER_RATIO / 2)
    const result = tempoFrom([10, 10.5, 11, 11 + nudged])

    expect(result.kind).toBe('tempo')
    expect(result.kind === 'tempo' && result.bpm).not.toBe(120)
  })

  it('has no protection at two taps, which is the price of no tap count', () => {
    // One interval is its own median, so nothing can be an outlier. A fumbled
    // double-tap is a real tempo — the range check is all that stands behind it.
    expect(tempoFrom([10, 10.4])).toEqual({ kind: 'tempo', bpm: 150 })
  })
})

describe('a tempo outside the range', () => {
  it('is refused with the number the player actually tapped, never clamped', () => {
    expect(tempoFrom(taps(60 / 200, 4))).toEqual({ kind: 'refused', bpm: 200 })
    expect(tempoFrom(taps(60 / 30, 2))).toEqual({ kind: 'refused', bpm: 30 })
  })

  it('is refused rather than clamped to the nearest legal tempo', () => {
    const fast = tempoFrom(taps(60 / 200, 4))
    const slow = tempoFrom(taps(60 / 30, 2))

    expect(fast.kind === 'refused' && fast.bpm).not.toBe(MAX_BPM)
    expect(slow.kind === 'refused' && slow.bpm).not.toBe(MIN_BPM)
  })
})

describe('an interval that is not a beat at all', () => {
  it('is dropped like any other fumble, not taken as a reason to give up', () => {
    // A doubled event or a held key repeats a timestamp. Seven good intervals
    // describe 120 bpm and one is zero — the zero is the most out-of-line
    // interval there is, which is exactly what the outlier rule is for.
    expect(tempoFrom([10, 10.5, 11, 11.5, 12, 12.5, 12.5, 13])).toEqual({
      kind: 'tempo',
      bpm: 120,
    })
  })

  it('is dropped even when it is most of a short attempt', () => {
    expect(tempoFrom([10, 10.5, 10.5, 11])).toEqual({ kind: 'tempo', bpm: 120 })
  })

  it('commits nothing when nothing is left after dropping them', () => {
    for (const nothing of [[10, 10], [10, 10, 10], [10, 9.5]]) {
      expect(tempoFrom(nothing), `${nothing}`).toEqual({ kind: 'none' })
    }
  })
})

describe('the window before the next tap', () => {
  it('is two beats of whatever is being tapped', () => {
    // 120 bpm is a half-second beat, so two beats is one second.
    expect(windowFor(tapAll([10, 10.5]))).toBeCloseTo(1, 10)
    // 180 bpm.
    expect(windowFor(tapAll(taps(60 / 180, 3)))).toBeCloseTo(2 / 3, 10)
    // 40 bpm.
    expect(windowFor(tapAll(taps(60 / 40, 3)))).toBeCloseTo(3, 10)
  })

  it('is generous before there is any interval to scale by', () => {
    expect(windowFor(EMPTY_TAPS)).toBe(OPENING_WINDOW_S)
    expect(windowFor(tapAll([10]))).toBe(OPENING_WINDOW_S)
  })

  it('opens wide enough that no legal second tap is ever cut off', () => {
    // Whatever a player taps, their second tap cannot legally arrive later
    // than the slowest tempo's beat — which is what makes this window safe.
    expect(OPENING_WINDOW_S).toBe(2)
    expect(OPENING_WINDOW_S).toBeGreaterThan(60 / MIN_BPM)
  })

  it('shortens as soon as the tapping says it can', () => {
    const opening = windowFor(tapAll([10]))
    const knowing = windowFor(tapAll([10, 10.4]))

    expect(knowing).toBeLessThan(opening)
  })

  it('tracks the tapping rather than the first interval alone', () => {
    // Starts near 100 bpm and settles at 150; the window follows the average.
    const drifting = tapAll([10, 10.6, 11, 11.4])
    expect(windowFor(drifting)).toBeLessThan(windowFor(tapAll([10, 10.6])))
  })

  it('leaves room for a player who is late, which is why it is two beats', () => {
    // The invariant, probed properly. A *perfect* tapper lands exactly one beat
    // later and survives even a one-beat window — `beat > beat` is false — so
    // probing with a perfect tapper asserts nothing. The argument for two beats
    // is tolerance for a human, so the probe is a human: 20% late.
    for (const bpm of [40, 120, 180]) {
      const beat = 60 / bpm
      const steady = tapAll(taps(beat, 4))
      const late = 10 + 3 * beat + beat * 1.2

      expect(hasExpired(steady, late), `${bpm}`).toBe(false)
      // And the window really is wider than the beat it came from.
      expect(windowFor(steady), `${bpm}`).toBeGreaterThan(beat)
    }
  })

  it('holds the boundary open rather than closed, which is what makes 30 bpm tappable', () => {
    // Deliberate, not incidental: a tap landing exactly on the window is still
    // in time. This is the whole reason 30 bpm can be tapped at all, and until
    // this test the behaviour was guarded only by a fixture that happened to
    // sit on the boundary.
    const opening = tapAll([10])
    expect(hasExpired(opening, 10 + OPENING_WINDOW_S)).toBe(false)
    expect(hasExpired(opening, 10 + OPENING_WINDOW_S + 0.001)).toBe(true)

    const tapped = tapAll([10, 10.5])
    expect(hasExpired(tapped, 10.5 + windowFor(tapped))).toBe(false)
  })

  it('cannot assemble a tempo slower than the opening window allows', () => {
    // Documented in spec.md: below 30 bpm a second tap always arrives too late,
    // so the attempt restarts forever and no tempo is ever refused — it simply
    // never forms. Costs nothing while 40 bpm is the floor.
    const tooSlow = 60 / 25
    const first = addTap(EMPTY_TAPS, 10)
    const second = addTap(first, 10 + tooSlow)

    expect(second.taps).toHaveLength(1)
    expect(commit(second)).toEqual({ kind: 'none' })
  })

  it('never reports an attempt that was never started as expired', () => {
    expect(hasExpired(EMPTY_TAPS, 10_000)).toBe(false)
  })
})
