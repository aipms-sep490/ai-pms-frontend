import { cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ user: { id: 1, roles: ['ADMIN', 'LECTURER'] }, assignments: vi.fn(), period: vi.fn(), team: vi.fn() }))
vi.mock('../../features/auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: sessionForTest, status: 'authenticated' }) }))
vi.mock('../../services/api/evaluations.api', () => ({ getMyEvaluationAssignments: mocks.assignments }))
vi.mock('../../services/service-gateway', () => ({ services: { academic: { getRegistrationPeriod: mocks.period }, team: { getCurrentTeam: mocks.team } } }))
const academic = { workflowContext: null, status: 'ready', error: null, authorization: { permissions: [], departmentIds: [], majorIds: [] }, academic: { selectedSemester: { id: 7 } } }
vi.mock('./useAcademicWorkflow', () => ({ useAcademicWorkflow: () => academic }))
import { useWorkspaceAccess } from './workspace-access'
import { StudentJourneyProvider } from './StudentJourneyProvider'
const sessionForTest = { user: mocks.user }
beforeEach(() => { vi.clearAllMocks(); mocks.user.roles = ['ADMIN', 'LECTURER']; mocks.assignments.mockResolvedValue({ items: [{ id: 9 }] }); mocks.period.mockResolvedValue(null); mocks.team.mockResolvedValue(null) })
afterEach(cleanup)
it('loads evaluator assignments for a dual Admin/Lecturer identity without changing its home role', async () => {
  const { result } = renderHook(() => useWorkspaceAccess())
  await waitFor(() => expect(result.current.assignments).toContain('EVALUATOR'))
  expect(result.current.identityRole).toBe('admin')
  expect(mocks.assignments).toHaveBeenCalledWith(1, 1, expect.any(AbortSignal))
})
it('loads the student journey for a dual Admin/Student identity', async () => {
  mocks.user.roles = ['ADMIN', 'STUDENT']
  const workflow = { user: { id: 1, effectiveRoles: ['ADMIN', 'STUDENT'] }, academic: {}, selectedSemester: { id: 7 } }
  Object.assign(academic, { workflowContext: workflow })
  render(<StudentJourneyProvider><span>child</span></StudentJourneyProvider>)
  await waitFor(() => expect(mocks.team).toHaveBeenCalledWith(7))
  Object.assign(academic, { workflowContext: null })
})
