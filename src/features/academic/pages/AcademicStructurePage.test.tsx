import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { AcademicStructurePage } from './AcademicStructurePage'

const academicHook = vi.hoisted(() => ({ useAcademicStructure: vi.fn() }))
vi.mock('../hooks/useAcademicStructure', () => academicHook)

const hierarchy = [{
  organization: { id: 1, code: 'FPTU', name: 'FPT University', description: null, isActive: true },
  departments: [{
    department: { id: 10, organizationId: 1, organizationCode: 'FPTU', organizationName: 'FPT University', code: 'SE', name: 'Kỹ thuật phần mềm', description: null, isActive: true },
    majors: [{ id: 100, departmentId: 10, departmentCode: 'SE', departmentName: 'Kỹ thuật phần mềm', organizationId: 1, organizationCode: 'FPTU', code: 'SE', name: 'Software Engineering', description: null, isActive: true }],
  }],
}]

const defaultState = () => ({
  hierarchy,
  context: { user: { roles: ['ADMIN'], grantedPermissions: [], effectiveRoles: ['ADMIN'] }, actions: [{ code: 'manage_academic_structure', allowed: true, reasons: [] }] },
  error: null,
  isLoading: false,
  isSubmitting: false,
  isEmpty: false,
  isForbidden: false,
  isUnauthorized: false,
  isUnauthenticated: false,
  canManageAcademicStructure: true,
  canManageOrganizations: true,
  retry: vi.fn(),
  submitRecord: vi.fn().mockResolvedValue(undefined),
  changeStatus: vi.fn().mockResolvedValue(undefined),
})

afterEach(cleanup)
beforeEach(() => academicHook.useAcademicStructure.mockImplementation(() => defaultState()))

function renderPage() { return render(<AcademicStructurePage />, { wrapper: MemoryRouter }) }

describe('AcademicStructurePage', () => {
  it('renders the backend-owned organization, department and major hierarchy', () => {
    renderPage()
    expect(screen.getByText('FPT University')).toBeDefined()
    expect(screen.getByText('Kỹ thuật phần mềm')).toBeDefined()
    expect(screen.getByText('Software Engineering')).toBeDefined()
    expect(screen.getByTestId('organization-1-departments')).toBeDefined()
    expect(screen.getByTestId('department-10-majors')).toBeDefined()
  })

  it('renders loading, empty, forbidden and server error states distinctly', () => {
    academicHook.useAcademicStructure.mockReturnValue({ ...defaultState(), hierarchy: null, isLoading: true })
    const { rerender } = render(<AcademicStructurePage />, { wrapper: MemoryRouter })
    expect(screen.getByRole('status').textContent).toContain('Đang tải')

    academicHook.useAcademicStructure.mockReturnValue({ ...defaultState(), hierarchy: [], isEmpty: true })
    rerender(<AcademicStructurePage />)
    expect(screen.getByRole('status').textContent).toContain('Không có tổ chức')

    academicHook.useAcademicStructure.mockReturnValue({ ...defaultState(), hierarchy: null, error: new HttpError('Forbidden', 403), isForbidden: true })
    rerender(<AcademicStructurePage />)
    expect(screen.getByRole('alert').textContent).toContain('Không có quyền truy cập')

    academicHook.useAcademicStructure.mockReturnValue({ ...defaultState(), hierarchy: null, error: new Error('offline') })
    rerender(<AcademicStructurePage />)
    expect(screen.getByRole('alert').textContent).toContain('Lỗi tải dữ liệu')
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeDefined()
  })

  it('routes an unauthenticated user to the existing login experience', () => {
    academicHook.useAcademicStructure.mockReturnValue({ ...defaultState(), hierarchy: null, isUnauthenticated: true })
    renderPage()
    expect(screen.getByRole('alert').textContent).toContain('Cần đăng nhập')
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toBeDefined()
  })

  it('shows supported mutation controls only when backend action availability allows it', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Thêm tổ chức' })).toBeDefined()
    expect(screen.getAllByRole('button', { name: 'Chỉnh sửa' }).length).toBeGreaterThan(0)
  })

  it('keeps mutation controls hidden for a restricted backend context', () => {
    academicHook.useAcademicStructure.mockReturnValue({ ...defaultState(), canManageAcademicStructure: false, canManageOrganizations: false, context: { ...defaultState().context, actions: [{ code: 'manage_academic_structure', allowed: false, reasons: ['ACADEMIC_MANAGER_REQUIRED'] }] } })
    renderPage()
    expect(screen.queryByRole('button', { name: 'Thêm tổ chức' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).toBeNull()
    expect(screen.getByText(/chế độ xem/i)).toBeDefined()
  })

  it('submits supported search and organization filters to the hook', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Tìm theo mã hoặc tên'), { target: { value: 'SE' } })
    fireEvent.change(screen.getByLabelText('Phạm vi tổ chức'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
    expect(academicHook.useAcademicStructure).toHaveBeenLastCalledWith({ search: 'SE', organizationId: 1, includeInactive: false })
  })
})
