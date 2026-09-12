import type { SourceId } from '../../transport/source'
import { BOSSA_NOVA } from './bossaNova'
import type { GrooveDefinition } from './definition'
import { ROCK } from './rock'
import { SECOND_LINE } from './secondLine'
import { SHUFFLE } from './shuffle'
import { STRAIGHT_FUNK } from './straightFunk'

/**
 * Every groove, by the id that names it. Typed over `SourceId` minus the click,
 * so a sixth source is a compile error here rather than a groove that silently
 * falls back to another one.
 */
export const GROOVES: Record<Exclude<SourceId, 'click'>, GrooveDefinition> = {
  'bossa-nova': BOSSA_NOVA,
  rock: ROCK,
  shuffle: SHUFFLE,
  'straight-funk': STRAIGHT_FUNK,
  'second-line': SECOND_LINE,
}
