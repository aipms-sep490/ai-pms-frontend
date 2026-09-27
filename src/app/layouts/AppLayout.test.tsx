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
        status: 'idle', error: null, errorKind: null, refresh: async () => {},
      }}>
        <StudentJourneyContext.Provider value={journey}><MemoryRouter initialEntries={initialEntries}><AppLayout /></MemoryRouter></StudentJourneyContext.Provider>
      </AcademicWorkflowContext.Provider>
    </AuthSessionContext.Provider>,
  )
}

describe('AppLayout & Navigation Shell', () => {
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
    expect(screen.queryByRole('button', { name: /Thông báo học vụ/i })).toBeNull()
    expect(screen.getByRole('link', { name: /Thông báo học vụ/i }).getAttribute('href')).toBe('/notifications')
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
    expect(screen.getByRole('link', { name: /Bàn làm việc GVHD/ })).toBeDefined()
    expect(screen.queryByRole('link', { name: /Tổng quan lộ trình/ })).toBeNull()
  })

  it('shows department navigation without student workspace routes', () => {
    renderAppLayout(['/department/projects/review'], ['DEPARTMENT_STAFF'])
    expect(screen.getByRole('link', { name: /Thẩm định đề cương/ })).toBeDefined()
    expect(screen.queryByRole('link', { name: /Tổng quan lộ trình/ })).toBeNull()
  })

  it('shows ACTIVE students the contribution, final-submission, and result routes', () => {
    const journey: StudentJourneyContextValue = {
      journeyState: 'ACTIVE', profile: null, semester: null, period: null, team: null, project: null,
      assignments: [], workflowContext: null, teamActions: null, projectActions: null,
      isLoading: false, error: null, refreshAll: async () => {}, setSimulatedJourneyState: () => {},
    }
    renderAppLayout(['/project/workspace'], ['STUDENT'], journey)
    expect(screen.getByRole('link', { name: 'Đóng góp thành viên' }).getAttribute('href')).toBe('/project/contributions')
    expect(screen.getByRole('link', { name: 'Bàn giao cuối' }).getAttribute('href')).toBe('/project/final-submission')
    expect(screen.getByRole('link', { name: 'Kết quả đồ án' }).getAttribute('href')).toBe('/project/result')
  })
})
