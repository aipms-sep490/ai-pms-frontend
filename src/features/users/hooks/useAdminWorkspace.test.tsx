import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAdminWorkspace } from './useAdminWorkspace'

const mocks = vi.hoisted(() => ({
  session: { accessToken: 'test-token', user: { id: 1, roles: ['ADMIN'] } },
  getUsers: vi.fn(), getRoles: vi.fn(), getPermissions: vi.fn(), getPermissionMatrix: vi.fn(), getAudit: vi.fn(),
}))
vi.mock('../../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: mocks.session }) }))
vi.mock('../api/admin-api', async importOriginal => ({ ...await importOriginal<object>(), ...mocks }))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getRoles.mockResolvedValue({ items: [] })
  mocks.getPermissions.mockResolvedValue({ items: [] })
  mocks.getPermissionMatrix.mockResolvedValue({ roles: [], permissions: [] })
  mocks.getAudit.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
})
afterEach(cleanup)

it('keeps the newest account filter result when an older request finishes later', async () => {
  let finishOld!: (value: object) => void
  mocks.getUsers.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve }))
  mocks.getUsers.mockResolvedValueOnce({ items: [], page: 1, pageSize: 20, totalCount: 2 })
  const { result, rerender } = renderHook(({ search }) => useAdminWorkspace({ search }), { initialProps: { search: 'old' } })
  rerender({ search: 'new' })
  await waitFor(() => expect(result.current.users.value.totalCount).toBe(2))
  await act(async () => { finishOld({ items: [], page: 1, pageSize: 20, totalCount: 99 }) })
  expect(result.current.users.value.totalCount).toBe(2)
  expect(result.current.users.state).toBe('ready')
})
