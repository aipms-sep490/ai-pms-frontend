import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MentorExecutionRoute } from './MentorExecutionRoute'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { HttpError } from '../../../services/http/http-client'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const api = vi.hoisted(() => ({ getProject: vi.fn(), getOwnAssignments: vi.fn(), getTeam: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => auth)
vi.mock('../../../services/service-gateway', () => ({ services: { project: { getProject: api.getProject }, supervisor: { getOwnAssignments: api.getOwnAssignments }, team: { getTeam: api.getTeam } } }))

function renderRoute(path = '/mentor/projects/9/majors/7/workspace') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<MentorExecutionRoute />}><Route path="/mentor/projects/:projectId/majors/:majorId/workspace" element={<Probe />} /></Route><Route path="/mentor/workspace" element={<p>Mentor home</p>} /></Routes></MemoryRouter>)
}
function Probe() { const access = useExecutionAccess(); return <div><p>Mentor scope {access.project.id} / {access.supervisor?.majorId} / {access.actor} / {String(access.canManageStructure)} / read only {String(access.readOnly)}</p><p>Roster: {access.team?.members.map(member => member.fullName).join(', ') ?? 'unavailable'}</p>{access.teamLoadError && <button onClick={access.retryTeam}>Retry roster</button>}</div> }
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('MentorExecutionRoute', () => {
  it('provides the backend roster for a scoped mentor route', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, teamId: 12, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, assignmentType: 'DISCIPLINE_MENTOR', majorId: 7, endedAt: null }] })
    api.getTeam.mockResolvedValue({ id: 12, members: [{ userId: 2, fullName: 'Leader' }] })
    renderRoute()
    expect(await screen.findByText('Roster: Leader')).toBeTruthy()
    expect(api.getTeam).toHaveBeenCalledWith(12)
  })
  it('preserves the mentor route when team access is denied, then retries', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, teamId: 12, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, assignmentType: 'DISCIPLINE_MENTOR', majorId: 7, endedAt: null }] })
    api.getTeam.mockRejectedValueOnce({ status: 403 }).mockResolvedValueOnce({ id: 12, members: [{ userId: 2, fullName: 'Leader' }] })
    renderRoute()
    expect(await screen.findByText('Roster: unavailable')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry roster' }))
    expect(await screen.findByText('Roster: Leader')).toBeTruthy()
  })
  it('allows only an exact active persisted discipline-mentor assignment', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, assignmentType: 'DISCIPLINE_MENTOR', majorId: 7, isPrimary: false, endedAt: null }] })
    renderRoute()
    expect(await screen.findByText('Mentor scope 9 / 7 / mentor / false / read only false')).toBeTruthy()
  })

  it.each([
    { assignment: { id: 3, projectId: 9, assignmentType: 'PRIMARY', majorId: null, isPrimary: true, endedAt: null }, message: 'Không có phân công mentor đang hiệu lực' },
    { assignment: { id: 3, projectId: 9, assignmentType: 'DISCIPLINE_MENTOR', majorId: 7, isPrimary: false, endedAt: '2026-10-01' }, message: 'Không có phân công mentor đang hiệu lực' },
    { assignment: { id: 3, projectId: 8, assignmentType: 'DISCIPLINE_MENTOR', majorId: 7, isPrimary: false, endedAt: null }, message: 'Không có phân công mentor đang hiệu lực' },
    { assignment: { id: 3, projectId: 9, assignmentType: 'DISCIPLINE_MENTOR', majorId: 8, isPrimary: false, endedAt: null }, message: 'Mã ngành trong đường dẫn không khớp' },
  ])('explains a denied mentor assignment without redirecting: $message', async ({ assignment, message }) => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValue({ items: [assignment] })
    renderRoute()
    expect(await screen.findByText(new RegExp(message))).toBeTruthy()
    expect(screen.queryByText('Mentor home')).toBeNull()
    expect(screen.getByRole('link', { name: 'Về danh sách đồ án' })).toBeTruthy()
    expect(api.getTeam).not.toHaveBeenCalled()
  })
  it('keeps a final-submission mentor assignment readable with writes disabled', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, teamId: 12, status: 'FINAL_SUBMISSION' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, assignmentType: 'DISCIPLINE_MENTOR', majorId: 7, endedAt: null }] })
    api.getTeam.mockResolvedValue({ id: 12, members: [] })
    renderRoute()
    expect(await screen.findByText('Mentor scope 9 / 7 / mentor / false / read only true')).toBeTruthy()
  })
  it('explains an unreadable project state without redirecting', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, teamId: 12, status: 'PROPOSED' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, assignmentType: 'DISCIPLINE_MENTOR', majorId: 7, endedAt: null }] })
    renderRoute()
    expect(await screen.findByText(/Đồ án chưa ở giai đoạn cho phép truy cập/)).toBeTruthy()
    expect(screen.queryByText('Mentor home')).toBeNull()
  })
  it('rejects a project response that does not match the requested URL', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 8, teamId: 12, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValue({ items: [] })
    renderRoute()
    expect(await screen.findByText(/Dữ liệu đồ án không khớp đường dẫn/)).toBeTruthy()
    expect(api.getTeam).not.toHaveBeenCalled()
  })
  it('shows a denied API response with a retry action', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockRejectedValue(new HttpError('forbidden', 403))
    api.getOwnAssignments.mockResolvedValue({ items: [] })
    renderRoute()
    expect(await screen.findByText(/Bạn không có quyền truy cập mentor/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy()
    expect(screen.queryByText('Mentor home')).toBeNull()
  })
})
