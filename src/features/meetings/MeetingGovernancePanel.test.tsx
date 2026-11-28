import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import type { ExecutionAccess } from '../execution/context/ExecutionAccessContext'
import type { MilestoneDto, TaskDto } from '../../types/backend'
import type { MeetingCandidate, MeetingDetail } from './meeting-types'
import { MeetingGovernancePanel } from './MeetingGovernancePanel'

const api = vi.hoisted(() => ({
  getMeetingDecisions: vi.fn(),
  getMeetingActionItems: vi.fn(),
  createMeetingDecision: vi.fn(),
  createMeetingActionItem: vi.fn(),
  updateMeetingActionItem: vi.fn(),
}))

const tasksApi = vi.hoisted(() => ({
  createTask: vi.fn(),
  getTask: vi.fn(),
}))

const milestonesApi = vi.hoisted(() => ({
  getProjectMilestones: vi.fn(),
}))

const governanceApi = vi.hoisted(() => ({
  getProjectActionItems: vi.fn(),
  createProjectActionItem: vi.fn(),
  updateProjectActionItem: vi.fn(),
  updateProjectActionItemStatus: vi.fn(),
}))

vi.mock('../../services/api/meetings.api', () => api)
vi.mock('../projects/api/project-governance-api', () => governanceApi)
vi.mock('../../services/api/tasks.api', () => tasksApi)
vi.mock('../../services/api/milestones.api', () => milestonesApi)

const meeting: MeetingDetail = {
  id: 70007,
  projectId: 90005,
  title: 'Họp rà soát kiến trúc hệ thống',
  agenda: 'Thống nhất API và kiến trúc CIB',
  meetingNotes: null,
  startAt: '2026-11-18T09:00:00Z',
  endAt: '2026-11-18T10:00:00Z',
  location: 'Phòng 401',
  onlineUrl: null,
  status: 'SCHEDULED',
  createdBy: 10,
  createdByName: 'Trần Văn A',
  createdAt: '2026-11-17T08:00:00Z',
  updatedAt: '2026-11-17T08:00:00Z',
  concurrencyToken: 'token-meet-70007',
  participants: [
    {
      id: 1,
      meetingId: 70007,
      userId: 10,
      fullName: 'Trần Văn A',
      email: 'a@example.com',
      attendanceStatus: 'ACCEPTED',
      createdAt: '2026-11-17T08:00:00Z',
      updatedAt: '2026-11-17T08:00:00Z',
    },
    {
      id: 2,
      meetingId: 70007,
      userId: 20,
      fullName: 'Nguyễn Văn B',
      email: 'b@example.com',
      attendanceStatus: 'ACCEPTED',
      createdAt: '2026-11-17T08:00:00Z',
      updatedAt: '2026-11-17T08:00:00Z',
    },
  ],
  feedbacks: [],
}

const candidates: MeetingCandidate[] = [
  { userId: 10, fullName: 'Trần Văn A', role: 'Trưởng nhóm' },
  { userId: 20, fullName: 'Nguyễn Văn B', role: 'Thành viên' },
  { userId: 99, fullName: 'TS. Nguyễn Hướng Dẫn', role: 'Giảng viên hướng dẫn' },
]

