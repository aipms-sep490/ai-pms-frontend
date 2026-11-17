import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSupervisors } from './useSupervisors'

const mocks = vi.hoisted(() => ({ academic: vi.fn(), list: vi.fn(), detail: vi.fn() }))
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { accessToken: 'staff-token' } }) }))
vi.mock('../../../app/context/useAcademicWorkflow', () => ({ useAcademicWorkflow: mocks.academic }))
vi.mock('../api/supervisor-api', () => ({ list: mocks.list, detail: mocks.detail }))

afterEach(() => vi.clearAllMocks())

describe('useSupervisors department directory', () => {
  it('reads only the department in the server workflow context', async () => {
    mocks.academic.mockReturnValue({ status: 'ready', academic: { departments: [{ id: 2, name: 'SE' }] } })
    mocks.list.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    const { result } = renderHook(() => useSupervisors())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mocks.list).toHaveBeenCalledWith('staff-token', { page: 1, pageSize: 20, departmentId: 2 })
  })

  it('does not request the global directory when the department scope is missing', async () => {
    mocks.academic.mockReturnValue({ status: 'ready', academic: { departments: [] } })
    const { result } = renderHook(() => useSupervisors())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isForbidden).toBe(true)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('does not display a supervisor detail outside the assigned department', async () => {
    mocks.academic.mockReturnValue({ status: 'ready', academic: { departments: [{ id: 2, name: 'SE' }] } })
    mocks.detail.mockResolvedValue({ id: 4, departmentId: 9, fullName: 'Outside scope' })
    const { result } = renderHook(() => useSupervisors(4))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isForbidden).toBe(true)
    expect(result.current.current).toBeNull()
  })

  it('ignores a previous filter response after the user changes the search', async () => {
    mocks.academic.mockReturnValue({ status: 'ready', academic: { departments: [{ id: 2, name: 'SE' }] } })
    let finishOld: ((value: unknown) => void) | undefined
    mocks.list.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
    mocks.list.mockResolvedValueOnce({ items: [{ id: 2, fullName: 'Current result' }], page: 1, pageSize: 20, totalCount: 1 })
    const { result } = renderHook(() => useSupervisors())
    act(() => result.current.setFilters({ page: 1, pageSize: 20, search: 'current' }))
    await waitFor(() => expect(result.current.items[0]?.fullName).toBe('Current result'))
    await act(async () => { finishOld?.({ items: [{ id: 1, fullName: 'Old result' }], page: 1, pageSize: 20, totalCount: 1 }) })
    expect(result.current.items[0]?.fullName).toBe('Current result')
  })
})
