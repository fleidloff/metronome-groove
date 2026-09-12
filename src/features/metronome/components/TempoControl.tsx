import { metronome } from '@/lib/snippets'
import { MAX_BPM, MIN_BPM } from '../lib/click/tempo'

export function TempoControl({
  bpm,
  onChange,
}: {
  bpm: number
  onChange: (bpm: number) => void
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <output
        htmlFor="tempo"
        className="flex items-baseline gap-3 tabular-nums"
      >
        <span className="text-8xl font-bold leading-none sm:text-9xl">
          {bpm}
        </span>
        {' '}
        <span className="text-3xl text-muted">{metronome.tempoUnit}</span>
      </output>
      <input
        id="tempo"
        type="range"
        aria-label={metronome.tempo}
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={bpm}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-4 w-full cursor-pointer appearance-none rounded-full bg-muted/20 accent-accent"
      />
    </div>
  )
}
