import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const workspace = vi.hoisted(() => ({ useAdminWorkspace: vi.fn() }))
vi.mock('../hooks/useAdminWorkspace', () => workspace)
import { AdminWorkspacePage } from './AdminWorkspacePage'
import { AdminRbacPage } from './AdminRbacPage'

const role = { id: 1, code: 'ADMIN', name: 'System Administrator', description: null, isSystemRole: true, permissions: [], isAssignableGlobalRole: true, assignmentKind: 'GLOBAL' }
const permission = { id: 9, code: 'ACCOUNT_READ', name: 'Read accounts', description: null, isSystemPermission: true }
const ready = (overrides = {}) => ({
  users: { state: 'ready', value: { items: [{ id: 7, fullName: 'Nguyễn Minh', email: 'minh@example.test', studentCode: null, employeeCode: 'GV07', status: 'ACTIVE', departmentId: 2, majorId: null, phone: null, title: null, accessFailedCount: 0, lockoutEndAt: null, roles: ['ADMIN', 'EVALUATOR'] }], page: 1, pageSize: 20, totalCount: 21 }, error: null },
  rbac: { state: 'ready', value: { roles: [role, { ...role, id: 2, code: 'EVALUATOR', name: 'Scoped evaluator', isSystemRole: false, isAssignableGlobalRole: false, assignmentKind: 'RESOURCE' }], permissions: [permission], matrix: { roles: [role], permissions: [permission] } }, error: null },
  audit: { state: 'ready', value: { items: [], page: 1, pageSize: 20, totalCount: 0 }, error: null },
  refresh: vi.fn(), isUnauthorized: false, isForbidden: vi.fn().mockReturnValue(false), createUser: vi.fn(), importUsers: vi.fn(), activate: vi.fn(), deactivate: vi.fn(), block: vi.fn(), unblock: vi.fn(), assignRole: vi.fn(), removeRole: vi.fn(), replacePermissions: vi.fn(), createRole: vi.fn(), updateRole: vi.fn(), deleteRole: vi.fn(), createPermission: vi.fn(), updatePermission: vi.fn(), deletePermission: vi.fn(), ...overrides,
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Admin workspace Phase 6', () => {
  it('renders bounded account metadata and excludes project-scoped roles from the global account role selector', () => {
    workspace.useAdminWorkspace.mockReturnValue(ready())
    render(<MemoryRouter><AdminWorkspacePage /></MemoryRouter>)
    expect(screen.getByText('Nguyễn Minh')).toBeTruthy()
    expect(screen.getByText('Trang 1/2 · 21 kết quả')).toBeTruthy()
    expect(screen.queryByText('EVALUATOR')).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'EVALUATOR' })).toBeNull()
  })

  it('keeps accounts usable when audit is forbidden and states the delivered profile-update boundary', () => {
    workspace.useAdminWorkspace.mockReturnValue(ready({ audit: { state: 'error', value: { items: [], page: 1, pageSize: 20, totalCount: 0 }, error: new Error('forbidden') }, isForbidden: vi.fn((resource: { error?: Error | null }) => resource.error?.message === 'forbidden') }))
    render(<MemoryRouter><AdminWorkspacePage /></MemoryRouter>)
    expect(screen.getByText('Nguyễn Minh')).toBeTruthy()
    expect(screen.getByText('Bạn không có quyền xem nhật ký bảo mật.')).toBeTruthy()
    expect(screen.getByText(/Cập nhật academic profile/)).toBeTruthy()
  })

  it('maps permissions only for a selected role and explains that mapping is not project authority', () => {
    workspace.useAdminWorkspace.mockReturnValue(ready())
    render(<MemoryRouter><AdminRbacPage /></MemoryRouter>)
    expect(screen.getByText(/không tạo quyền trên project/)).toBeTruthy()
    expect(screen.getByText('ADMIN')).toBeTruthy()
  })
})
