import type { Metadata } from 'next'
import { app } from '@/lib/snippets'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const sans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const mono = Geist_Mono({ variable: '--font-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: app.name,
  description: app.tagline,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
