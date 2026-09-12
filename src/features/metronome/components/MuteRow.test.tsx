import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BandedDiscGlyph } from '@/components/display/BandedDiscGlyph'
import { ConesGlyph } from '@/components/display/ConesGlyph'
import { DiscGlyph } from '@/components/display/DiscGlyph'
import { metronome } from '@/lib/snippets'
import { BOSSA_NOVA } from '../lib/groove/grooves/bossaNova'
import type { GrooveDefinition } from '../lib/groove/grooves/definition'
import { ROCK } from '../lib/groove/grooves/rock'
import { SECOND_LINE } from '../lib/groove/grooves/secondLine'
import { SHUFFLE } from '../lib/groove/grooves/shuffle'
import { STRAIGHT_FUNK } from '../lib/groove/grooves/straightFunk'
import {
  MUTABLE_VOICES,
  NO_MUTES,
  type MutableVoice,
} from '../lib/mute/voices'
import { MuteRow } from './MuteRow'

const NAME_OF: Record<MutableVoice, string> = {
  kick: metronome.kick,
  snare: metronome.snare,
  hat: metronome.hat,
}

const RUNS_OUT: readonly GrooveDefinition[] = [
  ROCK,
  STRAIGHT_FUNK,
  SHUFFLE,
  SECOND_LINE,
]

const noop = () => {}

const boxFor = (voice: MutableVoice) =>
  screen.getByRole('checkbox', { name: NAME_OF[voice] })

const rowFor = (voice: MutableVoice) => boxFor(voice).closest('label')

const drawingIn = (element: Element | null) =>
  element?.querySelector('svg')?.innerHTML ?? ''

const enableAll = () =>
  screen.queryByRole('button', { name: metronome.enableAll })

describe('the row of voice toggles', () => {
  it('names itself from a snippet, so the three toggles read as one control', () => {
    render(<MuteRow groove={ROCK} mutes={NO_MUTES} onChange={noop} />)

    expect(screen.getByRole('group', { name: metronome.voices })).toBeVisible()
  })

  it('renders one toggle per mutable voice, in MUTABLE_VOICES order', () => {
    render(<MuteRow groove={ROCK} mutes={NO_MUTES} onChange={noop} />)

    const boxes = screen.getAllByRole('checkbox')

    expect(boxes).toHaveLength(MUTABLE_VOICES.length)
    MUTABLE_VOICES.forEach((voice, index) => {
      expect(boxes[index]).toHaveAccessibleName(NAME_OF[voice])
    })
  })

  it('keeps that order in bossa too, which is reached by position and not by reading', () => {
    render(<MuteRow groove={BOSSA_NOVA} mutes={NO_MUTES} onChange={noop} />)

    const boxes = screen.getAllByRole('checkbox')

    expect(boxes).toHaveLength(MUTABLE_VOICES.length)
    MUTABLE_VOICES.forEach((voice, index) => {
      expect(boxes[index]).toHaveAccessibleName(NAME_OF[voice])
    })
  })

  it('draws the filled disc in front of the kick', () => {
    render(<MuteRow groove={ROCK} mutes={NO_MUTES} onChange={noop} />)
    const reference = render(<DiscGlyph />)

    expect(drawingIn(rowFor('kick'))).toBe(drawingIn(reference.container))
  })

  it('draws the banded disc in front of the snare', () => {
    render(<MuteRow groove={ROCK} mutes={NO_MUTES} onChange={noop} />)
    const reference = render(<BandedDiscGlyph />)

    expect(drawingIn(rowFor('snare'))).toBe(drawingIn(reference.container))
  })

  it('draws the two cones in front of the hat', () => {
    render(<MuteRow groove={ROCK} mutes={NO_MUTES} onChange={noop} />)
    const reference = render(<ConesGlyph />)

    expect(drawingIn(rowFor('hat'))).toBe(drawingIn(reference.container))
  })

  it('leaves the glyphs out of the accessibility tree, so a name is the label alone', () => {
    render(<MuteRow groove={ROCK} mutes={NO_MUTES} onChange={noop} />)

    for (const voice of MUTABLE_VOICES) {
      expect(rowFor(voice)?.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      )
    }
  })

  it('ticks a voice that sounds and unticks one that is muted', () => {
    render(<MuteRow groove={ROCK} mutes={['hat']} onChange={noop} />)

    expect(boxFor('kick')).toBeChecked()
    expect(boxFor('snare')).toBeChecked()
    expect(boxFor('hat')).not.toBeChecked()
  })

  it('reports the voice a press silences, leaving the rest of the set alone', () => {
    const onChange = vi.fn()
    render(<MuteRow groove={ROCK} mutes={['kick']} onChange={onChange} />)

    fireEvent.click(boxFor('hat'))

    expect(onChange).toHaveBeenCalledWith(['kick', 'hat'])
  })

  it('reports the voice a press brings back', () => {
    const onChange = vi.fn()
    render(<MuteRow groove={ROCK} mutes={['kick', 'hat']} onChange={onChange} />)

    fireEvent.click(boxFor('hat'))

    expect(onChange).toHaveBeenCalledWith(['kick'])
  })
})

