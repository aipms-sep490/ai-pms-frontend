import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ProjectDto, TeamDto, TimelineTaskDto } from '../../../types/backend'
import { CollaborationWorkspace } from './CollaborationWorkspace'

// Transport fixtures exist only in tests. Production uses the shared authenticated HTTP client.
const project: ProjectDto = { id: 9, teamId: 2, teamName: 'Nhóm đồ án', code: 'PRJ-9', title: 'Hệ thống quản lý đồ án',
  status: 'Active', registeredAt: '', createdBy: 1, createdByName: 'Nguyễn Minh An', createdAt: '', updatedAt: '', concurrencyToken: 'test', majors: [], tags: [] }
const names = ['Nguyễn Minh An', 'Trần Thu Hà', 'Lê Quốc Bảo', 'Phạm Anh Duy', 'Võ Ngọc Linh']
const team: TeamDto = { id: 2, academicSemesterId: 1, code: 'SE9', name: 'Nhóm đồ án', status: 'ACTIVE',
  members: names.map((fullName, index) => ({ userId: index + 1, fullName, isLeader: index === 0, isEligibleStudent: true })),
  eligibility: { canRegister: true, rosterLocked: true, reasons: [] } }
const tasks: TimelineTaskDto[] = [
  { id: 11, title: 'Hoàn thiện luồng đăng ký', status: 'IN_PROGRESS', dueAt: '2099-10-01T08:00:00', assignees: [{ userId: 1, fullName: names[0] }], dependencies: [] },
  { id: 12, title: 'Kiểm tra báo cáo', status: 'BLOCKED', dueAt: '2020-01-01T08:00:00', assignees: [{ userId: 2, fullName: names[1] }], dependencies: [] },
  { id: 13, title: 'Khảo sát yêu cầu', status: 'DONE', assignees: [{ userId: 1, fullName: names[0] }], dependencies: [] },
]
const milestone = { id: 3, title: 'Hoàn thiện chức năng cốt lõi', dueDate: '2099-10-01', status: 'IN_PROGRESS', sortOrder: 1, progressPercentage: 100 / 3, tasks }
const page = (items: unknown[] = [], totalPages = 1) => ({ items, page: 1, pageSize: 100, totalPages, totalCount: items.length })
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined
const calls: { url: URL; init?: RequestInit }[] = []

function mockTransport(handler?: Handler) {
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost')
    calls.push({ url, init })
    const custom = handler?.(url, init)
    if (custom !== undefined) return custom
    if (url.pathname.endsWith('/timeline')) return json({ projectId: 9, milestones: [milestone] })
    if (url.pathname.endsWith('/progress-summary')) return json({ projectId: 9, totalTasks: 3, doneTasks: 1, blockedTasks: 1, overdueTasks: 1, totalMilestones: 1, completedMilestones: 0, progressPercentage: 100 / 3 })
    if (/\/projects\/9\/(deliverables|progress-reports|meetings)$/.test(url.pathname)) return json(page())
    if (url.pathname === '/api/v1/tasks' && init?.method === 'POST') return json({ id: 50 }, 201)
    throw new Error(`Unexpected test endpoint: ${url.pathname}`)
  }))
}
const capabilities = (allowed: boolean) => ({ status: 'ready' as const, get: () => ({ state: allowed ? 'allowed' as const : 'denied' as const, allowed, reasons: [] }) })
const renderWorkspace = (currentUserId = 1, createAllowed = currentUserId === 1) => render(<MemoryRouter><CollaborationWorkspace project={project} team={team} currentUserId={currentUserId} executionCapabilities={capabilities(createAllowed)} /></MemoryRouter>)

