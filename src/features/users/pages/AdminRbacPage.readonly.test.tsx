import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const workspace = vi.hoisted(() => ({ useAdminWorkspace: vi.fn() }))
vi.mock('../hooks/useAdminWorkspace', () => workspace)
// BE-11 MVP: read-only matrix (write disabled by default).
vi.mock('../../../app/config/env', async () => {
  const actual = await vi.importActual<typeof import('../../../app/config/env')>('../../../app/config/env')
  return { env: { ...actual.env, rbacWriteEnabled: false } }
})
import { AdminRbacPage } from './AdminRbacPage'

const role = { id: 1, code: 'ADMIN', name: 'System Administrator', description: null, isSystemRole: true, permissions: [{ id: 9, code: 'ACCOUNT_READ', name: 'Read accounts', description: null, isSystemPermission: true }], isAssignableGlobalRole: true, assignmentKind: 'GLOBAL' }
const permission = { id: 9, code: 'ACCOUNT_READ', name: 'Read accounts', description: null, isSystemPermission: true }
const replacePermissions = vi.fn()
const ready = {
  users: { state: 'ready', value: { items: [], page: 1, pageSize: 20, totalCount: 0 }, error: null },
  rbac: { state: 'ready', error: null, value: { roles: [role], permissions: [permission], matrix: { roles: [role], permissions: [permission] } } },
  audit: { state: 'ready', value: { items: [], page: 1, pageSize: 20, totalCount: 0 }, error: null },
  refresh: vi.fn(), isUnauthorized: false, isForbidden: vi.fn().mockReturnValue(false), replacePermissions,
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('AdminRbacPage · read-only MVP (BE-11)', () => {
  it('shows the matrix without a save control and keeps checkboxes disabled', () => {
    workspace.useAdminWorkspace.mockReturnValue(ready)
    render(<MemoryRouter><AdminRbacPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /ADMIN/ }))
    expect(screen.queryByRole('button', { name: 'Lưu phân quyền' })).toBeNull()
    expect(screen.getByText(/chế độ chỉ đọc trong MVP/)).toBeTruthy()
    const checkbox = screen.getByRole('checkbox', { name: /ACCOUNT_READ/ }) as HTMLInputElement
    // The matrix is disabled via the enclosing <fieldset disabled> (read-only mode).
    expect(checkbox.closest('fieldset')?.disabled).toBe(true)
    expect(checkbox.checked).toBe(true)
  })
})
