import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ProjectResultBreakdown } from './ProjectResultBreakdown'
import type { ProjectMajorScore, ResultContribution } from './result-types'

afterEach(cleanup)

describe('ProjectResultBreakdown', () => {
  it('renders nothing when the backend ships no breakdown or advisory data', () => {
    const { container } = render(<ProjectResultBreakdown />)
    expect(container.firstChild).toBeNull()
  })

  it('shows COMMON, MajorAggregate and per-major rows, marking a pending major without a zero', () => {
    const majors: ProjectMajorScore[] = [
      { majorId: 1, majorName: 'IT', majorScore: 9, weightPercent: 50 },
      { majorId: 2, majorName: 'Marketing', majorScore: null, weightPercent: 50 },
    ]
    render(<ProjectResultBreakdown commonScore={8} majorAggregate={7.33} majorBreakdown={majors} />)
    expect(screen.getByText('IT')).toBeTruthy()
    expect(screen.getByText('Chưa có điểm')).toBeTruthy()
    // The pending Marketing row shows an em dash, never 0.
    expect(screen.queryByText('0')).toBeNull()
  })

  it('lists advisory contributions separately and states they are not scored', () => {
    const contributions: ResultContribution[] = [
      { assignmentId: 10, evaluationId: 1, evaluatorId: 5, rubricId: 2, weightPercent: 0, score: 0, advisory: true, source: 'INDUSTRY' },
      { assignmentId: 11, evaluationId: 2, evaluatorId: 6, rubricId: 2, weightPercent: 50, score: 8 },
    ]
    render(<ProjectResultBreakdown contributions={contributions} />)
    expect(screen.getByText(/không tính vào điểm số/)).toBeTruthy()
    expect(screen.getByText(/người chấm #5/)).toBeTruthy()
    // The scored (non-advisory) contribution is not listed in the advisory section.
    expect(screen.queryByText(/người chấm #6/)).toBeNull()
  })
})