beforeEach(() => { calls.length = 0; localStorage.setItem('token', 'test-session-token'); mockTransport() })
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('collaboration workspace API integration', () => {
  it('uses the real HTTP contracts and authentication, renders five member rows, and filters linked tasks', async () => {
    renderWorkspace()
    const progress = await screen.findByRole('progressbar', { name: `Tiến độ công việc của ${names[0]}` })
    expect(progress.getAttribute('aria-valuenow')).toBe('50')
    const memberSection = screen.getByRole('region', { name: /Tiến độ từng thành viên/ })
    expect(within(memberSection).getAllByRole('button')).toHaveLength(5)
    expect(within(memberSection).getAllByText('Chưa có công việc')).toHaveLength(3)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cập nhật dữ liệu nhóm' }).hasAttribute('disabled')).toBe(false))
    const paths = calls.map(call => call.url.pathname)
    expect(paths).toEqual(expect.arrayContaining(['/api/v1/tasks/project/9/timeline', '/api/v1/tasks/project/9/progress-summary',
      '/api/v1/projects/9/deliverables', '/api/v1/projects/9/progress-reports', '/api/v1/projects/9/meetings']))
    expect(calls.every(call => new Headers(call.init?.headers).get('Authorization') === 'Bearer test-session-token')).toBe(true)
    fireEvent.click(within(memberSection).getByRole('button', { name: new RegExp(names[1]) }))
    const taskSection = screen.getByRole('region', { name: `Công việc của ${names[1]}` })
    expect(within(taskSection).getByRole('link', { name: /Kiểm tra báo cáo/ }).getAttribute('href')).toBe('/project/tasks/12')
    expect(within(taskSection).queryByText('Hoàn thiện luồng đăng ký')).toBeNull()
    expect(within(taskSection).getByRole('link', { name: /Xem tất cả/ }).getAttribute('href')).toBe('/project/tasks?assignee=2')
    fireEvent.click(screen.getByRole('button', { name: 'Của tôi' }))
    expect(screen.getByRole('region', { name: `Công việc của ${names[0]}` })).toBeTruthy()
  })

  it('shows permission failures without fake zero progress and keeps other sections usable', async () => {
    let denied = true
    mockTransport(url => url.pathname.endsWith('/timeline') && denied ? json({ title: 'Forbidden' }, 403) : undefined)
    renderWorkspace(2)
    expect(await screen.findAllByText('Bạn chưa có quyền xem công việc của nhóm.')).toHaveLength(2)
    expect(screen.queryByRole('progressbar', { name: `Tiến độ công việc của ${names[0]}` })).toBeNull()
    expect(screen.queryByText('Nhóm không có công việc nào đang mở.')).toBeNull()
    expect(screen.getByText('1/3 việc hoàn thành')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Tạo công việc' })).toBeNull()
    denied = false
    fireEvent.click(screen.getAllByRole('button', { name: 'Thử lại' })[0])
    expect((await screen.findAllByRole('link', { name: /Kiểm tra báo cáo/ })).length).toBeGreaterThan(0)
  })

  it('gives a member a private work queue without team-wide coordination controls', async () => {
    renderWorkspace(2)

    expect(await screen.findByRole('heading', { name: 'Không gian công việc của tôi' })).toBeTruthy()
    expect(screen.queryByRole('region', { name: /Tiến độ từng thành viên/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tạo công việc' })).toBeNull()
    const taskSection = screen.getByRole('region', { name: 'Công việc của tôi' })
    expect(within(taskSection).getByRole('link', { name: /Kiểm tra báo cáo/ })).toBeTruthy()
    expect(within(taskSection).queryByText('Hoàn thiện luồng đăng ký')).toBeNull()
    expect(within(taskSection).getByRole('link', { name: /Xem tất cả/ }).getAttribute('href')).toBe('/project/tasks?assignee=2')
    expect(screen.getByRole('region', { name: /Đóng góp và chứng cứ/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Tệp và chứng cứ/ }).getAttribute('href')).toBe('/project/files')
  })
  it('does not let the overview leader presentation override a denied task action', async () => {
    renderWorkspace(1, false)
    await screen.findByRole('heading', { name: 'Điều phối đồ án' })
    expect(screen.queryByRole('button', { name: 'Tạo công việc' })).toBeNull()
  })
  it('shows a task CTA to a member when the backend action explicitly allows it', async () => {
    renderWorkspace(2, true)
    await screen.findByRole('heading', { name: 'Không gian công việc của tôi' })
    expect(screen.getByRole('button', { name: 'Tạo công việc' })).toBeTruthy()
  })

  it('reads all descending meeting pages before choosing the next meeting and preserves partial report feedback', async () => {
    mockTransport(url => {
      if (url.pathname.endsWith('/meetings')) return json(page(url.searchParams.get('page') === '2'
        ? [{ id: 2, title: 'Họp gần nhất', startAt: '2099-10-01T08:00:00', location: 'Phòng 201' }]
        : [{ id: 1, title: 'Họp xa hơn', startAt: '2099-11-01T08:00:00' }], 2))
      if (url.pathname.endsWith('/progress-reports')) return json(page([{ id: 21 }, { id: 22 }]))
      if (url.pathname === '/api/v1/progress-reports/21') return json({ id: 21, periodStart: '2026-09-14', periodEnd: '2026-09-20',
        feedbacks: [{ id: 31, supervisorName: 'Nguyễn Mai', createdAt: '2026-09-21T08:00:00', feedbackText: 'Nhóm cần làm rõ tiêu chí kiểm thử.' }] })
      if (url.pathname === '/api/v1/progress-reports/22') return json({ title: 'Unavailable' }, 500)
      return undefined
    })
    renderWorkspace()
    expect(await screen.findByRole('link', { name: /Họp gần nhất/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Họp xa hơn/ })).toBeNull()
    expect(await screen.findByText('Nhóm cần làm rõ tiêu chí kiểm thử.')).toBeTruthy()
    expect(screen.getByText('Một số nhận xét chưa tải được.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Xem báo cáo 14/09 – 20/09' }).getAttribute('href')).toBe('/project/reports/21')
    expect(calls.find(call => call.url.pathname.endsWith('/progress-reports'))?.url.searchParams.get('status')).toBe('REVIEWED')
    const meetingCalls = calls.filter(call => call.url.pathname.endsWith('/meetings'))
    expect(meetingCalls).toHaveLength(2)
    expect(meetingCalls[0].url.searchParams.get('from')).toBe(meetingCalls[1].url.searchParams.get('from'))
  })

  it('posts leader assignment and Vietnam due time, retains the form after failure, then reloads after success', async () => {
    let fail = true
    mockTransport((url, init) => url.pathname === '/api/v1/tasks' && init?.method === 'POST'
      ? json(fail ? { title: 'Forbidden' } : { id: 50 }, fail ? 403 : 201) : undefined)
    renderWorkspace()
    await screen.findByRole('progressbar', { name: `Tiến độ công việc của ${names[0]}` })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo công việc' }))
    const form = screen.getByRole('region', { name: 'Tạo công việc' })
    fireEvent.change(within(form).getByRole('textbox', { name: 'Tên công việc' }), { target: { value: '  Hoàn thiện đăng nhập  ' } })
    fireEvent.change(within(form).getByRole('combobox', { name: 'Mốc đồ án' }), { target: { value: '3' } })
    fireEvent.change(within(form).getByLabelText(/Hạn hoàn thành/), { target: { value: '2099-10-01T15:00' } })
    fireEvent.click(within(form).getByRole('checkbox', { name: names[1] }))
    fireEvent.click(within(form).getByRole('button', { name: 'Tạo công việc' }))
    expect(await screen.findByText('Bạn chưa có quyền tạo công việc cho nhóm.')).toBeTruthy()
    expect((within(form).getByRole('textbox', { name: 'Tên công việc' }) as HTMLInputElement).value).toBe('  Hoàn thiện đăng nhập  ')
    const creation = calls.find(call => call.init?.method === 'POST')!
    expect(JSON.parse(String(creation.init?.body))).toEqual({ milestoneId: 3, title: 'Hoàn thiện đăng nhập', description: null,
      priority: 'MEDIUM', dueAt: '2099-10-01T08:00:00.000Z', assigneeUserIds: [2] })
    fail = false
    fireEvent.click(within(form).getByRole('button', { name: 'Tạo công việc' }))
    expect(await screen.findByText('Đã tạo công việc.')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Tạo công việc' })).toBeNull()
    await waitFor(() => expect(calls.filter(call => call.url.pathname.endsWith('/timeline'))).toHaveLength(2))
  })

  it('aborts pending reads when the workspace unmounts', () => {
    mockTransport(() => new Promise<Response>(() => {}))
    const view = renderWorkspace()
    expect(calls).toHaveLength(5)
    view.unmount()
    expect(calls.every(call => call.init?.signal?.aborted)).toBe(true)
  })
})
