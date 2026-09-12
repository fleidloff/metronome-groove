import type { ReactNode } from 'react'

/**
 * The smallest readable line on the page. For text that has to be there and
 * has no claim on anyone's attention — a licence attribution rather than
 * something to act on.
 */
export function FinePrint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>
}
