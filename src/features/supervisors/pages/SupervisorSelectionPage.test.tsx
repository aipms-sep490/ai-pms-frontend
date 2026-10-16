import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SupervisorSelectionPage } from './SupervisorSelectionPage'

const journey = vi.hoisted(() => ({ useStudentJourney: vi.fn() }))
const selection = vi.hoisted(() => ({ useSupervisorSelection: vi.fn() }))
vi.mock('../../../app/context', () => journey)
vi.mock('../hooks/useSupervisorSelection', () => selection)
afterEach(() => { cleanup(); vi.clearAllMocks() })

const state = (overrides: Record<string, unknown> = {}) => ({
  candidates: [{ id: 4, fullName: 'Dr Nguyen', departmentName: 'SE', bio: null, expertise: [{ name: 'AI' }], activeProjects: 1, remainingSlots: 2, semesterLimit: 5 }],
  requests: [], assignments: [], activeAssignment: null, loading: false, candidateLoading: false, sendRequestPending: false, cancelPending: null, error: null,
  query: { search: '', expertise: '' }, setQuery: vi.fn(), applyFilters: vi.fn(), refresh: vi.fn(), send: vi.fn().mockResolvedValue(true), cancel: vi.fn(), canSend: true, canSendMentor: false, missingMentorMajorIds: [], isLeader: true, ...overrides,
})
const currentJourney = { project: { id: 9, code: 'P-9', title: 'Project', status: 'Approved', majors: [] }, team: {}, profile: { id: 2 }, projectActions: {}, refreshAll: vi.fn(), isLoading: false }

describe('SupervisorSelectionPage', () => {
  it('renders only project-specific candidates and sends an explicit user-selected request', async () => {
    const hook = state()
    journey.useStudentJourney.mockReturnValue(currentJourney)
    selection.useSupervisorSelection.mockReturnValue(hook)
    render(<MemoryRouter><SupervisorSelectionPage /></MemoryRouter>)
    expect(screen.getByText('Dr Nguyen')).toBeTruthy()
    expect(screen.getByText(/Tìm giảng viên phù hợp/)).toBeTruthy()
    fireEvent.click(screen.getByText('Chọn giảng viên'))
    fireEvent.click(screen.getByText('Gửi yêu cầu'))
    expect(hook.send).toHaveBeenCalledWith(hook.candidates[0], '', 'PRIMARY', undefined)
    fireEvent.click(screen.getByText('Lọc danh sách'))
    expect(hook.applyFilters).toHaveBeenCalledTimes(1)
  })

  it('keeps member request controls disabled and presents Backend 403 distinctly', () => {
    journey.useStudentJourney.mockReturnValue(currentJourney)
    selection.useSupervisorSelection.mockReturnValue(state({ canSend: false, isLeader: false, error: { kind: 'forbidden', message: 'Hệ thống từ chối quyền hoặc phạm vi đồ án.' } }))
    render(<MemoryRouter><SupervisorSelectionPage /></MemoryRouter>)
    expect(screen.getByRole('alert').textContent).toContain('Hệ thống từ chối quyền')
    expect(screen.getByText(/chưa thể gửi yêu cầu hướng dẫn/)).toBeTruthy()
  })
})

it('shows the request name even when the invited lecturer is absent from candidates and assignments', () => {
  journey.useStudentJourney.mockReturnValue(currentJourney)
  selection.useSupervisorSelection.mockReturnValue(state({ candidates: [], requests: [{ id: 1, supervisorProfileId: 6, supervisorName: 'V5 IT Evaluator', status: 'PENDING', requestedAt: '2026-10-16T06:26:00' }] }))
  render(<MemoryRouter><SupervisorSelectionPage /></MemoryRouter>)
  expect(screen.getByText(/V5 IT Evaluator/)).toBeTruthy()
  expect(screen.queryByText(/Giảng viên #6/)).toBeNull()
})

it('uses the assignment name and formatted dates in request history, without inactive search controls', () => {
  journey.useStudentJourney.mockReturnValue(currentJourney)
  const assignment = { supervisorProfileId: 4, supervisorName: 'Nguyễn Mai', assignedAt: '2026-09-12T09:00:00' }
  selection.useSupervisorSelection.mockReturnValue(state({ canSend: false, assignments: [assignment], activeAssignment: assignment, requests: [{ id: 1, supervisorProfileId: 4, status: 'ACCEPTED', requestedAt: '2026-09-10T09:00:00' }] }))
  render(<MemoryRouter><SupervisorSelectionPage /></MemoryRouter>)
  expect(screen.getAllByText(/Nguyễn Mai/).length).toBe(2)
  expect(screen.queryByText(/T09:00/)).toBeNull()
  expect(screen.queryByLabelText('Tìm giảng viên')).toBeNull()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Giảng viên hướng dẫn')
  expect(screen.queryByText(/Tìm giảng viên phù hợp/)).toBeNull()
})

it('lets the leader pick which open slot to invite a candidate for when a mentor is also missing', () => {
  const assignment = { supervisorProfileId: 4, supervisorName: 'Nguyễn Mai', assignedAt: '2026-09-12T09:00:00' }
  journey.useStudentJourney.mockReturnValue({ ...currentJourney, project: { ...currentJourney.project, majors: [{ majorId: 7, majorCode: 'AI', majorName: 'Trí tuệ nhân tạo' }] } })
  const hook = state({ activeAssignment: assignment, assignments: [assignment], canSendMentor: true, missingMentorMajorIds: [7] })
  selection.useSupervisorSelection.mockReturnValue(hook)
  render(<MemoryRouter><SupervisorSelectionPage /></MemoryRouter>)
  expect(screen.getByText('Mentor — Trí tuệ nhân tạo')).toBeTruthy()
  fireEvent.click(screen.getByText('Chọn giảng viên'))
  fireEvent.click(screen.getByText('Gửi yêu cầu'))
  expect(hook.send).toHaveBeenCalledWith(hook.candidates[0], '', 'DISCIPLINE_MENTOR', 7)
})
