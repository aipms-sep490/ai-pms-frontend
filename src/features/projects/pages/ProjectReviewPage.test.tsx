import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProjectReviewPage } from './ProjectReviewPage'

const hook = vi.hoisted(() => ({ useProjectReview: vi.fn() }))
vi.mock('../hooks/useProjectReview', () => hook)
afterEach(cleanup)

const reviewState = (overrides: Record<string, unknown> = {}) => ({
  queue: { items: [], page: 1, pageSize: 20, totalCount: 0 },
  project: { code: 'P-1', title: 'Interdisciplinary project', teamName: 'Team Alpha', status: 'UnderReview', description: 'Real API description' },
  detail: {
    academicScope: { projectMode: 'INTERDISCIPLINARY', leadDepartmentId: 5, primaryMajorId: null, requirements: [{ majorId: 7, minMembers: 1, maxMembers: 2, responsibility: 'Data' }] },
    latestSubmission: {
      id: 8,
      evidence: {
        scope: { projectMode: 'INTERDISCIPLINARY', leadDepartmentId: 5, primaryMajorId: null, requirements: [] },
        policy: { minMembers: 3, maxMembers: 5, minDistinctMajors: 2 },
        members: [{ userId: 9, fullName: 'Student One', majorId: 7, isLeader: true }],
      },
      decisions: [{ departmentId: 5, decision: 'PENDING', reason: null }],
    },
  },
  history: [{ oldStatus: 'Submitted', newStatus: 'UnderReview', changedByName: 'Staff', reason: null, changedAt: '2026-09-15' }],
  workflow: { status: 'UnderReview' }, error: null, loading: false, pending: null,
  refresh: vi.fn(), setSearch: vi.fn(), goToPage: vi.fn(), beginReview: vi.fn().mockResolvedValue(true), decide: vi.fn().mockResolvedValue(true), decideParticipatingDepartment: vi.fn().mockResolvedValue(true),
  canStart: false, canRequestRevision: false, canApprove: false, canReject: false, canApproveDepartment: false, canRejectDepartment: false,
  isUnauthorized: false, isForbidden: false,
  ...overrides,
})

const detailPage = () => render(<MemoryRouter initialEntries={['/department/projects/review/1']}><Routes><Route path="/department/projects/review/:id" element={<ProjectReviewPage />} /></Routes></MemoryRouter>)

describe('ProjectReviewPage', () => {
  beforeEach(() => vi.stubGlobal('confirm', vi.fn(() => true)))

  it('renders the server snapshot, scope, roster, participating decisions, and history', () => {
    hook.useProjectReview.mockReturnValue(reviewState())
    detailPage()
    expect(screen.getByRole('heading', { name: /Interdisciplinary project/ })).toBeTruthy()
    expect(screen.getByText('INTERDISCIPLINARY')).toBeTruthy()
    expect(screen.getByText(/Student One/)).toBeTruthy()
    expect(screen.getAllByText((_, element) => element?.textContent === 'Department #5: PENDING').length).toBeGreaterThan(0)
    expect(screen.getByText((_, element) => element?.textContent?.startsWith('Submitted → UnderReview') ?? false)).toBeTruthy()
  })

  it('renders a SINGLE_MAJOR scope without inventing participating Department decisions', () => {
    const state = reviewState({
      detail: {
        academicScope: { projectMode: 'SINGLE_MAJOR', leadDepartmentId: 5, primaryMajorId: 7, requirements: [] },
        latestSubmission: {
          id: 8,
          evidence: {
            scope: { projectMode: 'SINGLE_MAJOR', leadDepartmentId: 5, primaryMajorId: 7, requirements: [] },
            policy: { minMembers: 3, maxMembers: 5, minDistinctMajors: 1 },
            members: [{ userId: 9, fullName: 'Student One', majorId: 7, isLeader: true }],
          },
          decisions: [],
        },
      },
    })
    hook.useProjectReview.mockReturnValue(state)
    detailPage()
    expect(screen.getByText('SINGLE_MAJOR')).toBeTruthy()
    expect(screen.getByText(/Không có participating department decision/)).toBeTruthy()
  })

  it('renders decisions only when Backend actions permit them and requires a revision reason', () => {
    const state = reviewState({ canRequestRevision: true, canApproveDepartment: true, canApprove: false })
    hook.useProjectReview.mockReturnValue(state)
    detailPage()
    expect(screen.queryByText('Approve project')).toBeNull()
    fireEvent.click(screen.getByText('Request revision'))
    expect(screen.getByRole('status').textContent).toContain('bắt buộc')
    fireEvent.change(screen.getByPlaceholderText(/Lý do/), { target: { value: 'Need supporting evidence' } })
    fireEvent.click(screen.getByText('Request revision'))
    expect(state.decide).toHaveBeenCalledWith('revision', 'Need supporting evidence')
    fireEvent.click(screen.getByText('Approve as participating department'))
    expect(state.decideParticipatingDepartment).toHaveBeenCalledWith('APPROVED', 'Need supporting evidence')
  })

  it('keeps 401, 403, conflict, and empty queue distinct', () => {
    hook.useProjectReview.mockReturnValue(reviewState({ isUnauthorized: true }))
    detailPage()
    expect(screen.getByText(/Đăng nhập lại/)).toBeTruthy()
    cleanup()
    hook.useProjectReview.mockReturnValue(reviewState({ isForbidden: true }))
    detailPage()
    expect(screen.getByText(/Department scope/)).toBeTruthy()
    cleanup()
    hook.useProjectReview.mockReturnValue(reviewState({ error: { message: 'Dữ liệu review vừa thay đổi.' } }))
    detailPage()
    expect(screen.getByRole('alert')).toBeTruthy()
    cleanup()
    hook.useProjectReview.mockReturnValue(reviewState())
    render(<MemoryRouter initialEntries={['/department/projects/review']}><Routes><Route path="/department/projects/review" element={<ProjectReviewPage />} /></Routes></MemoryRouter>)
    expect(screen.getByText(/Không có project/)).toBeTruthy()
  })
})