const sampleMilestones: MilestoneDto[] = [
  {
    id: 301,
    projectId: 90005,
    title: 'Giai đoạn 1: Thiết kế kiến trúc',
    status: 'IN_PROGRESS',
    sortOrder: 1,
    createdBy: 10,
    createdByFullName: 'Trần Văn A',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 302,
    projectId: 90005,
    title: 'Giai đoạn 2: Hiện thực hóa tính năng',
    status: 'PLANNED',
    sortOrder: 2,
    createdBy: 10,
    createdByFullName: 'Trần Văn A',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
]

function renderPanel({
  canManage = true,
  disabled = false,
  actor = 'supervisor' as const,
  onChanged = vi.fn(),
} = {}) {
  const access: ExecutionAccess = {
    project: { id: 90005, teamId: 501, title: 'AI Project Management', status: 'ACTIVE' } as ExecutionAccess['project'],
    actor,
    canManageStructure: true,
    readOnly: false,
    routeBase: actor === 'supervisor' ? '/supervisor/projects/90005' : '/project',
    team: ({
      id: 501,
      name: 'Team Alpha',
      members: [
        { userId: 10, role: 'LEADER', isLeader: true, joinedAt: '2026-09-01T00:00:00Z' },
        { userId: 20, role: 'MEMBER', isLeader: false, joinedAt: '2026-09-01T00:00:00Z' },
      ],
    } as unknown) as ExecutionAccess['team'],
  }

  return render(
    <MemoryRouter>
      <ExecutionAccessProvider value={access}>
        <MeetingGovernancePanel
          meeting={meeting}
          concurrencyToken={meeting.concurrencyToken!}
          candidates={candidates}
          canManage={canManage}
          disabled={disabled}
          onChanged={onChanged}
        />
      </ExecutionAccessProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  // Set system time: 2026-11-18 10:00:00 UTC (17:00:00 Vietnam time UTC+7)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-18T10:00:00.000Z'))

  vi.resetAllMocks()
  api.getMeetingDecisions.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  api.getMeetingActionItems.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  governanceApi.getProjectActionItems.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  milestonesApi.getProjectMilestones.mockResolvedValue(sampleMilestones)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('MeetingGovernancePanel: Deadline Validation (ISSUE-02)', () => {
  it('renders datetime-local input with min constraint', async () => {
    renderPanel()
    await screen.findByRole('heading', { name: 'Kết luận và công việc sau họp' })

    fireEvent.click(screen.getByRole('button', { name: 'Thêm công việc' }))
    const dueInput = screen.getByLabelText(/Hạn hoàn thành/) as HTMLInputElement

    expect(dueInput.type).toBe('datetime-local')
    expect(dueInput.min).toBe('2026-11-18T17:00')
  })

  it('rejects a past deadline with inline error and blocks submission', async () => {
    renderPanel()
    await screen.findByRole('heading', { name: 'Kết luận và công việc sau họp' })

    fireEvent.click(screen.getByRole('button', { name: 'Thêm công việc' }))
    fireEvent.change(screen.getByLabelText('Công việc', { exact: true }), { target: { value: 'Nộp báo cáo tuần' } })

    // Enter a past date (16/11/2026)
    const dueInput = screen.getByLabelText(/Hạn hoàn thành/)
    fireEvent.change(dueInput, { target: { value: '2026-11-16T12:00' } })

    // Inline error appears immediately
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(
      'Hạn hoàn thành phải lớn hơn thời điểm hiện tại. Vui lòng chọn ngày và giờ trong tương lai.'
    )

    // Submit button is disabled
    const submitBtn = screen.getByRole('button', { name: 'Tạo công việc' }) as HTMLButtonElement
    expect(submitBtn.disabled).toBe(true)

    // Form submission does not trigger API
    fireEvent.submit(submitBtn.closest('form')!)
    expect(api.createMeetingActionItem).not.toHaveBeenCalled()
    expect(tasksApi.createTask).not.toHaveBeenCalled()
  })

  it('rejects the exact current minute as past/non-future', async () => {
    renderPanel()
    await screen.findByRole('heading', { name: 'Kết luận và công việc sau họp' })

    fireEvent.click(screen.getByRole('button', { name: 'Thêm công việc' }))
    fireEvent.change(screen.getByLabelText(/Hạn hoàn thành/), { target: { value: '2026-11-18T17:00' } })

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(
      'Hạn hoàn thành phải lớn hơn thời điểm hiện tại. Vui lòng chọn ngày và giờ trong tương lai.'
    )
  })

  it('clears error and enables submit when selecting a future date and time', async () => {
    governanceApi.createProjectActionItem.mockResolvedValue({
      id: 101,
      projectId: 90005,
      sourceType: 'MEETING',
      meetingId: 70007,
      title: 'Hoàn thiện tài liệu kiến trúc',
      description: null,
      ownerId: null,
      taskId: null,
      milestoneId: null,
      dueAt: '2026-11-19T03:00:00.000Z',
      status: 'TODO',
      concurrencyToken: 'token-act-1',
      createdBy: 10,
      createdAt: '2026-11-18T10:00:00Z',
      updatedAt: '2026-11-18T10:00:00Z',
    })

    renderPanel()
    await screen.findByRole('heading', { name: 'Kết luận và công việc sau họp' })

    fireEvent.click(screen.getByRole('button', { name: 'Thêm công việc' }))
    fireEvent.change(screen.getByLabelText('Công việc', { exact: true }), { target: { value: 'Hoàn thiện tài liệu kiến trúc' } })

    // Uncheck create task for simple action item test
    fireEvent.click(screen.getByRole('checkbox', { name: /Đồng thời tạo Task/ }))

    // First type past date
    fireEvent.change(screen.getByLabelText(/Hạn hoàn thành/), { target: { value: '2026-11-16T12:00' } })
    expect(await screen.findByRole('alert')).toBeTruthy()

    // Then update to future date (tomorrow 10:00 AM VN)
    fireEvent.change(screen.getByLabelText(/Hạn hoàn thành/), { target: { value: '2026-11-19T10:00' } })
    expect(screen.queryByRole('alert')).toBeNull()

    const submitBtn = screen.getByRole('button', { name: 'Tạo công việc' }) as HTMLButtonElement
    expect(submitBtn.disabled).toBe(false)

    fireEvent.submit(submitBtn.closest('form')!)

    await waitFor(() => {
      expect(governanceApi.createProjectActionItem).toHaveBeenCalledWith(
        90005,
        expect.objectContaining({
          sourceType: 'MEETING',
          meetingId: 70007,
          title: 'Hoàn thiện tài liệu kiến trúc',
          dueAt: '2026-11-19T03:00:00.000Z',
        })
      )
    })
  })

  it('allows historical action items with past deadlines to change status without blocking', async () => {
    const historicalItem = {
      id: 55,
      projectId: 90005,
      sourceType: 'MEETING',
      meetingId: 70007,
      title: 'Nhiệm vụ tuần trước đã quá hạn',
      description: 'Cần xác nhận hoàn tất',
      ownerId: 10,
      taskId: null,
      milestoneId: null,
      dueAt: '2026-11-10T10:00:00.000Z', // past date
      status: 'TODO' as const,
      concurrencyToken: 'token-55',
      createdBy: 10,
      createdAt: '2026-11-09T08:00:00Z',
      updatedAt: '2026-11-09T08:00:00Z',
    }

    governanceApi.getProjectActionItems.mockResolvedValue({ items: [historicalItem], page: 1, pageSize: 100, totalCount: 1 })
    governanceApi.updateProjectActionItemStatus.mockResolvedValue({ ...historicalItem, status: 'IN_PROGRESS', concurrencyToken: 'token-55-v2' })

    renderPanel()
    await screen.findByText('Nhiệm vụ tuần trước đã quá hạn')

    // Find the status select
    const statusSelect = screen.getByDisplayValue('Chưa bắt đầu')
    fireEvent.change(statusSelect, { target: { value: 'IN_PROGRESS' } })

    await waitFor(() => {
      expect(governanceApi.updateProjectActionItemStatus).toHaveBeenCalledWith(
        90005,
        55,
        'IN_PROGRESS',
        'token-55',
      )
    })

    // No validation error raised
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('MeetingGovernancePanel: Task Creation and Linking (ISSUE-01)', () => {
  it('simultaneously creates a Task and links it to the Action Item via project_action_items FK', async () => {
    const createdTask: TaskDto = {
      id: 888,
      milestoneId: 301,
      title: 'Viết tài liệu API Gateway',
      description: 'Mô tả chi tiết\n\nNguồn: Cuộc họp #70007: Họp rà soát kiến trúc hệ thống',
      status: 'TODO',
      priority: 'HIGH',
      dueAt: '2026-11-20T03:00:00.000Z',
      assignees: [{ id: 1, taskId: 888, userId: 20, userFullName: 'Nguyễn Văn B', assignedBy: 10, assignedAt: '2026-11-18T10:00:00Z' }],
      createdBy: 10,
      createdByFullName: 'Trần Văn A',
      dependencies: [],
      createdAt: '2026-11-18T10:00:00Z',
      updatedAt: '2026-11-18T10:00:00Z',
    }

    const createdActionItem = {
      id: 201,
      projectId: 90005,
      sourceType: 'MEETING',
      meetingId: 70007,
      title: 'Viết tài liệu API Gateway',
      description: 'Mô tả chi tiết',
      ownerId: 20,
      taskId: 888,
      milestoneId: 301,
      dueAt: '2026-11-20T03:00:00.000Z',
      status: 'TODO' as const,
      concurrencyToken: 'token-201',
      createdBy: 10,
      createdAt: '2026-11-18T10:00:00Z',
      updatedAt: '2026-11-18T10:00:00Z',
    }

    tasksApi.createTask.mockResolvedValue(createdTask)
    governanceApi.createProjectActionItem.mockResolvedValue(createdActionItem)

    renderPanel()
    await screen.findByRole('heading', { name: 'Kết luận và công việc sau họp' })

    fireEvent.click(screen.getByRole('button', { name: 'Thêm công việc' }))

    // Fill form
    fireEvent.change(screen.getByLabelText('Công việc', { exact: true }), { target: { value: 'Viết tài liệu API Gateway' } })
    fireEvent.change(screen.getByLabelText(/Hạn hoàn thành/), { target: { value: '2026-11-20T10:00' } })
    fireEvent.change(screen.getByLabelText(/Người phụ trách/), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/Mô tả/), { target: { value: 'Mô tả chi tiết' } })

    // Checkbox is checked by default
    expect((screen.getByRole('checkbox', { name: /Đồng thời tạo Task/ }) as HTMLInputElement).checked).toBe(true)

    // Select milestone & priority
    fireEvent.change(screen.getByLabelText(/Mốc đồ án/), { target: { value: '301' } })
    fireEvent.change(screen.getByLabelText(/Độ ưu tiên/), { target: { value: 'HIGH' } })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Tạo công việc' }))

    await waitFor(() => {
      // 1. Task created with meeting back-link in description
      expect(tasksApi.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneId: 301,
          title: 'Viết tài liệu API Gateway',
          description: expect.stringContaining('Nguồn: Cuộc họp #70007: Họp rà soát kiến trúc hệ thống'),
          priority: 'HIGH',
          dueAt: '2026-11-20T03:00:00.000Z',
          assigneeUserIds: [20],
        })
      )

      // 2. Action item created with real FK taskId & milestoneId
      expect(governanceApi.createProjectActionItem).toHaveBeenCalledWith(
        90005,
        expect.objectContaining({
          sourceType: 'MEETING',
          meetingId: 70007,
          title: 'Viết tài liệu API Gateway',
          description: 'Mô tả chi tiết',
          ownerId: 20,
          taskId: 888,
          milestoneId: 301,
          dueAt: '2026-11-20T03:00:00.000Z',
        })
      )
    })

    // 3. UI displays linked task badge and details
    const badge = await screen.findByText(/Công việc liên kết/)
    expect(badge).toBeTruthy()
    expect(screen.getAllByText('Chưa bắt đầu').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Giai đoạn 1: Thiết kế kiến trúc/).length).toBeGreaterThanOrEqual(1)

    // 4. View Task link points to routeBase/tasks/888
    const viewTaskLink = screen.getByRole('link', { name: /Mở công việc/ }) as HTMLAnchorElement
    expect(viewTaskLink.getAttribute('href')).toBe('/supervisor/projects/90005/tasks/888')

    // 5. Duplicate creation button is NOT present for this linked item
    expect(screen.queryByRole('button', { name: /Tạo Task trên bảng Công việc/ })).toBeNull()
  })

  it('displays linked task when loading existing action item with FK taskId', async () => {
    const existingAction = {
      id: 303,
      projectId: 90005,
      sourceType: 'MEETING',
      meetingId: 70007,
      title: 'Phát triển module xác thực',
      description: 'Cần viết unit test đầy đủ',
      ownerId: 10,
      taskId: 999,
      milestoneId: 301,
      dueAt: '2026-11-25T10:00:00.000Z',
      status: 'TODO' as const,
      concurrencyToken: 'token-303',
      createdBy: 10,
      createdAt: '2026-11-18T08:00:00Z',
      updatedAt: '2026-11-18T08:00:00Z',
    }

    const linkedTaskDto: TaskDto = {
      id: 999,
      milestoneId: 301,
      title: 'Phát triển module xác thực',
      description: 'Cần viết unit test đầy đủ\n\nNguồn: Cuộc họp #70007: Họp rà soát kiến trúc hệ thống',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueAt: '2026-11-25T10:00:00.000Z',
      assignees: [{ id: 1, taskId: 999, userId: 10, userFullName: 'Trần Văn A', assignedBy: 10, assignedAt: '2026-11-18T08:00:00Z' }],
      createdBy: 10,
      createdByFullName: 'Trần Văn A',
      dependencies: [],
      createdAt: '2026-11-18T08:00:00Z',
      updatedAt: '2026-11-18T08:00:00Z',
    }

    governanceApi.getProjectActionItems.mockResolvedValue({ items: [existingAction], page: 1, pageSize: 100, totalCount: 1 })
    tasksApi.getTask.mockResolvedValue(linkedTaskDto)

    renderPanel()

    // Title and clean description
    await screen.findByText('Phát triển module xác thực')
    expect(screen.getByText('Cần viết unit test đầy đủ')).toBeTruthy()

    // Linked task badge and status
    const badge = await screen.findByText(/Công việc liên kết/)
    expect(badge).toBeTruthy()
    expect(screen.getAllByText('Đang thực hiện').length).toBeGreaterThanOrEqual(1)

    // Navigation link
    const link = screen.getByRole('link', { name: /Mở công việc/ })
    expect(link.getAttribute('href')).toBe('/supervisor/projects/90005/tasks/999')
  })

  it('allows creating a Task from an existing unlinked action item', async () => {
    const unlinkedAction = {
      id: 404,
      projectId: 90005,
      sourceType: 'MEETING',
      meetingId: 70007,
      title: 'Khảo sát giải pháp database',
      description: 'Tìm hiểu MongoDB vs PostgreSQL',
      ownerId: 20,
      taskId: null,
      milestoneId: null,
      dueAt: '2026-11-22T10:00:00.000Z',
      status: 'TODO' as const,
      concurrencyToken: 'token-404',
      createdBy: 10,
      createdAt: '2026-11-18T08:00:00Z',
      updatedAt: '2026-11-18T08:00:00Z',
    }

    governanceApi.getProjectActionItems.mockResolvedValue({ items: [unlinkedAction], page: 1, pageSize: 100, totalCount: 1 })

    const createdTask: TaskDto = {
      id: 777,
      milestoneId: 301,
      title: 'Khảo sát giải pháp database',
      description: 'Tìm hiểu MongoDB vs PostgreSQL\n\nNguồn: Cuộc họp #70007: Họp rà soát kiến trúc hệ thống',
      status: 'TODO',
      assignees: [{ id: 2, taskId: 777, userId: 20, userFullName: 'Nguyễn Văn B', assignedBy: 10, assignedAt: '2026-11-18T10:00:00Z' }],
      createdBy: 10,
      createdByFullName: 'Trần Văn A',
      dependencies: [],
      createdAt: '2026-11-18T10:00:00Z',
      updatedAt: '2026-11-18T10:00:00Z',
    }

    tasksApi.createTask.mockResolvedValue(createdTask)
    governanceApi.updateProjectActionItem.mockResolvedValue({
      ...unlinkedAction,
      taskId: 777,
      milestoneId: 301,
      concurrencyToken: 'token-404-v2',
    })

    renderPanel()
    await screen.findByText('Khảo sát giải pháp database')

    // Click "+ Tạo Task trên bảng Công việc"
    const createBtn = screen.getByRole('button', { name: /\+ Tạo Task trên bảng Công việc/ })
    fireEvent.click(createBtn)

    // Inline form appears
    expect(screen.getByRole('group', { name: 'Tạo Task liên kết' })).toBeTruthy()

    // Confirm creation
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo Task' }))

    await waitFor(() => {
      expect(tasksApi.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneId: 301,
          title: 'Khảo sát giải pháp database',
          description: expect.stringContaining('Nguồn: Cuộc họp #70007: Họp rà soát kiến trúc hệ thống'),
          assigneeUserIds: [20],
        })
      )

      expect(governanceApi.updateProjectActionItem).toHaveBeenCalledWith(
        90005,
        404,
        expect.objectContaining({
          taskId: 777,
          milestoneId: 301,
          concurrencyToken: 'token-404',
        })
      )
    })

    // Now linked task badge is rendered and inline creation form is closed
    const badge = await screen.findByText(/Công việc liên kết/)
    expect(badge).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Tạo Task liên kết' })).toBeNull()
  })

  it('does not offer task creation when user lacks permission or meeting is read-only', async () => {
    renderPanel({ canManage: false })
    await screen.findByRole('heading', { name: 'Kết luận và công việc sau họp' })

    // Controls for adding action or decisions are not shown
    expect(screen.queryByRole('button', { name: 'Thêm công việc' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ghi kết luận' })).toBeNull()
  })
})
