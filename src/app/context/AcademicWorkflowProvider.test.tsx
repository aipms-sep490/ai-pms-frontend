import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthSessionContext } from '../../features/auth/context/auth-session-context'
import type { AuthSessionContextValue } from '../../features/auth/context/auth-session-context'
import type { LoginSession } from '../../features/auth/types/auth.types'
import { HttpError } from '../../services/http/http-client'
import { AcademicWorkflowProvider } from './AcademicWorkflowProvider'
import { useAcademicWorkflow } from './useAcademicWorkflow'

const workflow = vi.hoisted(() => ({ getCurrentContext: vi.fn() }))
vi.mock('../../services/service-gateway', () => ({
  services: { workflow },
}))

const session: LoginSession = {
  accessToken: 'access-token',
  tokenType: 'Bearer',
  expiresAtUtc: '2026-09-20T00:00:00Z',
  refreshToken: 'refresh-token',
  refreshTokenExpiresAtUtc: '2026-09-27T00:00:00Z',
  user: { id: 17, email: 'student@fpt.edu.vn', fullName: 'Student One', roles: ['STUDENT'] },
}

const contextResponse = {
  asOfUtc: '2026-09-15T00:00:00Z',
  user: {
    id: 17,
    email: 'student@fpt.edu.vn',
    fullName: 'Student One',
    status: 'ACTIVE',
    studentCode: 'SE170001',
    roles: ['STUDENT'],
    grantedPermissions: ['topic.read'],
    effectiveRoles: ['STUDENT_MEMBER'],
    requiresTokenRefresh: false,
  },
  academic: {
    organization: { id: 1, code: 'FPTU', name: 'FPT University', isActive: true },
    department: { id: 8, code: 'SE', name: 'Software Engineering', isActive: true },
    major: { id: 12, code: 'SE', name: 'Software Engineering', isActive: true },
    hasActiveDepartmentScope: true,
    hasEligibleStudentProfile: true,
    issues: [],
  },
  currentSemesters: [{ id: 4, organizationId: 1, code: 'FA26', name: 'Fall 2026', status: 'ACTIVE', startDate: '2026-09-01', endDate: '2026-12-31', isCurrent: true }],
  selectedSemester: { id: 4, organizationId: 1, code: 'FA26', name: 'Fall 2026', status: 'ACTIVE', startDate: '2026-09-01', endDate: '2026-12-31', isCurrent: true },
  semesterSelectionIssues: [],
  periods: [{ id: 9, code: 'REG', name: 'Registration', periodType: 'REGISTRATION', status: 'ACTIVE', startAtUtc: '2026-09-01T00:00:00Z', endAtUtc: '2026-09-30T00:00:00Z', isOpen: true }],
  currentTeam: null,
  actions: [],
}

function authValue(overrides: Partial<AuthSessionContextValue> = {}): AuthSessionContextValue {
  return {
    session,
    status: 'authenticated',
    error: null,
    login: async () => {},
    refreshProfile: async () => {},
    logout: async () => {},
    restoreSession: async () => {},
    ...overrides,
  }
}

function Probe() {
  const { academic, authorization, currentUser, errorKind, status } = useAcademicWorkflow()
  return <>
    <p data-testid="status">{status}</p>
    <p data-testid="user">{currentUser?.fullName ?? 'none'}</p>
    <p data-testid="semester">{academic?.selectedSemester?.code ?? 'none'}</p>
    <p data-testid="department">{authorization.departmentIds.join(',')}</p>
    <p data-testid="major">{authorization.majorIds.join(',')}</p>
    <p data-testid="error-kind">{errorKind ?? 'none'}</p>
  </>
}

function renderProvider(value = authValue()) {
  return render(
    <AuthSessionContext.Provider value={value}>
      <AcademicWorkflowProvider><Probe /></AcademicWorkflowProvider>
    </AuthSessionContext.Provider>,
  )
}

describe('AcademicWorkflowProvider', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('loads the authenticated user academic context from the shared workflow adapter', async () => {
    workflow.getCurrentContext.mockResolvedValue(contextResponse)
    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'))
    expect(screen.getByTestId('user').textContent).toBe('Student One')
    expect(screen.getByTestId('semester').textContent).toBe('FA26')
    expect(screen.getByTestId('department').textContent).toBe('8')
    expect(screen.getByTestId('major').textContent).toBe('12')
    expect(workflow.getCurrentContext).toHaveBeenCalledWith(undefined, expect.any(AbortSignal))
  })

  it('does not let URL filter parameters override server-derived academic scope', async () => {
    window.history.pushState({}, '', '/project/workspace?departmentId=999&majorId=998&semesterId=997')
    workflow.getCurrentContext.mockResolvedValue(contextResponse)
    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'))
    expect(screen.getByTestId('department').textContent).toBe('8')
    expect(screen.getByTestId('major').textContent).toBe('12')
    window.history.pushState({}, '', '/')
  })

  it('does not initialize academic context for an unauthenticated session', () => {
    renderProvider(authValue({ session: null, status: 'unauthenticated' }))
    expect(screen.getByTestId('status').textContent).toBe('idle')
    expect(workflow.getCurrentContext).not.toHaveBeenCalled()
  })

  it('exposes loading before the academic context resolves', () => {
    workflow.getCurrentContext.mockReturnValue(new Promise(() => {}))
    renderProvider()
    expect(screen.getByTestId('status').textContent).toBe('loading')
  })

  it('keeps a 403 distinct from authentication and system failures', async () => {
    workflow.getCurrentContext.mockRejectedValue(new HttpError('Forbidden', 403))
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('forbidden'))
    expect(screen.getByTestId('error-kind').textContent).toBe('none')
  })

  it('keeps a 401 an authentication concern and surfaces a system context failure separately', async () => {
    workflow.getCurrentContext.mockRejectedValueOnce(new HttpError('Unauthorized', 401))
    const view = renderProvider()
    await waitFor(() => expect(screen.getByTestId('error-kind').textContent).toBe('authentication'))
    view.unmount()

    workflow.getCurrentContext.mockRejectedValueOnce(new Error('Offline'))
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('error-kind').textContent).toBe('system'))
  })

  it('clears stale context before loading a changed authenticated user', async () => {
    workflow.getCurrentContext.mockResolvedValue(contextResponse)
    const view = renderProvider()
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'))

    workflow.getCurrentContext.mockImplementation(() => new Promise(() => {}))
    view.rerender(
      <AuthSessionContext.Provider value={authValue({ session: { ...session, accessToken: 'second-token', user: { ...session.user, id: 18, fullName: 'Student Two' } } })}>
        <AcademicWorkflowProvider><Probe /></AcademicWorkflowProvider>
      </AuthSessionContext.Provider>,
    )

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('loading'))
    expect(screen.getByTestId('user').textContent).toBe('Student Two')
    expect(screen.getByTestId('semester').textContent).toBe('none')
  })
})
