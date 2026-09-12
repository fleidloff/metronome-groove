/** specs/11-bossa-nova */

import { STEPS_PER_BAR } from '@/lib/steps'
import type { GrooveDefinition, Line } from './definition'
import { STRAIGHT_FUNK_HUMANIZE } from './straightFunk'

const BOSSA_NOVA_HUMANIZE = {
  ...STRAIGHT_FUNK_HUMANIZE,
  exactVoices: ['claves'],
} as const

const KIT: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [8] },
  { voice: 'kick', velocity: 0.78, steps: [6, 14] },
  { voice: 'hatClosed', velocity: 0.66, steps: [0, 2, 4, 6, 8, 10, 12, 14] },
]

const clave = (steps: readonly number[]): Line => ({ voice: 'claves', velocity: 0.5, steps })

const PHASE_0: readonly Line[] = [clave([0, 6, 12]), ...KIT]

const PHASE_1: readonly Line[] = [clave([4, 10]), ...KIT]

const LIGHT: readonly Line[] = [
  clave([4, 10]),
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [8, 12, 14] },
  { voice: 'kick', velocity: 0.78, steps: [6] },
  { voice: 'hatClosed', velocity: 0.66, steps: [0, 2, 4, 6, 8, 10, 12, 14] },
]

const FILL: readonly Line[] = [
  clave([4, 10]),
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [8, 12, 14] },
  { voice: 'kick', velocity: 0.78, steps: [6] },
  { voice: 'snare', velocity: 0.62, steps: [13] },
  { voice: 'snare', velocity: 0.7, steps: [15] },
  { voice: 'hatClosed', velocity: 0.66, steps: [0, 2, 4, 6, 8, 10, 12, 14] },
]

export const BOSSA_NOVA: GrooveDefinition = {
  id: 'bossa-nova',
  steps: STEPS_PER_BAR,
  subdivision: 8,
  seed: 0x5f_62_6f_73,
  swing: 0,
  humanize: BOSSA_NOVA_HUMANIZE,
  ordinary: [PHASE_0, PHASE_1],
  // `claves` is decoded for the count-in by every bank, so it costs no download.
  voices: ['kick', 'snare', 'hatClosed'],
  light: LIGHT,
  fill: FILL,
}
