import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthSessionContext, type AuthSessionContextValue } from '../../features/auth/context/auth-session-context'
import { AppLayout } from './AppLayout'

afterEach(() => {
  cleanup()
})

function renderAppLayout(initialEntries = ['/project/workspace'], roles: string[] = ['STUDENT']) {
  const auth: AuthSessionContextValue = {
    session: { accessToken: 'test', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: '', refreshTokenExpiresAtUtc: '', user: { id: 1, fullName: 'Nguyễn Hoàng Minh', email: 'lecturer@fe.edu.vn', roles } },
    status: 'authenticated', error: null, login: async () => { throw new Error('unused') }, logout: () => {}, refreshProfile: async () => {},
  }
  return render(
    <AuthSessionContext.Provider value={auth}>
      <MemoryRouter initialEntries={initialEntries}><AppLayout /></MemoryRouter>
    </AuthSessionContext.Provider>
  )
}

describe('AppLayout & Navigation Shell', () => {
  it('renders brand header, navigation items, and simulation states', () => {
    renderAppLayout()

    // Brand title
    expect(screen.getByText('AI-PMS • FPTU')).toBeDefined()
    expect(screen.getByText('Học kỳ chưa xác định')).toBeDefined()
    expect(screen.getByText(/SEP490\s*\/\s*Chưa có nhóm/)).toBeDefined()

    // Active navigation item and breadcrumb
    expect(screen.getAllByText('Bàn làm việc Tổng quan').length).toBeGreaterThanOrEqual(1)

    // Implemented route link
    expect(screen.getByText('Đăng ký & Hồ sơ đề tài')).toBeDefined()

    // Honest disabled preview controls
    const searchBtn = screen.getByRole('button', { name: /Tìm kiếm toàn hệ thống/i })
    expect(searchBtn).toBeDefined()
    expect(searchBtn.hasAttribute('disabled')).toBe(true)

    const bellBtn = screen.getByRole('button', { name: /Thông báo học vụ/i })
    expect(bellBtn).toBeDefined()
    expect(bellBtn.hasAttribute('disabled')).toBe(true)
  })

  it('toggles mobile drawer on hamburger button click', () => {
    renderAppLayout()

    const hamburger = screen.getByRole('button', { name: /Mở menu điều hướng/i })
    expect(hamburger.getAttribute('aria-expanded')).toBe('false')

    // Click to open
    fireEvent.click(hamburger)
    expect(hamburger.getAttribute('aria-expanded')).toBe('true')

    const sidebar = document.getElementById('main-sidebar')
    expect(sidebar?.classList.contains('drawer-open')).toBe(true)
    expect(sidebar?.getAttribute('role')).toBe('dialog')
    expect(sidebar?.getAttribute('aria-modal')).toBe('true')
  })

  it('closes mobile drawer and returns focus on Escape key press', () => {
    renderAppLayout()

    const hamburger = screen.getByRole('button', { name: /Mở menu điều hướng/i })
    fireEvent.click(hamburger)
    expect(hamburger.getAttribute('aria-expanded')).toBe('true')

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(hamburger.getAttribute('aria-expanded')).toBe('false')
    const sidebar = document.getElementById('main-sidebar')
    expect(sidebar?.classList.contains('drawer-open')).toBe(false)
    expect(document.activeElement).toBe(hamburger)
  })

  it('closes mobile drawer using dedicated close button', () => {
    renderAppLayout()

    const hamburger = screen.getByRole('button', { name: /Mở menu điều hướng/i })
    fireEvent.click(hamburger)

    const closeBtn = screen.getByRole('button', { name: 'Đóng ngăn điều hướng' })
    fireEvent.click(closeBtn)

    expect(hamburger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(hamburger)
  })

  it('renders student baseline profile and workspace without role switcher', () => {
    renderAppLayout()

    // Student profile display
    expect(screen.getByText('Nguyễn Hoàng Minh')).toBeDefined()
    expect(screen.getByText('Tài khoản sinh viên')).toBeDefined()

    // Confirms role switcher button is completely removed from Batch 0
    const roleButton = screen.queryByRole('button', { name: /Chuyển đổi vai trò xem trước/i })
    expect(roleButton).toBeNull()

    // Student navigation items
    expect(screen.getByText('Tiến trình & Cột mốc')).toBeDefined()
    expect(screen.getByText('Gantt & Đường găng')).toBeDefined()

    expect(screen.queryByText('Bàn làm việc GVHD')).toBeNull()
    expect(screen.queryByText('Quản lý Bộ môn')).toBeNull()
  })

  it('shows only the lecturer workspace for a lecturer account', () => {
    renderAppLayout(['/supervisor/workspace'], ['LECTURER'])
    expect(screen.getByRole('link', { name: /Bàn làm việc GVHD/ })).toBeDefined()
    expect(screen.queryByRole('link', { name: /Bàn làm việc Tổng quan/ })).toBeNull()
    expect(screen.queryByText('Chưa có nhóm')).toBeNull()
  })

  it('shows department pages without student navigation for department staff', () => {
    renderAppLayout(['/department/projects/review'], ['DEPARTMENT_STAFF'])
    expect(screen.getByRole('link', { name: /Thẩm định đề cương/ })).toBeDefined()
    expect(screen.queryByRole('link', { name: /Bàn làm việc Tổng quan/ })).toBeNull()
    expect(screen.queryByText('Chưa có nhóm')).toBeNull()
  })
})
