import { type MuteSet, NO_MUTES, audibleHits } from '../mute/voices'
import type { Source } from '../transport/source'
import { hitsAt } from './cycle'
import type { GrooveDefinition } from './grooves/definition'
import { gainTrim, timingOffset } from './humanize'
import { swingOffset } from './swing'

export interface GrooveSourceOptions {
  readonly seed?: number
  readonly variations?: () => boolean
  readonly mutes?: () => MuteSet
}

export function createGrooveSource(
  groove: GrooveDefinition,
  {
    seed = groove.seed,
    variations = () => true,
    mutes = () => NO_MUTES,
  }: GrooveSourceOptions = {},
): Source {
  const { humanize, swing } = groove

  return {
    id: groove.id,
    steps: groove.steps,
    humanize,
    hitsAt: (step) => audibleHits(hitsAt(groove, step, variations()), mutes()),
    displace: (hit, step, stepSeconds) =>
      swingOffset(swing, step, stepSeconds, groove.steps / groove.subdivision) +
      timingOffset(humanize, seed, hit.voice, step, stepSeconds),
    trim: (hit, step) => gainTrim(humanize, seed, hit.voice, step),
    /** ADR 0011 */
    takeStep: (step) => step,
  }
}
