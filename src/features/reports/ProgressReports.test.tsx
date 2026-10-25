import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import type { ExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { HttpError } from '../../services/http/http-client'
import { ProgressReportDetailPage } from './ProgressReportDetailPage'
import { ProgressReportsPage } from './ProgressReportsPage'
import type { ReportDetail } from './report-types'

const api = vi.hoisted(() => ({
  getProgressReports: vi.fn(),
  getProgressReport: vi.fn(),
  createProgressReport: vi.fn(),
  updateProgressReport: vi.fn(),
  submitProgressReport: vi.fn(),
  addProgressReportFeedback: vi.fn(),
}))
const ai = vi.hoisted(() => ({ getReportAiSummary: vi.fn() }))
const govApi = vi.hoisted(() => ({ getReportingCycles: vi.fn() }))

vi.mock('../../services/api/progress-reports.api', () => api)
vi.mock('../ai/ai-api', () => ai)
vi.mock('../projects/api/project-governance-api', () => govApi)

const draft: ReportDetail = {
  id: 17,
  projectId: 9,
  submittedBy: 2,
  submittedByName: 'Nguyễn Minh Anh',
  reportType: 'WEEKLY',
  periodStart: '2026-09-14',
  periodEnd: '2026-09-20',
  summary: 'Hoàn thành chức năng đăng ký',
  completedWork: 'Tích hợp API đề tài',
  inProgressWork: 'Kiểm thử đơn vị',
  blockers: 'Không có',
  risks: 'Không có',
  nextActions: 'Bàn giao',
  plannedWork: 'Kiểm thử với giảng viên',
  issuesAndRisks: null,
  status: 'DRAFT',
  submittedAt: null,
  isLate: null,
  createdAt: '2026-09-20T08:00:00Z',
  updatedAt: '2026-09-20T08:00:00Z',
  concurrencyToken: 'report-token',
  feedbacks: [],
  progressReportPeriodId: 101,
}

const capabilities = (allowed: boolean) => ({
  status: 'ready' as const,
  get: () => ({ state: allowed ? ('allowed' as const) : ('denied' as const), allowed, reasons: [] }),
})

function mount({
  actor = 'student',
  leader = true,
  path = '/project/reports/17',
  createAllowed = actor === 'student',
}: {
  actor?: 'student' | 'supervisor'
  leader?: boolean
  path?: string
  createAllowed?: boolean
} = {}) {
  const access: ExecutionAccess = {
    project: { id: 9, title: 'Quản lý đồ án', status: 'ACTIVE' } as ExecutionAccess['project'],
    actor,
    canManageStructure: leader,
    executionCapabilities: actor === 'student' ? capabilities(createAllowed) : undefined,
    currentUserId: actor === 'student' ? 2 : 5,
    routeBase: '/project',
  }
  const router = createMemoryRouter(
    [
      {
        element: (
          <ExecutionAccessProvider value={access}>
            <Outlet />
          </ExecutionAccessProvider>
        ),
        children: [
          { path: '/project/reports', element: <ProgressReportsPage /> },
          { path: '/project/reports/new', element: <ProgressReportDetailPage create /> },
          { path: '/project/reports/:reportId', element: <ProgressReportDetailPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

const input = (name: string, value: string) =>
  fireEvent.change(screen.getByLabelText(name, { exact: false }), { target: { value } })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

beforeEach(() => {
  vi.resetAllMocks()
  govApi.getReportingCycles.mockResolvedValue({ items: [], totalCount: 0, totalPages: 0 })
  api.getProgressReport.mockResolvedValue(draft)
  api.getProgressReports.mockResolvedValue({ items: [draft], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
  ai.getReportAiSummary.mockResolvedValue({
    projectId: 9,
    reportId: 17,
    reportType: 'WEEKLY',
    periodStart: '2026-09-14',
    periodEnd: '2026-09-20',
    summary: { completed: '', inProgress: '', blockers: '', risks: '', nextActions: '' },
    contextScope: 'PROJECT',
    evidence: [],
    limitationNote: null,
    generatedAt: '2026-09-20T08:00:00Z',
  })
})
afterEach(cleanup)

describe('Progress reports workflow', () => {
  it('opens a report through its row without a duplicate view action', async () => {
    mount({ path: '/project/reports' })
    const row = await screen.findByRole('link', { name: /Hoàn thành chức năng đăng ký/ })
    expect(row.getAttribute('href')).toBe('/project/reports/17')
    expect(screen.queryByText('Xem báo cáo')).toBeNull()
    fireEvent.click(row)
    expect(await screen.findByRole('heading', { name: 'Chi tiết báo cáo' })).toBeTruthy()
  })

  it('keeps the unsaved edit guard when using Back from a direct report link', async () => {
    mount()
    await screen.findByLabelText(/Tóm tắt tiến độ/)
    input('Tóm tắt tiến độ', 'Nội dung chưa lưu')
    fireEvent.click(screen.getByRole('link', { name: 'Quay lại' }))
    expect(await screen.findByText('Bạn có nội dung chưa lưu. Rời trang sẽ bỏ những thay đổi này.')).toBeTruthy()
    click('Ở lại soạn tiếp')
    expect((screen.getByLabelText(/Tóm tắt tiến độ/) as HTMLTextAreaElement).value).toBe('Nội dung chưa lưu')
    fireEvent.click(screen.getByRole('link', { name: 'Quay lại' }))
    click('Bỏ thay đổi và rời trang')
    expect(await screen.findByRole('heading', { name: 'Lịch sử báo cáo' })).toBeTruthy()
    expect(api.updateProgressReport).not.toHaveBeenCalled()
  })

  it('protects unsaved edits when navigating away and allows an explicit discard', async () => {
    mount()
    await screen.findByLabelText(/Tóm tắt tiến độ/)
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
    input('Từ ngày', '2026-09-14')
    input('Đến ngày', '2026-09-20')
    input('Tóm tắt tiến độ', '  Hoàn thành chức năng đăng ký  ')
    click('Lưu bản nháp')
    await screen.findByText('Người tạo: Nguyễn Minh Anh')
    expect(api.createProgressReport).toHaveBeenCalledWith(9, {
      reportType: 'WEEKLY',
      periodStart: '2026-09-14',
      periodEnd: '2026-09-20',
      progressReportPeriodId: null,
      summary: draft.summary,
      completedWork: null,
      inProgressWork: null,
      blockers: null,
      risks: null,
      nextActions: null,
      plannedWork: null,
      issuesAndRisks: undefined,
    })
  })

  it('populates period dates when a reporting cycle is selected', async () => {
    govApi.getReportingCycles.mockResolvedValue({
      items: [
        {
          id: 202,
          reportType: 'WEEKLY',
          periodStart: '2026-10-01',
          periodEnd: '2026-10-07',
          deadline: '2026-10-08',
        },
      ],
      totalCount: 1,
      totalPages: 1,
    })
    mount({ path: '/project/reports/new' })
    await screen.findByLabelText(/Kỳ báo cáo học vụ/)
    fireEvent.change(screen.getByLabelText(/Kỳ báo cáo học vụ/), { target: { value: '202' } })
    expect((screen.getByLabelText('Từ ngày') as HTMLInputElement).value).toBe('2026-10-01')
    expect((screen.getByLabelText('Đến ngày') as HTMLInputElement).value).toBe('2026-10-07')
  })

  it('lets a member create a report when the backend action allows it', async () => {
    api.createProgressReport.mockResolvedValue(draft)
    mount({ leader: false, path: '/project/reports/new', createAllowed: true })
    input('Từ ngày', '2026-09-14')
    input('Đến ngày', '2026-09-20')
    input('Tóm tắt tiến độ', 'Tiến độ của tôi')
    click('Lưu bản nháp')
    await screen.findByText('Người tạo: Nguyễn Minh Anh')
    expect(api.createProgressReport).toHaveBeenCalledTimes(1)
  })

  it('hides and blocks report creation when capability is unavailable or denied', async () => {
    mount({ path: '/project/reports', createAllowed: false })
    await screen.findByText(draft.summary)
    expect(screen.queryByRole('link', { name: /Tạo báo cáo/ })).toBeNull()
    cleanup()
    mount({ path: '/project/reports/new', createAllowed: false })
    expect(await screen.findByText(/Bạn chưa thể tạo báo cáo/)).toBeTruthy()
    expect(api.createProgressReport).not.toHaveBeenCalled()
  })

  it('validates blank summary and reversed dates without sending requests', () => {
    mount({ path: '/project/reports/new' })
    input('Tóm tắt tiến độ', '   ')
    fireEvent.submit(screen.getByRole('button', { name: 'Lưu bản nháp' }).closest('form')!)
    expect(screen.getByRole('alert').textContent).toContain('Vui lòng nhập')
    input('Tóm tắt tiến độ', 'Kết quả')
    input('Từ ngày', '2026-09-20')
    input('Đến ngày', '2026-09-14')
    fireEvent.submit(screen.getByRole('button', { name: 'Lưu bản nháp' }).closest('form')!)
    expect(screen.getByRole('alert').textContent).toContain('Ngày kết thúc')
    expect(api.createProgressReport).not.toHaveBeenCalled()
  })

  it('allows members to edit drafts but never to submit', async () => {
    api.updateProgressReport.mockResolvedValue({ ...draft, summary: 'Đã cập nhật' })
    mount({ leader: false })
    await screen.findByLabelText(/Tóm tắt tiến độ/)
    expect(screen.queryByRole('button', { name: 'Nộp cho GVHD' })).toBeNull()
    input('Tóm tắt tiến độ', 'Đã cập nhật')
    click('Lưu thay đổi')
    await screen.findByText(/Đã lưu thay đổi/)
    expect(api.updateProgressReport).toHaveBeenCalledWith(17, {
      summary: 'Đã cập nhật',
      completedWork: draft.completedWork,
      inProgressWork: draft.inProgressWork,
      blockers: draft.blockers,
      risks: draft.risks,
      nextActions: draft.nextActions,
      plannedWork: draft.plannedWork,
      progressReportPeriodId: draft.progressReportPeriodId,
      concurrencyToken: 'report-token',
    })
  })

  it('blocks submit for incomplete persisted drafts and unsaved changes', async () => {
    api.getProgressReport.mockResolvedValue({ ...draft, summary: ' ' })
    mount()
    const submit = (await screen.findByRole('button', { name: 'Nộp cho GVHD' })) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    input('Tóm tắt tiến độ', 'Tiến độ mới')
    expect(submit.disabled).toBe(true)
    expect(screen.getByText('Lưu thay đổi trước khi nộp.')).toBeTruthy()
    expect(api.submitProgressReport).not.toHaveBeenCalled()
  })

  it('requires confirmation, submits once and locks the report', async () => {
    let resolve!: (value: ReportDetail) => void
    api.submitProgressReport.mockReturnValue(new Promise((done) => { resolve = done }))
    mount()
    await screen.findByRole('button', { name: 'Nộp cho GVHD' })
    click('Nộp cho GVHD')
    expect(api.submitProgressReport).not.toHaveBeenCalled()
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
    mount()
    await screen.findByLabelText(/Tóm tắt tiến độ/)
    input('Tóm tắt tiến độ', 'Nội dung cần giữ lại')
    click('Lưu thay đổi')
    await screen.findByRole('alert')
    expect((screen.getByLabelText(/Tóm tắt tiến độ/) as HTMLTextAreaElement).value).toBe('Nội dung cần giữ lại')
    expect(screen.getByText('Lưu thay đổi trước khi nộp.')).toBeTruthy()
  })

  it('renders legacy issuesAndRisks as read-only with explanatory label', async () => {
    api.getProgressReport.mockResolvedValue({ ...draft, issuesAndRisks: 'Vấn đề cũ trong lịch sử' })
    mount()
    expect(await screen.findByText('Vấn đề cũ trong lịch sử')).toBeTruthy()
    expect(screen.getByText(/Trường cũ, đã thay bằng Vướng mắc và Rủi ro/)).toBeTruthy()
  })

  it('does not reveal a report from another project', async () => {
    api.getProgressReport.mockResolvedValue({ ...draft, projectId: 999 })
    mount()
    await screen.findByText('Báo cáo không thuộc đồ án đang mở.')
    expect(screen.queryByText(draft.summary)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nộp cho GVHD' })).toBeNull()
  })

  it('rejects an invalid detail ID without calling the API', async () => {
    mount({ path: '/project/reports/invalid' })
    await screen.findByText('Đường dẫn báo cáo không hợp lệ.')
    expect(api.getProgressReport).not.toHaveBeenCalled()
  })

  it('lets supervisors read drafts but not edit or comment', async () => {
    mount({ actor: 'supervisor' })
    await screen.findByText(draft.summary)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Nộp cho GVHD' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gửi phản hồi' })).toBeNull()
  })

  it('posts supervisor feedback and reloads authoritative REVIEWED detail', async () => {
    const feedback = {
      id: 44,
      supervisorName: 'ThS. Trần Mai',
      feedbackText: 'Bổ sung kiểm thử phân quyền.',
      createdAt: '2026-09-21T08:30:00Z',
    }
    api.getProgressReport
      .mockResolvedValueOnce({ ...draft, status: 'SUBMITTED' })
      .mockResolvedValue({ ...draft, status: 'REVIEWED', feedbacks: [feedback] })
    api.addProgressReportFeedback.mockResolvedValue(feedback)
    mount({ actor: 'supervisor' })
    await screen.findByLabelText('Phản hồi mới')
    input('Phản hồi mới', `  ${feedback.feedbackText}  `)
    click('Gửi phản hồi')
    await screen.findByText('Đã nhận xét')
    expect(screen.getByText(feedback.feedbackText)).toBeTruthy()
    expect(api.addProgressReportFeedback).toHaveBeenCalledWith(17, feedback.feedbackText, 'report-token')
    expect(screen.getByText('Đã nhận xét')).toBeTruthy()
    expect((screen.getByLabelText('Phản hồi mới') as HTMLTextAreaElement).value).toBe('')
  })

  it('retains feedback on forbidden POST without fabricating success', async () => {
    api.getProgressReport.mockResolvedValue({ ...draft, status: 'SUBMITTED' })
    api.addProgressReportFeedback.mockRejectedValue(new HttpError('forbidden', 403))
    mount({ actor: 'supervisor' })
    await screen.findByLabelText('Phản hồi mới')
    input('Phản hồi mới', 'Cần thêm kiểm thử')
    click('Gửi phản hồi')
    expect((await screen.findByRole('alert')).textContent).toContain('không có quyền')
    expect((screen.getByLabelText('Phản hồi mới') as HTMLTextAreaElement).value).toBe('Cần thêm kiểm thử')
    expect(screen.queryByText('Đã nhận xét')).toBeNull()
  })

  it('refreshes authoritative detail and retains feedback on a concurrency conflict', async () => {
    api.getProgressReport.mockResolvedValue({ ...draft, status: 'SUBMITTED' })
    api.addProgressReportFeedback.mockRejectedValue(new HttpError('conflict', 409))
    mount({ actor: 'supervisor' })
    await screen.findByLabelText('Phản hồi mới')
    input('Phản hồi mới', 'Giữ lại phản hồi này')
    click('Gửi phản hồi')
    expect((await screen.findByRole('alert')).textContent).toContain('Dữ liệu đã thay đổi')
    await waitFor(() => expect(api.getProgressReport.mock.calls.length).toBeGreaterThanOrEqual(2))
    expect((screen.getByLabelText('Phản hồi mới') as HTMLTextAreaElement).value).toBe('Giữ lại phản hồi này')
    expect(api.addProgressReportFeedback).toHaveBeenCalledTimes(1)
  })

  it('does not re-post feedback when the refresh after success fails', async () => {
    api.getProgressReport
      .mockResolvedValueOnce({ ...draft, status: 'SUBMITTED' })
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValue({ ...draft, status: 'REVIEWED' })
    api.addProgressReportFeedback.mockResolvedValue({ id: 44 })
    mount({ actor: 'supervisor' })
    await screen.findByLabelText('Phản hồi mới')
    input('Phản hồi mới', 'Đã xem')
    click('Gửi phản hồi')
    await screen.findByRole('alert')
    expect(screen.getByText('Đã gửi phản hồi cho nhóm.')).toBeTruthy()
    click('Tải lại')
    await screen.findByText('Đã nhận xét')
    expect(api.addProgressReportFeedback).toHaveBeenCalledTimes(1)
  })

  it('shows reviewed feedback read-only for students after a reload', async () => {
    api.getProgressReport.mockResolvedValue({
      ...draft,
      status: 'REVIEWED',
      feedbacks: [{ id: 1, supervisorName: 'ThS. Mai', createdAt: '2026-09-21', feedbackText: 'Hoàn thiện tài liệu kiểm thử.' }],
    })
    mount()
    await screen.findByText('Hoàn thiện tài liệu kiểm thử.')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gửi phản hồi' })).toBeNull()
  })
})

describe('Report list', () => {
  it('filters using the API, resets pagination, and preserves project context', async () => {
    mount({ path: '/project/reports?page=3' })
    await screen.findByText(draft.summary)
    input('Trạng thái', 'SUBMITTED')
    await waitFor(() =>
      expect(api.getProgressReports).toHaveBeenLastCalledWith(
        9,
        { status: 'SUBMITTED', reportType: undefined, page: 1, pageSize: 10 },
        expect.any(AbortSignal),
      ),
    )
    expect(screen.getByRole('link', { name: /14\/09\/2026/ }).getAttribute('href')).toBe('/project/reports/17')
  })

  it('recovers from a load error and shows a useful empty state', async () => {
    api.getProgressReports.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue({
      items: [],
      totalCount: 0,
      totalPages: 0,
    })
    mount({ path: '/project/reports', actor: 'supervisor' })
    await screen.findByRole('alert')
    click('Tải lại')
    await screen.findByText('Bắt đầu kỳ báo cáo đầu tiên')
    expect(screen.queryByRole('link', { name: /Tạo báo cáo/ })).toBeNull()
  })

  it('ignores late responses from a previous filter', async () => {
    let resolve!: (value: unknown) => void
    api.getProgressReports
      .mockReturnValueOnce(new Promise((done) => { resolve = done }))
      .mockResolvedValue({ items: [], totalCount: 0, totalPages: 0 })
    mount({ path: '/project/reports' })
    input('Trạng thái', 'REVIEWED')
    await screen.findByText('Chưa có báo cáo phù hợp')
    await act(async () => resolve({ items: [draft], totalCount: 1, totalPages: 1 }))
    expect(screen.queryByText(draft.summary)).toBeNull()
  })
})
