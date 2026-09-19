import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import type { ExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { HttpError } from '../../services/http/http-client'
import { ProgressReportDetailPage } from './ProgressReportDetailPage'
import { ProgressReportsPage } from './ProgressReportsPage'
import type { ReportDetail } from './report-types'

const api = vi.hoisted(() => ({ getProgressReports: vi.fn(), getProgressReport: vi.fn(), createProgressReport: vi.fn(), updateProgressReport: vi.fn(), submitProgressReport: vi.fn(), addProgressReportFeedback: vi.fn() }))
vi.mock('../../services/api/progress-reports.api', () => api)
const draft: ReportDetail = {
  id: 17, projectId: 9, submittedBy: 2, submittedByName: 'Nguyễn Minh Anh', reportType: 'WEEKLY', periodStart: '2026-09-14', periodEnd: '2026-09-20',
  summary: 'Hoàn thành chức năng đăng ký', completedWork: 'Tích hợp API đề tài', plannedWork: 'Kiểm thử với giảng viên', issuesAndRisks: 'Không có',
  status: 'DRAFT', submittedAt: null, isLate: null, createdAt: '2026-09-20T08:00:00Z', updatedAt: '2026-09-20T08:00:00Z', feedbacks: [],
}
function mount({ actor = 'student', leader = true, path = '/project/reports/17' }: { actor?: 'student' | 'supervisor'; leader?: boolean; path?: string } = {}) {
  const access: ExecutionAccess = { project: { id: 9, title: 'Quản lý đồ án', status: 'ACTIVE' } as ExecutionAccess['project'], actor, canManageStructure: leader, currentUserId: actor === 'student' ? 2 : 5, routeBase: '/project' }
  const router = createMemoryRouter([{ element: <ExecutionAccessProvider value={access}><Outlet /></ExecutionAccessProvider>, children: [
    { path: '/project/reports', element: <ProgressReportsPage /> },
    { path: '/project/reports/new', element: <ProgressReportDetailPage create /> },
    { path: '/project/reports/:reportId', element: <ProgressReportDetailPage /> },
  ] }], { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}
const input = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name, { exact: false }), { target: { value } })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

beforeEach(() => {
  vi.resetAllMocks()
  api.getProgressReport.mockResolvedValue(draft)
  api.getProgressReports.mockResolvedValue({ items: [draft], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
})
afterEach(cleanup)

describe('Progress reports workflow', () => {
  it('protects unsaved edits when navigating away and allows an explicit discard', async () => {
    mount(); await screen.findByLabelText(/Tóm tắt tiến độ/)
    input('Tóm tắt tiến độ', 'Nội dung chưa lưu')
    fireEvent.click(screen.getByRole('link', { name: 'Danh sách báo cáo' }))
    await screen.findByText(/Bạn có nội dung chưa lưu/)
    click('Ở lại soạn tiếp')
    expect((screen.getByLabelText(/Tóm tắt tiến độ/) as HTMLTextAreaElement).value).toBe('Nội dung chưa lưu')
    fireEvent.click(screen.getByRole('link', { name: 'Danh sách báo cáo' }))
    click('Bỏ thay đổi và rời trang')
    await screen.findByRole('heading', { name: 'Lịch sử báo cáo' })
    expect(api.updateProgressReport).not.toHaveBeenCalled()
  })
  it('creates a trimmed draft then opens its persisted detail', async () => {
    api.createProgressReport.mockResolvedValue(draft)
    mount({ path: '/project/reports/new' })
    input('Từ ngày', '2026-09-14'); input('Đến ngày', '2026-09-20'); input('Tóm tắt tiến độ', '  Hoàn thành chức năng đăng ký  ')
    click('Lưu bản nháp')
    await screen.findByText('Người tạo: Nguyễn Minh Anh')
    expect(api.createProgressReport).toHaveBeenCalledWith(9, { reportType: 'WEEKLY', periodStart: '2026-09-14', periodEnd: '2026-09-20', summary: draft.summary, completedWork: null, plannedWork: null, issuesAndRisks: null })
  })
  it('validates blank summary and reversed dates without sending requests', () => {
    mount({ path: '/project/reports/new' })
    input('Tóm tắt tiến độ', '   ')
    fireEvent.submit(screen.getByRole('button', { name: 'Lưu bản nháp' }).closest('form')!)
    expect(screen.getByRole('alert').textContent).toContain('Vui lòng nhập')
    input('Tóm tắt tiến độ', 'Kết quả'); input('Từ ngày', '2026-09-20'); input('Đến ngày', '2026-09-14')
    fireEvent.submit(screen.getByRole('button', { name: 'Lưu bản nháp' }).closest('form')!)
    expect(screen.getByRole('alert').textContent).toContain('Ngày kết thúc')
    expect(api.createProgressReport).not.toHaveBeenCalled()
  })
  it('allows members to edit drafts but never to submit', async () => {
    api.updateProgressReport.mockResolvedValue({ ...draft, summary: 'Đã cập nhật' })
    mount({ leader: false })
    await screen.findByLabelText(/Tóm tắt tiến độ/)
    expect(screen.queryByRole('button', { name: 'Nộp cho GVHD' })).toBeNull()
    input('Tóm tắt tiến độ', 'Đã cập nhật'); click('Lưu thay đổi')
    await screen.findByText(/Đã lưu thay đổi/)
    expect(api.updateProgressReport).toHaveBeenCalledWith(17, { summary: 'Đã cập nhật', completedWork: draft.completedWork, plannedWork: draft.plannedWork, issuesAndRisks: draft.issuesAndRisks })
  })
  it('blocks submit for incomplete persisted drafts and unsaved changes', async () => {
    api.getProgressReport.mockResolvedValue({ ...draft, issuesAndRisks: ' ' })
    mount()
    const submit = await screen.findByRole('button', { name: 'Nộp cho GVHD' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    input('Khó khăn & rủi ro', 'Không có')
    expect(submit.disabled).toBe(true)
    expect(screen.getByText('Lưu thay đổi trước khi nộp.')).toBeTruthy()
    expect(api.submitProgressReport).not.toHaveBeenCalled()
  })
  it('requires confirmation, submits once and locks the report', async () => {
    let resolve!: (value: ReportDetail) => void
    api.submitProgressReport.mockReturnValue(new Promise((done) => { resolve = done }))
    mount(); await screen.findByRole('button', { name: 'Nộp cho GVHD' })
    click('Nộp cho GVHD'); expect(api.submitProgressReport).not.toHaveBeenCalled()
    click('Xác nhận nộp')
    fireEvent.click(screen.getByRole('button', { name: 'Đang nộp…' }))
    expect(api.submitProgressReport).toHaveBeenCalledTimes(1)
    await act(async () => resolve({ ...draft, status: 'SUBMITTED', submittedAt: '2026-09-21T08:00:00Z' }))
    expect(await screen.findByText('Đã nộp')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
  it('preserves unsaved content when saving fails', async () => {
    api.updateProgressReport.mockRejectedValue(new HttpError('conflict', 409))
    mount(); await screen.findByLabelText(/Tóm tắt tiến độ/)
    input('Tóm tắt tiến độ', 'Nội dung cần giữ lại'); click('Lưu thay đổi')
    await screen.findByRole('alert')
    expect((screen.getByLabelText(/Tóm tắt tiến độ/) as HTMLTextAreaElement).value).toBe('Nội dung cần giữ lại')
    expect(screen.getByText('Lưu thay đổi trước khi nộp.')).toBeTruthy()
  })
  it('does not reveal a report from another project', async () => {
    api.getProgressReport.mockResolvedValue({ ...draft, projectId: 999 })
    mount(); await screen.findByText('Báo cáo không thuộc đồ án đang mở.')
    expect(screen.queryByText(draft.summary)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nộp cho GVHD' })).toBeNull()
  })
  it('rejects an invalid detail ID without calling the API', async () => {
    mount({ path: '/project/reports/invalid' })
    await screen.findByText('Đường dẫn báo cáo không hợp lệ.')
    expect(api.getProgressReport).not.toHaveBeenCalled()
  })
  it('lets supervisors read drafts but not edit or comment', async () => {
    mount({ actor: 'supervisor' }); await screen.findByText(draft.summary)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nộp cho GVHD' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gửi nhận xét' })).toBeNull()
  })
  it('posts supervisor feedback and reloads authoritative REVIEWED detail', async () => {
    const feedback = { id: 44, supervisorName: 'ThS. Trần Mai', feedbackText: 'Bổ sung kiểm thử phân quyền.', createdAt: '2026-09-21T08:30:00Z' }
    api.getProgressReport.mockResolvedValueOnce({ ...draft, status: 'SUBMITTED' }).mockResolvedValue({ ...draft, status: 'REVIEWED', feedbacks: [feedback] })
    api.addProgressReportFeedback.mockResolvedValue(feedback)
    mount({ actor: 'supervisor' })
    await screen.findByLabelText('Nhận xét mới')
    input('Nhận xét mới', `  ${feedback.feedbackText}  `); click('Gửi nhận xét')
    await screen.findByText('Đã nhận xét')
    expect(screen.getByText(feedback.feedbackText)).toBeTruthy()
    expect(api.addProgressReportFeedback).toHaveBeenCalledWith(17, feedback.feedbackText)
    expect(screen.getByText('Đã nhận xét')).toBeTruthy()
    expect((screen.getByLabelText('Nhận xét mới') as HTMLTextAreaElement).value).toBe('')
  })
  it('retains feedback on forbidden POST without fabricating success', async () => {
    api.getProgressReport.mockResolvedValue({ ...draft, status: 'SUBMITTED' })
    api.addProgressReportFeedback.mockRejectedValue(new HttpError('forbidden', 403))
    mount({ actor: 'supervisor' }); await screen.findByLabelText('Nhận xét mới')
    input('Nhận xét mới', 'Cần thêm kiểm thử'); click('Gửi nhận xét')
    expect((await screen.findByRole('alert')).textContent).toContain('không có quyền')
    expect((screen.getByLabelText('Nhận xét mới') as HTMLTextAreaElement).value).toBe('Cần thêm kiểm thử')
    expect(screen.queryByText('Đã nhận xét')).toBeNull()
  })
  it('does not re-post feedback when the refresh after success fails', async () => {
    api.getProgressReport.mockResolvedValueOnce({ ...draft, status: 'SUBMITTED' }).mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue({ ...draft, status: 'REVIEWED' })
    api.addProgressReportFeedback.mockResolvedValue({ id: 44 })
    mount({ actor: 'supervisor' }); await screen.findByLabelText('Nhận xét mới')
    input('Nhận xét mới', 'Đã xem'); click('Gửi nhận xét')
    await screen.findByRole('alert')
    expect(screen.getByText('Đã gửi nhận xét cho nhóm.')).toBeTruthy()
    click('Tải lại'); await screen.findByText('Đã nhận xét')
    expect(api.addProgressReportFeedback).toHaveBeenCalledTimes(1)
  })
  it('shows reviewed feedback read-only for students after a reload', async () => {
    api.getProgressReport.mockResolvedValue({ ...draft, status: 'REVIEWED', feedbacks: [{ id: 1, supervisorName: 'ThS. Mai', createdAt: '2026-09-21', feedbackText: 'Hoàn thiện tài liệu kiểm thử.' }] })
    mount(); await screen.findByText('Hoàn thiện tài liệu kiểm thử.')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gửi nhận xét' })).toBeNull()
  })
})

describe('Report list', () => {
  it('filters using the API, resets pagination, and preserves project context', async () => {
    mount({ path: '/project/reports?page=3' }); await screen.findByText(draft.summary)
    input('Trạng thái', 'SUBMITTED')
    await waitFor(() => expect(api.getProgressReports).toHaveBeenLastCalledWith(9, { status: 'SUBMITTED', reportType: undefined, page: 1, pageSize: 10 }, expect.any(AbortSignal)))
    expect(screen.getByRole('link', { name: /14\/09\/2026/ }).getAttribute('href')).toBe('/project/reports/17')
  })
  it('recovers from a load error and shows a useful empty state', async () => {
    api.getProgressReports.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue({ items: [], totalCount: 0, totalPages: 0 })
    mount({ path: '/project/reports', actor: 'supervisor' }); await screen.findByRole('alert')
    click('Tải lại'); await screen.findByText('Bắt đầu kỳ báo cáo đầu tiên')
    expect(screen.queryByRole('link', { name: /Tạo báo cáo/ })).toBeNull()
  })
  it('ignores late responses from a previous filter', async () => {
    let resolve!: (value: unknown) => void
    api.getProgressReports.mockReturnValueOnce(new Promise((done) => { resolve = done })).mockResolvedValue({ items: [], totalCount: 0, totalPages: 0 })
    mount({ path: '/project/reports' })
    input('Trạng thái', 'REVIEWED'); await screen.findByText('Chưa có báo cáo phù hợp')
    await act(async () => resolve({ items: [draft], totalCount: 1, totalPages: 1 }))
    expect(screen.queryByText(draft.summary)).toBeNull()
  })
})
