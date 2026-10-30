import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import { HttpError } from '../../services/http/http-client'
import { DeliverablesPage } from './DeliverablesPage'

const api = vi.hoisted(() => ({
  getDeliverables: vi.fn(), getDeliverable: vi.fn(), getDeliverableVersions: vi.fn(), getDeliverableFeedback: vi.fn(), downloadDeliverableFile: vi.fn(),
  createDeliverable: vi.fn(), updateDeliverable: vi.fn(), deleteDeliverable: vi.fn(), submitDeliverableVersion: vi.fn(), reviewDeliverableVersion: vi.fn(),
}))
vi.mock('../../services/api/deliverables.api', () => api)
afterEach(cleanup)
const item = { id: 4, projectId: 9, milestoneId: null, title: 'Báo cáo thiết kế', description: null, deliverableType: 'REPORT', dueAt: null, status: 'OPEN', createdBy: 2, latestVersion: 1 }
function page(actor: 'student' | 'supervisor' = 'student', readOnly = false) { return render(<MemoryRouter><ExecutionAccessProvider value={{ project: { id: 9, teamId: 1, teamName: 'Demo team', code: 'P9', title: 'Demo', status: 'ACTIVE', registeredAt: '2026-09-01', createdBy: 1, createdByName: 'Demo', createdAt: '2026-09-01', updatedAt: '2026-09-01', concurrencyToken: 'token', majors: [], tags: [] }, actor, canManageStructure: actor === 'supervisor', readOnly, routeBase: actor === 'student' ? '/project' : '/supervisor/projects/9' }}><DeliverablesPage /></ExecutionAccessProvider></MemoryRouter>) }
beforeEach(() => {
  vi.clearAllMocks()
  api.getDeliverables.mockResolvedValue({ items: [item], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
  api.getDeliverableVersions.mockResolvedValue({ items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 })
  api.getDeliverableFeedback.mockResolvedValue({ items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 })
})
describe('DeliverablesPage', () => {
  it('preserves the original UTC deadline when editing an offsetless server timestamp', async () => {
    api.getDeliverables.mockResolvedValue({ items: [{ ...item, dueAt: '2026-10-30T11:00:00' }], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
    page('supervisor'); await screen.findByText('Báo cáo thiết kế')
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    expect((screen.getByLabelText('Hạn nộp theo giờ Việt Nam') as HTMLInputElement).value).toBe('2026-10-30T18:00')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hạng mục' }))
    await waitFor(() => expect(api.updateDeliverable).toHaveBeenCalledWith(4, expect.objectContaining({ dueAt: '2026-10-30T11:00:00.000Z' })))
  })

  it('uses server latestVersion for an upload and refreshes after a verified stale version instead of retrying', async () => {
    api.submitDeliverableVersion.mockRejectedValue(new HttpError('stale', 409, { code: 'STALE_LATEST_VERSION' }))
    page(); await screen.findByText('Báo cáo thiết kế')
    const input = screen.getByLabelText('Tệp Báo cáo thiết kế')
    fireEvent.change(input, { target: { files: [new File(['a'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.submit(screen.getByRole('button', { name: 'Nộp phiên bản' }).closest('form')!)
    await waitFor(() => expect(api.submitDeliverableVersion).toHaveBeenCalledWith(4, 1, expect.any(File), ''))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/phiên bản mới hơn/))
    expect(screen.getByRole('alert').textContent).not.toContain('phiên bản không còn mới nhất')
    expect(api.submitDeliverableVersion).toHaveBeenCalledOnce()
    expect(api.getDeliverables.mock.calls.length).toBeGreaterThan(1)
    expect(screen.getByRole('button', { name: 'Tải lại dữ liệu' })).toBeTruthy()
  })

  it('keeps the file and note and hides retry for the verified missing execution window', async () => {
    api.submitDeliverableVersion.mockRejectedValue(new HttpError('English detail', 409, {
      code: 'EXECUTION_WINDOW_REQUIRED', detail: 'English detail', traceId: 'secret trace',
    }))
    page(); await screen.findByText('Báo cáo thiết kế')
    const fileInput = screen.getByLabelText('Tệp Báo cáo thiết kế') as HTMLInputElement
    const noteInput = screen.getByLabelText('Ghi chú Báo cáo thiết kế') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['a'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.change(noteInput, { target: { value: 'Giữ ghi chú chưa nộp' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Nộp phiên bản' }).closest('form')!)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('chưa có kỳ thực hiện đang mở')
    expect(alert.textContent).not.toMatch(/phiên bản|English detail|secret trace/)
    expect(screen.queryByRole('button', { name: /Thử lại|Tải lại dữ liệu/ })).toBeNull()
    expect(noteInput.value).toBe('Giữ ghi chú chưa nộp')
    expect(fileInput.files?.[0]?.name).toBe('report.pdf')
    expect(api.getDeliverables).toHaveBeenCalledTimes(1)
  })

  it('refreshes a locked deliverable and removes the stale upload form', async () => {
    api.getDeliverables
      .mockResolvedValueOnce({ items: [item], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
      .mockResolvedValueOnce({ items: [{ ...item, status: 'ACCEPTED' }], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
    api.submitDeliverableVersion.mockRejectedValueOnce(new HttpError('private', 409, { code: 'DELIVERABLE_LOCKED' }))
    page(); await screen.findByText('Báo cáo thiết kế')
    fireEvent.change(screen.getByLabelText('Tệp Báo cáo thiết kế'), { target: { files: [new File(['a'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.submit(screen.getByRole('button', { name: 'Nộp phiên bản' }).closest('form')!)
    expect(await screen.findByText('Đã chấp nhận', { selector: 'span.ex-badge' })).toBeTruthy()
    expect(api.getDeliverables).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('button', { name: 'Nộp phiên bản' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Thử lại|Tải lại dữ liệu/ })).toBeNull()
    expect(api.submitDeliverableVersion).toHaveBeenCalledOnce()
  })

  it('offers read retry after 503 without automatically resubmitting the upload', async () => {
    api.submitDeliverableVersion.mockRejectedValue(new HttpError('private server error', 503, { traceId: 'private' }))
    page(); await screen.findByText('Báo cáo thiết kế')
    fireEvent.change(screen.getByLabelText('Tệp Báo cáo thiết kế'), { target: { files: [new File(['a'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.submit(screen.getByRole('button', { name: 'Nộp phiên bản' }).closest('form')!)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).not.toMatch(/private server error|private/)
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(api.getDeliverables).toHaveBeenCalledTimes(2))
    expect(api.submitDeliverableVersion).toHaveBeenCalledOnce()
  })

  it('shows backend field keys inline without leaking their English validation text', async () => {
    api.submitDeliverableVersion.mockRejectedValue(new HttpError('private', 422, {
      errors: { file: ['English file detail'], note: ['English note detail'] }, traceId: 'private trace',
    }))
    page(); await screen.findByText('Báo cáo thiết kế')
    const fileInput = screen.getByLabelText('Tệp Báo cáo thiết kế') as HTMLInputElement
    const noteInput = screen.getByLabelText('Ghi chú Báo cáo thiết kế') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['a'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.change(noteInput, { target: { value: 'Bản nháp ghi chú' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Nộp phiên bản' }).closest('form')!)
    await waitFor(() => expect(fileInput.getAttribute('aria-invalid')).toBe('true'))
    expect(noteInput.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Kiểm tra tệp đã chọn.')).toBeTruthy()
    expect(screen.getByText('Kiểm tra ghi chú phiên bản.')).toBeTruthy()
    expect(noteInput.value).toBe('Bản nháp ghi chú')
    expect(screen.getAllByRole('alert').map(alert => alert.textContent).join(' ')).not.toMatch(/English|private trace/)
  })

  it('keeps a server permission denial visible without offering a retry', async () => {
    api.submitDeliverableVersion.mockRejectedValue(new HttpError('private permission detail', 403, { detail: 'private permission detail' }))
    page(); await screen.findByText('Báo cáo thiết kế')
    fireEvent.change(screen.getByLabelText('Tệp Báo cáo thiết kế'), { target: { files: [new File(['a'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.submit(screen.getByRole('button', { name: 'Nộp phiên bản' }).closest('form')!)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('không có quyền')
    expect(alert.textContent).not.toContain('private permission detail')
    expect(screen.queryByRole('button', { name: /Thử lại|Tải lại dữ liệu/ })).toBeNull()
    expect(api.getDeliverables).toHaveBeenCalledTimes(1)
  })

  it('announces a confirmed upload as status rather than an error alert', async () => {
    api.submitDeliverableVersion.mockResolvedValue({ id: 31, deliverableId: 4, versionNumber: 2, status: 'SUBMITTED' })
    page(); await screen.findByText('Báo cáo thiết kế')
    fireEvent.change(screen.getByLabelText('Tệp Báo cáo thiết kế'), { target: { files: [new File(['a'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.submit(screen.getByRole('button', { name: 'Nộp phiên bản' }).closest('form')!)
    expect((await screen.findByRole('status')).textContent).toContain('Đã nộp phiên bản mới')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('offers a reload after a server read error without displaying raw backend detail or trace ID', async () => {
    api.getDeliverables.mockRejectedValueOnce(new HttpError('Internal English detail', 503, { detail: 'Internal English detail', traceId: 'secret-trace' }))
    page()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).not.toMatch(/Internal English detail|secret-trace/)
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Báo cáo thiết kế')).toBeTruthy()
    expect(api.getDeliverables).toHaveBeenCalledTimes(2)
  })

  it('shows reviewer controls only for the assigned supervisor and a submitted version', async () => {
    api.getDeliverableVersions.mockResolvedValue({ items: [{ id: 7, deliverableId: 4, versionNumber: 1, submittedBy: 3, note: null, status: 'SUBMITTED', submittedAt: '2026-09-22T00:00:00Z', files: [] }], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
    page('supervisor'); await screen.findByText('Báo cáo thiết kế')
    fireEvent.click(screen.getByRole('button', { name: 'Xem phiên bản' }))
    expect(await screen.findByLabelText('Nhận xét V1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nộp phiên bản' })).toBeNull()
  })

  it('keeps submitted versions visible but hides review writes in supervisor read-only mode', async () => {
    api.getDeliverableVersions.mockResolvedValue({ items: [{ id: 7, deliverableId: 4, versionNumber: 1, submittedBy: 3, note: null, status: 'SUBMITTED', submittedAt: '2026-09-22T00:00:00Z', files: [] }], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
    page('supervisor', true); await screen.findByText('Báo cáo thiết kế')
    fireEvent.click(screen.getByRole('button', { name: 'Xem phiên bản' }))
    expect(await screen.findByText('Phiên bản 1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi đánh giá' })).toBeNull()
    expect(api.reviewDeliverableVersion).not.toHaveBeenCalled()
  })

  it('loads persisted feedback for the selected immutable version', async () => {
    const version = { id: 7, deliverableId: 4, versionNumber: 1, submittedBy: 3, note: null, status: 'ACCEPTED', submittedAt: '2026-09-22T00:00:00Z', files: [] }
    api.getDeliverableVersions.mockResolvedValue({ items: [version], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
    api.getDeliverableFeedback.mockResolvedValue({ items: [{ id: 10, projectId: 9, versionId: 7, assignmentId: 2, supervisorUserId: 5, feedback: 'Đủ bằng chứng để nghiệm thu.', createdAt: '2026-09-23T00:00:00Z' }], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
    page(); await screen.findByText('Báo cáo thiết kế')
    fireEvent.click(screen.getByRole('button', { name: 'Xem phiên bản' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Xem phản hồi' }))
    expect(await screen.findByText('Đủ bằng chứng để nghiệm thu.')).toBeTruthy()
    expect(api.getDeliverableFeedback).toHaveBeenCalledWith(7, 1, 10, undefined)
  })
})

it('ignores a late version response after closing and opening another deliverable', async () => {
  const other = { ...item, id: 5, title: 'Sản phẩm cuối' }
  api.getDeliverables.mockResolvedValue({ items: [item, other], page: 1, pageSize: 10, totalCount: 2, totalPages: 1 })
  let resolveOld!: (value: unknown) => void
  api.getDeliverableVersions.mockImplementation((id: number) => id === 4 ? new Promise(resolve => { resolveOld = resolve }) : Promise.resolve({ items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 }))
  page(); await screen.findByText('Báo cáo thiết kế')
  fireEvent.click(screen.getAllByRole('button', { name: 'Xem phiên bản' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Đóng hộp thoại' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Xem phiên bản' })[1])
  await screen.findByRole('heading', { name: 'Chưa có phiên bản' })
  resolveOld({ items: [{ id: 7, versionNumber: 1, note: 'Phản hồi tải cũ', status: 'OPEN', files: [] }], totalCount: 1 })
  await waitFor(() => expect(screen.queryByText('Phản hồi tải cũ')).toBeNull())
  expect(screen.getByRole('dialog', { name: 'Lịch sử phiên bản' }).textContent).toContain('Sản phẩm cuối')
})
