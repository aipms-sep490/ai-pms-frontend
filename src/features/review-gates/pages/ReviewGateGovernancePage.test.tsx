import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReviewGateGovernancePage } from './ReviewGateGovernancePage'
import { reviewGatesMockAdapter } from '../api/review-gates-mock-adapter'
import { AcademicWorkflowContext, type AcademicWorkflowContextValue } from '../../../app/context/academic-workflow-context'

const urgent = vi.hoisted(() => ({ getDepartmentUrgentActions: vi.fn() }))
vi.mock('../../calendar/action-aggregators-api', () => urgent)

vi.mock('../api/review-gates-api', async () => {
  const { reviewGatesMockAdapter: adapter } = await import('../api/review-gates-mock-adapter')
  return {
    getReviewGateTemplates: () => adapter.getTemplates(),
    getReviewGateTemplate: (id: string) => adapter.getTemplateById(id),
    saveReviewGateTemplate: (template: Parameters<typeof adapter.saveTemplate>[0]) => adapter.saveTemplate(template),
    publishReviewGateTemplate: (id: string, concurrencyToken?: string) => adapter.publishTemplate(id, concurrencyToken),
    deleteReviewGateTemplate: (id: string) => adapter.deleteTemplate(id),
    getProjectReviewMatrix: (mode?: string) => adapter.getMonitoringMatrix(mode),
    updateGateDecision: (projectId: string, gateCode: string, newStatus: Parameters<typeof adapter.updateProjectGateDecision>[2]) =>
      adapter.updateProjectGateDecision(projectId, gateCode, newStatus),
    updateHybridScopeDecision: (projectId: string, scope: string, newStatus: Parameters<typeof adapter.updateHybridScopeDecision>[2]) =>
      adapter.updateHybridScopeDecision(projectId, scope, newStatus),
    getDefenseReadiness: (projectId: string) => adapter.getDefenseReadiness(projectId),
    getReviewGateOverrideCapability: () => Promise.resolve({ canOverrideGate: false }),
    getStudentReviewTimeline: (projectId?: string) => adapter.getStudentReviewTimeline(projectId),
    getGateAssignments: () => Promise.resolve([]),
    getGateReviewerCandidates: () => Promise.resolve({ items: [], totalCount: 0, page: 1, pageSize: 30 }),
    getGateRoundScopeConsensus: () => Promise.resolve(null),
  }
})

