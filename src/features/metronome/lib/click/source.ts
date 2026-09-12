import { BEATS_PER_BAR } from '@/lib/steps'
import type { Hit, Source } from '../transport/source'
import { CLICK_PATTERN } from './pattern'

/**
 * The click as a source like any other: four steps, one voice, and the only
 * one whose `humanize` is null. Null rather than a zeroed record, because a
 * click humanized by zero is one edit away from being humanized by something,
 * and being exact is the whole of what a click is for.
 *
 * `displace` and `trim` are absent for the same reason — there is nothing to
 * apply, so there is nothing to get wrong.
 */
const BAR: readonly (readonly Hit[])[] = CLICK_PATTERN.map((velocity) => [
  { voice: 'claves', velocity } as const,
])

export const CLICK_SOURCE: Source = {
  id: 'click',
  steps: BEATS_PER_BAR,
  humanize: null,
  hitsAt: (step) => BAR[((step % BAR.length) + BAR.length) % BAR.length],
}
