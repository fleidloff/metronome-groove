import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Metronome } from './Metronome'

describe('Metronome', () => {
  it('names itself to the player', () => {
    render(<Metronome />)

    expect(screen.getByRole('heading', { name: 'Metronome' })).toBeVisible()
  })

  it('says that it does not keep time yet', () => {
    render(<Metronome />)

    expect(screen.getByText('Nothing keeps time yet.')).toBeVisible()
  })
})
