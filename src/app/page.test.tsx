import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from './page'

describe('the home route', () => {
  it('renders the metronome slice', () => {
    render(<Home />)

    expect(screen.getByRole('heading', { name: 'Metronome' })).toBeVisible()
  })
})
