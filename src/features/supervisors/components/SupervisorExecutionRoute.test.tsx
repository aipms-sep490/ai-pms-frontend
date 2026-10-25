import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SupervisorExecutionRoute } from './SupervisorExecutionRoute'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const api = vi.hoisted(() => ({ getProject: vi.fn(), getOwnAssignments: vi.fn(), getTeam: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => auth)
vi.mock('../../../services/service-gateway', () => ({
  services: {
    project: { getProject: api.getProject },
    supervisor: { getOwnAssignments: api.getOwnAssignments },
    team: { getTeam: api.getTeam },
  },
}))

function renderRoute(path = '/supervisor/projects/9/tasks') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<SupervisorExecutionRoute />}>
          <Route path="/supervisor/projects/:projectId/tasks" element={<AccessProbe />} />
        </Route>
        <Route path="/supervisor/workspace" element={<p>Supervisor home</p>} />
      </Routes>
    </MemoryRouter>,
  )
}
function AccessProbe() {
  const access = useExecutionAccess()
  return (
    <p>
      Supervisor tasks allowed · {String(access.canManageStructure)} · Team: {access.team?.name ?? 'none'}
    </p>
  )
}
afterEach(() => { cleanup(); vi.clearAllMocks() })
describe('SupervisorExecutionRoute', () => {
  it('allows an assigned supervisor into an ACTIVE project execution route', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }] })
    renderRoute()
    expect(await screen.findByText('Supervisor tasks allowed · false · Team: none')).toBeTruthy()
    expect(api.getOwnAssignments).toHaveBeenCalledWith({ status: 'ACTIVE', page: 1, pageSize: 100 })
  })

  it('allows an assigned supervisor into a FINAL_SUBMISSION project execution route', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status: 'FINAL_SUBMISSION' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }] })
    renderRoute()
    expect(await screen.findByText('Supervisor tasks allowed · false · Team: none')).toBeTruthy()
  })

  it('passes team roster to ExecutionAccess when project has teamId', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status: 'ACTIVE', teamId: 28 })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }] })
    api.getTeam.mockResolvedValue({ id: 28, name: 'Team Alpha', members: [{ userId: 101, fullName: 'Student A' }] })
    renderRoute()
    expect(await screen.findByText('Supervisor tasks allowed · false · Team: Team Alpha')).toBeTruthy()
    expect(api.getTeam).toHaveBeenCalledWith(28)
  })

  it.each([
    { assignment: { id: 3, projectId: 9, isPrimary: true, endedAt: '2026-09-01' }, status: 'ACTIVE' },
    { assignment: { id: 3, projectId: 9, isPrimary: true, endedAt: null }, status: 'SUPERVISOR_PENDING' },
  ])('redirects when assignment is inactive or the Project status is invalid', async ({ assignment, status }) => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status })
    api.getOwnAssignments.mockResolvedValue({ items: [assignment] })
    renderRoute()
    expect(await screen.findByText('Supervisor home')).toBeTruthy()
  })

  it('does not deny an ACTIVE primary assignment that the Backend returns on a later page', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValueOnce({ items: [], totalPages: 2 })
      .mockResolvedValueOnce({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }], totalPages: 2 })
    renderRoute()
    expect(await screen.findByText('Supervisor tasks allowed · false · Team: none')).toBeTruthy()
    expect(api.getOwnAssignments).toHaveBeenNthCalledWith(2, { status: 'ACTIVE', page: 2, pageSize: 100 })
  })
})
