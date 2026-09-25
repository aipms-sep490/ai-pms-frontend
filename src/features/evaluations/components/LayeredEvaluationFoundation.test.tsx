import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LayeredEvaluationFoundation } from './LayeredEvaluationFoundation'

describe('LayeredEvaluationFoundation', () => {
  it('documents future scopes without inventing inputs, scores, or mutations', () => {
    render(<LayeredEvaluationFoundation />)

    expect(screen.getByText(/W7-BE-02/)).toBeTruthy()
    expect(screen.getByText(/COMMON/)).toBeTruthy()
    expect(screen.getByText(/MAJOR_SPECIFIC/)).toBeTruthy()
    expect(screen.getByText(/INDIVIDUAL/)).toBeTruthy()
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
