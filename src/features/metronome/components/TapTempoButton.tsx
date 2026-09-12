import { Button } from '@/components/controls/Button'
import { metronome } from '@/lib/snippets'

export function TapTempoButton({ onTap }: { onTap: () => void }) {
  return (
    <Button emphasis="normal" onPress={onTap}>
      {metronome.tap}
    </Button>
  )
}
