import { Select, type SelectOption } from '@/components/controls/Select'
import { metronome } from '@/lib/snippets'
import type { SourceId } from '../lib/transport/source'

/** The click first, because it is the default and what the app is without a
 *  groove: a first visit downloads one file and sounds on the first tap. */
const OPTIONS: readonly SelectOption<SourceId>[] = [
  { value: 'click', label: metronome.click },
  { value: 'straight-funk', label: metronome.straightFunk },
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
