import { Checkbox } from '@/components/controls/Checkbox'
import { metronome } from '@/lib/snippets'

export function FillsToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Checkbox
      id="fills"
      label={metronome.fills}
      checked={checked}
      onChange={onChange}
    />
  )
}
