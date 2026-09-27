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
function page(actor: 'student' | 'supervisor' = 'student') { return render(<MemoryRouter><ExecutionAccessProvider value={{ project: { id: 9, teamId: 1, teamName: 'Demo team', code: 'P9', title: 'Demo', status: 'ACTIVE', registeredAt: '2026-09-01', createdBy: 1, createdByName: 'Demo', createdAt: '2026-09-01', updatedAt: '2026-09-01', concurrencyToken: 'token', majors: [], tags: [] }, actor, canManageStructure: actor === 'supervisor', routeBase: actor === 'student' ? '/project' : '/supervisor/projects/9' }}><DeliverablesPage /></ExecutionAccessProvider></MemoryRouter>) }
beforeEach(() => {
  vi.clearAllMocks()
  api.getDeliverables.mockResolvedValue({ items: [item], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
  api.getDeliverableVersions.mockResolvedValue({ items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 })
  api.getDeliverableFeedback.mockResolvedValue({ items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 })
})
describe('DeliverablesPage', () => {
  it('uses server latestVersion for an upload and refreshes after a 409 instead of retrying', async () => {
    api.submitDeliverableVersion.mockRejectedValue(new HttpError('stale', 409))
    page(); await screen.findByText('Báo cáo thiết kế')
    const input = screen.getByLabelText('Tệp Báo cáo thiết kế')
    fireEvent.change(input, { target: { files: [new File(['a'], 'report.pdf', { type: 'application/pdf' })] } })
    fireEvent.submit(screen.getByRole('button', { name: 'Nộp phiên bản' }).closest('form')!)
    await waitFor(() => expect(api.submitDeliverableVersion).toHaveBeenCalledWith(4, 1, expect.any(File), ''))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Dữ liệu đã thay đổi/))
    expect(api.submitDeliverableVersion).toHaveBeenCalledOnce()
    expect(api.getDeliverables.mock.calls.length).toBeGreaterThan(1)
  })

  it('shows reviewer controls only for the assigned supervisor and a submitted version', async () => {
    api.getDeliverableVersions.mockResolvedValue({ items: [{ id: 7, deliverableId: 4, versionNumber: 1, submittedBy: 3, note: null, status: 'SUBMITTED', submittedAt: '2026-09-22T00:00:00Z', files: [] }], page: 1, pageSize: 10, totalCount: 1, totalPages: 1 })
    page('supervisor'); await screen.findByText('Báo cáo thiết kế')
    fireEvent.click(screen.getByRole('button', { name: 'Xem phiên bản' }))
    expect(await screen.findByLabelText('Nhận xét V1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nộp phiên bản' })).toBeNull()
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
