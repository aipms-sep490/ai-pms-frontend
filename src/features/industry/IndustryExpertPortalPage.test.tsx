import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IndustryExpertPortalPage } from './IndustryExpertPortalPage'
import type { IndustryAssignment, IndustryFeedback, IndustryFile } from './industry-api'

const api = vi.hoisted(() => ({
  getMyIndustryAssignments: vi.fn(),
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
  allowedActions: ['SHARE_FILE', 'FEEDBACK'],
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
        expectedVersion: 2,
        content: 'Bổ sung thêm tài liệu API swagger.',
      })
    })

    expect(await screen.findByText(/Gửi ý kiến đóng góp chuyên môn thành công/)).toBeTruthy()
  })

  it('handles empty assignments gracefully', async () => {
    api.getMyIndustryAssignments.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0, totalPages: 0 })
    render(<IndustryExpertPortalPage />)

    expect(await screen.findByText(/Bạn chưa được phân công cố vấn đồ án nào/)).toBeTruthy()
  })
})
