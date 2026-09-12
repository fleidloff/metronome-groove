import { Select, type SelectOption } from '@/components/controls/Select'
import { metronome } from '@/lib/snippets'
import type { SourceId } from '../lib/transport/source'

const OPTIONS: readonly SelectOption<SourceId>[] = [
  { value: 'click', label: metronome.click },
  { value: 'bossa-nova', label: metronome.bossaNova },
  { value: 'rock', label: metronome.rock },
  { value: 'shuffle', label: metronome.shuffle },
  { value: 'straight-funk', label: metronome.straightFunk },
  { value: 'second-line', label: metronome.secondLine },
]

export function SourceSelect({
  value,
  onChange,
}: {
  value: SourceId
  onChange: (value: SourceId) => void
}) {
  return (
    <Select
      id="sound"
      label={metronome.sound}
      value={value}
      options={OPTIONS}
      onChange={onChange}
    />
  )
}
