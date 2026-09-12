import type { ReactNode } from 'react'

export function PageFrame({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-between gap-12 px-6 py-12">
      {children}
    </main>
  )
}
