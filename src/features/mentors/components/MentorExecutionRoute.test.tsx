import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MentorExecutionRoute } from './MentorExecutionRoute'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const api = vi.hoisted(() => ({ getProject: vi.fn(), getOwnAssignments: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => auth)
vi.mock('../../../services/service-gateway', () => ({ services: { project: { getProject: api.getProject }, supervisor: { getOwnAssignments: api.getOwnAssignments } } }))

function renderRoute(path = '/mentor/projects/9/majors/7/workspace') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<MentorExecutionRoute />}><Route path="/mentor/projects/:projectId/majors/:majorId/workspace" element={<Probe />} /></Route><Route path="/mentor/workspace" element={<p>Mentor home</p>} /></Routes></MemoryRouter>)
}
function Probe() { const access = useExecutionAccess(); return <p>Mentor scope {access.project.id} / {access.supervisor?.majorId} / {access.actor} / {String(access.canManageStructure)}</p> }
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('MentorExecutionRoute', () => {
  it('allows only an exact active persisted discipline-mentor assignment', async () => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValue({ items: [{ id: 3, projectId: 9, assignmentType: 'DISCIPLINE_MENTOR', majorId: 7, isPrimary: false, endedAt: null }] })
    renderRoute()
    expect(await screen.findByText('Mentor scope 9 / 7 / mentor / false')).toBeTruthy()
  })

  it.each([
    { assignment: { id: 3, projectId: 9, assignmentType: 'PRIMARY', majorId: null, isPrimary: true, endedAt: null }, path: '/mentor/projects/9/majors/7/workspace' },
    { assignment: { id: 3, projectId: 9, assignmentType: 'DISCIPLINE_MENTOR', majorId: 7, isPrimary: false, endedAt: '2026-10-01' }, path: '/mentor/projects/9/majors/7/workspace' },
    { assignment: { id: 3, projectId: 8, assignmentType: 'DISCIPLINE_MENTOR', majorId: 7, isPrimary: false, endedAt: null }, path: '/mentor/projects/9/majors/7/workspace' },
    { assignment: { id: 3, projectId: 9, assignmentType: 'DISCIPLINE_MENTOR', majorId: 8, isPrimary: false, endedAt: null }, path: '/mentor/projects/9/majors/7/workspace' },
  ])('redirects when assignment cannot prove the requested project/major scope', async ({ assignment, path }) => {
    auth.useAuthSession.mockReturnValue({ session: { user: { id: 5 } } })
    api.getProject.mockResolvedValue({ id: 9, status: 'ACTIVE' })
    api.getOwnAssignments.mockResolvedValue({ items: [assignment] })
    renderRoute(path)
    expect(await screen.findByText('Mentor home')).toBeTruthy()
  })
})
