import type { ReactNode } from 'react'
import type { Space } from '@/components/tokens'

// Tailwind extracts literal class strings, so `gap-${gap}` produces no CSS.
const GAP: Record<Space, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
}

const GAP_WIDE: Record<Space, string> = {
  0: 'sm:gap-0',
  1: 'sm:gap-1',
  2: 'sm:gap-2',
  3: 'sm:gap-3',
  4: 'sm:gap-4',
  6: 'sm:gap-6',
  8: 'sm:gap-8',
  10: 'sm:gap-10',
  12: 'sm:gap-12',
}

export function List({
  label,
  gap,
  gapWide,
  children,
}: {
  label: string
  gap?: Space
  gapWide?: Space
  children: ReactNode
}) {
  const className = [
    'flex items-center justify-center',
    gap === undefined ? false : GAP[gap],
    gapWide === undefined ? false : GAP_WIDE[gapWide],
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ol aria-label={label} className={className}>
      {children}
    </ol>
  )
}
