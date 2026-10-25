import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ProjectResultBreakdown } from './ProjectResultBreakdown'
import type { ResultBreakdown, ResultContribution } from './result-types'

afterEach(cleanup)

const breakdown = (over: Partial<ResultBreakdown> = {}): ResultBreakdown => ({
  calculationVersion: 'DECIMAL_V2', isLegacy: false, approvalStatus: 'APPROVED', readiness: 'READY',
  commonScore: 8, majorAggregate: 7.33, majorBreakdown: [], components: [],
  ...over,
})

describe('ProjectResultBreakdown', () => {
  it('renders nothing when the backend ships no breakdown or advisory data', () => {
    const { container } = render(<ProjectResultBreakdown />)
    expect(container.firstChild).toBeNull()
  })

  it('shows COMMON, MajorAggregate and per-major rows, marking a pending major without a zero', () => {
    render(<ProjectResultBreakdown majorNames={{ 1: 'Công nghệ thông tin', 2: 'Thiết kế' }} breakdown={breakdown({ majorBreakdown: [
      { majorId: 1, score: 9 },
      { majorId: 2, score: null },
    ] })} />)
    expect(screen.getByText('Công nghệ thông tin')).toBeTruthy()
    expect(screen.getByText('Chưa có điểm')).toBeTruthy()
    // The pending major row shows an em dash, never 0.
    expect(screen.queryByText('0')).toBeNull()
  })

  it('flags a non-approved (demo/proposed) scheme — e.g. an unapproved Marketing rubric — instead of presenting it as official', () => {
    render(<ProjectResultBreakdown breakdown={breakdown({ approvalStatus: 'PROPOSED', isDemo: true })} />)
    expect(screen.getByText('Phương án demo / chưa duyệt chính thức')).toBeTruthy()
  })

  it('does not flag an approved, non-demo scheme', () => {
    render(<ProjectResultBreakdown breakdown={breakdown({ approvalStatus: 'APPROVED', isDemo: false })} />)
    expect(screen.queryByText(/demo \/ chưa duyệt/)).toBeNull()
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
  it('renders structured formula description when formula.components is provided (FUNC-07 / Q5)', () => {
    render(
      <ProjectResultBreakdown
        breakdown={breakdown({
          formula: {
            components: [
              { type: 'COMMON', weightPercent: 40 },
              { type: 'MAJOR', weightPercent: 40 },
              { type: 'INDIVIDUAL', weightPercent: 20 },
            ],
          },
        })}
      />,
    )
    expect(
      screen.getByText((content) => content.includes('40% điểm chung + 40% tổng hợp theo ngành + 20% đánh giá cá nhân')),
    ).toBeTruthy()
  })

  it('renders fallback without hardcoded numbers when formula is absent (FUNC-07 / Q5)', () => {
    render(<ProjectResultBreakdown breakdown={breakdown({ formula: null, components: [] })} />)
    expect(screen.getByText(/Cách tính điểm theo phương án đánh giá đã công bố/)).toBeTruthy()
    expect(screen.queryByText(/50% điểm chung + 50% tổng hợp/)).toBeNull()
  })
})
