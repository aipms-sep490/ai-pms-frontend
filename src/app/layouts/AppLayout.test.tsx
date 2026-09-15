import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthSessionContext, type AuthSessionContextValue } from '../../features/auth/context/auth-session-context'
import { AcademicWorkflowContext } from '../context/academic-workflow-context'
import { AppLayout } from './AppLayout'

afterEach(cleanup)

function renderAppLayout(initialEntries = ['/project/workspace'], roles: string[] = ['STUDENT']) {
  const auth: AuthSessionContextValue = {
    session: { accessToken: 'test', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: '', refreshTokenExpiresAtUtc: '', user: { id: 1, fullName: 'Nguyễn Hoàng Minh', email: 'lecturer@fe.edu.vn', roles } },
    status: 'authenticated', error: null, login: async () => { throw new Error('unused') }, logout: async () => {}, refreshProfile: async () => {}, restoreSession: async () => {},
  }
  return render(
    <AuthSessionContext.Provider value={auth}>
      <AcademicWorkflowContext.Provider value={{
        currentUser: auth.session?.user ?? null, workflowContext: null, academic: null,
        authorization: { roles: [], permissions: [], departmentIds: [], majorIds: [] },
        status: 'idle', error: null, errorKind: null, refresh: async () => {},
      }}>
        <MemoryRouter initialEntries={initialEntries}><AppLayout /></MemoryRouter>
      </AcademicWorkflowContext.Provider>
    </AuthSessionContext.Provider>,
  )
}

describe('AppLayout & Navigation Shell', () => {
  it('renders brand header, student navigation, and honest disabled controls', () => {
    renderAppLayout()
    expect(screen.getByText('AI-PMS • FPTU')).toBeDefined()
    expect(screen.getByText('Học kỳ chưa xác định')).toBeDefined()
    expect(screen.getAllByText('Bàn làm việc Tổng quan').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Đăng ký & Hồ sơ đề tài')).toBeDefined()
    expect(screen.getByRole('button', { name: /Tìm kiếm toàn hệ thống/i }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: /Thông báo học vụ/i }).hasAttribute('disabled')).toBe(true)
  })

  it('toggles the mobile drawer and restores focus after Escape', () => {
    renderAppLayout()
    const hamburger = screen.getByRole('button', { name: /Mở menu điều hướng/i })
    fireEvent.click(hamburger)
    expect(hamburger.getAttribute('aria-expanded')).toBe('true')
    const sidebar = document.getElementById('main-sidebar')
    expect(sidebar?.getAttribute('role')).toBe('dialog')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(hamburger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(hamburger)
  })

  it('shows role-specific navigation without a student workspace for lecturers', () => {
    renderAppLayout(['/supervisor/workspace'], ['LECTURER'])
    expect(screen.getByRole('link', { name: /Bàn làm việc GVHD/ })).toBeDefined()
    expect(screen.queryByRole('link', { name: /Bàn làm việc Tổng quan/ })).toBeNull()
  })

  it('shows department navigation without student workspace routes', () => {
    renderAppLayout(['/department/projects/review'], ['DEPARTMENT_STAFF'])
    expect(screen.getByRole('link', { name: /Thẩm định đề cương/ })).toBeDefined()
    expect(screen.queryByRole('link', { name: /Bàn làm việc Tổng quan/ })).toBeNull()
  })
})
