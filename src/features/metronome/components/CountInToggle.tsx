import { Checkbox } from '@/components/controls/Checkbox'
import { metronome } from '@/lib/snippets'

export function CountInToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Checkbox
      id="count-in"
      label={metronome.countIn}
      checked={checked}
      onChange={onChange}
    />
  )
}
