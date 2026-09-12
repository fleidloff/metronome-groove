/** specs/13-second-line */

import { STEPS_PER_BAR } from '@/lib/steps'
import type { GrooveDefinition, Line } from './definition'
import { STRAIGHT_FUNK_HUMANIZE } from './straightFunk'

export const SECOND_LINE_SWING = 0.2

export const SECOND_LINE_TAP = 0.45

const ORDINARY: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [6, 12] },
  { voice: 'snare', velocity: 0.86, steps: [6, 14] },
  { voice: 'snare', velocity: 0.7, steps: [10] },
  { voice: 'snare', velocity: SECOND_LINE_TAP, steps: [3, 11] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6, 10, 14] },
  { voice: 'hatClosed', velocity: 0.66, steps: [1, 3, 5, 7, 9, 11, 13, 15] },
]

const LIGHT: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [6, 12] },
  { voice: 'kick', velocity: 0.78, steps: [14] },
  { voice: 'snare', velocity: 0.86, steps: [6, 14] },
  { voice: 'snare', velocity: 0.7, steps: [10] },
  { voice: 'snare', velocity: SECOND_LINE_TAP, steps: [3, 11] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6, 10, 14] },
  { voice: 'hatClosed', velocity: 0.66, steps: [1, 3, 5, 7, 9, 11, 13, 15] },
  { voice: 'hatOpen', velocity: 0.8, steps: [12] },
]

const FILL: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [6, 12] },
  { voice: 'snare', velocity: 0.86, steps: [6, 14] },
  { voice: 'snare', velocity: 0.78, steps: [12] },
  { voice: 'snare', velocity: 0.7, steps: [10] },
  { voice: 'snare', velocity: 0.62, steps: [8] },
  { voice: 'snare', velocity: SECOND_LINE_TAP, steps: [3, 9, 11, 13, 15] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6, 10, 14] },
  { voice: 'hatClosed', velocity: 0.66, steps: [1, 3, 5, 7, 9, 11, 13, 15] },
]

export const SECOND_LINE: GrooveDefinition = {
  id: 'second-line',
  steps: STEPS_PER_BAR,
  subdivision: STEPS_PER_BAR,
  seed: 0x5f_32_6e_64,
  swing: SECOND_LINE_SWING,
  humanize: STRAIGHT_FUNK_HUMANIZE,
  voices: ['kick', 'snare', 'hatClosed', 'hatOpen'],
  ordinary: [ORDINARY],
  light: LIGHT,
  fill: FILL,
}
