import type { Velocity } from '@/lib/velocity'
import type { Humanize, SourceId, VoiceName } from '../../transport/source'

/** One voice at one velocity, and every step of the bar it sounds on. */
export interface Line {
  readonly voice: VoiceName
  readonly velocity: Velocity
  readonly steps: readonly number[]
}

/**
 * A groove as data. Everything that makes one groove different from another
 * lives here; everything they share is `cycle.ts` and `source.ts`.
 */
export interface GrooveDefinition {
  readonly id: SourceId
  /** The grid the figure is written on. 16 for every groove so far. */
  readonly steps: number
  /**
   * The subdivision the groove *states*, which is not always the grid it is
   * written on: 16 for funk, 8 for rock. The positions between its steps are
   * rests, and ADR 0010's invariant 2 reads against this rather than against
   * `steps` — a groove that states eighths is not full of holes.
   */
  readonly subdivision: number
  readonly seed: number
  readonly swing: number
  readonly humanize: Humanize
  readonly ordinary: readonly Line[]
  readonly light: readonly Line[]
  readonly fill: readonly Line[]
}

/** The order the voices are written in is the order a step hands them out. */
export const VOICE_ORDER: readonly VoiceName[] = [
  'kick',
  'snare',
  'hatClosed',
  'hatOpen',
]
