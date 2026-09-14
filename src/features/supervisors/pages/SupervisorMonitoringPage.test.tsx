import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SupervisorMonitoringPage } from './SupervisorMonitoringPage'

const hook = vi.hoisted(() => ({ useSupervisors: vi.fn() }))

vi.mock('../hooks/useSupervisors', () => hook)

afterEach(cleanup)

const supervisor = {
  id: 4,
  userId: 14,
  fullName: 'Dr. Lan Nguyen',
  departmentId: 2,
  departmentName: 'Computer Science',
  bio: 'Distributed systems researcher.',
  isAvailable: true,
  expertise: [{ name: 'AI', proficiencyLevel: 'Advanced' }],
}

const state = (overrides = {}) => ({
  items: [supervisor],
  page: 1,
  pageSize: 20,
  totalCount: 1,
  current: null,
  filters: { page: 1, pageSize: 20 },
  setFilters: vi.fn(),
  loading: false,
  error: null,
  refresh: vi.fn(),
  isUnauthorized: false,
  isForbidden: false,
  ...overrides,
})

function page(path = '/department/supervisors') {
  return render(<MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/department/supervisors" element={<SupervisorMonitoringPage />} />
      <Route path="/department/supervisors/:id" element={<SupervisorMonitoringPage />} />
    </Routes>
  </MemoryRouter>)
}

beforeEach(() => hook.useSupervisors.mockReturnValue(state()))

describe('SupervisorMonitoringPage', () => {
  it('renders backend-scoped identity, department, expertise, and availability', () => {
    page()
    expect(screen.getByText('Dr. Lan Nguyen')).toBeTruthy()
    expect(screen.getByText(/Computer Science.*Available/)).toBeTruthy()
    expect(screen.getByText('AI')).toBeTruthy()
  })

  it('passes supported filters to the hook state', () => {
    const current = state()
    hook.useSupervisors.mockReturnValue(current)
    page()
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'Lan' } })
    fireEvent.change(screen.getByPlaceholderText('Department ID'), { target: { value: '2' } })
    fireEvent.change(screen.getByPlaceholderText('Expertise'), { target: { value: 'AI' } })
    fireEvent.change(screen.getByLabelText('Availability'), { target: { value: 'true' } })
    expect(current.setFilters).toHaveBeenLastCalledWith(expect.objectContaining({ isAvailable: true, page: 1 }))
    expect(current.setFilters).toHaveBeenCalledWith(expect.objectContaining({ search: 'Lan' }))
    expect(current.setFilters).toHaveBeenCalledWith(expect.objectContaining({ departmentId: 2 }))
    expect(current.setFilters).toHaveBeenCalledWith(expect.objectContaining({ expertise: 'AI' }))
  })

  it('renders loading, empty, auth, forbidden, and retry states', () => {
    hook.useSupervisors.mockReturnValue(state({ loading: true }))
    const rendered = page()
    expect(screen.getByText(/Đang tải/)).toBeTruthy()
    rendered.unmount()

    hook.useSupervisors.mockReturnValue(state({ items: [] }))
    page()
    expect(screen.getByText('Không có supervisor.')).toBeTruthy()
    cleanup()

    hook.useSupervisors.mockReturnValue(state({ isUnauthorized: true }))
    page()
    expect(screen.getByText('Đăng nhập')).toBeTruthy()
    cleanup()

    hook.useSupervisors.mockReturnValue(state({ isForbidden: true }))
    page()
    expect(screen.getByText(/Department scope/)).toBeTruthy()
    cleanup()

    const current = state({ error: new Error('failure') })
    hook.useSupervisors.mockReturnValue(current)
    page()
    fireEvent.click(screen.getByText('Thử lại'))
    expect(current.refresh).toHaveBeenCalledOnce()
  })

  it('renders the supported detail fields', () => {
    hook.useSupervisors.mockReturnValue(state({ current: supervisor }))
    page('/department/supervisors/4')
    expect(screen.getByRole('heading', { name: 'Dr. Lan Nguyen' })).toBeTruthy()
    expect(screen.getByText('Distributed systems researcher.')).toBeTruthy()
    expect(screen.getByText('AI (Advanced)')).toBeTruthy()
  })
})
