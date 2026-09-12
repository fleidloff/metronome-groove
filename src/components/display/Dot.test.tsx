import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Dot } from './Dot'

const COLOUR = /^(bg|text|ring|border|outline|shadow|opacity|fill|stroke|from|via|to|accent|decoration|divide|caret)-/

/** Sam's condition is that the downbeat is not distinct by colour alone, so
 *  strip every colour utility and require the remainder to still differ. */
const shapeOf = (element: Element) =>
  element.className
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !COLOUR.test(token.replace(/^[\w-]+:/, '')))

const sizeOf = (element: Element) =>
  shapeOf(element).find((token) => /^size-/.test(token))

const EMPHASISED = 'One'
const PLAIN = 'Two'

/** A dot is an `<li>`, so the list it belongs to is what the page gives it. */
const renderPair = () =>
  render(
    <ol>
      <Dot label={EMPHASISED} emphasised />
      <Dot label={PLAIN} />
    </ol>,
  )

describe('the dot', () => {
  it('is a list item, so a list can arrange it', () => {
    render(
      <ol>
        <Dot label={PLAIN} />
      </ol>,
    )

    expect(screen.getByRole('listitem').tagName).toBe('LI')
  })

  it('takes its accessible name from the label it is given', () => {
    renderPair()

    const [emphasised, plain] = screen.getAllByRole('listitem')

    expect(emphasised).toHaveAccessibleName(EMPHASISED)
    expect(plain).toHaveAccessibleName(PLAIN)
  })

  it('differs from a plain dot by more than colour', () => {
    renderPair()

    const [emphasised, plain] = screen.getAllByRole('listitem')

    expect(shapeOf(emphasised)).not.toEqual(shapeOf(plain))
    expect(sizeOf(emphasised)).toBeDefined()
    expect(sizeOf(emphasised)).not.toBe(sizeOf(plain))
  })

  it('says it is emphasised, so a composer can be checked on it', () => {
    renderPair()

    const [emphasised, plain] = screen.getAllByRole('listitem')

    expect(emphasised).toHaveAttribute('data-emphasised', 'true')
    expect(plain).not.toHaveAttribute('data-emphasised', 'true')
  })

  it('is the current step only while it is active', () => {
    const view = render(
      <ol>
        <Dot label={PLAIN} active />
      </ol>,
    )
    expect(screen.getByRole('listitem')).toHaveAttribute('aria-current', 'step')

    view.rerender(
      <ol>
        <Dot label={PLAIN} />
      </ol>,
    )
    expect(screen.getByRole('listitem')).not.toHaveAttribute('aria-current')
  })

  it('is round, and changes colour rather than jumping', () => {
    render(
      <ol>
        <Dot label={PLAIN} />
      </ol>,
    )

    expect(screen.getByRole('listitem')).toHaveClass(
      'rounded-full',
      'transition-colors',
      'duration-75',
    )
  })
})
