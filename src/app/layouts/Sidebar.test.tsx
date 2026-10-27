import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { AuthSessionContext, type AuthSessionContextValue } from '../../features/auth/context/auth-session-context'
import { AcademicWorkflowContext } from '../context/academic-workflow-context'
import { StudentJourneyContext, type StudentJourneyContextValue } from '../context/StudentJourneyContext'
import { Sidebar } from './Sidebar'

afterEach(cleanup)
const coordination = () => screen.getByRole('button', { name: /^1\. Điều phối & Tiến độ/ })
const execution = () => screen.getByRole('button', { name: /^2\. Thực thi công việc/ })

function NavigationControls() {
  const navigate = useNavigate(), location = useLocation()
  return <div>
    <output aria-label="Đường dẫn hiện tại">{location.pathname}</output>
    <button onClick={() => navigate('/project/gantt')}>Đến lịch thực hiện</button>
    <button onClick={() => navigate('/project/tasks/17')}>Đến chi tiết công việc</button>
    <button onClick={() => navigate('/project/tasks-other')}>Đến đường dẫn gần giống</button>
    <button onClick={() => navigate('/profile')}>Đến hồ sơ</button>
    <button onClick={() => navigate(-1)}>Quay lại</button>
  </div>
}

function mount(path = '/project/timeline', loading = false) {
  const auth: AuthSessionContextValue = {
    session: { accessToken: 'unit-test', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: '', refreshTokenExpiresAtUtc: '', user: { id: 1, fullName: 'Sinh viên kiểm thử', email: 'student@example.test', roles: ['STUDENT'] } },
    status: 'authenticated', error: null, login: async () => { throw new Error('unused') }, logout: async () => {}, refreshProfile: async () => {}, restoreSession: async () => {},
  }
  const journey: StudentJourneyContextValue = {
    journeyState: 'ACTIVE', profile: null, semester: null, period: null, team: null,
    project: { id: 1, status: 'ACTIVE' } as NonNullable<StudentJourneyContextValue['project']>,
    assignments: [], workflowContext: null, teamActions: null, projectActions: null,
    isLoading: false, error: null, refreshAll: async () => {}, setSimulatedJourneyState: () => {},
  }
  const tree = (isLoading: boolean) => <AuthSessionContext.Provider value={auth}>
    <AcademicWorkflowContext.Provider value={{ currentUser: auth.session?.user ?? null, workflowContext: null, academic: null, authorization: { roles: [], permissions: [], departmentIds: [], majorIds: [] }, status: 'ready', error: null, errorKind: null, refresh: async () => {} }}>
      <StudentJourneyContext.Provider value={{ ...journey, isLoading }}>
        <MemoryRouter initialEntries={[path]}><Sidebar isOpen={false} onClose={() => {}} /><NavigationControls /></MemoryRouter>
      </StudentJourneyContext.Provider>
    </AcademicWorkflowContext.Provider>
  </AuthSessionContext.Provider>
  const view = render(tree(loading))
  return { ...view, refresh: (isLoading = false) => view.rerender(tree(isLoading)) }
}

describe('student sidebar groups', () => {
  it('lets the active group collapse by clicking its arrow and reopen without navigating', () => {
    mount()
    const button = coordination()
    expect(button.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(within(button).getByText('expand_more'))
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('link', { name: 'Tiến trình Review Gates' })).toBeNull()
    expect(screen.getByLabelText('Đường dẫn hiện tại').textContent).toBe('/project/timeline')
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('link', { name: 'Tiến trình Review Gates' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('preserves manual choices when contexts rerender without a route change', () => {
    const view = mount()
    fireEvent.click(coordination()); fireEvent.click(execution())
    view.refresh()
    expect(coordination().getAttribute('aria-expanded')).toBe('false')
    expect(execution().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('link', { name: 'Công việc' })).toBeNull()
  })

  it('opens the destination group on route changes while preserving other collapsed groups', () => {
    mount()
    fireEvent.click(coordination()); fireEvent.click(execution())
    fireEvent.click(screen.getByRole('button', { name: 'Đến lịch thực hiện' }))
    expect(coordination().getAttribute('aria-expanded')).toBe('true')
    expect(execution().getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('link', { name: 'Lịch thực hiện' }).getAttribute('aria-current')).toBe('page')
  })

  it('opens the matching group for nested routes and supports Back without opening unrelated groups', () => {
    mount()
    fireEvent.click(coordination()); fireEvent.click(execution())
    fireEvent.click(screen.getByRole('button', { name: 'Đến chi tiết công việc' }))
    expect(execution().getAttribute('aria-expanded')).toBe('true')
    expect(coordination().getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('link', { name: 'Công việc' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(execution())
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(coordination().getAttribute('aria-expanded')).toBe('true')
    expect(execution().getAttribute('aria-expanded')).toBe('false')
  })

  it('does not treat a similar path prefix as a nested route', () => {
    mount()
    fireEvent.click(execution())
    fireEvent.click(screen.getByRole('button', { name: 'Đến đường dẫn gần giống' }))
    expect(execution().getAttribute('aria-expanded')).toBe('false')
  })

  it('loads the current group after delayed context and still permits manual collapse afterward', () => {
    const view = mount('/project/tasks/17', true)
    expect(screen.queryByRole('button', { name: /^2\. Thực thi/ })).toBeNull()
    view.refresh(false)
    expect(execution().getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(execution())
    expect(execution().getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps the active group closed through a context loading/ready cycle on the same route', () => {
    const view = mount()
    fireEvent.click(coordination())
    view.refresh(true)
    view.refresh(false)
    expect(coordination().getAttribute('aria-expanded')).toBe('false')
  })

  it('reveals the current group again after returning from a route without a student group', () => {
    mount()
    fireEvent.click(coordination())
    fireEvent.click(screen.getByRole('button', { name: 'Đến hồ sơ' }))
    expect(coordination().getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(coordination().getAttribute('aria-expanded')).toBe('true')
  })
})
