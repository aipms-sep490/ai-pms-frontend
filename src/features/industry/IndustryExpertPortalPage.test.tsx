import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IndustryExpertPortalPage } from './IndustryExpertPortalPage'
import type { IndustryAssignment, IndustryFeedback, IndustryFile } from './industry-api'

const api = vi.hoisted(() => ({
  getMyIndustryAssignments: vi.fn(),
  getIndustryAssignment: vi.fn(),
  getIndustrySharedFiles: vi.fn(),
  getIndustryFeedbackHistory: vi.fn(),
  downloadIndustrySharedFile: vi.fn(),
  submitIndustryFeedback: vi.fn(),
}))
vi.mock('./industry-api', () => api)

const assignment: IndustryAssignment = {
  id: 1,
  projectId: 9,
  projectCode: 'SE-09',
  projectTitle: 'AI-PMS Web System',
  expertId: 15,
  scope: 'COMMON',
  majorId: null,
  startsAt: '2026-10-01T00:00:00Z',
  endsAt: '2026-12-31T23:59:59Z',
  status: 'ACTIVE',
  concurrencyToken: 'token-abc',
  allowedActions: ['READ', 'SUBMIT_FEEDBACK'],
  advisoryOnly: true,
}

const fileItem: IndustryFile = {
  id: 50,
  fileId: 501,
  deliverableVersionId: 101,
  fileName: 'specs.pdf',
  contentType: 'application/pdf',
  sizeBytes: 15360,
  sha256: 'sha-value',
  downloadUrl: '/download',
}

const feedbackItem: IndustryFeedback = {
  id: 1,
  version: 1,
  supersedesVersion: null,
  content: 'Kiến trúc rất tốt, cần chú ý phân quyền API.',
  submittedBy: 15,
  submittedAt: '2026-10-10T12:00:00Z',
  advisoryOnly: true,
}

beforeEach(() => {
  vi.resetAllMocks()
  api.getMyIndustryAssignments.mockResolvedValue({ items: [assignment], page: 1, pageSize: 50, totalCount: 1, totalPages: 1 })
  api.getIndustryAssignment.mockResolvedValue({ ...assignment, concurrencyToken: 'token-new' })
  api.getIndustrySharedFiles.mockResolvedValue({ items: [fileItem], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 })
  api.getIndustryFeedbackHistory.mockResolvedValue({ items: [feedbackItem], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 })
})
afterEach(cleanup)

