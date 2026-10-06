import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LayeredEvaluationFoundation } from './LayeredEvaluationFoundation'

describe('LayeredEvaluationFoundation', () => {
  it('documents future scopes without inventing inputs, scores, or mutations', () => {
    render(<LayeredEvaluationFoundation />)

    expect(screen.getByText(/Chưa thể mở đánh giá theo phạm vi/)).toBeTruthy()
    expect(screen.getByText(/Cả đồ án/)).toBeTruthy()
    expect(screen.getByText(/Theo chuyên ngành/)).toBeTruthy()
    expect(screen.getByText(/Theo sinh viên/)).toBeTruthy()
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
