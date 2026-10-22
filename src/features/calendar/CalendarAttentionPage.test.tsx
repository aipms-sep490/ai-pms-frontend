import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarAttentionPage } from './CalendarAttentionPage'
import { loadCalendarAttention } from './calendar-data'

const access = vi.hoisted(() => ({ identityRole: 'student', selectedSemesterId: 1, departmentIds: [] as number[], departments: [] as { id: number; name: string }[] }))
vi.mock('../../app/context/workspace-access', () => ({ useWorkspaceAccess: () => access }))
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: { accessToken: 'token' } }) }))
vi.mock('./calendar-data', () => ({ loadCalendarAttention: vi.fn() }))

const loader = vi.mocked(loadCalendarAttention)
const data = {
  calendar: [{ sourceType: 'TASK' as const, sourceId: 1, title: 'Task có hạn', dueAt: '2026-10-04T01:00:00Z', status: 'TODO', deepLink: '/project/tasks/1' }],
  attention: [{ code: 'TASK_OVERDUE', source: 'TASK' as const, sourceId: 1, title: 'Task có hạn', description: 'Công việc đã quá hạn theo dữ liệu dashboard.', dueAt: '2026-10-01T01:00:00Z', status: 'TODO', presentationPriority: 10, deepLink: '/project/tasks/1' }],
  sources: [{ id: 'meetings', label: 'Lịch họp', state: 'error' as const, message: '403' }, { id: 'tasks', label: 'Công việc', state: 'ready' as const }],
}

describe('CalendarAttentionPage', () => {
  afterEach(cleanup)
  beforeEach(() => { loader.mockClear(); loader.mockResolvedValue(data); access.identityRole = 'student'; access.departmentIds = []; access.departments = [] })

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
  it('discloses filtered open work without calling it urgent or a load failure', async () => {
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
    expect((await screen.findByLabelText('Chưa xác định số việc cần làm')).textContent).toBe('—')
    expect(screen.getAllByText('Task có hạn')).toHaveLength(2)
    expect(within(screen.getByRole('complementary')).getByText('Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.')).toBeTruthy()
  })
  it.each([
    { failed: 'next-actions', healthy: 'student-dashboard', title: 'Mốc quá hạn vẫn đọc được' },
    { failed: 'student-dashboard', healthy: 'next-actions', title: 'Task HIGH vẫn đọc được' },
  ])('does not claim a total when $failed fails, while preserving $healthy items and supporting retry', async ({ failed, healthy, title }) => {
    const attention = [{ ...data.attention[0], title }]
    loader.mockResolvedValue({ calendar: [], attention, sources: [{ id: failed, label: failed, state: 'error' }, { id: healthy, label: healthy, state: 'ready' }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    const badge = await screen.findByLabelText('Chưa xác định số việc cần làm')
    expect(badge.textContent).toBe('—')
    const panel = within(screen.getByRole('complementary'))
    expect(panel.getByText(title)).toBeTruthy()
    expect(panel.getByText('Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.')).toBeTruthy()
    loader.mockResolvedValue({ calendar: [], attention, sources: [{ id: failed, label: failed, state: 'ready' }, { id: healthy, label: healthy, state: 'ready' }] })
    fireEvent.click(panel.getByRole('button', { name: 'Tải lại danh sách' }))
    await screen.findByLabelText('1 điểm cần chú ý')
    expect(loader).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.')).toBeNull()
  })
  it.each([0, 2])('claims the count %s only when both student attention sources succeeded', async count => {
    loader.mockResolvedValue({ calendar: [], attention: count ? [data.attention[0], { ...data.attention[0], sourceId: 2, title: 'Mốc đồ án' }] : [], sources: [{ id: 'next-actions', label: 'Việc cần làm', state: 'empty' }, { id: 'student-dashboard', label: 'Mốc đồ án', state: 'ready' }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    expect((await screen.findByLabelText(`${count} điểm cần chú ý`)).textContent).toBe(String(count))
    expect(screen.queryByText('Một số nguồn chưa tải được; danh sách có thể chưa đầy đủ.')).toBeNull()
    if (!count) expect(screen.getByText('Không có việc cần làm.')).toBeTruthy()
  })
  it.each(['partial', 'unavailable', 'unsupported'] as const)('does not claim a count for an attention source in state %s', async state => {
    loader.mockResolvedValue({ ...data, sources: [{ id: 'accounts', label: 'Tài khoản', state }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    expect((await screen.findByLabelText('Chưa xác định số việc cần làm')).textContent).toBe('—')
  })
  it('never infers completeness from an item when no attention source is known', async () => {
    loader.mockResolvedValue({ ...data, sources: [] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    expect((await screen.findByLabelText('Chưa xác định số việc cần làm')).textContent).toBe('—')
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
})
