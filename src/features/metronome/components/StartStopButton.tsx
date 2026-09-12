import { Button } from '@/components/controls/Button'
import { metronome } from '@/lib/snippets'

export function StartStopButton({
  running,
  onToggle,
}: {
  running: boolean
  onToggle: () => void
}) {
  return (
    <Button emphasis="hero" pressed={running} onPress={onToggle}>
      {running ? metronome.stop : metronome.start}
    </Button>
  )
}
