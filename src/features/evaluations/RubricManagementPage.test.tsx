import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { RubricManagementPage } from './RubricManagementPage'

const mocks = vi.hoisted(() => ({
  listRubrics: vi.fn(),
  getRubric: vi.fn(),
  createRubric: vi.fn(),
  publishRubric: vi.fn(),
  retireRubric: vi.fn(),
  cloneRubric: vi.fn(),
  deleteRubric: vi.fn(),
  updateRubric: vi.fn(),
  submitRubricForApproval: vi.fn(),
  approveRubric: vi.fn(),
  rejectRubric: vi.fn(),
}))
vi.mock('./rubrics-api', () => mocks)
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: null }) }))

const criterion = { id: 1, name: 'Chất lượng', description: 'Mô tả đầy đủ', weightPercent: 100, maxScore: 10, sortOrder: 0, isRequired: true, children: [], criterionCode: 'CRIT-1', learningOutcome: 'CLO-1', evidenceGuidance: 'Báo cáo mẫu', levels: [{ levelOrder: 1, label: 'Xuất sắc', descriptor: 'Hoàn thiện tốt', scoreFrom: 8.5, scoreTo: 10 }] }
const published = { id: 2, departmentId: 1, academicSemesterId: 1, code: 'PUBLIC', name: 'Bộ đã công bố', description: null, status: 'PUBLISHED', version: 1, concurrencyToken: 'token', canEdit: false, criteria: [criterion], projectMode: 'SINGLE_MAJOR', evaluationStage: 'COLD', evaluationScope: 'COMMON', approvalReference: 'QD-2026/01' }
const draft = { ...published, id: 1, code: 'DRAFT', name: 'Bộ nháp', status: 'DRAFT', canEdit: true, canSubmitForApproval: true, canApprove: false, canReject: false }
const pending = { ...published, id: 3, code: 'PENDING', name: 'Bộ chờ duyệt', status: 'PENDING_APPROVAL', canEdit: false, canSubmitForApproval: false, canApprove: true, canReject: true }

const page = () => render(<MemoryRouter><RubricManagementPage /></MemoryRouter>)
afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  mocks.listRubrics.mockResolvedValue({ items: [draft, published, pending], totalCount: 3 })
  mocks.getRubric.mockImplementation(async (id: number) => {
    if (id === 1) return draft
    if (id === 3) return pending
    return published
  })
})

