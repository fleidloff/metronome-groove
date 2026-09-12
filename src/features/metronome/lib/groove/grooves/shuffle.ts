/** specs/12-shuffle */

import { STEPS_PER_BAR } from '@/lib/steps'
import type { GrooveDefinition, Line } from './definition'
import { STRAIGHT_FUNK_HUMANIZE } from './straightFunk'

const ORDINARY: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [8] },
  { voice: 'kick', velocity: 0.78, steps: [10] },
  { voice: 'snare', velocity: 0.95, steps: [4, 12] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6, 10, 14] },
]

const LIGHT: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [8] },
  { voice: 'kick', velocity: 0.78, steps: [10] },
  { voice: 'snare', velocity: 0.95, steps: [4, 12] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6, 14] },
  { voice: 'hatOpen', velocity: 0.76, steps: [10] },
]

const FILL: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [8, 12] },
  { voice: 'snare', velocity: 0.95, steps: [4] },
  { voice: 'snare', velocity: 0.62, steps: [9] },
  { voice: 'snare', velocity: 0.7, steps: [10, 13] },
  { voice: 'snare', velocity: 0.78, steps: [12, 15] },
  { voice: 'snare', velocity: 0.86, steps: [14] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6] },
  { voice: 'hatOpen', velocity: 0.76, steps: [10] },
]

export const SHUFFLE: GrooveDefinition = {
  id: 'shuffle',
  steps: STEPS_PER_BAR,
  subdivision: 8,
  seed: 0x5f_73_68_75,
  swing: 2 / 3,
  humanize: STRAIGHT_FUNK_HUMANIZE,
  ordinary: [ORDINARY],
  voices: ['kick', 'snare', 'hatClosed', 'hatOpen'],
  light: LIGHT,
  fill: FILL,
}
