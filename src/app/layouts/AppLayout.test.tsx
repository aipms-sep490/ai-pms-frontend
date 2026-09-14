import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { AuthSessionContext } from '../../features/auth/context/auth-session-context'
import { AcademicWorkflowContext } from '../context/academic-workflow-context'

afterEach(() => {
  cleanup()
})

function renderAppLayout(initialEntries = ['/project/workspace']) {
  return render(
    <AuthSessionContext.Provider value={{
      session: null,
      status: 'unauthenticated',
      error: null,
      login: async () => {},
      refreshProfile: async () => {},
      logout: async () => {},
      restoreSession: async () => {},
    }}>
      <AcademicWorkflowContext.Provider value={{
        currentUser: null,
        workflowContext: null,
        academic: null,
        authorization: { roles: [], permissions: [], departmentIds: [], majorIds: [] },
        status: 'idle',
        error: null,
        errorKind: null,
        refresh: async () => {},
      }}>
        <MemoryRouter initialEntries={initialEntries}>
          <AppLayout />
        </MemoryRouter>
      </AcademicWorkflowContext.Provider>
    </AuthSessionContext.Provider>,
  )
}

describe('AppLayout & Navigation Shell', () => {
  it('renders brand header, navigation items, and simulation states', () => {
    renderAppLayout()

    // Brand title
    expect(screen.getByText('AI-PMS • FPTU')).toBeDefined()
    expect(screen.getByText('Học kỳ chưa xác định')).toBeDefined()
    expect(screen.getByText(/Ngữ cảnh chưa xác định\s*\/\s*Chưa có nhóm/)).toBeDefined()

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
    expect(screen.getByText('Sinh viên')).toBeDefined()
    expect(screen.getByText('Tài khoản sinh viên')).toBeDefined()

    // Confirms role switcher button is completely removed from Batch 0
    const roleButton = screen.queryByRole('button', { name: /Chuyển đổi vai trò xem trước/i })
    expect(roleButton).toBeNull()

    // Student navigation items
    expect(screen.getByText('Tiến trình & Cột mốc')).toBeDefined()
    expect(screen.getByText('Gantt & Đường găng')).toBeDefined()

    // Management section displayed as preview
    expect(screen.getByText('Phân hệ Quản lý & Giảng viên')).toBeDefined()
    expect(screen.getByText('Bàn làm việc GVHD')).toBeDefined()
    expect(screen.getByText('Quản lý Bộ môn')).toBeDefined()
  })
})
