import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthSessionContext, type AuthSessionContextValue } from '../../features/auth/context/auth-session-context'
import { AcademicWorkflowContext } from '../context/academic-workflow-context'
import { AppLayout } from './AppLayout'
import { StudentJourneyContext, type StudentJourneyContextValue } from '../context/StudentJourneyContext'

afterEach(cleanup)

function renderAppLayout(initialEntries = ['/project/overview'], roles: string[] = ['STUDENT'], journey: StudentJourneyContextValue | null = null) {
  const auth: AuthSessionContextValue = {
    session: { accessToken: 'test', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: '', refreshTokenExpiresAtUtc: '', user: { id: 1, fullName: 'Nguyễn Hoàng Minh', email: 'lecturer@fe.edu.vn', roles } },
    status: 'authenticated', error: null, login: async () => { throw new Error('unused') }, logout: async () => {}, refreshProfile: async () => {}, restoreSession: async () => {},
  }
  return render(
    <AuthSessionContext.Provider value={auth}>
      <AcademicWorkflowContext.Provider value={{
        currentUser: auth.session?.user ?? null, workflowContext: null, academic: null,
        authorization: { roles: [], permissions: [], departmentIds: [], majorIds: [] },
        status: 'ready', error: null, errorKind: null, refresh: async () => {},
      }}>
        <StudentJourneyContext.Provider value={journey}><MemoryRouter initialEntries={initialEntries}><AppLayout /></MemoryRouter></StudentJourneyContext.Provider>
      </AcademicWorkflowContext.Provider>
    </AuthSessionContext.Provider>,
  )
}

describe('AppLayout & Navigation Shell', () => {
  it('opens notifications in a popover and returns focus to the bell on Escape', () => {
    renderAppLayout()
    const bell = screen.getByRole('button', { name: /Mở thông báo học vụ/ })
    fireEvent.click(bell)
    expect(bell.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('region', { name: 'Thông báo mới' })).toBeDefined()
    screen.getByRole('link', { name: 'Xem tất cả' }).focus()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Thông báo mới' })).toBeNull()
    expect(document.activeElement).toBe(bell)
  })
  it.each([{ isLoading: true, error: null }, { isLoading: false, error: 'Failed to fetch' }])('does not invent a team or show the registration menu before project context is known', (state) => {
    const journey: StudentJourneyContextValue = { journeyState: 'TEAM_FORMING', profile: null, semester: null, period: null, team: null, project: null, assignments: [], workflowContext: null, teamActions: null, projectActions: null, refreshAll: async () => {}, setSimulatedJourneyState: () => {}, ...state }
    renderAppLayout(['/project/tasks'], ['STUDENT'], journey)
    expect(screen.queryByText('Chưa có nhóm')).toBeNull()
    expect(screen.queryByText('Đang kiện toàn')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Tổng quan lộ trình' })).toBeNull()
    expect(screen.queryByText(/Sắp có/)).toBeNull()
    expect(screen.getByRole('navigation', { name: /breadcrumb/ }).textContent).toContain('Công việc')
  })
  it('renders student navigation and notification access without unfinished controls', () => {
    renderAppLayout()
    expect(screen.getByText('AI-PMS • FPTU')).toBeDefined()
    expect(screen.getByText('Học kỳ chưa xác định')).toBeDefined()
    expect(screen.getAllByText('Tổng quan lộ trình').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Hồ sơ đồ án')).toBeDefined()
    expect(screen.queryByRole('button', { name: /Tìm kiếm toàn hệ thống/i })).toBeNull()
    expect(screen.getByRole('button', { name: /Mở thông báo học vụ/i })).toBeDefined()
    expect(screen.queryByText(/Sắp có/)).toBeNull()
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
    expect(screen.getByRole('link', { name: /Hướng dẫn đồ án/ })).toBeDefined()
    expect(screen.queryByRole('link', { name: /Đánh giá được phân công/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Tổng quan lộ trình/ })).toBeNull()
  })

  it('shows department navigation without student workspace routes', () => {
    renderAppLayout(['/department/projects/review'], ['DEPARTMENT_STAFF'])
    expect(screen.getByRole('link', { name: /Thẩm định đề cương/ })).toBeDefined()
    expect(screen.queryByRole('link', { name: /Tổng quan lộ trình/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tìm chức năng' })).toBeNull()
    expect(document.querySelector('[data-experience=enhanced]')).toBeNull()
  })

  it('opens quick navigation with the keyboard, focuses search and matches Vietnamese without accents', () => {
    renderAppLayout(['/supervisor/projects/7/workspace'], ['LECTURER'])
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const search = screen.getByRole('textbox', { name: 'Tên chức năng' })
    expect(document.activeElement).toBe(search)
    fireEvent.change(search, { target: { value: 'lich hop' } })
    expect(screen.getByRole('button', { name: 'Lịch họp của đồ án' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Quản trị nền tảng' })).toBeNull()
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Lịch họp của đồ án' }))
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows an unavailable-context state instead of an invented empty team after a journey error', () => {
    const journey: StudentJourneyContextValue = { journeyState: 'TEAM_FORMING', profile: null, semester: null, period: null, team: null, project: null, assignments: [], workflowContext: null, teamActions: null, projectActions: null, isLoading: false, error: 'Network unavailable', refreshAll: async () => {}, setSimulatedJourneyState: () => {} }
    renderAppLayout(['/project/overview'], ['STUDENT'], journey)
    expect(screen.getAllByRole('alert').some((node) => node.textContent?.includes('Chưa tải được ngữ cảnh đồ án'))).toBe(true)
    expect(screen.queryByRole('link', { name: 'Tổng quan lộ trình' })).toBeNull()
  })

  it('keeps platform administration separate from academic governance navigation', () => {
    renderAppLayout(['/admin/access'], ['ADMIN'])
    expect(screen.getByRole('link', { name: 'Quản trị nền tảng' })).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Thẩm định đề cương' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tìm chức năng' }))
    expect(screen.getByRole('button', { name: 'Phân quyền hệ thống' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Thông báo' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Thẩm định đề cương' })).toBeNull()
  })

  it('shows ACTIVE students the contribution, final-submission, and result routes', () => {
    const journey: StudentJourneyContextValue = {
      journeyState: 'ACTIVE', profile: null, semester: null, period: null, team: null, project: { id: 1, status: 'ACTIVE' } as any,
      assignments: [], workflowContext: null, teamActions: null, projectActions: null,
      isLoading: false, error: null, refreshAll: async () => {}, setSimulatedJourneyState: () => {},
    }
    renderAppLayout(['/project/workspace'], ['STUDENT'], journey)
    expect(screen.getByRole('link', { name: 'Đóng góp thành viên' }).getAttribute('href')).toBe('/project/contributions')
    expect(screen.getByRole('link', { name: 'Bàn giao cuối kỳ' }).getAttribute('href')).toBe('/project/final-submission')
    expect(screen.getByRole('link', { name: 'Kết quả đồ án' }).getAttribute('href')).toBe('/project/result')
  })
})
