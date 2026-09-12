import type { Velocity } from '@/lib/velocity'

export type VoiceName = 'claves' | 'kick' | 'snare' | 'hatClosed' | 'hatOpen'

export type SourceId = 'click' | 'straight-funk'

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
