import type { Source } from '../transport/source'
import { hitsAt } from './cycle'
import type { GrooveDefinition } from './grooves/definition'
import { gainTrim, timingOffset } from './humanize'
import { swingOffset } from './swing'

export interface GrooveSourceOptions {
  /** Defaults to the groove's own, which is what makes a run repeatable. */
  readonly seed?: number
  /**
   * Read per step rather than captured once, which is what makes a toggle land
   * on the next unqueued step: the scheduler queues about 100 ms ahead and
   * calls `hitsAt` as each step is queued.
   */
  readonly variations?: () => boolean
}

/**
 * One factory over any groove's data. Every groove displaces, trims and indexes
 * takes the same way; what differs is the lines, the swing, the seed and the
 * humanize record, and all four arrive in the definition.
 */
export function createGrooveSource(
  groove: GrooveDefinition,
  { seed = groove.seed, variations = () => true }: GrooveSourceOptions = {},
): Source {
  const { humanize, swing } = groove

  return {
    id: groove.id,
    steps: groove.steps,
    humanize,
    hitsAt: (step) => hitsAt(groove, step, variations()),
    displace: (hit, step, stepSeconds) =>
      swingOffset(swing, step, stepSeconds) +
      timingOffset(humanize, seed, hit.voice, step, stepSeconds),
    trim: (hit, step) => gainTrim(humanize, seed, hit.voice, step),
    /** A groove does not shift its own timeline against the scheduler's, so the
     *  take step is the grid step. A count-in is what moves it, and it wraps
     *  this rather than being known to it. */
    takeStep: (step) => step,
  }
}
