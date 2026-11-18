import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { AuthSessionContext, type AuthSessionContextValue } from '../../features/auth/context/auth-session-context'
import { AcademicWorkflowContext } from '../context/academic-workflow-context'
import { StudentJourneyContext, type StudentJourneyContextValue } from '../context/StudentJourneyContext'
import { Sidebar } from './Sidebar'

vi.mock('../../features/auth/components/SelfAvatarImage', () => ({ SelfAvatarImage: ({ initials }: { initials: string }) => <span>{initials}</span> }))

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
    <button onClick={() => navigate('/academic/governance')}>Đến học kỳ</button>
    <button onClick={() => navigate('/department/projects/review/17')}>Đến thẩm định</button>
    <button onClick={() => navigate(-1)}>Quay lại</button>
  </div>
}

function mount(path = '/project/timeline', loading = false, roles: string[] = ['STUDENT']) {
  const auth: AuthSessionContextValue = {
    session: { accessToken: 'unit-test', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: '', refreshTokenExpiresAtUtc: '', user: { id: 1, fullName: roles.includes('DEPARTMENT_STAFF') ? 'Cán bộ bộ môn' : 'Sinh viên kiểm thử', email: roles.includes('DEPARTMENT_STAFF') ? 'staff@example.test' : 'student@example.test', roles } },
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

describe('department sidebar groups', () => {
  const overview = () => screen.getByRole('button', { name: /^1\. Tổng quan & hồ sơ/ })
  const topics = () => screen.getByRole('button', { name: /^2\. Đề tài & hướng dẫn/ })

  it('organizes academic governance into role-specific groups and keeps account links separate', () => {
    mount('/department/workspace', false, ['DEPARTMENT_STAFF'])
    expect(overview().getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('link', { name: 'Tổng quan bộ môn' })).toBeDefined()
    expect(screen.getByRole('button', { name: /^3\. Cấu hình học vụ/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /^4\. Review Gates & kiểm soát/ })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Hồ sơ tài khoản' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Lịch tổng hợp' })).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Phối hợp nhóm' })).toBeNull()
  })

  it('opens the active governance group and supports collapse without changing route', () => {
    mount('/department/projects/review', false, ['DEPARTMENT_STAFF'])
    expect(topics().getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('link', { name: 'Thẩm định đề cương' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(topics())
    expect(topics().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('link', { name: 'Thẩm định đề cương' })).toBeNull()
    expect(screen.getByLabelText('Đường dẫn hiện tại').textContent).toBe('/department/projects/review')
  })

  it('reveals a collapsed group for a nested destination and restores the group on Back', () => {
    mount('/department/workspace', false, ['DEPARTMENT_STAFF'])
    fireEvent.click(overview()); fireEvent.click(topics())
    fireEvent.click(screen.getByRole('button', { name: 'Đến thẩm định' }))
    expect(topics().getAttribute('aria-expanded')).toBe('true')
    expect(overview().getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('link', { name: 'Thẩm định đề cương' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(topics())
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(overview().getAttribute('aria-expanded')).toBe('true')
    expect(topics().getAttribute('aria-expanded')).toBe('false')
  })

  it('highlights the exact academic destination and keeps Admin and student routes out of staff navigation', () => {
    mount('/academic/governance', false, ['DEPARTMENT_STAFF'])
    expect(screen.getByRole('link', { name: 'Học kỳ và kỳ đồ án' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Cấu trúc đào tạo' }).getAttribute('aria-current')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Quản trị nền tảng' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Công việc' })).toBeNull()
  })

  it('preserves every permitted destination for a department identity that also has a student role', () => {
    mount('/department/workspace', false, ['DEPARTMENT_STAFF', 'STUDENT'])
    expect(overview()).toBeDefined()
    expect(screen.getByRole('link', { name: 'Phối hợp nhóm' })).toBeDefined()
    expect(screen.getAllByRole('link', { name: 'Công việc' })).toHaveLength(1)
    expect(screen.getAllByRole('link', { name: 'Hồ sơ tài khoản' })).toHaveLength(1)
  })

  it('preserves the Admin navigation layout and academic links', () => {
    mount('/academic/governance', false, ['ADMIN'])
    expect(screen.queryByRole('button', { name: /^3\. Cấu hình học vụ/ })).toBeNull()
    expect(screen.getByRole('link', { name: 'Quản trị nền tảng' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Học kỳ và kỳ đồ án' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Cấu trúc đào tạo' }).getAttribute('aria-current')).toBeNull()
  })
})
