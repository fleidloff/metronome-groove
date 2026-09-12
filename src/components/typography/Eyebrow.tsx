import type { ReactNode } from 'react'

export function Eyebrow({
  level = 1,
  children,
}: {
  level?: 1 | 2 | 3
  children: ReactNode
}) {
  const Heading = `h${level}` as const

  return (
    <Heading className="text-sm font-medium uppercase tracking-[0.3em] text-muted">
      {children}
    </Heading>
  )
}
