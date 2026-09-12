import type { ReactNode } from 'react'

export function FinePrint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>
}
