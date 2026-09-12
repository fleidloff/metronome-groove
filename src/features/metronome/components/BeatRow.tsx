import { Dot } from '@/components/display/Dot'
import { List } from '@/components/layout/List'
import { metronome } from '@/lib/snippets'

const BEATS = [0, 1, 2, 3]

export function BeatRow({ current }: { current: number | null }) {
  return (
    <List label={metronome.bar} gap={6} gapWide={10}>
      {BEATS.map((beat) => {
        const downbeat = beat === 0

        return (
          <Dot
            key={beat}
            label={
              downbeat
                ? metronome.downbeatName({ beat: beat + 1 })
                : metronome.beatName({ beat: beat + 1 })
            }
            emphasised={downbeat}
            active={current === beat}
          />
        )
      })}
    </List>
  )
}
