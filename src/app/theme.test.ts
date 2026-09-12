import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) =>
  readFileSync(join(process.cwd(), 'src/app', file), 'utf8')

const css = read('globals.css')
const layout = read('layout.tsx')

const themeBlock = () => {
  const start = css.indexOf('@theme')
  const open = css.indexOf('{', start)
  return css.slice(open + 1, css.indexOf('}', open))
}

/** Everything outside the @theme block — where a property must be *declared*. */
const outsideTheme = () => {
  const start = css.indexOf('@theme')
  return css.slice(0, start) + css.slice(css.indexOf('}', start) + 1)
}

const declares = (source: string, name: string) =>
  new RegExp(`\\${name}\\s*:\\s*\\S`).test(source)

describe('the theme', () => {
  it('declares a Tailwind v4 @theme block', () => {
    expect(css).toMatch(/@import\s+"tailwindcss"/)
    expect(css).toMatch(/@theme\s+inline\s*\{/)
  })

  it('resolves every custom property the @theme block reaches for', () => {
    const referenced = [...themeBlock().matchAll(/var\((--[\w-]+)\)/g)].map(
      (match) => match[1],
    )

    expect(referenced.length).toBeGreaterThan(0)

    // A font face is injected onto <html> by next/font, so it is declared in
    // the layout rather than the stylesheet. Everything else is the sheet's own.
    const fromLayout = referenced.filter((name) => name.startsWith('--font-'))
    const fromSheet = referenced.filter((name) => !name.startsWith('--font-'))

    for (const name of fromSheet) {
      expect(
        declares(outsideTheme(), name),
        `${name} is referenced by @theme but declared nowhere outside it`,
      ).toBe(true)
    }

    for (const name of fromLayout) {
      expect(
        layout.includes(`'${name}'`),
        `${name} is referenced by @theme but no next/font call supplies it`,
      ).toBe(true)
    }
  })

  it('carries a dark palette as well as a light one', () => {
    expect(css).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/)

    const dark = css.slice(css.indexOf('prefers-color-scheme'))
    expect(dark).toMatch(/--background:/)
    expect(dark).toMatch(/--foreground:/)
  })

  it('dresses the body in the theme rather than a hard-coded stack', () => {
    const body = css.slice(css.indexOf('body {'))

    expect(body).toMatch(/background:\s*var\(--background\)/)
    expect(body).toMatch(/color:\s*var\(--foreground\)/)
    expect(body).toMatch(/font-family:\s*var\(--font-sans\)/)
  })
})
