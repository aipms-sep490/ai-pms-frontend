import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IndustryExpertWorkspacePage } from './IndustryExpertWorkspacePage'

const mocks = vi.hoisted(() => ({
  getMyIndustryAssignments: vi.fn(),
  getIndustryEvidence: vi.fn(),
  downloadIndustryEvidenceFile: vi.fn(),
  getIndustryFeedbackHistory: vi.fn(),
  submitIndustryFeedback: vi.fn(),
}))
vi.mock('./industry-api', async () => {
  const actual = await vi.importActual<typeof import('./industry-api')>('./industry-api')
  return {
    ...actual,
    getMyIndustryAssignments: mocks.getMyIndustryAssignments, getIndustryEvidence: mocks.getIndustryEvidence,
    downloadIndustryEvidenceFile: mocks.downloadIndustryEvidenceFile, getIndustryFeedbackHistory: mocks.getIndustryFeedbackHistory,
    submitIndustryFeedback: mocks.submitIndustryFeedback,
  }
})

const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 100, totalCount: items.length })
const assignment = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 7, projectId: 9, projectCode: 'P9', projectTitle: 'Demo project', expertId: 3, scope: 'COMMON', majorId: null,
  startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-12-01T00:00:00Z', status: 'ACTIVE', concurrencyToken: 'tok',
  allowedActions: ['READ', 'SUBMIT_FEEDBACK'], advisoryOnly: true, ...over,
})

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('IndustryExpertWorkspacePage', () => {
  it('shows an empty state with no active assignment', async () => {
    mocks.getMyIndustryAssignments.mockResolvedValue(page([]))
    render(<IndustryExpertWorkspacePage />)
    expect(await screen.findByText('Bạn chưa có phân công cố vấn nào đang hoạt động.')).toBeTruthy()
  })

  it('auto-selects the only assignment and loads its evidence + feedback', async () => {
    mocks.getMyIndustryAssignments.mockResolvedValue(page([assignment()]))
    mocks.getIndustryEvidence.mockResolvedValue(page([{ id: 1, fileId: 4, deliverableVersionId: 2, fileName: 'srs.pdf', contentType: 'application/pdf', sizeBytes: 10, sha256: 'a', downloadUrl: '' }]))
    mocks.getIndustryFeedbackHistory.mockResolvedValue(page([]))
    render(<IndustryExpertWorkspacePage />)
    expect(await screen.findByRole('heading', { name: 'P9 — Demo project' })).toBeTruthy()
    expect(await screen.findByText('srs.pdf')).toBeTruthy()
  })

  it('only offers the feedback form when the backend allows SUBMIT_FEEDBACK', async () => {
    mocks.getMyIndustryAssignments.mockResolvedValue(page([assignment({ allowedActions: ['READ'] })]))
    mocks.getIndustryEvidence.mockResolvedValue(page([]))
    mocks.getIndustryFeedbackHistory.mockResolvedValue(page([]))
    render(<IndustryExpertWorkspacePage />)
    await screen.findByRole('heading', { name: 'P9 — Demo project' })
    expect(screen.queryByRole('button', { name: 'Gửi góp ý' })).toBeNull()
  })

  it('submits feedback with the latest version and refetches', async () => {
    mocks.getMyIndustryAssignments.mockResolvedValue(page([assignment()]))
    mocks.getIndustryEvidence.mockResolvedValue(page([]))
    mocks.getIndustryFeedbackHistory.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([{ id: 1, version: 1, supersedesVersion: null, content: 'Tốt.', submittedBy: 3, submittedAt: '2026-10-05T00:00:00Z', advisoryOnly: true }]))
    mocks.submitIndustryFeedback.mockResolvedValue({})
    render(<IndustryExpertWorkspacePage />)
    await screen.findByRole('heading', { name: 'P9 — Demo project' })
    fireEvent.change(screen.getByPlaceholderText('Nhận xét cố vấn thực tiễn cho nhóm…'), { target: { value: 'Tốt.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi góp ý' }))
    await waitFor(() => expect(mocks.submitIndustryFeedback).toHaveBeenCalledWith(7, { concurrencyToken: 'tok', expectedVersion: 0, content: 'Tốt.' }))
    expect(await screen.findByText('Tốt.')).toBeTruthy()
  })

  it('lets the expert switch between multiple assignments', async () => {
    mocks.getMyIndustryAssignments.mockResolvedValue(page([assignment(), assignment({ id: 8, projectCode: 'P10', projectTitle: 'Second project' })]))
    mocks.getIndustryEvidence.mockResolvedValue(page([]))
    mocks.getIndustryFeedbackHistory.mockResolvedValue(page([]))
    render(<IndustryExpertWorkspacePage />)
    const select = await screen.findByLabelText('Đồ án')
    expect(screen.getByRole('heading', { name: 'P9 — Demo project' })).toBeTruthy()
    fireEvent.change(select, { target: { value: '8' } })
    expect(await screen.findByRole('heading', { name: 'P10 — Second project' })).toBeTruthy()
  })
})
