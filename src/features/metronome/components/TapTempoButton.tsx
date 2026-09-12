import { metronome } from '@/lib/snippets'

export function TapTempoButton({ onTap }: { onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={metronome.tap}
      className="rounded-card border border-muted/30 px-8 py-4 text-xl font-medium transition-transform active:scale-[0.98]"
    >
      {metronome.tap}
    </button>
  )
}
