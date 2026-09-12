import { STEPS_PER_BAR } from '@/lib/steps'
import type { Source } from '../transport/source'
import { hitsAt } from './figure'
import { STRAIGHT_FUNK_HUMANIZE, gainTrim, timingOffset } from './humanize'
import { STRAIGHT_FUNK_SWING, swingOffset } from './swing'

/**
 * Fixed rather than drawn at start-up. The displacement of every hit is a pure
 * function of `(seed, voice, step)`, so a constant seed is what makes the
 * groove sound the same on Tuesday as it did on Monday — which is what a
 * listening pass needs in order to be worth anything. A caller may pass its
 * own to hear a different set of imperfections from the same figure.
 */
export const STRAIGHT_FUNK_SEED = 0x5f_75_6e_6b

export function createStraightFunkSource(seed: number = STRAIGHT_FUNK_SEED): Source {
  return {
    id: 'straight-funk',
    steps: STEPS_PER_BAR,
    humanize: STRAIGHT_FUNK_HUMANIZE,
    hitsAt,
    displace: (hit, step, stepSeconds) =>
      swingOffset(STRAIGHT_FUNK_SWING, step, stepSeconds) +
      timingOffset(STRAIGHT_FUNK_HUMANIZE, seed, hit.voice, step, stepSeconds),
    trim: (hit, step) => gainTrim(STRAIGHT_FUNK_HUMANIZE, seed, hit.voice, step),
  }
}
