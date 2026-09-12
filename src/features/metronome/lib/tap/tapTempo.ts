import { MAX_BPM, MIN_BPM } from '../transport/tempo'

/**
 * The silence ends an attempt, not a tap count — and it is measured in beats of
 * whatever is being tapped rather than in seconds, so it is short at a fast
 * tempo and long at a slow one.
 */
export const BEATS_OF_SILENCE = 2

/**
 * The window after a single tap, before there is any interval to scale by.
 *
 * Two seconds: the slowest legal tap gap is 1.5 s at 40 bpm, so this clears it
 * with margin, and one tap commits nothing anyway — all this window decides is
 * how long a stray press holds the click quiet.
 *
 * Scaling it by the *current* tempo was rejected. Tap a 40 bpm tune while the
 * slider sits at 180 and the window would be 0.67 s, so the second tap always
 * lands too late and the attempt restarts forever. A flat opening has no such
 * failure; from the second tap on, the window is two beats of what is actually
 * being tapped.
 *
 * A consequence worth knowing: a second tap slower than this always restarts,
 * so no tempo below 30 bpm can be tapped in at all. Nothing below 40 is legal,
 * so it costs nothing — until the range widens downwards.
 */
export const OPENING_WINDOW_S = 2

/** Two taps is one interval, which is the least that describes a tempo. */
export const TAPS_FOR_A_TEMPO = 2

/** An interval this far from the median is a fumble rather than a beat. */
export const OUTLIER_RATIO = 0.5

export type TapState = {
  /** Tap times in seconds, oldest first. Empty means no attempt in flight. */
  readonly taps: readonly number[]
}

export type TapCommit =
  /** Fewer than two taps: nothing to average, so the tempo is untouched. */
  | { kind: 'none' }
  | { kind: 'tempo'; bpm: number }
  /** Outside the range — refused, never clamped, because a tempo the player
   *  did not tap is undiagnosable from across the room. */
  | { kind: 'refused'; bpm: number }

export const EMPTY_TAPS: TapState = { taps: [] }

/** How long this attempt will wait for another tap, in seconds. */
export function windowFor(state: TapState): number {
  const beat = meanInterval(state.taps)
  return beat === null ? OPENING_WINDOW_S : BEATS_OF_SILENCE * beat
}

export function hasExpired(state: TapState, now: number): boolean {
  const last = state.taps.at(-1)
  return last !== undefined && now - last > windowFor(state)
}

/** Records a tap. Decides nothing — the silence does that, in `commit`. */
export function addTap(state: TapState, at: number): TapState {
  return { taps: hasExpired(state, at) ? [at] : [...state.taps, at] }
}

/** What the attempt came to, once the player has stopped tapping. */
export function commit(state: TapState): TapCommit {
  const bpm = bpmFrom(state.taps)
  if (bpm === null) return { kind: 'none' }

  return bpm >= MIN_BPM && bpm <= MAX_BPM
    ? { kind: 'tempo', bpm }
    : { kind: 'refused', bpm }
}

/**
 * The median interval decides what a beat is here; anything far from it is a
 * fumble and is dropped rather than averaged in, so one bad tap costs nothing.
 *
 * With a single interval there is no median worth the name and no protection —
 * two taps is a tempo on trust. Three or more and the outlier rule bites.
 */
function bpmFrom(taps: readonly number[]): number | null {
  const mean = meanInterval(taps)
  return mean === null ? null : Math.round(60 / mean)
}

function meanInterval(taps: readonly number[]): number | null {
  if (taps.length < TAPS_FOR_A_TEMPO) return null

  // A zero or negative interval is a repeated or out-of-order timestamp — a
  // doubled event, a held key, a clock that stepped back. It is the most
  // out-of-line interval there can be, so it is dropped like any other fumble
  // rather than discarding the attempt: eight good taps with one duplicate
  // still describe a tempo, and giving up on them would contradict the rule
  // that more taps make a better answer.
  const intervals = taps
    .slice(1)
    .map((tap, index) => tap - taps[index])
    .filter((interval) => interval > 0)

  if (intervals.length === 0) return null

  const median = [...intervals].sort((a, b) => a - b)[
    Math.floor(intervals.length / 2)
  ]

  // The median always survives its own filter, so this is never empty.
  const kept = intervals.filter(
    (interval) => Math.abs(interval - median) <= median * OUTLIER_RATIO,
  )

  return kept.reduce((sum, interval) => sum + interval, 0) / kept.length
}
