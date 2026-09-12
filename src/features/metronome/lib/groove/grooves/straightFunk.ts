/** specs/6-straight-funk-groove */

import { STEPS_PER_BAR } from '@/lib/steps'
import type { Humanize } from '../../transport/source'
import type { GrooveDefinition, Line } from './definition'

/** `specs/6-straight-funk-groove/tech-spec.md` § Why the pack’s numbers cannot be copied */
export const GHOST_VELOCITY = 0.37

export const STRAIGHT_FUNK_HUMANIZE: Humanize = {
  timingFractionOfStep: 0.03,
  timingCeilingMs: 4,
  velocityJitter: 0.04,
  exactVoices: [],
}

export const STRAIGHT_FUNK_SWING = 0

export const STRAIGHT_FUNK_SEED = 0x5f_75_6e_6b

const ORDINARY: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [10] },
  { voice: 'kick', velocity: 0.82, steps: [3] },
  { voice: 'snare', velocity: 0.92, steps: [4, 12] },
  { voice: 'snare', velocity: GHOST_VELOCITY, steps: [7, 9, 15] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6, 10] },
  { voice: 'hatClosed', velocity: 0.66, steps: [1, 3, 5, 7, 9, 11, 13, 15] },
  { voice: 'hatOpen', velocity: 0.88, steps: [14] },
]

const LIGHT: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.86, steps: [10] },
  { voice: 'kick', velocity: 0.82, steps: [3] },
  { voice: 'snare', velocity: 0.92, steps: [4, 12] },
  { voice: 'snare', velocity: GHOST_VELOCITY, steps: [7, 9] },
  { voice: 'snare', velocity: 0.66, steps: [15] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8, 12] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6] },
  { voice: 'hatClosed', velocity: 0.66, steps: [1, 3, 5, 7, 9, 11, 13, 15] },
  { voice: 'hatOpen', velocity: 0.88, steps: [14] },
  { voice: 'hatOpen', velocity: 0.76, steps: [10] },
]

const FILL: readonly Line[] = [
  { voice: 'kick', velocity: 0.95, steps: [0] },
  { voice: 'kick', velocity: 0.82, steps: [3] },
  { voice: 'snare', velocity: 0.92, steps: [4] },
  { voice: 'snare', velocity: GHOST_VELOCITY, steps: [7, 9, 13] },
  { voice: 'snare', velocity: 0.78, steps: [8, 14] },
  { voice: 'snare', velocity: 0.7, steps: [10] },
  { voice: 'snare', velocity: 0.62, steps: [11] },
  { voice: 'snare', velocity: 0.86, steps: [12] },
  { voice: 'snare', velocity: 0.94, steps: [15] },
  { voice: 'hatClosed', velocity: 0.9, steps: [0, 4, 8] },
  { voice: 'hatClosed', velocity: 0.78, steps: [2, 6] },
  { voice: 'hatClosed', velocity: 0.66, steps: [1, 3, 5, 7] },
]

export const STRAIGHT_FUNK: GrooveDefinition = {
  id: 'straight-funk',
  steps: STEPS_PER_BAR,
  subdivision: STEPS_PER_BAR,
  seed: STRAIGHT_FUNK_SEED,
  swing: STRAIGHT_FUNK_SWING,
  humanize: STRAIGHT_FUNK_HUMANIZE,
  ordinary: [ORDINARY],
  voices: ['kick', 'snare', 'hatClosed', 'hatOpen'],
  light: LIGHT,
  fill: FILL,
}
