import type { Velocity } from '@/lib/velocity'

export type VoiceName = 'claves' | 'kick' | 'snare' | 'hatClosed' | 'hatOpen'

/**
 * Every source the app has, as a value. The type derives from it so there is
 * still one declaration — a validator that needs to check an id at runtime
 * (reading a stored setup, say) checks against this rather than against a
 * second copy of the union.
 *
 * The order is the select box's order: the click first because it is the
 * default, then rock, which `docs/music.md` calls the baseline.
 */
export const SOURCE_IDS = ['click', 'rock', 'straight-funk'] as const

export type SourceId = (typeof SOURCE_IDS)[number]

export interface Hit {
  readonly voice: VoiceName
  readonly velocity: Velocity
}

/**
 * Bounded, stateless displacement. The bound is a fraction of a step with a
 * millisecond ceiling, never a bare millisecond figure: a sixteenth is 375 ms
 * at 40 bpm and 83 ms at 180, so a flat 9 ms would mean two different things.
 */
export interface Humanize {
  readonly timingFractionOfStep: number
  readonly timingCeilingMs: number
  readonly velocityJitter: number
}

/**
 * What sounds, and when. The click is a four-step source with one voice; the
 * groove is a sixteen-step source with four. `humanize` is null for the click
 * and only for the click.
 */
export interface Source {
  readonly id: SourceId
  readonly steps: number
  readonly humanize: Humanize | null
  hitsAt(step: number): readonly Hit[]
  /**
   * Seconds to displace this hit, bounded and stateless — the same arguments
   * return the same value in any call order, which is what keeps the groove
   * returning to the grid rather than wandering off it.
   *
   * The source owns this rather than the scheduler: a transport that reached
   * into one groove's humanize would know about that groove. A source that is
   * not humanized returns 0, and the click is the only one.
   */
  displace?(hit: Hit, step: number, stepSeconds: number): number
  /** Gain multiplier, applied *after* layer selection so a hit at a layer
   *  boundary cannot flicker between timbres. 1 when not humanized. */
  trim?(hit: Hit, step: number): number
  /**
   * The step the device indexes round-robin takes on. The grid step unless a
   * source shifts its own timeline against the scheduler's — a count-in maps
   * it back, so the groove's first sounding bar draws the takes it would have
   * drawn had it started from silence.
   *
   * The source owns this for the same reason it owns `displace`: a transport
   * that knew which sources shift their timeline would know about those
   * sources.
   */
  takeStep?(step: number): number
}

/**
 * What the device needs past the hit itself. It rides with the hit rather than
 * living on it because neither field is part of what the figure wrote down.
 */
export interface Placement {
  /**
   * The absolute step, which never wraps at the bar. Round-robin indexes on
   * this: bar-local indexing makes a one-bar loop bit-identical every bar,
   * where absolute gives three takes on a sixteen-step bar a period of
   * lcm(3, 16) = 48 steps.
   */
  readonly step: number
  /** The source's `trim`, to apply once the velocity layer has been chosen. */
  readonly gain: number
}

/** Time is injected so a test can advance it rather than wait for it. */
export interface Clock {
  readonly currentTime: number
  schedule(at: number, hit: Hit, placement: Placement): void
  /** Silence before a sample's attack. A property of the recording, not of the
   *  grid: the claves' is 8.3 ms and every kit voice's is zero. */
  leadInFor(voice: VoiceName): number
}
