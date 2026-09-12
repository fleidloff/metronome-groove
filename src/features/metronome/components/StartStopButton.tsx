import { metronome } from '@/lib/snippets'

export function StartStopButton({
  running,
  onToggle,
}: {
  running: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={running}
      className="w-full max-w-md rounded-card bg-accent px-8 py-12 text-6xl font-bold tracking-wide text-background shadow-card transition-transform active:scale-[0.98]"
    >
      {running ? metronome.stop : metronome.start}
    </button>
  )
}
