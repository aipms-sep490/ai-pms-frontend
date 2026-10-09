import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProjectReviewPage } from './ProjectReviewPage'

const hook = vi.hoisted(() => ({ useProjectReview: vi.fn() }))
const academic = vi.hoisted(() => ({ useAcademicStructure: vi.fn() }))
vi.mock('../hooks/useProjectReview', () => hook)
vi.mock('../../academic/hooks/useAcademicStructure', () => academic)
afterEach(cleanup)

const reviewState = (overrides: Record<string, unknown> = {}) => ({
  queue: { items: [], page: 1, pageSize: 20, totalCount: 0 },
  project: { code: 'P-1', title: 'Interdisciplinary project', teamName: 'Team Alpha', status: 'UnderReview', description: 'Real API description', proposalSource: 'STUDENT_PROPOSAL' },
  detail: {
    academicScope: { projectMode: 'INTERDISCIPLINARY', leadDepartmentId: 5, primaryMajorId: null, requirements: [{ majorId: 7, minMembers: 1, maxMembers: 2, responsibility: 'Data' }] },
    latestSubmission: {
      id: 8,
      evidence: {
        scope: { projectMode: 'INTERDISCIPLINARY', leadDepartmentId: 5, primaryMajorId: null, requirements: [] },
        policy: { minMembers: 3, maxMembers: 5, minDistinctMajors: 2 },
        members: [{ userId: 9, fullName: 'Student One', majorId: 7, isLeader: true }],
        departmentIds: [5, 6],
      },
      decisions: [{ departmentId: 5, decision: 'PENDING', reason: null }, { departmentId: 6, decision: 'PENDING', reason: null }],
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

it('keeps requirements read-only on an ACTIVE project according to the backend lock rule', () => {
  academic.useAcademicStructure.mockReturnValue({ hierarchy: [], departments: [], majors: [], loading: false, error: null })
  hook.useProjectReview.mockReturnValue(reviewState({ workflow: { status: 'ACTIVE' } }))
  detailPage()
  expect(screen.queryByRole('button', { name: /Cấu hình requirements|Chỉnh sửa requirements/ })).toBeNull()
  expect(screen.getByText('Yêu cầu nhân sự chỉ được chỉnh ở bản nháp hoặc khi đã yêu cầu sửa đề cương.')).toBeTruthy()
})

describe('ProjectReviewPage', () => {
  beforeEach(() => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    academic.useAcademicStructure.mockReturnValue({ hierarchy: [{
      organization: {}, departments: [
        { department: { id: 5, name: 'Software Engineering', code: 'SE' }, majors: [{ id: 7, name: 'Software Engineering', code: 'SE' }] },
        { department: { id: 6, name: 'Business Administration', code: 'BA' }, majors: [{ id: 8, name: 'Business Administration', code: 'BA' }] },
      ],
    }] })
  })

  it('renders the server snapshot, scope, roster, participating decisions, and history', () => {
    hook.useProjectReview.mockReturnValue(reviewState())
    detailPage()
    expect(screen.getByRole('heading', { name: /Interdisciplinary project/ })).toBeTruthy()
    expect(screen.getByText('Liên ngành')).toBeTruthy()
    expect(screen.getByText(/Student One/)).toBeTruthy()
    expect(screen.getAllByText('Software Engineering (SE)').length).toBeGreaterThan(0)
    expect(screen.getByText((_, element) => element?.tagName === 'P' && (element.textContent?.startsWith('Đã nộp đề cương → Đang thẩm định') ?? false))).toBeTruthy()
    expect(screen.getByText('Đề xuất của sinh viên')).toBeTruthy()
  })

  it('renders only canonical published-topic provenance from ProjectDto', () => {
    hook.useProjectReview.mockReturnValue(reviewState({ project: { code: 'P-1', title: 'Interdisciplinary project', teamName: 'Team Alpha', proposalSource: 'PUBLISHED_TOPIC', topicId: 42, selectedTopic: { id: 42, code: 'TOP-42', title: 'Secure AI' } } }))
    detailPage()
    expect(screen.getByText(/Đề tài đã công bố/).textContent).toContain('#42 · TOP-42 — Secure AI')
  })

  it('renders a SINGLE_MAJOR scope without cross-department panel or action', () => {
    const state = reviewState({
      detail: {
        academicScope: { projectMode: 'SINGLE_MAJOR', leadDepartmentId: 5, primaryMajorId: 7, requirements: [] },
        latestSubmission: {
          id: 8,
          evidence: {
            scope: { projectMode: 'SINGLE_MAJOR', leadDepartmentId: 5, primaryMajorId: 7, requirements: [] },
            policy: { minMembers: 3, maxMembers: 5, minDistinctMajors: 1 },
            members: [{ userId: 9, fullName: 'Student One', majorId: 7, isLeader: true }],
            departmentIds: [5],
          },
          decisions: [],
        },
      },
    })
    hook.useProjectReview.mockReturnValue(state)
    detailPage()
    expect(screen.getByText('Một ngành')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Ý kiến các bộ môn tham gia' })).toBeNull()
    expect(screen.queryByText('Chấp thuận đề cương')).toBeNull()
  })

  it('renders decisions only when Backend actions permit them and requires a revision reason', async () => {
    const state = reviewState({ canRequestRevision: true, canApproveDepartment: true, canApprove: false })
    hook.useProjectReview.mockReturnValue(state)
    detailPage()
    expect(screen.queryByText('Phê duyệt đề cương')).toBeNull()
    fireEvent.click(screen.getByText('Yêu cầu chỉnh sửa'))
    expect(screen.getByRole('status').textContent).toContain('bắt buộc')
    fireEvent.change(screen.getByPlaceholderText(/lý do/i), { target: { value: 'Need supporting evidence' } })
    fireEvent.click(screen.getByText('Yêu cầu chỉnh sửa'))
    expect(state.decide).toHaveBeenCalledWith('revision', 'Need supporting evidence')
    fireEvent.click(screen.getByText('Chấp thuận đề cương'))
    expect(state.decideParticipatingDepartment).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ghi nhận đồng ý' }))
    await waitFor(() => expect(state.decideParticipatingDepartment).toHaveBeenCalledWith('APPROVED', 'Need supporting evidence'))
  })

  it('requires a reason and confirmation before a participating Department rejection', async () => {
    const state = reviewState({ canRejectDepartment: true })
    hook.useProjectReview.mockReturnValue(state)
    detailPage()
    fireEvent.click(screen.getByText('Không chấp thuận'))
    expect(screen.getByRole('status').textContent).toContain('bắt buộc')
    expect(state.decideParticipatingDepartment).not.toHaveBeenCalled()
    fireEvent.change(screen.getByPlaceholderText(/lý do/i), { target: { value: 'Quota evidence is missing' } })
    fireEvent.click(screen.getByText('Không chấp thuận'))
    expect(state.decideParticipatingDepartment).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ghi nhận từ chối' }))
    await waitFor(() => expect(state.decideParticipatingDepartment).toHaveBeenCalledWith('REJECTED', 'Quota evidence is missing'))
    expect(globalThis.confirm).not.toHaveBeenCalled()
  })

  it('keeps 401, 403, conflict, and empty queue distinct', () => {
    hook.useProjectReview.mockReturnValue(reviewState({ isUnauthorized: true }))
    detailPage()
    expect(screen.getByText(/Đăng nhập lại/)).toBeTruthy()
    cleanup()
    hook.useProjectReview.mockReturnValue(reviewState({ isForbidden: true }))
    detailPage()
    expect(screen.getByText(/không có quyền thẩm định/)).toBeTruthy()
    cleanup()
    hook.useProjectReview.mockReturnValue(reviewState({ error: { message: 'Dữ liệu review vừa thay đổi.' } }))
    detailPage()
    expect(screen.getByRole('alert')).toBeTruthy()
    cleanup()
    hook.useProjectReview.mockReturnValue(reviewState())
    render(<MemoryRouter initialEntries={['/department/projects/review']}><Routes><Route path="/department/projects/review" element={<ProjectReviewPage />} /></Routes></MemoryRouter>)
    expect(screen.getByText(/Không có đề cương/)).toBeTruthy()
  })

  it('presents final approval only after every current participating decision is approved', () => {
    const approved = reviewState({
      canApprove: true,
      detail: {
        academicScope: { projectMode: 'INTERDISCIPLINARY', leadDepartmentId: 5, primaryMajorId: null, requirements: [] },
        latestSubmission: {
          id: 8,
          evidence: { scope: {}, policy: { minMembers: 3, maxMembers: 5, minDistinctMajors: 2 }, members: [], departmentIds: [5, 6] },
          decisions: [{ departmentId: 5, decision: 'APPROVED' }, { departmentId: 6, decision: 'APPROVED' }],
        },
      },
    })
    hook.useProjectReview.mockReturnValue(approved)
    detailPage()
    expect(screen.getByText('Phê duyệt đề cương')).toBeTruthy()
    cleanup()

    hook.useProjectReview.mockReturnValue(reviewState({ canApprove: true }))
    detailPage()
    expect(screen.queryByText('Phê duyệt đề cương')).toBeNull()
    expect(screen.getByText(/Chỉ có thể phê duyệt cuối/)).toBeTruthy()
  })
})
