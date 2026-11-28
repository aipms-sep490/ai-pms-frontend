import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarAttentionPage } from './CalendarAttentionPage'
import { loadCalendarAttention } from './calendar-data'

const access = vi.hoisted(() => ({
  identityRole: 'student' as 'student' | 'lecturer' | 'department' | 'admin',
  identityRoles: ['STUDENT'] as string[],
  selectedSemesterId: 1,
  departmentIds: [] as number[],
  departments: [] as { id: number; name: string }[],
}))
vi.mock('../../app/context/workspace-access', () => ({ useWorkspaceAccess: () => access }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { accessToken: 'token' } }) }))
vi.mock('./calendar-data', () => ({ loadCalendarAttention: vi.fn() }))

const loader = vi.mocked(loadCalendarAttention)
async function expectAttentionBadge(visualValue: string, announcement: string) {
  const badge = await screen.findByRole('status', { name: announcement })
  expect(badge.getAttribute('aria-atomic')).toBe('true')
  expect(within(badge).getByText(visualValue, { selector: '[aria-hidden="true"]' }).textContent).toBe(visualValue)
  expect(within(badge).getByText(announcement, { selector: '.sr-only' }).textContent).toBe(announcement)
}
const data = {
  calendar: [{ sourceType: 'TASK' as const, sourceId: 1, title: 'Task có hạn', dueAt: '2026-10-04T01:00:00Z', status: 'TODO', deepLink: '/project/tasks/1' }],
  attention: [{ code: 'TASK_OVERDUE', source: 'TASK' as const, sourceId: 1, title: 'Task có hạn', description: 'Công việc đã quá hạn theo dữ liệu dashboard.', dueAt: '2026-10-01T01:00:00Z', status: 'TODO', presentationPriority: 10, deepLink: '/project/tasks/1' }],
  sources: [{ id: 'meetings', label: 'Lịch họp', state: 'error' as const, message: '403' }, { id: 'tasks', label: 'Công việc', state: 'ready' as const }],
}

