import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import { HttpError } from '../../services/http/http-client'
import { DeliverablesPage } from './DeliverablesPage'

const api = vi.hoisted(() => ({ getDeliverables: vi.fn(), getDeliverableVersions: vi.fn(), createDeliverable: vi.fn(), submitDeliverableVersion: vi.fn(), reviewDeliverableVersion: vi.fn() }))
vi.mock('../../services/api/deliverables.api', () => api)
afterEach(cleanup)
const item = { id: 4, projectId: 9, milestoneId: null, title: 'Báo cáo thiết kế', description: null, deliverableType: 'REPORT', dueAt: null, status: 'OPEN', createdBy: 2, latestVersion: 1 }
function page(actor: 'student' | 'supervisor' = 'student') { return render(<MemoryRouter><ExecutionAccessProvider value={{ project: { id: 9, teamId: 1, teamName: 'Demo team', code: 'P9', title: 'Demo', status: 'ACTIVE', registeredAt: '2026-09-01', createdBy: 1, createdByName: 'Demo', createdAt: '2026-09-01', updatedAt: '2026-09-01', concurrencyToken: 'token', majors: [], tags: [] }, actor, canManageStructure: actor === 'supervisor', routeBase: actor === 'student' ? '/project' : '/supervisor/projects/9' }}><DeliverablesPage /></ExecutionAccessProvider></MemoryRouter>) }
beforeEach(() => { vi.clearAllMocks(); api.getDeliverables.mockResolvedValue({ items: [item] }); api.getDeliverableVersions.mockResolvedValue({ items: [] }) })
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
    api.getDeliverableVersions.mockResolvedValue({ items: [{ id: 7, deliverableId: 4, versionNumber: 1, submittedBy: 3, note: null, status: 'SUBMITTED', submittedAt: '2026-09-22T00:00:00Z', files: [] }] })
    page('supervisor'); await screen.findByText('Báo cáo thiết kế')
    fireEvent.click(screen.getByRole('button', { name: 'Xem phiên bản' }))
    expect(await screen.findByLabelText('Nhận xét V1')).toBeTruthy()
  })
})
