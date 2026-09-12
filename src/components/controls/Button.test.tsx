import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

const TEXT_SCALE = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl']

const textScale = (element: Element) =>
  Math.max(
    -1,
    ...element.className
      .split(/\s+/)
      .map((token) => TEXT_SCALE.indexOf(token.replace(/^text-/, ''))),
  )

const HERO = 'Go'
const PLAIN = 'Push'

const noop = () => {}

describe('the button', () => {
  it('fills its column and is huge when it asks for the hero emphasis', () => {
    render(
      <Button emphasis="hero" onPress={noop}>
        {HERO}
      </Button>,
    )

    const control = screen.getByRole('button', { name: HERO })

    expect(control).toHaveClass('w-full')
    expect(control.className).toMatch(/\btext-(4|5|6|7|8|9)xl\b/)
  })

  it('says which emphasis it was given, so a composer can be checked on it', () => {
    render(
      <Button emphasis="hero" onPress={noop}>
        {HERO}
      </Button>,
    )

    expect(screen.getByRole('button', { name: HERO })).toHaveAttribute(
      'data-emphasis',
      'hero',
    )
  })

  it('is a normal button when no emphasis is asked for', () => {
    render(<Button onPress={noop}>{PLAIN}</Button>)

    const control = screen.getByRole('button', { name: PLAIN })

    expect(control).toHaveAttribute('data-emphasis', 'normal')
    expect(control).not.toHaveClass('w-full')
  })

  it('makes the hero the dominant one wherever the two sit together', () => {
    render(
      <>
        <Button emphasis="hero" onPress={noop}>
          {HERO}
        </Button>
        <Button onPress={noop}>{PLAIN}</Button>
      </>,
    )

    const hero = screen.getByRole('button', { name: HERO })
    const plain = screen.getByRole('button', { name: PLAIN })

    expect(textScale(hero)).toBeGreaterThan(textScale(plain))
  })

  it('reports a pressed state accessibly, and carries none when it has none', () => {
    const view = render(
      <Button pressed onPress={noop}>
        {PLAIN}
      </Button>,
    )
    expect(screen.getByRole('button', { name: PLAIN })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    view.rerender(
      <Button pressed={false} onPress={noop}>
        {PLAIN}
      </Button>,
    )
    expect(screen.getByRole('button', { name: PLAIN })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    view.rerender(<Button onPress={noop}>{PLAIN}</Button>)
    expect(screen.getByRole('button', { name: PLAIN })).not.toHaveAttribute(
      'aria-pressed',
    )
  })

  it('presses once per click, and is not a submit button', () => {
    const onPress = vi.fn()
    render(<Button onPress={onPress}>{PLAIN}</Button>)

    const control = screen.getByRole('button', { name: PLAIN })
    expect(control).toHaveAttribute('type', 'button')

    fireEvent.click(control)
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