describe('CalendarAttentionPage', () => {
  afterEach(cleanup)
  beforeEach(() => {
    loader.mockClear()
    loader.mockResolvedValue(data)
    access.identityRole = 'student'
    access.identityRoles = ['STUDENT']
    access.departmentIds = []
    access.departments = []
  })

  it('renders independent calendar and attention facts with a partial-data notice', async () => {
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Lịch tổng hợp & điểm cần chú ý' })).toBeDefined()
    expect(screen.getAllByText('Task có hạn')).toHaveLength(2)
    expect(screen.getByText(/nguồn chưa đầy đủ/)).toBeDefined()
    expect(screen.getByText('Lịch họp')).toBeDefined()
  })

  it('has no mutation control and supports the mobile-primary agenda view', async () => {
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await screen.findAllByText('Task có hạn')
    expect(screen.getByRole('button', { name: 'Danh sách' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('button', { name: /Tạo|Duyệt|Gửi phản hồi|Lưu/ })).toBeNull()
  })
  it('shows NORMAL open actions directly in attention with severity and lecturer 5-hat filters (TK-W2-14)', async () => {
    access.identityRole = 'lecturer'
    access.identityRoles = ['DEPARTMENT_STAFF', 'LECTURER']
    access.departmentIds = [1]
    access.departments = [{ id: 1, name: 'CNTT' }]
    loader.mockResolvedValue({
      calendar: [],
      attention: [
        { code: 'GATE_REVIEW_ASSIGNMENT', source: 'REVIEW_GATE', sourceId: 10, title: 'Chấm phản biện G1', description: 'Đồ án Alpha', status: 'PENDING', severity: 'NORMAL', presentationPriority: 10, deepLink: '/review/gate-assignments' },
        { code: 'DEFENSE_COMMITTEE', source: 'DEFENSE_SESSION', sourceId: 20, title: 'Phiên bảo vệ', description: 'Đã xác nhận', status: 'CONFIRMED', severity: 'HIGH', presentationPriority: 5, deepLink: '/evaluator/workspace' },
      ],
      otherOpenActionsCount: 0,
      sources: [{ id: 'triage-queue', label: 'Việc cần xử lý', state: 'ready' }],
    })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    expect(await screen.findByText('Chấm phản biện G1')).toBeTruthy()
    expect(screen.getAllByText('Phiên bảo vệ').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'Chế độ Bộ môn' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Chế độ Giảng viên' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Phản biện Gate' }))
    expect(screen.getByText('Chấm phản biện G1')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Phiên bảo vệ/ })).toBeNull()
  })
  it('discloses legacy overflow message only if caller supplies otherOpenActionsCount', async () => {
    loader.mockResolvedValue({ calendar: [], attention: [], otherOpenActionsCount: 12, sources: [{ id: 'next-actions', label: 'Việc cần làm', state: 'ready' }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    expect(await screen.findByText('Còn 12 việc đang mở không thuộc nhóm ưu tiên cao.')).toBeTruthy()
    expect(screen.getByText('Không có điểm cần chú ý ưu tiên cao.')).toBeTruthy()
    expect(screen.queryByText(/Chưa tải được danh sách/)).toBeNull()
  })
  it('passes every authorized department from the session to the loader', async () => {
    access.identityRole = 'department'; access.departmentIds = [1, 2]
    access.departments = [{ id: 1, name: 'Công nghệ thông tin' }, { id: 2, name: 'Quản trị kinh doanh' }]
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await screen.findAllByText('Task có hạn')
    expect(loader).toHaveBeenCalledWith(expect.objectContaining({ departmentIds: [1, 2], departments: access.departments }))
  })
  it('keeps healthy department items without claiming a count when another department fails', async () => {
    loader.mockResolvedValue({ ...data, sources: [{ id: 'urgent-actions-1', label: 'Bộ môn 1', state: 'ready' }, { id: 'urgent-actions-2', label: 'Bộ môn 2', state: 'error' }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await expectAttentionBadge('—', 'Chưa xác định số việc cần làm')
    expect(screen.getAllByText('Task có hạn')).toHaveLength(2)
    expect(within(screen.getByRole('complementary')).getByText('Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.')).toBeTruthy()
  })
  it('does not claim a total when next-actions fails, while preserving available items and supporting retry', async () => {
    const failed = 'next-actions'; const healthy = 'student-dashboard'; const title = 'Mục đã tải vẫn đọc được'
    const attention = [{ ...data.attention[0], title }]
    loader.mockResolvedValue({ calendar: [], attention, sources: [{ id: failed, label: failed, state: 'error' }, { id: healthy, label: healthy, state: 'ready' }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await expectAttentionBadge('—', 'Chưa xác định số việc cần làm')
    const panel = within(screen.getByRole('complementary'))
    expect(panel.getByText(title)).toBeTruthy()
    expect(panel.getByRole('alert').textContent).toContain('Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.')
    loader.mockResolvedValue({ calendar: [], attention, sources: [{ id: failed, label: failed, state: 'ready' }, { id: healthy, label: healthy, state: 'ready' }] })
    fireEvent.click(panel.getByRole('button', { name: 'Tải lại danh sách' }))
    await screen.findByLabelText('1 điểm cần chú ý')
    expect(loader).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.')).toBeNull()
  })
  it.each([0, 2])('claims the count %s when the aggregator succeeds even if the calendar dashboard fails', async count => {
    loader.mockResolvedValue({ calendar: [], attention: count ? [data.attention[0], { ...data.attention[0], sourceId: 2, title: 'Mốc đồ án' }] : [], sources: [{ id: 'next-actions', label: 'Việc cần làm', state: count ? 'ready' : 'empty' }, { id: 'student-dashboard', label: 'Lịch dự phòng', state: 'error', message: 'Dashboard 500' }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await expectAttentionBadge(String(count), `${count} điểm cần chú ý`)
    expect(screen.queryByText('Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.')).toBeNull()
    if (!count) expect(screen.getByText('Không có việc cần làm.')).toBeTruthy()
  })
  it.each(['unavailable', 'unsupported'] as const)('shows the source reason once inside attention for %s scope without a retry action', async state => {
    access.identityRole = 'department'
    const message = 'Chưa xác định được bộ môn từ phiên đăng nhập. Không truy vấn phạm vi khác.'
    loader.mockResolvedValue({ calendar: [], attention: [], sources: [{ id: 'urgent-actions', label: 'Việc cần xử lý của bộ môn', state, message }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await screen.findByLabelText('Chưa xác định số việc cần làm')
    const panel = within(screen.getByRole('complementary'))
    expect(panel.getAllByText(message)).toHaveLength(1)
    expect(panel.queryByRole('button', { name: 'Tải lại danh sách' })).toBeNull()
    expect(panel.queryByRole('alert')).toBeNull()
    expect(panel.queryByText('Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.')).toBeNull()
    expect(panel.queryByText('Chưa tải được danh sách việc cần làm. Xem trạng thái nguồn và thử tải lại.')).toBeNull()
    expect(loader).toHaveBeenCalledTimes(1)
  })
  it('announces a genuine source error with an alert and provides one functioning retry', async () => {
    loader.mockResolvedValueOnce({ calendar: [], attention: [], sources: [{ id: 'triage-queue', label: 'Việc cần xử lý', state: 'error', message: '503: Không thể tải dữ liệu.' }] })
    loader.mockResolvedValue({ calendar: [], attention: data.attention, sources: [{ id: 'triage-queue', label: 'Việc cần xử lý', state: 'ready' }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await screen.findByLabelText('Chưa xác định số việc cần làm')
    const panel = within(screen.getByRole('complementary'))
    expect(panel.getByRole('alert').textContent).toContain('Một số nguồn chưa tải được')
    expect(panel.getAllByRole('button', { name: 'Tải lại danh sách' })).toHaveLength(1)
    fireEvent.click(panel.getByRole('button', { name: 'Tải lại danh sách' }))
    await screen.findByLabelText('1 điểm cần chú ý')
    expect(loader).toHaveBeenCalledTimes(2)
    expect(within(screen.getByRole('complementary')).queryByRole('alert')).toBeNull()
  })
  it('announces the asynchronously loaded badge in one atomic status region with count context', async () => {
    loader.mockResolvedValue({ calendar: [], attention: data.attention, sources: [{ id: 'next-actions', label: 'Việc cần làm', state: 'ready' }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await screen.findByLabelText('1 điểm cần chú ý')
    const statuses = within(screen.getByRole('complementary')).getAllByRole('status').filter(region => region.textContent?.includes('1 điểm cần chú ý'))
    expect(statuses).toHaveLength(1)
    expect(statuses[0].getAttribute('aria-atomic')).toBe('true')
    expect(statuses[0].textContent).not.toBe('1')
  })
  it('discloses the returned and total counts for a truncated source without offering an error retry', async () => {
    loader.mockResolvedValue({ calendar: [], attention: data.attention, otherOpenActionsCount: 1, sources: [{ id: 'next-actions', label: 'Việc cần làm', state: 'partial', message: 'Hiển thị 2 trong tổng số 73 việc.' }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await screen.findByLabelText('Chưa xác định số việc cần làm')
    const panel = within(screen.getByRole('complementary'))
    expect(panel.getByText('Hiển thị 2 trong tổng số 73 việc.')).toBeTruthy()
    expect(panel.getByText('Còn 1 việc đang mở không thuộc nhóm ưu tiên cao.')).toBeTruthy()
    expect(panel.queryByRole('button', { name: 'Tải lại danh sách' })).toBeNull()
    expect(panel.queryByRole('alert')).toBeNull()
  })
  it.each(['partial', 'unavailable', 'unsupported'] as const)('does not claim a count for an attention source in state %s', async state => {
    loader.mockResolvedValue({ ...data, sources: [{ id: 'accounts', label: 'Tài khoản', state }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await expectAttentionBadge('—', 'Chưa xác định số việc cần làm')
  })
  it('never infers completeness from an item when no attention source is known', async () => {
    loader.mockResolvedValue({ ...data, sources: [] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await expectAttentionBadge('—', 'Chưa xác định số việc cần làm')
    expect(screen.getAllByText('Task có hạn')).toHaveLength(2)
  })
  it('does not refetch on unrelated view changes or rerenders with stable department context', async () => {
    access.identityRole = 'department'; access.departmentIds = [1, 2]
    access.departments = [{ id: 1, name: 'Công nghệ thông tin' }, { id: 2, name: 'Quản trị kinh doanh' }]
    const { rerender } = render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await screen.findAllByText('Task có hạn')
    fireEvent.click(screen.getByRole('button', { name: 'Theo tháng' }))
    rerender(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    expect(loader).toHaveBeenCalledTimes(1)
    access.departments = [{ id: 1, name: 'Tên bộ môn đã cập nhật' }, access.departments[1]]
    rerender(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2))
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({ departments: access.departments }))
  })

  it('renders a 7-column Mon–Sun month calendar grid and reveals day details on click', async () => {
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await screen.findAllByText('Task có hạn')
    fireEvent.click(screen.getByRole('button', { name: 'Theo tháng' }))
    const grid = screen.getByRole('grid')
    expect(within(grid).getAllByRole('columnheader').map(el => el.textContent)).toEqual(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'])
    const dayCell = within(grid).getByRole('gridcell', { name: /2026-10-04/ })
    fireEvent.click(dayCell)
    expect(dayCell.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getAllByText('Task có hạn').length).toBeGreaterThanOrEqual(2)
  })

  it('localizes raw workflow status enums without leaking BLOCKED, IN_REVIEW, PENDING, or DRAFT', async () => {
    loader.mockResolvedValue({
      calendar: [
        { sourceType: 'TASK', sourceId: 11, title: 'Việc bị chặn', dueAt: '2026-10-05T01:00:00Z', status: 'BLOCKED', deepLink: '/project/tasks/11' },
        { sourceType: 'DELIVERABLE', sourceId: 12, title: 'Hồ sơ đang xét', dueAt: '2026-10-06T01:00:00Z', status: 'IN_REVIEW', deepLink: '/project/deliverables' },
        { sourceType: 'PROGRESS_REPORT', sourceId: 13, title: 'Báo cáo nháp', dueAt: '2026-10-07T01:00:00Z', status: 'DRAFT', deepLink: '/project/reports' },
        { sourceType: 'MILESTONE', sourceId: 14, title: 'Mốc chờ xử lý', dueAt: '2026-10-08T01:00:00Z', status: 'PENDING', deepLink: '/project/milestones' },
      ],
      attention: [],
      sources: [{ id: 'tasks', label: 'Công việc', state: 'ready' }],
    })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    expect((await screen.findAllByText('Bị chặn')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Đang xem xét').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Bản nháp').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Chờ xử lý').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('BLOCKED')).toBeNull()
    expect(screen.queryByText('IN_REVIEW')).toBeNull()
    expect(screen.queryByText('DRAFT')).toBeNull()
    expect(screen.queryByText('PENDING')).toBeNull()
  })
})
