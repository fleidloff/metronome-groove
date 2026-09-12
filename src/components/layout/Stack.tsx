import type { ReactNode } from 'react'
import type { Space } from '@/components/tokens'

// Tailwind extracts literal class strings from source, so `gap-${gap}` would
// compile and render while producing no CSS at all.
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

export function Stack({ gap, children }: { gap?: Space; children: ReactNode }) {
  const className = [
    'flex w-full max-w-md flex-col items-center',
    gap === undefined ? false : GAP[gap],
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={className}>{children}</div>
}
