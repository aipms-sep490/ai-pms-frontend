import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({ getContributions: vi.fn(), getContributionEvidence: vi.fn(), rebuildContributionSnapshot: vi.fn() }))
vi.mock('./contributions-api', () => api)
vi.mock('../../app/context', () => ({ useStudentJourney: () => ({ isLoading: false, project: null }) }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { user: { id: 2, roles: ['DEPARTMENT_STAFF'] } } }) }))

import { ProjectContributionsPage } from './ProjectContributionsPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ProjectContributionsPage', () => {
  it('states insufficient data clearly and sends the selected evidence source to the scoped endpoint', async () => {
    api.getContributions.mockResolvedValue({ dataStatus: 'INSUFFICIENT_DATA', activityVariance: null, page: 1, pageSize: 20, totalCount: 1, ruleVersion: 'activity-v2', snapshotHash: null, snapshotAt: null, members: [{ userId: 4, displayName: 'Khang', assignedTasks: 1, completedTasks: 0, submittedReports: 0, attendedMeetings: 0, submittedDeliverableVersions: 0, activityScore: 0, evidenceCount: 0, uploadedFiles: 0 }] })
    api.getContributionEvidence.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    render(<MemoryRouter initialEntries={['/department/projects/9/contributions']}><Routes><Route path="/department/projects/:projectId/contributions" element={<ProjectContributionsPage />} /></Routes></MemoryRouter>)

    expect(await screen.findByText(/Chưa đủ chứng cứ để so sánh/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Xem chứng cứ' }))
    await screen.findByRole('combobox', { name: 'Nguồn chứng cứ' })
    fireEvent.change(screen.getByRole('combobox', { name: 'Nguồn chứng cứ' }), { target: { value: 'MEETING' } })
    await waitFor(() => expect(api.getContributionEvidence).toHaveBeenLastCalledWith(9, 4, 1, 'MEETING'))
  })
})
