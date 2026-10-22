import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarAttentionPage } from './CalendarAttentionPage'
import { loadCalendarAttention } from './calendar-data'

const access = vi.hoisted(() => ({ identityRole: 'student', selectedSemesterId: 1, departmentIds: [] as number[] }))
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
  beforeEach(() => { loader.mockClear(); loader.mockResolvedValue(data); access.identityRole = 'student'; access.departmentIds = [] })

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
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    await screen.findAllByText('Task có hạn')
    expect(loader).toHaveBeenCalledWith(expect.objectContaining({ departmentIds: [1, 2] }))
  })
  it('counts healthy department sources and recovered milestones even if another source fails', async () => {
    loader.mockResolvedValue({ ...data, sources: [{ id: 'urgent-actions-1', label: 'Bộ môn 1', state: 'ready' }, { id: 'urgent-actions-2', label: 'Bộ môn 2', state: 'error' }] })
    render(<MemoryRouter><CalendarAttentionPage /></MemoryRouter>)
    expect(await screen.findByLabelText('1 điểm cần chú ý')).toBeTruthy()
  })
})
