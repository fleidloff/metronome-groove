import type { ReactNode } from 'react'

export type ButtonEmphasis = 'hero' | 'normal'

const EMPHASIS: Record<ButtonEmphasis, string> = {
  hero: 'w-full max-w-md rounded-card bg-accent px-8 py-12 text-6xl font-bold tracking-wide text-background shadow-card transition-transform active:scale-[0.98]',
  normal:
    'rounded-card border border-muted/30 px-8 py-4 text-xl font-medium transition-transform active:scale-[0.98]',
}

export function Button({
  emphasis = 'normal',
  pressed,
  onPress,
  children,
}: {
  emphasis?: ButtonEmphasis
  pressed?: boolean
  onPress: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={pressed}
      data-emphasis={emphasis}
      className={EMPHASIS[emphasis]}
    >
      {children}
    </button>
  )
}