describe('ReviewGateGovernancePage (Academic Review Gates Vertical Slice)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows empty matrix cells as a dash and flags scoped reviewer gaps', async () => {
    urgent.getDepartmentUrgentActions.mockResolvedValue({ departmentId: 2, totalCount: 1, hasMore: false, asOfUtc: '', items: [{ kind: 'REVIEWER_ASSIGNMENT', id: 5, projectId: 9, title: 'Chưa phân reviewer', status: 'PLANNED', severity: 'HIGH', dueAt: null, deepLink: '/department/projects/9/review-gates' }] })
    const value = { academic: { departments: [{ id: 2, name: 'IT' }] } } as unknown as AcademicWorkflowContextValue
    render(<MemoryRouter><AcademicWorkflowContext.Provider value={value}><ReviewGateGovernancePage /></AcademicWorkflowContext.Provider></MemoryRouter>)
    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Ma trận tiến độ' }))
    expect(await screen.findByText(/đồ án thiếu reviewer/)).toBeTruthy()
    expect(urgent.getDepartmentUrgentActions).toHaveBeenCalledWith(2)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.getByRole('columnheader', { name: 'R1' }).closest('thead')?.className).toContain('ai-table__head--band')
  })

  it('renders Progress Template library with single and interdisciplinary templates', async () => {
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Cấu hình & Giám sát Tiến trình Đồ án')).toBeTruthy()
    expect(screen.getByText('IT Capstone – Review 1–4')).toBeTruthy()
    expect(screen.getByText('Integrated Capstone – IT/MKT/Design')).toBeTruthy()
  })

  it('switches to Builder tab, renders R1..R4 gates and adds a new gate', async () => {
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Thiết kế cổng kiểm duyệt' }))

    expect(await screen.findByText('Trình tự Review Gates')).toBeTruthy()
    expect(screen.getAllByText(/Requirement & Analysis/)[0]).toBeTruthy()
    expect(screen.getAllByText(/System Design & Prototype/)[0]).toBeTruthy()

    // Add a new gate
    const addGateBtn = screen.getByRole('button', { name: '＋ Thêm Gate' })
    fireEvent.click(addGateBtn)

    expect(screen.getByText('Review 5 (Bản nháp)')).toBeTruthy()
  })

  it('opens requirement drawer, adds a new requirement to the current gate', async () => {
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Thiết kế cổng kiểm duyệt' }))

    const addReqBtn = await screen.findByRole('button', { name: '＋ Thêm yêu cầu' })
    fireEvent.click(addReqBtn)

    expect(screen.getByRole('heading', { name: 'Thêm yêu cầu mới' })).toBeTruthy()

    const codeInput = screen.getByLabelText(/Mã yêu cầu/)
    fireEvent.change(codeInput, { target: { value: 'R1-POSTMAN' } })
    const titleInput = screen.getByLabelText(/Tên yêu cầu \/ Tiêu chuẩn đầu ra/)
    fireEvent.change(titleInput, { target: { value: 'API Documentation Postman Collection' } })

    const saveBtn = screen.getByRole('button', { name: 'Lưu yêu cầu' })
    fireEvent.click(saveBtn)

    expect(await screen.findByText('API Documentation Postman Collection')).toBeTruthy()
  })

  it('displays Project Review Matrix and inspects blocker reason drawer', async () => {
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Ma trận tiến độ' }))

    expect(await screen.findByText('Campus Support Platform')).toBeTruthy()
    expect(screen.getByText('Smart Library System')).toBeTruthy()

    // Click on IT-01 which has REVISION_REQUIRED
    fireEvent.click(screen.getByText('Campus Support Platform'))

    expect(await screen.findByText('Lý do chưa đạt / Kiến nghị của Reviewer:')).toBeTruthy()
    expect(screen.getByText(/Reviewer yêu cầu cập nhật sơ đồ kiến trúc SDD/)).toBeTruthy()
  })

  it('enforces interdisciplinary gate dependency: blocks PASS until all required disciplines pass', async () => {
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Cổng liên ngành' }))

    expect(await screen.findByText('G2 · Integrated Concept & Architecture Gate')).toBeTruthy()
    expect(screen.getByText('CHỜ THẨM ĐỊNH CÁC NGÀNH')).toBeTruthy()
    expect(screen.getByText('Có nhánh cần chỉnh sửa')).toBeTruthy()

    // Find the dropdown for Design scope (which is currently REVISION_REQUIRED) and update to PASSED
    const selects = screen.getAllByRole('combobox')
    const designSelect = selects.find(s => (s as HTMLSelectElement).value === 'REVISION_REQUIRED')
    expect(designSelect).toBeTruthy()

    fireEvent.change(designSelect!, { target: { value: 'PASSED' } })
    // A local choice is a draft until the user explicitly sends the decision.
    expect(screen.getByText('CHỜ THẨM ĐỊNH CÁC NGÀNH')).toBeTruthy()
    fireEvent.click(designSelect!.closest('tr')!.querySelector('button')!)
    // The mock adapter applies the same explicit user action as the API path.
    await waitFor(() => {
      expect(screen.getByText('CÁC NHÁNH ĐÃ ĐẠT')).toBeTruthy()
      expect(screen.getByText('Các nhánh đã đạt')).toBeTruthy()
      expect(screen.queryByText('READY FOR PASS')).toBeNull()
    }, { timeout: 5000 })
  })

  it('evaluates defense readiness conditions and shows NOT READY when gates are incomplete', async () => {
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Xét điều kiện bảo vệ' }))

    expect(await screen.findByText('Xét điều kiện tham gia bảo vệ đồ án tốt nghiệp')).toBeTruthy()
    expect(screen.getByText('CHƯA ĐỦ ĐIỀU KIỆN')).toBeTruthy()
    expect(screen.getByText('Chưa đủ điều kiện bảo vệ')).toBeTruthy()
    expect(screen.getByText('Hoàn thành và ĐẠT (PASSED) tất cả các đợt Review Gate (R1–R4)')).toBeTruthy()
  })

  it('handles optimistic concurrency conflict (409) safely during draft save', async () => {
    vi.spyOn(reviewGatesMockAdapter, 'saveTemplate').mockRejectedValueOnce(
      new Error('409: Dữ liệu mẫu tiến trình đã được cập nhật bởi quản trị viên khác. Hãy tải lại trang.'),
    )

    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Thiết kế cổng kiểm duyệt' }))

    const saveDraftBtn = await screen.findByRole('button', { name: 'Lưu bản nháp' })
    fireEvent.click(saveDraftBtn)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText(/409: Dữ liệu mẫu tiến trình đã được cập nhật/)).toBeTruthy()
  })

  it('creates a fresh draft template when clicking Tạo Mẫu Tiến trình Mới', async () => {
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    const createBtn = screen.getByRole('button', { name: '＋ Tạo Mẫu Tiến trình Mới' })
    fireEvent.click(createBtn)

    // Should switch to Builder tab with new draft title
    expect(await screen.findByText(/Mẫu tiến trình mới \(Bản nháp\)/)).toBeTruthy()
    expect(screen.getByText('BẢN NHÁP')).toBeTruthy()
  })

  it('clones a published template into an editable draft template', async () => {
    await reviewGatesMockAdapter.publishTemplate('tmpl-it-2026')

    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Thiết kế cổng kiểm duyệt' }))

    expect(await screen.findByText('ĐÃ CÔNG BỐ')).toBeTruthy()
    expect(screen.getByText(/Mẫu tiến trình đã công bố chính thức:/)).toBeTruthy()

    // Click clone button
    const cloneBtn = screen.getByRole('button', { name: /Nhân bản bản nháp mới/ })
    fireEvent.click(cloneBtn)

    expect(await screen.findByText(/IT Capstone – Review 1–4 \(Bản nháp/)).toBeTruthy()
    expect(screen.getByText('BẢN NHÁP')).toBeTruthy()
  })

  it('blocks direct legacy decision bypass when inspecting a project and delegates governance to GateCoordinationDrawer (TK-W2-08)', async () => {
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Ma trận tiến độ' }))

    // Check dynamic headers (R1..R4)
    expect(await screen.findByText('R1')).toBeTruthy()
    expect(screen.getByText('R2')).toBeTruthy()
    expect(screen.getByText('R3')).toBeTruthy()
    expect(screen.getByText('R4')).toBeTruthy()

    // Click on IT-01 to open inspection drawer
    fireEvent.click(screen.getByText('Campus Support Platform'))
    expect(await screen.findByText('Trạng thái các đợt cổng kiểm duyệt')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cập nhật quyết định Reviewer' })).toBeNull()
  })

  it('opens directly on the progress matrix tab when navigated to /department/projects/progress-matrix', async () => {
    render(
      <MemoryRouter initialEntries={['/department/projects/progress-matrix']}>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Ma trận tiến trình các đồ án')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ma trận tiến độ' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Campus Support Platform')).toBeTruthy()
  })

  it('confirms and deletes a DRAFT review gate template from the library table', async () => {
    reviewGatesMockAdapter.reset()
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('IT Capstone – Review 1–4')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Xóa nháp' })[0])

    const confirmBtn = await screen.findByRole('button', { name: 'Xóa bản nháp' })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(screen.queryByText('IT Capstone – Review 1–4')).toBeNull()
    })
    reviewGatesMockAdapter.reset()
  })
})
