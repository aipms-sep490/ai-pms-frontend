import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createPermission,
  createRole,
  deletePermission,
  getAudit,
  deleteRole,
  getUsers,
  getPermissionMatrix,
  activateUser,
  blockUser,
  deactivateUser,
  unblockUser,
  updatePermission,
  updateRole,
} from './admin-api'

const response = (body: unknown = {}) => ({ ok: true, status: 200, json: async () => body })

describe('account security catalog API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses only the backend role, permission, and matrix contracts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response())
    vi.stubGlobal('fetch', fetchMock)
    const draft = { code: 'PROJECT_READ', name: 'Read projects', description: null }

    await Promise.all([
      getPermissionMatrix('token'),
      createRole(draft, 'token'), updateRole(4, draft, 'token'), deleteRole(4, 'token'),
      createPermission(draft, 'token'), updatePermission(7, draft, 'token'), deletePermission(7, 'token'),
    ])

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/security/permissions/matrix', expect.objectContaining({ method: 'GET' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/security/roles', expect.objectContaining({ method: 'POST', body: JSON.stringify(draft) }))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/security/roles/4', expect.objectContaining({ method: 'PUT', body: JSON.stringify(draft) }))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/security/roles/4', expect.objectContaining({ method: 'DELETE' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/security/permissions', expect.objectContaining({ method: 'POST', body: JSON.stringify(draft) }))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/security/permissions/7', expect.objectContaining({ method: 'PUT', body: JSON.stringify(draft) }))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/security/permissions/7', expect.objectContaining({ method: 'DELETE' }))
  })

  it('keeps server pagination, audit filters, and explicit account lifecycle endpoints authoritative', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ items: [], page: 1, pageSize: 20, totalCount: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    await Promise.all([
      getUsers('token', { search: 'minh', status: 'ACTIVE', page: 2 }),
      getAudit('token', { action: 'ACCOUNT_', outcome: 'SUCCESS', page: 3 }),
      activateUser(8, 'token'), deactivateUser(8, 'token'), blockUser(8, 'token'), unblockUser(8, 'token'),
    ])
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/users?search=minh&status=ACTIVE&page=2&pageSize=20', expect.objectContaining({ method: 'GET' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/security/audit-logs?action=ACCOUNT_&outcome=SUCCESS&page=3&pageSize=20', expect.objectContaining({ method: 'GET' }))
    for (const suffix of ['activate', 'deactivate', 'block', 'unblock']) expect(fetchMock).toHaveBeenCalledWith(`/api/v1/users/8/${suffix}`, expect.objectContaining({ method: 'POST' }))
  })
})
