import { Checkbox } from '@/components/controls/Checkbox'
import { metronome } from '@/lib/snippets'

/**
 * Whether the groove plays its marked bars. It is only rendered while a groove
 * is selected — the click has none, and a checkbox that does nothing is one
 * more thing to read past on the way to Play.
 */
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
