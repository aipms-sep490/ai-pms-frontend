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
  query: { search: '', expertise: '' }, setQuery: vi.fn(), refresh: vi.fn(), send: vi.fn().mockResolvedValue(true), cancel: vi.fn(), canSend: true, isLeader: true, ...overrides,
})
const currentJourney = { project: { id: 9, code: 'P-9', title: 'Project', status: 'Approved' }, team: {}, profile: { id: 2 }, projectActions: {}, refreshAll: vi.fn(), isLoading: false }

describe('SupervisorSelectionPage', () => {
  it('renders only project-specific candidates and sends an explicit user-selected request', async () => {
    const hook = state()
    journey.useStudentJourney.mockReturnValue(currentJourney)
    selection.useSupervisorSelection.mockReturnValue(hook)
    render(<MemoryRouter><SupervisorSelectionPage /></MemoryRouter>)
    expect(screen.getByText('Dr Nguyen')).toBeTruthy()
    expect(screen.getByText(/không dùng Supervisor Directory chung/)).toBeTruthy()
    fireEvent.click(screen.getByText('Chọn candidate'))
    fireEvent.click(screen.getByText('Gửi yêu cầu'))
    expect(hook.send).toHaveBeenCalledWith(hook.candidates[0], '')
  })

  it('keeps member request controls disabled and presents Backend 403 distinctly', () => {
    journey.useStudentJourney.mockReturnValue(currentJourney)
    selection.useSupervisorSelection.mockReturnValue(state({ canSend: false, isLeader: false, error: { kind: 'forbidden', message: 'Backend từ chối quyền hoặc phạm vi Project.' } }))
    render(<MemoryRouter><SupervisorSelectionPage /></MemoryRouter>)
    expect(screen.getByRole('alert').textContent).toContain('Backend từ chối quyền')
    expect(screen.getByText(/Backend chưa cho phép/)).toBeTruthy()
  })
})
