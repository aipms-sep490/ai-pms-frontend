import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AcademicContextSnapshot } from '../../app/context/academic-workflow-context'
import { useWorkspaceAccess } from '../../app/context/workspace-access'
import { CalendarAttentionPage } from './CalendarAttentionPage'
import { loadCalendarAttention } from './calendar-data'

const state = vi.hoisted(() => ({
  session: { user: { id: 1, roles: ['DEPARTMENT_STAFF'] }, accessToken: 'controlled-token' },
  academic: {
    academic: null as AcademicContextSnapshot | null,
    authorization: { permissions: [], departmentIds: [1, 2], majorIds: [] },
    status: 'ready', error: null, workflowContext: null,
  },
}))
vi.mock('../../features/auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: state.session, status: 'authenticated' }) }))
vi.mock('../../app/context/useAcademicWorkflow', () => ({ useAcademicWorkflow: () => state.academic }))
vi.mock('./calendar-data', () => ({ loadCalendarAttention: vi.fn() }))
const loader = vi.mocked(loadCalendarAttention)
const departments = [
  { id: 1, code: 'IT', name: 'Công nghệ thông tin', isActive: true },
  { id: 2, code: 'BA', name: 'Quản trị kinh doanh', isActive: true },
]
function snapshot(): AcademicContextSnapshot {
  return { organization: null, departments, majors: [], currentSemesters: [], selectedSemester: null, periods: [], hasActiveDepartmentScope: true, hasEligibleStudentProfile: false, issues: [] }
}
describe('calendar with the real memoized workspace context', () => {
  afterEach(cleanup)
  beforeEach(() => {
    state.academic.academic = snapshot()
    loader.mockReset()
    loader.mockResolvedValue({ attention: [], calendar: [], sources: [{ id: 'urgent-actions-1', label: 'Công nghệ thông tin', state: 'empty' }, { id: 'urgent-actions-2', label: 'Quản trị kinh doanh', state: 'empty' }] })
  })
  it('exposes academic references unchanged and tracks replacements without recreating the array', () => {
    const { result, rerender } = renderHook(() => useWorkspaceAccess())
    expect(result.current.departments).toBe(departments)
    rerender()
    expect(result.current.departments).toBe(departments)
    const renamed = [{ ...departments[0], name: 'Tên mới' }, departments[1]]
    state.academic.academic = { ...snapshot(), departments: renamed }
    rerender()
    expect(result.current.departments).toBe(renamed)
  })
  it('keeps the empty department fallback stable across context recomputation', () => {
    state.academic.academic = null
    const { result, rerender } = renderHook(() => useWorkspaceAccess())
    const empty = result.current.departments
    expect(empty).toEqual([])
    state.academic.academic = snapshot()
    state.academic.academic.departments = []
    rerender()
    state.academic.academic = null
    rerender()
    expect(result.current.departments).toBe(empty)
  })
  it('loads once per real department context change and never loops after render or view updates', async () => {
    const { rerender } = render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await screen.findByText('Không có việc cần làm.')
    expect(loader).toHaveBeenCalledTimes(1)
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({ departments, departmentIds: [1, 2] }))
    fireEvent.click(screen.getByRole('button', { name: 'Theo tháng' }))
    rerender(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    expect(loader).toHaveBeenCalledTimes(1)
    const renamed = [{ ...departments[0], name: 'Tên mới' }, departments[1]]
    state.academic.academic = { ...snapshot(), departments: renamed }
    rerender(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2))
    await screen.findByText('Không có việc cần làm.')
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({ departments: renamed }))
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