describe('IndustryExpertPortalPage', () => {
  it('renders expert assignments, shared files and feedback history', async () => {
    render(<IndustryExpertPortalPage />)

    expect((await screen.findAllByText('AI-PMS Web System')).length).toBeGreaterThan(0)
    expect(screen.getByText(/Ý kiến tư vấn \(Advisory Only\)/)).toBeTruthy()
    expect(await screen.findByText('specs.pdf')).toBeTruthy()
    expect(screen.getByText('Kiến trúc rất tốt, cần chú ý phân quyền API.')).toBeTruthy()
    expect(screen.getByText(/Phiên bản #1/)).toBeTruthy()
  })

  it('allows the expert to submit professional advisory feedback', async () => {
    api.submitIndustryFeedback.mockResolvedValue({
      id: 2,
      version: 2,
      supersedesVersion: 1,
      content: 'Bổ sung thêm tài liệu API swagger.',
      submittedBy: 15,
      submittedAt: '2026-10-15T12:00:00Z',
      advisoryOnly: true,
    })

    render(<IndustryExpertPortalPage />)
    await screen.findByText('specs.pdf')

    const textarea = screen.getByPlaceholderText(/Góp ý chuyên môn/)
    fireEvent.change(textarea, { target: { value: 'Bổ sung thêm tài liệu API swagger.' } })

    fireEvent.click(screen.getByRole('button', { name: 'Gửi nhận xét' }))

    await waitFor(() => {
      expect(api.submitIndustryFeedback).toHaveBeenCalledWith(1, {
        concurrencyToken: 'token-abc',
        expectedVersion: 1,
        content: 'Bổ sung thêm tài liệu API swagger.',
      })
    })

    expect(await screen.findByText(/Gửi ý kiến đóng góp chuyên môn thành công/)).toBeTruthy()
    await waitFor(() => expect(api.getIndustryAssignment).toHaveBeenCalledWith(1))
  })

  it('handles empty assignments gracefully', async () => {
    api.getMyIndustryAssignments.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 })
    render(<IndustryExpertPortalPage />)

    expect(await screen.findByText(/Bạn chưa được phân công cố vấn đồ án nào/)).toBeTruthy()
  })

  it('keeps files and feedback attached to the selected assignment when earlier requests finish late', async () => {
    const second = { ...assignment, id: 2, projectId: 10, projectCode: 'SE-10', projectTitle: 'Second project' }
    api.getMyIndustryAssignments.mockResolvedValue({ items: [assignment, second], page: 1, pageSize: 50, totalCount: 2, totalPages: 1 })
    let finishOldFiles!: (value: { items: IndustryFile[] }) => void
    let finishOldFeedback!: (value: { items: IndustryFeedback[] }) => void
    api.getIndustrySharedFiles.mockImplementation((id: number) => id === 1
      ? new Promise(resolve => { finishOldFiles = resolve })
      : Promise.resolve({ items: [{ ...fileItem, id: 60, fileName: 'second.pdf' }] }))
    api.getIndustryFeedbackHistory.mockImplementation((id: number) => id === 1
      ? new Promise(resolve => { finishOldFeedback = resolve })
      : Promise.resolve({ items: [{ ...feedbackItem, id: 2, content: 'Second feedback' }] }))

    render(<IndustryExpertPortalPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Second project/ }))
    expect(await screen.findByText('second.pdf')).toBeTruthy()
    finishOldFiles({ items: [fileItem] })
    finishOldFeedback({ items: [feedbackItem] })
    await waitFor(() => expect(screen.queryByText('specs.pdf')).toBeNull())
    expect(screen.getByText('Second feedback')).toBeTruthy()
    expect(screen.queryByText(feedbackItem.content)).toBeNull()
  })

  it('shows a request failure instead of claiming an empty shared-file list', async () => {
    api.getIndustrySharedFiles.mockRejectedValue(new Error('Network unavailable'))
    render(<IndustryExpertPortalPage />)
    expect(await screen.findByRole('alert', { name: 'Lỗi tải tài liệu' })).toBeTruthy()
    expect(screen.queryByText('Bộ môn chưa chia sẻ file bản nộp nào cho phạm vi này.')).toBeNull()
  })

  it('does not offer feedback when the assignment grants only file access', async () => {
    api.getMyIndustryAssignments.mockResolvedValue({ items: [{ ...assignment, allowedActions: ['READ'] }], page: 1, pageSize: 50, totalCount: 1, totalPages: 1 })
    render(<IndustryExpertPortalPage />)
    await screen.findByText('specs.pdf')
    expect((screen.getByRole('button', { name: 'Gửi nhận xét' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Phân công này hiện không cho phép gửi nhận xét.')).toBeTruthy()
  })

  it('blocks a new version when feedback history cannot be loaded', async () => {
    api.getIndustryFeedbackHistory.mockRejectedValue(new Error('Network unavailable'))
    render(<IndustryExpertPortalPage />)
    expect(await screen.findByText('Chưa tải được lịch sử nhận xét. Hãy thử lại trước khi gửi phiên bản mới.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Gửi nhận xét' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('loads later assignment, file and feedback pages without dropping the first page', async () => {
    api.getMyIndustryAssignments.mockImplementation((page: number) => Promise.resolve(page === 1
      ? { items: [assignment], page, pageSize: 50, totalCount: 2 }
      : { items: [{ ...assignment, id: 2, projectTitle: 'Later project' }], page, pageSize: 50, totalCount: 2 }))
    api.getIndustrySharedFiles.mockImplementation((_id: number, page = 1) => Promise.resolve(page === 1
      ? { items: [fileItem], page, pageSize: 20, totalCount: 2 }
      : { items: [{ ...fileItem, id: 51, fileName: 'later.pdf' }], page, pageSize: 20, totalCount: 2 }))
    api.getIndustryFeedbackHistory.mockImplementation((_id: number, page = 1) => Promise.resolve(page === 1
      ? { items: [feedbackItem], page, pageSize: 20, totalCount: 2 }
      : { items: [{ ...feedbackItem, id: 2, version: 0, content: 'Older feedback' }], page, pageSize: 20, totalCount: 2 }))

    render(<IndustryExpertPortalPage />)
    await screen.findByText('specs.pdf')
    fireEvent.click(screen.getByRole('button', { name: /Xem thêm phân công/ }))
    expect(await screen.findByRole('button', { name: /Later project/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Xem thêm tài liệu/ }))
    expect(await screen.findByText('later.pdf')).toBeTruthy()
    expect(screen.getByText('specs.pdf')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Xem thêm nhận xét/ }))
    expect(await screen.findByText('Older feedback')).toBeTruthy()
    expect(screen.getByText(feedbackItem.content)).toBeTruthy()
    expect(api.getIndustryFeedbackHistory).toHaveBeenCalledWith(1, 2)
  })

  it('holds a second feedback submission until the changed assignment token is refreshed', async () => {
    api.submitIndustryFeedback.mockResolvedValue({ ...feedbackItem, id: 2, version: 2 })
    api.getIndustryAssignment.mockRejectedValue(new Error('Unavailable'))
    render(<IndustryExpertPortalPage />)
    await screen.findByText('specs.pdf')
    fireEvent.change(screen.getByPlaceholderText(/Góp ý chuyên môn/), { target: { value: 'First feedback' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi nhận xét' }))
    expect(await screen.findByText(/Đã gửi nhận xét nhưng chưa làm mới được phân công/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Gửi nhận xét' }) as HTMLButtonElement).disabled).toBe(true)
    api.getIndustryAssignment.mockResolvedValue({ ...assignment, concurrencyToken: 'token-new' })
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới phân công' }))
    await waitFor(() => expect(screen.queryByText(/Đã gửi nhận xét nhưng chưa làm mới được phân công/)).toBeNull())
  })
})
