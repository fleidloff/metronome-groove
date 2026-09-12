import { Checkbox } from '@/components/controls/Checkbox'
import { metronome } from '@/lib/snippets'

/**
 * Whether a run opens with a counted-in bar. It is only rendered while a groove
 * is selected — the click has no count-in, and a checkbox that does nothing is
 * one more thing to read past on the way to Play.
 */
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