describe('RubricManagementPage deep interactions', () => {
  it('opens the published rubric as readable content, without disabled editing controls', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    expect(mocks.getRubric).toHaveBeenCalledWith(2)
    expect(screen.getByRole('heading', { name: /Chất lượng/ })).toBeDefined()
    expect(screen.queryByLabelText('Tên tiêu chí')).toBeNull()
  })

  it('cancels version creation without sending an API request', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phiên bản' }))
    expect(screen.getByLabelText('Mã phiên bản mới').tagName).toBe('INPUT')
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(mocks.cloneRubric).not.toHaveBeenCalled()
  })

  it('restores a valid maximum score when the final child is removed', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bộ tiêu chí' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm tiêu chí con' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Bỏ' })[1])
    expect((screen.getByLabelText('Điểm tối đa') as HTMLInputElement).value).toBe('10')
    expect(mocks.createRubric).not.toHaveBeenCalled()
  })

  it('ignores a late response after selecting a different rubric', async () => {
    let resolveFirst!: (value: typeof draft) => void
    mocks.getRubric.mockImplementation((id: number) => id === 1 ? new Promise(resolve => { resolveFirst = resolve }) : Promise.resolve(published))
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: /DRAFT · v1/ }))
    fireEvent.click(screen.getByRole('button', { name: /PUBLIC · v1/ }))
    await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    resolveFirst(draft)
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'DRAFT · v1' })).toBeNull())
  })

  it('preserves unsaved edits when cancelling a rubric switch, and discards only after confirmation', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: /DRAFT · v1/ }))
    await screen.findByLabelText('Tên bộ tiêu chí')
    fireEvent.change(screen.getByLabelText('Tên bộ tiêu chí'), { target: { value: 'Nội dung chưa lưu' } })
    fireEvent.click(screen.getByRole('button', { name: /PUBLIC · v1/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect((screen.getByLabelText('Tên bộ tiêu chí') as HTMLInputElement).value).toBe('Nội dung chưa lưu')
    fireEvent.click(screen.getByRole('button', { name: /PUBLIC · v1/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }))
    await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    expect(mocks.updateRubric).not.toHaveBeenCalled()
  })

  it('edits 7 scope fields, criterion metadata, and adds criterion levels in draft (F8)', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: /DRAFT · v1/ }))
    await screen.findByLabelText('Tên bộ tiêu chí')

    // Change scope fields
    fireEvent.change(screen.getByLabelText('Chế độ đồ án'), { target: { value: 'INTERDISCIPLINARY' } })
    fireEvent.change(screen.getByLabelText('Giai đoạn đánh giá'), { target: { value: 'DEFENSE' } })
    fireEvent.change(screen.getByLabelText('Phạm vi đánh giá'), { target: { value: 'MAJOR_SPECIFIC' } })
    fireEvent.change(screen.getByLabelText('Mã chuyên ngành (Major ID)'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Hiệu lực từ ngày'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('Hiệu lực đến ngày'), { target: { value: '2026-12-31' } })

    // Change criterion metadata
    fireEvent.change(screen.getByLabelText('Mã tiêu chí (Code)'), { target: { value: 'CRIT-NEW' } })
    fireEvent.change(screen.getByLabelText('Chuẩn đầu ra (CLO / PLO)'), { target: { value: 'CLO-4' } })
    fireEvent.change(screen.getByLabelText('Hướng dẫn minh chứng'), { target: { value: 'Bản thiết kế hệ thống' } })

    // Add a criterion level
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm mức đánh giá' }))
    expect(screen.getAllByPlaceholderText('Tên mức (ví dụ: Xuất sắc)').length).toBe(2)

    mocks.updateRubric.mockResolvedValue({ ...draft, id: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))

    await waitFor(() => {
      expect(mocks.updateRubric).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          projectMode: 'INTERDISCIPLINARY',
          evaluationStage: 'DEFENSE',
          evaluationScope: 'MAJOR_SPECIFIC',
          majorId: 8,
          criteria: expect.arrayContaining([
            expect.objectContaining({
              criterionCode: 'CRIT-NEW',
              learningOutcome: 'CLO-4',
              evidenceGuidance: 'Bản thiết kế hệ thống',
            }),
          ]),
        }),
        'token'
      )
    })
  })

  it('submits rubric for approval when canSubmitForApproval is granted (BE-08 FE)', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: /DRAFT · v1/ }))
    const submitBtn = await screen.findByRole('button', { name: 'Gửi phê duyệt' })
    expect(submitBtn).toBeTruthy()

    mocks.submitRubricForApproval.mockResolvedValue({ ...draft, status: 'PENDING_APPROVAL' })
    fireEvent.click(submitBtn)

    // Confirmation dialog appears with confirm button
    const confirmBtns = await screen.findAllByRole('button', { name: 'Gửi phê duyệt' })
    const modalBtn = confirmBtns.find(b => b.classList.contains('app-modal__button')) ?? confirmBtns[0]
    fireEvent.submit(modalBtn.closest('form')!)

    await waitFor(() => expect(mocks.submitRubricForApproval).toHaveBeenCalledWith(1, 'token'))
  })

  it('approves rubric with optional approval reference when canApprove is granted (BE-08 FE)', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: /PENDING · v1/ }))
    const approveBtn = await screen.findByRole('button', { name: 'Phê duyệt' })
    expect(approveBtn).toBeTruthy()

    mocks.approveRubric.mockResolvedValue({ ...pending, status: 'APPROVED' })
    fireEvent.click(approveBtn)

    // Dialog with approval reference input
    const refInput = await screen.findByLabelText(/Số quyết định/)
    fireEvent.change(refInput, { target: { value: 'QD-2026/99' } })

    const confirmBtns = screen.getAllByRole('button', { name: 'Phê duyệt' })
    const modalBtn = confirmBtns.find(b => b.classList.contains('app-modal__button')) ?? confirmBtns[0]
    fireEvent.submit(modalBtn.closest('form')!)

    await waitFor(() => expect(mocks.approveRubric).toHaveBeenCalledWith(3, 'token', 'QD-2026/99'))
  })

  it('rejects rubric requiring mandatory rejection reason when canReject is granted (BE-08 FE)', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: /PENDING · v1/ }))
    const rejectBtn = await screen.findByRole('button', { name: 'Từ chối' })
    expect(rejectBtn).toBeTruthy()

    mocks.rejectRubric.mockResolvedValue({ ...pending, status: 'DRAFT' })
    fireEvent.click(rejectBtn)

    // In the reject dialog, rejection reason is required
    const reasonInput = await screen.findByLabelText(/Lý do từ chối/)
    fireEvent.change(reasonInput, { target: { value: 'Chưa đủ tiêu chí CLO-3' } })

    const confirmBtns = screen.getAllByRole('button', { name: 'Từ chối' })
    const modalBtn = confirmBtns.find(b => b.classList.contains('app-modal__button')) ?? confirmBtns[0]
    fireEvent.submit(modalBtn.closest('form')!)

    await waitFor(() => expect(mocks.rejectRubric).toHaveBeenCalledWith(3, 'token', 'Chưa đủ tiêu chí CLO-3'))
  })
})
