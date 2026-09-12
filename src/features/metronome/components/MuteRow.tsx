import { Button } from '@/components/controls/Button'
import { Checkbox } from '@/components/controls/Checkbox'
import { Stack } from '@/components/layout/Stack'
import { metronome } from '@/lib/snippets'
import type { GrooveDefinition } from '../lib/groove/grooves/definition'
import {
  canMute,
  mutableVoicesOf,
  NO_MUTES,
  type MutableVoice,
  type MuteSet,
} from '../lib/mute/voices'
import { GLYPH_OF } from './voiceGlyphs'

const NAME_OF: Record<MutableVoice, string> = {
  kick: metronome.kick,
  snare: metronome.snare,
  hat: metronome.hat,
}

export function MuteRow({
  groove,
  mutes,
  onChange,
}: {
  groove: GrooveDefinition
  mutes: MuteSet
  onChange: (mutes: MuteSet) => void
}) {
  return (
    <fieldset aria-label={metronome.voices}>
      <Stack gap={2}>
        {mutableVoicesOf(groove).map((voice) => {
          const Glyph = GLYPH_OF[voice]
          const sounds = !mutes.includes(voice)

          return (
            <Checkbox
              key={voice}
              id={`voice-${voice}`}
              label={NAME_OF[voice]}
              icon={<Glyph />}
              checked={sounds}
              disabled={sounds && !canMute(groove, mutes, voice)}
              onChange={() =>
                onChange(
                  sounds
                    ? [...mutes, voice]
                    : mutes.filter((muted) => muted !== voice),
                )
              }
            />
          )
        })}
        {mutes.length > 0 && (
          <Button onPress={() => onChange(NO_MUTES)}>
            {metronome.enableAll}
          </Button>
        )}
      </Stack>
    </fieldset>
  )
}
