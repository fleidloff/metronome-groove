import { metronome } from '@/lib/snippets'

const BEATS = [0, 1, 2, 3]

const dotClass = (downbeat: boolean, lit: boolean) =>
  [
    'rounded-full transition-colors duration-75',
    downbeat ? 'size-16 sm:size-24 ring-4 ring-offset-4' : 'size-9 sm:size-14',
    lit ? 'bg-accent' : 'bg-muted/20',
    downbeat && (lit ? 'ring-accent ring-offset-background' : 'ring-muted/30 ring-offset-background'),
  ]
    .filter(Boolean)
    .join(' ')

export function BeatRow({ current }: { current: number | null }) {
  return (
    <ol
      aria-label={metronome.bar}
      className="flex items-center justify-center gap-6 sm:gap-10"
    >
      {BEATS.map((beat) => {
        const downbeat = beat === 0

        return (
          <li
            key={beat}
            aria-label={
              downbeat
                ? metronome.downbeatName({ beat: beat + 1 })
                : metronome.beatName({ beat: beat + 1 })
            }
            aria-current={current === beat ? 'step' : undefined}
            className={dotClass(downbeat, current === beat)}
          />
        )
      })}
    </ol>
  )
}
