import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAcademicGovernance } from './useAcademicGovernance'

const auth = vi.hoisted(() => ({ useAuthSession: vi.fn() }))
const academicApi = vi.hoisted(() => ({ getAcademicWorkflowContext: vi.fn() }))
const governanceApi = vi.hoisted(() => ({
  getSemesters: vi.fn(),
  getProjectPeriods: vi.fn(),
  saveProjectPeriod: vi.fn(),
  saveSemester: vi.fn(),
  setGovernanceStatus: vi.fn(),
}))

vi.mock('../../auth/context/useAuthSession', () => auth)
vi.mock('../api/academic-api', () => academicApi)
vi.mock('../api/governance-api', () => governanceApi)

describe('useAcademicGovernance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.useAuthSession.mockReturnValue({ session: { accessToken: 'access-token' } })
    governanceApi.getSemesters.mockResolvedValue({ items: [] })
    governanceApi.getProjectPeriods.mockResolvedValue({ items: [] })
  })

  it('allows governance controls when the backend action is allowed, independent of a frontend role label', async () => {
    academicApi.getAcademicWorkflowContext.mockResolvedValue({
      actions: [{ code: 'manage_academic_structure', allowed: true, issues: [] }],
    })

    const { result } = renderHook(() => useAcademicGovernance())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canManage).toBe(true)
  })

  it('keeps governance controls read-only when the backend action is denied', async () => {
    academicApi.getAcademicWorkflowContext.mockResolvedValue({
      actions: [{ code: 'manage_academic_structure', allowed: false, issues: ['ACADEMIC_MANAGER_REQUIRED'] }],
    })

    const { result } = renderHook(() => useAcademicGovernance())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.canManage).toBe(false)
  })
})