describe('the last voice that still sounds', () => {
  for (const groove of RUNS_OUT) {
    it(`cannot be silenced in ${groove.id}, and says so rather than refusing the press`, () => {
      render(<MuteRow groove={groove} mutes={['kick', 'snare']} onChange={noop} />)

      expect(boxFor('hat')).toBeDisabled()
      expect(boxFor('hat')).toBeChecked()
      expect(boxFor('kick')).toBeEnabled()
      expect(boxFor('snare')).toBeEnabled()
    })
  }

  it('disables whichever voice is the survivor, not the hat by name', () => {
    render(<MuteRow groove={ROCK} mutes={['snare', 'hat']} onChange={noop} />)

    expect(boxFor('kick')).toBeDisabled()
    expect(boxFor('hat')).toBeEnabled()
  })

  it('disables nothing while two voices are still sounding', () => {
    render(<MuteRow groove={ROCK} mutes={['kick']} onChange={noop} />)

    for (const voice of MUTABLE_VOICES) expect(boxFor(voice)).toBeEnabled()
  })

  /** specs/15-per-voice-mute/spec.md, `## Decided` */
  it('is never a bossa toggle: the clave sounds under all three and no toggle reaches it', () => {
    render(
      <MuteRow groove={BOSSA_NOVA} mutes={['kick', 'snare']} onChange={noop} />,
    )

    expect(boxFor('hat')).toBeEnabled()
  })

  it('lets bossa be muted all the way down to its bare clave', () => {
    const onChange = vi.fn()
    render(
      <MuteRow
        groove={BOSSA_NOVA}
        mutes={['kick', 'snare']}
        onChange={onChange}
      />,
    )

    fireEvent.click(boxFor('hat'))

    expect(onChange).toHaveBeenCalledWith(['kick', 'snare', 'hat'])
  })

  it('still offers every bossa toggle once the clave is playing alone', () => {
    render(
      <MuteRow
        groove={BOSSA_NOVA}
        mutes={['kick', 'snare', 'hat']}
        onChange={noop}
      />,
    )

    for (const voice of MUTABLE_VOICES) {
      expect(boxFor(voice)).toBeEnabled()
      expect(boxFor(voice)).not.toBeChecked()
    }
  })
})

describe('enable all', () => {
  it('is absent while every voice still sounds', () => {
    render(<MuteRow groove={ROCK} mutes={NO_MUTES} onChange={noop} />)

    expect(enableAll()).toBeNull()
  })

  it('arrives the moment one voice is silenced', () => {
    render(<MuteRow groove={ROCK} mutes={['hat']} onChange={noop} />)

    expect(enableAll()).toBeVisible()
  })

  it('reports an empty set, whatever was muted', () => {
    const onChange = vi.fn()
    render(
      <MuteRow groove={ROCK} mutes={['kick', 'snare']} onChange={onChange} />,
    )

    fireEvent.click(enableAll()!)

    expect(onChange).toHaveBeenCalledWith([])
  })
})
