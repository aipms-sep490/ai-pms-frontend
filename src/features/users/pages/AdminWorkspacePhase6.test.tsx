import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

const workspace = vi.hoisted(() => ({ useAdminWorkspace: vi.fn() }))
vi.mock('../hooks/useAdminWorkspace', () => workspace)
vi.mock('../../academic/components/AcademicScopeFields', () => ({ AcademicScopeFields: () => null }))
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
  it('carries account filters and pagination to the detail return path', () => {
    workspace.useAdminWorkspace.mockReturnValue(ready())
    function Detail() { return <p>{useLocation().state?.returnTo}</p> }
    render(<MemoryRouter initialEntries={['/admin/access?search=Minh&status=ACTIVE&page=2']}><Routes><Route path="/admin/access" element={<AdminWorkspacePage />} /><Route path="/admin/access/users/:id" element={<Detail />} /></Routes></MemoryRouter>)
    fireEvent.click(screen.getByRole('link', { name: 'Xem chi tiết' }))
    expect(screen.getByText('/admin/access?search=Minh&status=ACTIVE&page=2')).toBeTruthy()
  })
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
    expect(screen.getByText(/Mở hồ sơ từng tài khoản/)).toBeTruthy()
  })

  it('maps permissions only for a selected role and explains that mapping is not project authority', () => {
    workspace.useAdminWorkspace.mockReturnValue(ready())
    render(<MemoryRouter><AdminRbacPage /></MemoryRouter>)
    expect(screen.getByText(/Phân công trong đồ án được quản lý/)).toBeTruthy()
    expect(screen.getByText('ADMIN')).toBeTruthy()
  })
})


describe('Admin form state', () => {
  it('keeps permissions hidden by a filter when saving the selected role', async () => {
    const replacePermissions = vi.fn().mockResolvedValue(undefined)
    workspace.useAdminWorkspace.mockReturnValue(ready({ replacePermissions, rbac: { state: 'ready', error: null, value: { roles: [{ ...role, permissions: [permission] }], permissions: [permission, { ...permission, id: 10, code: 'ACCOUNT_WRITE', name: 'Write accounts' }], matrix: { roles: [], permissions: [] } } } }))
    render(<MemoryRouter><AdminRbacPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /ADMIN/ }))
    fireEvent.change(screen.getByLabelText('Tìm quyền truy cập'), { target: { value: 'WRITE' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /ACCOUNT_WRITE/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phân quyền' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Lưu quyền truy cập' }))
    await waitFor(() => expect(replacePermissions).toHaveBeenCalledWith(1, [9, 10]))
  })
  it('replaces the checkbox selection when switching roles', () => {
    workspace.useAdminWorkspace.mockReturnValue(ready({ rbac: { state: 'ready', error: null, value: { roles: [{ ...role, permissions: [permission] }, { ...role, id: 2, code: 'LECTURER', permissions: [] }], permissions: [permission], matrix: { roles: [], permissions: [] } } } }))
    render(<MemoryRouter><AdminRbacPage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /ADMIN/ }))
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: /LECTURER/ }))
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
  })
  it('keeps entered account details when creation fails', async () => {
    const createUser = vi.fn().mockRejectedValue(new Error('Failed'))
    workspace.useAdminWorkspace.mockReturnValue(ready({ createUser }))
    render(<MemoryRouter><AdminWorkspacePage /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: 'Nguyễn An' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@example.test' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu ban đầu'), { target: { value: 'Example123!' } })
    fireEvent.submit(screen.getByLabelText('Họ tên').closest('form')!)
    await waitFor(() => expect(createUser).toHaveBeenCalledOnce())
    await waitFor(() => expect((screen.getByLabelText('Họ tên') as HTMLInputElement).disabled).toBe(false))
    expect((screen.getByLabelText('Họ tên') as HTMLInputElement).value).toBe('Nguyễn An')
  })
})
