import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
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

  it('renders an authoritative COMMON100 formula without the old50/50 claim', () => {
    const { container } = render(<ProjectResultBreakdown breakdown={breakdown({ formula: { components: [{ type: 'COMMON', weightPercent: 100 }] } })} />)
    expect(screen.getByText('Điểm đồ án = 100% điểm chung.')).toBeDefined()
    expect(container.textContent).not.toContain('50%')
    expect(container.textContent).not.toContain('Không cộng điểm cá nhân')
  })

  it('uses the server40/40/20 metadata and keeps the frozen version visible', () => {
    render(<ProjectResultBreakdown breakdown={breakdown({ schemeName: 'Frozen rubric', schemeVersion: 3, formula: { components: [{ type: 'COMMON', weightPercent: 40 }, { type: 'MAJOR', weightPercent: 40 }, { type: 'INDIVIDUAL', weightPercent: 20 }] } })} />)
    expect(screen.getByText('Điểm đồ án = 40% điểm chung + 40% tổng hợp theo ngành + 20% điểm cá nhân.')).toBeDefined()
    expect(screen.getByText(/Frozen rubric.*Phiên bản 3/)).toBeDefined()
  })

  it('uses neutral text without asserting percentages when formula metadata is absent', () => {
    const { container } = render(<ProjectResultBreakdown breakdown={breakdown()} />)
    expect(screen.getByText('Cách tính điểm theo phương án đánh giá đã công bố.')).toBeDefined()
    expect(container.textContent).not.toContain('%')
  })

  it.each([
    { components: [] },
    { components: [{ type: 'UNKNOWN_PRIVATE', weightPercent: 100 }] },
    { components: [{ type: '__proto__', weightPercent: 100 }] },
    { components: [{ type: 'COMMON', weightPercent: -1 }] },
    { components: [{ type: 'COMMON', weightPercent: Infinity }] },
    { components: [{ type: 'COMMON', weightPercent: 80 }] },
    { components: [{ type: 'COMMON', weightPercent: 99.5 }, { type: 'MAJOR', weightPercent: 0.5 }] },
    { components: [{ type: 'COMMON', weightPercent: 50 }, { type: 'COMMON', weightPercent: 50 }] },
    { components: null },
  ])('rejects malformed or unagreed formula metadata %#', formula => {
    const { container } = render(<ProjectResultBreakdown breakdown={breakdown({ formula: formula as unknown as ResultBreakdown['formula'] })} />)
    expect(screen.getByText('Cách tính điểm theo phương án đánh giá đã công bố.')).toBeDefined()
    expect(container.textContent).not.toMatch(/%|PRIVATE|Infinity|NaN/)
  })

  it('does not expose server description prose or include zero-weight clauses', () => {
    const formula = { description: 'PRIVATE_ENGLISH_DESCRIPTION', components: [{ type: 'COMMON', weightPercent: 100 }, { type: 'MAJOR', weightPercent: 0 }] }
    const { container } = render(<ProjectResultBreakdown breakdown={breakdown({ formula })} />)
    expect(screen.getByText('Điểm đồ án = 100% điểm chung.')).toBeDefined()
    expect(container.textContent).not.toMatch(/PRIVATE|\b0%/)
  })

  it('keeps pending and zero-weight rows from becoming a zero score, while retaining genuine grade zero', () => {
    const component = { componentId: 1, name: 'Chờ chấm', scope: 'COMMON', weightPercent: 100, score: null, requiredEvaluators: 1, finalizedEvaluators: 0 }
    render(<ProjectResultBreakdown breakdown={breakdown({ components: [component, { ...component, componentId: 2, name: 'Không có trọng số', weightPercent: 0, score: 0 }, { ...component, componentId: 3, name: 'Điểm 0 thật', score: 0, finalizedEvaluators: 1 }] })} />)
    const table = screen.getByRole('table', { name: 'Điểm thành phần do hệ thống cung cấp' })
    const pending = within(table).getByRole('row', { name: /Chờ chấm/ })
    const inactive = within(table).getByRole('row', { name: /Không có trọng số/ })
    const scored = within(table).getByRole('row', { name: /Điểm 0 thật/ })
    expect(pending.textContent).toContain('Chưa có điểm')
    expect(within(pending).queryByText('0')).toBeNull()
    expect(inactive.textContent).toContain('Không áp dụng')
    expect(within(inactive).queryByText('0')).toBeNull()
    expect(within(scored).getByText('0')).toBeDefined()
    expect(scored.textContent).toContain('Đã chấm')
  })

  it('labels student history as an individual formula rather than a project formula', () => {
    const { container } = render(<ProjectResultBreakdown target="student" breakdown={breakdown({ formula: { components: [{ type: 'COMMON', weightPercent: 100 }] } })} />)
    expect(screen.getByRole('heading', { name: 'Cấu thành điểm cá nhân' })).toBeDefined()
    expect(screen.getByText('Điểm cá nhân = 100% điểm chung.')).toBeDefined()
    expect(container.textContent).not.toContain('Điểm đồ án =')
  })
})
