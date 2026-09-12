import { BEATS_PER_BAR } from '@/lib/steps'
import type { Hit, Source } from '../transport/source'
import { CLICK_PATTERN } from './pattern'

const BAR: readonly (readonly Hit[])[] = CLICK_PATTERN.map((velocity) => [
  { voice: 'claves', velocity } as const,
])

export const CLICK_SOURCE: Source = {
  id: 'click',
  steps: BEATS_PER_BAR,
  humanize: null,
  hitsAt: (step) => BAR[((step % BAR.length) + BAR.length) % BAR.length],
}
