import { Button } from '@/components/controls/Button'
import { metronome } from '@/lib/snippets'

/** `loading` wins over both other labels: a press whose samples have not
 *  arrived is waiting, and saying so is the difference between that and a
 *  silent bar. */
export function StartStopButton({
  running,
  loading = false,
  onToggle,
}: {
  running: boolean
  loading?: boolean
  onToggle: () => void
}) {
  return (
    <Button emphasis="hero" pressed={running} onPress={onToggle}>
      {loading ? metronome.loading : running ? metronome.stop : metronome.start}
    </Button>
  )
}
