import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DepartmentDecisionHistory } from './DepartmentDecisionHistory'

describe('DepartmentDecisionHistory', () => {
  it('does not fabricate historical decision snapshots when the backend only returns latest', () => {
    render(<DepartmentDecisionHistory />)
    expect(screen.getByText(/not returned by the current Backend contract/)).toBeTruthy()
  })
})
