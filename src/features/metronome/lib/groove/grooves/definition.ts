import type { Velocity } from '@/lib/velocity'
import type { Humanize, SourceId, VoiceName } from '../../transport/source'
import type { KitVoiceName } from '../kit'

export interface Line {
  readonly voice: VoiceName
  readonly velocity: Velocity
  readonly steps: readonly number[]
}

export interface GrooveDefinition {
  readonly id: SourceId
  readonly steps: number
  readonly subdivision: number
  readonly seed: number
  readonly swing: number
  readonly humanize: Humanize
  readonly voices: readonly KitVoiceName[]
  readonly ordinary: readonly (readonly Line[])[]
  readonly light: readonly Line[]
  readonly fill: readonly Line[]
}

export const VOICE_ORDER: readonly VoiceName[] = [
  'kick',
  'snare',
  'hatClosed',
  'hatOpen',
  'rim',
  'claves',
]
