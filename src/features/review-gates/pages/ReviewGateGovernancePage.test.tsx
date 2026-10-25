import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ReviewGateGovernancePage } from './ReviewGateGovernancePage'
import { reviewGatesMockAdapter } from '../api/review-gates-mock-adapter'

vi.mock('../../../app/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../app/config/env')>()
  return {
    ...actual,
    env: {
      ...actual.env,
      reviewGatesMockEnabled: true,
    },
  }
})


describe('ReviewGateGovernancePage (Academic Review Gates Vertical Slice)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
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
    expect(screen.getByText('Fall 2026 · SEP490')).toBeTruthy()
  })

  it('switches to Builder tab, renders R1..R4 gates and adds a new gate', async () => {
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Thiết kế Review Gates (Builder)' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Thiết kế Review Gates (Builder)' }))

    const addReqBtn = await screen.findByRole('button', { name: '＋ Thêm yêu cầu' })
    fireEvent.click(addReqBtn)

    expect(screen.getByRole('heading', { name: 'Thêm yêu cầu mới' })).toBeTruthy()

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
    fireEvent.click(screen.getByRole('button', { name: 'Ma trận Giám sát Tiến trình (Matrix)' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Gate Liên ngành (Interdisciplinary)' }))

    expect(await screen.findByText('G2 · Integrated Concept & Architecture Gate')).toBeTruthy()
    expect(screen.getByText('CHỜ THẨM ĐỊNH CÁC NGÀNH')).toBeTruthy()
    expect(screen.getByText('Có nhánh cần chỉnh sửa')).toBeTruthy()

    // Find the dropdown for Design scope (which is currently REVISION_REQUIRED) and update to PASSED
    const selects = screen.getAllByRole('combobox')
    const designSelect = selects.find(s => (s as HTMLSelectElement).value === 'REVISION_REQUIRED')
    expect(designSelect).toBeTruthy()

    fireEvent.change(designSelect!, { target: { value: 'PASSED' } })

    // Now all scopes are PASSED
    await waitFor(() => {
      expect(screen.getByText('CÁC NHÁNH ĐÃ ĐẠT')).toBeTruthy()
      expect(screen.getByText('Các nhánh đã đạt')).toBeTruthy()
      expect(screen.queryByText('READY FOR PASS')).toBeNull()
    })
  })

  it('evaluates defense readiness conditions and shows NOT READY when gates are incomplete', async () => {
    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Xét Điều kiện Bảo vệ (Defense Readiness)' }))

    expect(await screen.findByText('Xét điều kiện tham gia bảo vệ đồ án tốt nghiệp (Defense Readiness)')).toBeTruthy()
    expect(screen.getByText('CHƯA ĐỦ ĐIỀU KIỆN')).toBeTruthy()
    expect(screen.getByText('NOT READY')).toBeTruthy()
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
    fireEvent.click(screen.getByRole('button', { name: 'Thiết kế Review Gates (Builder)' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Thiết kế Review Gates (Builder)' }))

    expect(await screen.findByText('ĐÃ CÔNG BỐ')).toBeTruthy()
    expect(screen.getByText(/Mẫu tiến trình đã công bố chính thức:/)).toBeTruthy()

    // Click clone button
    const cloneBtn = screen.getByRole('button', { name: /Nhân bản bản nháp mới/ })
    fireEvent.click(cloneBtn)

    expect(await screen.findByText(/IT Capstone – Review 1–4 \(Bản nháp/)).toBeTruthy()
    expect(screen.getByText('BẢN NHÁP')).toBeTruthy()
  })

  it('dynamically displays gate columns in matrix and rolls back on decision conflict', async () => {
    vi.spyOn(reviewGatesMockAdapter, 'updateProjectGateDecision').mockRejectedValueOnce(
      new Error('409: Phiên bản bản ghi tiến trình dự án đã thay đổi.'),
    )

    render(
      <MemoryRouter>
        <ReviewGateGovernancePage />
      </MemoryRouter>,
    )

    await screen.findByText('IT Capstone – Review 1–4')
    fireEvent.click(screen.getByRole('button', { name: 'Ma trận Giám sát Tiến trình (Matrix)' }))

    // Check dynamic headers (R1..R4)
    expect(await screen.findByText('R1')).toBeTruthy()
    expect(screen.getByText('R2')).toBeTruthy()
    expect(screen.getByText('R3')).toBeTruthy()
    expect(screen.getByText('R4')).toBeTruthy()

    // Click on IT-01 to open inspection drawer
    fireEvent.click(screen.getByText('Campus Support Platform'))
    expect(await screen.findByText('Ghi nhận kết luận thẩm định (Reviewer Scoped Decision)')).toBeTruthy()

    // Submit decision in drawer
    const submitDecisionBtn = screen.getByRole('button', { name: 'Cập nhật quyết định Reviewer' })
    fireEvent.click(submitDecisionBtn)

    // Check conflict error is displayed
    const conflictMsgs = await screen.findAllByText(/409: Phiên bản bản ghi tiến trình/)
    expect(conflictMsgs.length).toBeGreaterThanOrEqual(1)
  })
})
