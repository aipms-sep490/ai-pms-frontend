import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SupervisorExecutionRoute } from './SupervisorExecutionRoute'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { HttpError } from '../../../services/http/http-client'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const api = vi.hoisted(() => ({ getProject: vi.fn(), getOwnAssignments: vi.fn(), getTeam: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => auth)
vi.mock('../../../services/service-gateway', () => ({ services: { project: { getProject: api.getProject }, supervisor: { getOwnAssignments: api.getOwnAssignments }, team: { getTeam: api.getTeam } } }))

function renderRoute(path = '/supervisor/projects/9/tasks') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<SupervisorExecutionRoute />}><Route path="/supervisor/projects/:projectId/tasks" element={<AccessProbe />} /><Route path="/supervisor/projects/:projectId/final-submission" element={<AccessProbe />} /></Route><Route path="/supervisor/workspace" element={<p>Supervisor home</p>} /></Routes></MemoryRouter>)
}
function AccessProbe() { const access = useExecutionAccess(); return <div><p>Supervisor tasks allowed · {String(access.canManageStructure)} · readOnly {String(access.readOnly)}</p><p>Roster: {access.team?.members.map(member => member.fullName).join(', ') ?? 'unavailable'}</p>{access.teamLoadError && <button onClick={access.retryTeam}>Retry roster</button>}</div> }
afterEach(() => { cleanup(); vi.clearAllMocks() })
describe('SupervisorExecutionRoute', () => {
  it('retains read-only protection after a failed roster load and successful retry on a final project', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, teamId: 12, status: 'FINAL_SUBMISSION' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }] })
    api.getTeam.mockRejectedValueOnce(new HttpError('forbidden', 403)).mockResolvedValueOnce({ id: 12, members: [{ userId: 2, fullName: 'Leader' }] })
    renderRoute()
    expect(await screen.findByText('Roster: unavailable')).toBeTruthy()
    expect(screen.getByText('Supervisor tasks allowed · false · readOnly true')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry roster' }))
    expect(await screen.findByText('Roster: Leader')).toBeTruthy()
    expect(screen.getByText('Supervisor tasks allowed · false · readOnly true')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('chỉ xem')
  })

  it('passes the complete backend roster to execution screens', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, teamId: 12, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }] })
    api.getTeam.mockResolvedValue({ id: 12, members: [{ userId: 2, fullName: 'Leader chưa có task' }] })
    renderRoute()
    expect(await screen.findByText('Roster: Leader chưa có task')).toBeTruthy()
    expect(api.getTeam).toHaveBeenCalledWith(12)
  })
  it('keeps the execution route open after a team 403 and retries the roster independently', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, teamId: 12, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }] })
    api.getTeam.mockRejectedValueOnce({ status: 403 }).mockResolvedValueOnce({ id: 12, members: [{ userId: 2, fullName: 'Leader' }] })
    renderRoute()
    expect(await screen.findByText('Roster: unavailable')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry roster' }))
    expect(await screen.findByText('Roster: Leader')).toBeTruthy()
  })
  it('allows an assigned supervisor into an ACTIVE project execution route', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } }); api.getProject.mockResolvedValue({ id: 9, status: 'ACTIVE' }); api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }] })
    renderRoute()
    expect(await screen.findByText('Supervisor tasks allowed · false · readOnly false')).toBeTruthy()
    expect(api.getOwnAssignments).toHaveBeenCalledWith({ status: 'ACTIVE', page: 1, pageSize: 100 })
  })
  it.each(['FINAL_SUBMISSION', 'COMPLETED', 'ARCHIVED'])('opens a %s project in read-only mode for an assigned supervisor', async (status) => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }] })
    renderRoute()
    expect(await screen.findByText('Supervisor tasks allowed · false · readOnly true')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('chỉ xem')
  })
  it('keeps the final-submission route open for the assigned supervisor', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status: 'FINAL_SUBMISSION' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }] })
    renderRoute('/supervisor/projects/9/final-submission')
    expect(await screen.findByText('Supervisor tasks allowed · false · readOnly true')).toBeTruthy()
  })
  it.each([{ assignment: { id: 3, projectId: 9, isPrimary: true, endedAt: '2026-09-01' }, status: 'ACTIVE' }, { assignment: { id: 3, projectId: 9, isPrimary: true, endedAt: null }, status: 'SUPERVISOR_PENDING' }])('explains denied access without redirecting', async ({ assignment, status }) => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } }); api.getProject.mockResolvedValue({ id: 9, status }); api.getOwnAssignments.mockResolvedValue({ items: [assignment] })
    renderRoute()
    expect(await screen.findByText(/Không có phân công hướng dẫn đang hiệu lực|chưa ở giai đoạn cho phép truy cập/)).toBeTruthy()
    expect(screen.queryByText('Supervisor home')).toBeNull()
    expect(api.getTeam).not.toHaveBeenCalled()
  })
  it('explains a missing assignment without exposing project content', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } }); api.getProject.mockResolvedValue({ id: 9, status: 'FINAL_SUBMISSION' }); api.getOwnAssignments.mockResolvedValue({ items: [] })
    renderRoute()
    expect(await screen.findByText('Không có phân công hướng dẫn đang hiệu lực cho đồ án này.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Về danh sách đồ án' })).toBeTruthy()
    expect(screen.queryByText(/Supervisor tasks allowed/)).toBeNull()
  })
  it('shows the backend authorization error without rendering the outlet', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } }); api.getProject.mockRejectedValue(new HttpError('forbidden', 403)); api.getOwnAssignments.mockResolvedValue({ items: [] })
    renderRoute()
    expect(await screen.findByText('Bạn không có quyền truy cập đồ án này.')).toBeTruthy()
    expect(screen.queryByText(/Supervisor tasks allowed/)).toBeNull()
  })
  it('does not reveal a different project returned for the route', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } }); api.getProject.mockResolvedValue({ id: 99, status: 'ACTIVE', title: 'Đồ án khác' }); api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }] })
    renderRoute()
    expect(await screen.findByText('Dữ liệu đồ án không khớp đường dẫn đang mở.')).toBeTruthy()
    expect(screen.queryByText('Đồ án khác')).toBeNull()
    expect(screen.queryByText(/Supervisor tasks allowed/)).toBeNull()
  })
  it('does not deny an ACTIVE primary assignment that the Backend returns on a later page', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValueOnce({ items: [], totalPages: 2 })
      .mockResolvedValueOnce({ items: [{ id: 3, projectId: 9, isPrimary: true, endedAt: null }], totalPages: 2 })
    renderRoute()
    expect(await screen.findByText('Supervisor tasks allowed · false · readOnly false')).toBeTruthy()
    expect(api.getOwnAssignments).toHaveBeenNthCalledWith(2, { status: 'ACTIVE', page: 2, pageSize: 100 })
  })
})
