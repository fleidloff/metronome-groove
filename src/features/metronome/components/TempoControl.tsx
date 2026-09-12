import { Slider } from '@/components/controls/Slider'
import { Readout } from '@/components/display/Readout'
import { Stack } from '@/components/layout/Stack'
import { metronome } from '@/lib/snippets'
import { MAX_BPM, MIN_BPM } from '../lib/click/tempo'

export function TempoControl({
  bpm,
  onChange,
}: {
  bpm: number
  onChange: (bpm: number) => void
}) {
  return (
    <Stack gap={6}>
      <Readout htmlFor="tempo" value={bpm} unit={metronome.tempoUnit} />
      <Slider
        id="tempo"
        label={metronome.tempo}
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={bpm}
        onChange={onChange}
      />
    </Stack>
  )
}
