import { MAX_BPM, MIN_BPM } from '../transport/tempo'

export const BEATS_OF_SILENCE = 2

export const OPENING_WINDOW_S = 2

export const TAPS_FOR_A_TEMPO = 2

export const OUTLIER_RATIO = 0.5

export type TapState = {
  readonly taps: readonly number[]
}

export type TapCommit =
  | { kind: 'none' }
  | { kind: 'tempo'; bpm: number }
  | { kind: 'refused'; bpm: number }

export const EMPTY_TAPS: TapState = { taps: [] }

export function windowFor(state: TapState): number {
  const beat = meanInterval(state.taps)
  return beat === null ? OPENING_WINDOW_S : BEATS_OF_SILENCE * beat
}

export function hasExpired(state: TapState, now: number): boolean {
  const last = state.taps.at(-1)
  return last !== undefined && now - last > windowFor(state)
}

export function addTap(state: TapState, at: number): TapState {
  return { taps: hasExpired(state, at) ? [at] : [...state.taps, at] }
}

export function commit(state: TapState): TapCommit {
  const bpm = bpmFrom(state.taps)
  if (bpm === null) return { kind: 'none' }

  return bpm >= MIN_BPM && bpm <= MAX_BPM
    ? { kind: 'tempo', bpm }
    : { kind: 'refused', bpm }
}

function bpmFrom(taps: readonly number[]): number | null {
  const mean = meanInterval(taps)
  return mean === null ? null : Math.round(60 / mean)
}

function meanInterval(taps: readonly number[]): number | null {
  if (taps.length < TAPS_FOR_A_TEMPO) return null

  const intervals = taps
    .slice(1)
    .map((tap, index) => tap - taps[index])
    .filter((interval) => interval > 0)

  if (intervals.length === 0) return null

  const median = [...intervals].sort((a, b) => a - b)[
    Math.floor(intervals.length / 2)
  ]

  const kept = intervals.filter(
    (interval) => Math.abs(interval - median) <= median * OUTLIER_RATIO,
  )

  return kept.reduce((sum, interval) => sum + interval, 0) / kept.length
}
