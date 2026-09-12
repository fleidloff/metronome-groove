import { Button } from '@/components/controls/Button'
import { metronome } from '@/lib/snippets'

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
