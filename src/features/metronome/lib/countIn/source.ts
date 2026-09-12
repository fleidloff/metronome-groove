import { isQuarter } from '@/lib/steps'
import { CLICK_PATTERN } from '../click/pattern'
import type { Hit, Source } from '../transport/source'

const NOTHING: readonly Hit[] = []

/** specs/9-count-in */
export function createCountInSource(inner: Source, countIn: () => boolean): Source {
  const stepsPerBeat = inner.steps / CLICK_PATTERN.length

  const countBar: readonly (readonly Hit[])[] = Array.from(
    { length: inner.steps },
    (_, step): readonly Hit[] =>
      isQuarter(step, inner.steps)
        ? [{ voice: 'claves', velocity: CLICK_PATTERN[step / stepsPerBeat] }]
        : NOTHING,
  )

  /** Null while the count bar sounds, so the inner's first sounding bar is its
   *  own step 0 and round-robin, displacement and trim all line up. */
  const innerStep = (step: number): number | null => {
    if (!countIn()) return step

    return step < inner.steps ? null : step - inner.steps
  }

  return {
    id: inner.id,
    steps: inner.steps,
    humanize: inner.humanize,

    hitsAt(step) {
      const at = innerStep(step)

      return at === null ? countBar[step] : inner.hitsAt(at)
    },

    displace(hit, step, stepSeconds) {
      const at = innerStep(step)

      return at === null ? 0 : (inner.displace?.(hit, at, stepSeconds) ?? 0)
    },

    trim(hit, step) {
      const at = innerStep(step)

      return at === null ? 1 : (inner.trim?.(hit, at) ?? 1)
    },

    takeStep(step) {
      const at = innerStep(step)

      return at === null ? step : (inner.takeStep?.(at) ?? at)
    },
  }
}
