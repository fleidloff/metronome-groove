import type { Velocity } from '@/lib/velocity'

export type VoiceName = 'claves' | 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'rim'

export const SOURCE_IDS = ['click', 'bossa-nova', 'rock', 'straight-funk'] as const

export type SourceId = (typeof SOURCE_IDS)[number]

export interface Hit {
  readonly voice: VoiceName
  readonly velocity: Velocity
}

export interface Humanize {
  readonly timingFractionOfStep: number
  readonly timingCeilingMs: number
  readonly velocityJitter: number
  /** Timing bound zero, velocity jitter unaffected — a bound, not the per-voice
   *  lean ADR 0007 rule 2 forbids. */
  readonly exactVoices: readonly VoiceName[]
}

export interface Source {
  readonly id: SourceId
  readonly steps: number
  readonly humanize: Humanize | null
  hitsAt(step: number): readonly Hit[]
  displace?(hit: Hit, step: number, stepSeconds: number): number
  /** Applied *after* velocity-layer selection, so a hit at a layer boundary
   *  cannot flicker between timbres. */
  trim?(hit: Hit, step: number): number
  /** The grid step unless the source shifts its own timeline against the
   *  scheduler's; see `countIn/source.ts`. */
  takeStep?(step: number): number
}

export interface Placement {
  readonly step: number
  readonly gain: number
}

export interface Clock {
  readonly currentTime: number
  schedule(at: number, hit: Hit, placement: Placement): void
  /** Silence before a sample's attack: the claves' is 8.3 ms, every kit voice's
   *  is zero. */
  leadInFor(voice: VoiceName): number
}
