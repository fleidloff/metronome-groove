import type { ComponentType } from 'react'
import { BandedDiscGlyph } from '@/components/display/BandedDiscGlyph'
import { ConesGlyph } from '@/components/display/ConesGlyph'
import { DiscGlyph } from '@/components/display/DiscGlyph'
import type { MutableVoice } from '../lib/mute/voices'

export const GLYPH_OF: Record<MutableVoice, ComponentType> = {
  kick: DiscGlyph,
  snare: BandedDiscGlyph,
  hat: ConesGlyph,
}
