import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProjectGovernancePage } from './ProjectGovernancePage'

const govApi = vi.hoisted(() => ({
  getReportingCycles: vi.fn(),
  getProjectActionItems: vi.fn(),
  getProjectEvidence: vi.fn(),
  getProjectGovernance: vi.fn(),
  canManageProjectGovernance: vi.fn(),
  governanceReadOnlyReason: vi.fn(),
}))
const projectApi = vi.hoisted(() => ({ getProject: vi.fn() }))
const meetingsApi = vi.hoisted(() => ({ getMeetings: vi.fn() }))
const reportsApi = vi.hoisted(() => ({ getProgressReports: vi.fn() }))

vi.mock('../api/project-governance-api', () => govApi)
vi.mock('../../../services/api/projects.api', () => projectApi)
vi.mock('../../../services/api/meetings.api', () => meetingsApi)
vi.mock('../../../services/api/progress-reports.api', () => reportsApi)
vi.mock('../components/DepartmentGovernanceOverview', () => ({ DepartmentGovernanceOverview: () => null }))
vi.mock('../../supervisors/components/AssignmentManagementPanel', () => ({ AssignmentManagementPanel: () => null }))

beforeEach(() => {
  vi.clearAllMocks()
  projectApi.getProject.mockResolvedValue({ id: 9, code: 'PRJ-09', title: 'Đồ án điều phối', academicScope: { leadDepartmentId: 2 } })
  govApi.getProjectGovernance.mockResolvedValue({ projectStatus: 'ACTIVE', actorScope: { departmentId: 2 } })
  govApi.canManageProjectGovernance.mockReturnValue(true)
  govApi.governanceReadOnlyReason.mockReturnValue('')
  govApi.getReportingCycles.mockResolvedValue({
    items: [{ id: 1, reportType: 'WEEKLY', latePolicy: 'FLAG', periodStart: '2026-10-01T00:00:00Z', periodEnd: '2026-10-07T00:00:00Z', deadline: '2026-10-08T00:00:00Z', concurrencyToken: 't1' }],
    totalCount: 1,
    pageSize: 20,
  })
  govApi.getProjectActionItems.mockResolvedValue({
    items: [{ id: 2, title: 'Chốt đặc tả API', status: 'TODO', sourceType: 'MEETING', dueAt: '2026-10-12T00:00:00Z' }],
    totalCount: 1,
    pageSize: 20,
  })
  govApi.getProjectEvidence.mockImplementation((_id: number, query: { page: number }) => Promise.resolve({
    items: [{ id: 100 + query.page, sourceType: 'TASK', classification: 'DELIVERABLE', verificationStatus: 'VERIFIED', submittedAt: '2026-10-05T00:00:00Z', notes: `Minh chứng trang ${query.page}` }],
    totalCount: 25,
    pageSize: 20,
  }))
  meetingsApi.getMeetings.mockResolvedValue({ items: [], totalCount: 0, pageSize: 100 })
  reportsApi.getProgressReports.mockResolvedValue({ items: [], totalCount: 0, pageSize: 100 })
})

afterEach(cleanup)

describe('ProjectGovernancePage', () => {
  it('keeps independent pagination state for cycles, actions, and evidence tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/department/projects/9/governance']}>
        <Routes>
          <Route path="/department/projects/:projectId/governance" element={<ProjectGovernancePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Báo cáo hàng tuần')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: /Sổ minh chứng đồ án/ }))
    expect(await screen.findByText('Minh chứng trang 1')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => {
      expect(govApi.getProjectEvidence).toHaveBeenLastCalledWith(9, { page: 2, pageSize: 20 })
      expect(govApi.getReportingCycles).toHaveBeenLastCalledWith(9, undefined, 1)
      expect(govApi.getProjectActionItems).toHaveBeenLastCalledWith(9, undefined, 1)
    })
    expect(await screen.findByText('Minh chứng trang 2')).toBeTruthy()

    // Switching back to cycles still shows page 1 cycle data (not blank page 2)
    fireEvent.click(screen.getByRole('tab', { name: /Lịch báo cáo/ }))
    expect(screen.getByText('Báo cáo hàng tuần')).toBeTruthy()
  })
})
