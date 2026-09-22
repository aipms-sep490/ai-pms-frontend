import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import type { ExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { HttpError } from '../../services/http/http-client'
import { MeetingsPage } from './MeetingsPage'
import { CreateMeetingPage } from './CreateMeetingPage'
import { MeetingDetailPage } from './MeetingDetailPage'
import type { MeetingDetail } from './meeting-types'

const api = vi.hoisted(() => ({ getMeetings: vi.fn(), getMeeting: vi.fn(), getMeetingCandidates: vi.fn(), createMeeting: vi.fn(), updateMeeting: vi.fn(), cancelMeeting: vi.fn(), completeMeeting: vi.fn(), updateMeetingNotes: vi.fn(), addMeetingParticipant: vi.fn(), removeMeetingParticipant: vi.fn(), addMeetingFeedback: vi.fn() }))
vi.mock('../../services/api/meetings.api', () => api)
const meeting: MeetingDetail = {
  id: 42, projectId: 2, title: 'Rà soát tiến độ tuần', agenda: 'Đánh giá kết quả và kế hoạch', meetingNotes: null,
  startAt: '2026-09-23T02:00:00', endAt: '2026-09-23T03:00:00', location: 'Phòng 302', onlineUrl: 'https://meet.google.com/abc-defg-hij',
  status: 'SCHEDULED', createdBy: 9, createdByName: 'Khang', createdAt: '2026-09-22T08:00:00', updatedAt: '2026-09-22T08:00:00',
  participants: [{ id: 101, meetingId: 42, userId: 9, fullName: 'Khang', email: 'khang@example.com', attendanceStatus: 'ACCEPTED', createdAt: '2026-09-22T08:00:00', updatedAt: '2026-09-22T08:00:00' }], feedbacks: [],
}
function mount({ actor = 'student', leader = true, userId = 9, path }: { actor?: 'student' | 'supervisor'; leader?: boolean; userId?: number; path?: string } = {}) {
  const routeBase = actor === 'student' ? '/project' : '/supervisor/projects/2'
  const access: ExecutionAccess = { project: { id: 2, teamId: 3, title: 'Quản lý đồ án', status: 'ACTIVE' } as ExecutionAccess['project'], actor, canManageStructure: leader, currentUserId: userId, routeBase }
  const router = createMemoryRouter([{ element: <ExecutionAccessProvider value={access}><Outlet /></ExecutionAccessProvider>, children: [
    { path: `${routeBase}/workspace`, element: <h1>Workspace</h1> },
    { path: `${routeBase}/meetings`, element: <MeetingsPage /> },
    { path: `${routeBase}/meetings/new`, element: <CreateMeetingPage /> },
    { path: `${routeBase}/meetings/:meetingId`, element: <MeetingDetailPage /> },
  ] }], { initialEntries: [path ?? `${routeBase}/meetings/42`] })
  render(<RouterProvider router={router} />)
  return router
}
const input = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name, { exact: false }), { target: { value } })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const ready = () => screen.findByRole('heading', { name: 'Nội dung & địa điểm' })
const listResult = (items: unknown[] = [{ ...meeting, participantCount: 1 }]) => ({ items, page: 1, pageSize: 10, totalCount: items.length, totalPages: items.length ? 1 : 0 })
beforeEach(() => {
  vi.resetAllMocks()
  api.getMeeting.mockResolvedValue(meeting)
  api.getMeetings.mockResolvedValue(listResult())
  api.getMeetingCandidates.mockResolvedValue({ candidates: [{ userId: 9, fullName: 'Khang', role: 'Trưởng nhóm' }, { userId: 6, fullName: 'GVHD', role: 'Giảng viên hướng dẫn' }] })
})
afterEach(cleanup)

describe('Meetings end-user workflow', () => {
  it('keeps supervisor scheduling available when BE denies the student roster', async () => {
    api.getMeetingCandidates.mockResolvedValue({ candidates: [{ userId: 6, fullName: 'GVHD', role: 'Giảng viên hướng dẫn' }], notice: 'Trưởng nhóm có thể thêm sinh viên sau.' })
    api.createMeeting.mockResolvedValue(meeting)
    mount({ actor: 'supervisor', userId: 6, path: '/supervisor/projects/2/meetings/new' })
    await screen.findByText('Trưởng nhóm có thể thêm sinh viên sau.')
    input('Tiêu đề', 'GVHD lên lịch'); input('Bắt đầu', '2026-09-23T09:00'); click('Tạo cuộc họp')
    await ready(); expect(api.createMeeting.mock.calls[0][1].participantUserIds).toEqual([])
  })
  it('creates a trimmed schedule in UTC with invitees then opens saved detail', async () => {
    api.createMeeting.mockResolvedValue(meeting)
    mount({ path: '/project/meetings/new' })
    await screen.findByLabelText(/GVHD/)
    input('Tiêu đề', '  Rà soát tiến độ tuần  '); input('Bắt đầu', '2026-09-23T09:00')
    fireEvent.click(screen.getByLabelText(/GVHD/))
    click('Tạo cuộc họp'); await ready()
    expect(api.createMeeting).toHaveBeenCalledWith(2, { title: meeting.title, startAt: '2026-09-23T02:00:00.000Z', endAt: null, agenda: null, location: null, onlineUrl: null, participantUserIds: [6] })
    expect(screen.queryByText(/Nội dung chưa được lưu/)).toBeNull()
  })
  it('validates blank title, reversed times and unsafe links before sending', async () => {
    mount({ path: '/project/meetings/new' }); await screen.findByLabelText(/GVHD/)
    input('Tiêu đề', ' ')
    const submit = () => fireEvent.submit(screen.getByRole('button', { name: 'Tạo cuộc họp' }).closest('form')!)
    submit(); expect(screen.getByRole('alert').textContent).toContain('tiêu đề')
    input('Tiêu đề', 'Họp'); input('Bắt đầu', '2026-09-23T10:00'); input('Kết thúc', '2026-09-23T09:00')
    submit(); expect(screen.getByRole('alert').textContent).toContain('Giờ kết thúc')
    input('Kết thúc', '2026-09-23T10:00'); input('Liên kết', 'javascript:alert(1)')
    submit(); expect(screen.getByRole('alert').textContent).toContain('http://')
    expect(api.createMeeting).not.toHaveBeenCalled()
  })
  it('denies member creation and permits only read access for non-organizers', async () => {
    mount({ leader: false, userId: 10, path: '/project/meetings/new' })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(api.getMeetingCandidates).not.toHaveBeenCalled()
    cleanup(); mount({ leader: false, userId: 10 }); await ready()
    expect(screen.queryByRole('button', { name: 'Sửa lịch' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cập nhật biên bản' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Viết nhận xét' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Hoàn tất cuộc họp' })).toBeNull()
  })
  it('allows the original organizer to manage after they cease to be leader', async () => {
    mount({ leader: false, userId: 9 }); await ready()
    expect(screen.getByRole('button', { name: 'Sửa lịch' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cập nhật biên bản' })).toBeTruthy()
  })
  it('updates schedule without changing its participants or shifting time', async () => {
    mount(); await ready(); click('Sửa lịch')
    expect((screen.getByLabelText(/Bắt đầu/) as HTMLInputElement).value).toBe('2026-09-23T09:00')
    input('Địa điểm', 'Phòng 401'); click('Lưu lịch họp')
    await screen.findByText('Đã lưu thay đổi lịch họp.'); await ready()
    expect(api.updateMeeting).toHaveBeenCalledWith(42, { title: meeting.title, agenda: meeting.agenda, startAt: '2026-09-23T02:00:00.000Z', endAt: '2026-09-23T03:00:00.000Z', location: 'Phòng 401', onlineUrl: meeting.onlineUrl })
    expect(api.getMeeting).toHaveBeenCalledTimes(2)
  })
  it('adds a candidate and removes by user ID after explicit confirmation', async () => {
    mount(); await ready(); await screen.findByLabelText('Thêm người tham gia')
    input('Thêm người tham gia', '6'); click('Thêm vào cuộc họp')
    await screen.findByText('Đã thêm người tham gia.'); await ready()
    expect(api.addMeetingParticipant).toHaveBeenCalledWith(42, 6)
    click('Bỏ Khang khỏi cuộc họp')
    expect(api.removeMeetingParticipant).not.toHaveBeenCalled()
    click('Xác nhận'); await screen.findByText('Đã cập nhật danh sách người tham gia.')
    expect(api.removeMeetingParticipant).toHaveBeenCalledWith(42, 9)
  })
  it('stores notes and only changed attendance values, including after completion', async () => {
    api.getMeeting.mockResolvedValue({ ...meeting, status: 'COMPLETED' })
    mount(); await ready(); click('Cập nhật biên bản')
    input('Biên bản & kết luận', '  Thống nhất kiểm thử API  '); input('Khang', 'ATTENDED')
    click('Lưu biên bản & điểm danh'); await screen.findByText('Đã lưu biên bản và điểm danh.')
    expect(api.updateMeetingNotes).toHaveBeenCalledWith(42, { meetingNotes: 'Thống nhất kiểm thử API', attendances: [{ userId: 9, attendanceStatus: 'ATTENDED' }] })
    await ready(); expect(screen.queryByRole('button', { name: 'Sửa lịch' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Bỏ Khang khỏi cuộc họp' })).toBeNull()
  })
  it('does not overwrite an untouched nullable attendance', async () => {
    api.getMeeting.mockResolvedValue({ ...meeting, participants: [{ ...meeting.participants[0], attendanceStatus: null }] })
    mount(); await ready(); click('Cập nhật biên bản'); input('Biên bản & kết luận', 'Kết luận')
    click('Lưu biên bản & điểm danh'); await screen.findByText('Đã lưu biên bản và điểm danh.')
    expect(api.updateMeetingNotes).toHaveBeenCalledWith(42, { meetingNotes: 'Kết luận', attendances: [] })
  })
  it('completes once despite repeated clicks and reloads the locked status', async () => {
    let resolve!: () => void
    api.completeMeeting.mockReturnValue(new Promise<void>((done) => { resolve = done }))
    mount(); await ready(); click('Hoàn tất cuộc họp')
    expect(api.completeMeeting).not.toHaveBeenCalled(); click('Xác nhận'); click('Đang xử lý…')
    expect(api.completeMeeting).toHaveBeenCalledTimes(1)
    api.getMeeting.mockResolvedValue({ ...meeting, status: 'COMPLETED' })
    await act(async () => resolve()); await screen.findByText('Đã hoàn tất')
    expect(screen.queryByRole('button', { name: 'Hoàn tất cuộc họp' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Cập nhật biên bản' })).toBeTruthy()
  })
  it('cancels explicitly and makes even supervisor notes/feedback read-only', async () => {
    mount({ actor: 'supervisor', userId: 6 }); await ready(); click('Hủy lịch họp')
    expect(api.cancelMeeting).not.toHaveBeenCalled()
    api.getMeeting.mockResolvedValue({ ...meeting, status: 'CANCELLED' }); click('Xác nhận')
    await screen.findByText('Đã hủy')
    expect(api.cancelMeeting).toHaveBeenCalledWith(42)
    expect(screen.queryByRole('button', { name: 'Cập nhật biên bản' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Viết nhận xét' })).toBeNull()
  })
  it.each(['SCHEDULED', 'COMPLETED'] as const)('permits GVHD feedback on %s without inventing a new status', async (status) => {
    api.getMeeting.mockResolvedValue({ ...meeting, status })
    mount({ actor: 'supervisor', userId: 6 }); await ready(); click('Viết nhận xét')
    input('Nhận xét mới', '  Cần bổ sung kiểm thử  ')
    api.getMeeting.mockResolvedValue({ ...meeting, status, feedbacks: [{ id: 1, supervisorName: 'GVHD', feedbackText: 'Cần bổ sung kiểm thử', createdAt: '2026-09-23T03:00:00Z' }] })
    click('Gửi nhận xét'); await screen.findByText('Đã gửi nhận xét cho nhóm.'); await ready()
    expect(screen.getByText('Cần bổ sung kiểm thử')).toBeTruthy()
    expect(api.addMeetingFeedback).toHaveBeenCalledWith(42, 'Cần bổ sung kiểm thử')
    expect(screen.getByText(status === 'SCHEDULED' ? 'Đã lên lịch' : 'Đã hoàn tất')).toBeTruthy()
  })
  it('protects unsaved content on route changes and allows explicit discard', async () => {
    mount(); await ready(); click('Cập nhật biên bản'); input('Biên bản & kết luận', 'Chưa lưu')
    fireEvent.click(screen.getByRole('link', { name: 'Danh sách cuộc họp' }))
    await screen.findByText(/Nội dung chưa được lưu/); click('Ở lại soạn tiếp')
    expect((screen.getByLabelText('Biên bản & kết luận') as HTMLTextAreaElement).value).toBe('Chưa lưu')
    fireEvent.click(screen.getByRole('link', { name: 'Danh sách cuộc họp' })); click('Bỏ thay đổi và rời trang')
    await screen.findByRole('heading', { name: 'Các cuộc họp' })
    expect(api.updateMeetingNotes).not.toHaveBeenCalled()
  })
  it('requires confirmation before discarding drafts inside the page', async () => {
    mount(); await ready(); click('Cập nhật biên bản'); input('Biên bản & kết luận', 'Chưa lưu')
    click('Đóng chỉnh sửa'); expect(screen.getByRole('alertdialog').textContent).toContain('chưa lưu')
    click('Quay lại'); expect(screen.getByLabelText('Biên bản & kết luận')).toBeTruthy()
    click('Đóng chỉnh sửa'); click('Xác nhận'); expect(screen.queryByRole('textbox')).toBeNull()
  })
  it('retains failed drafts and forbids replay until an explicit reload', async () => {
    api.updateMeetingNotes.mockRejectedValue(new HttpError('conflict', 409))
    mount(); await ready(); click('Cập nhật biên bản'); input('Biên bản & kết luận', 'Giữ nội dung này'); click('Lưu biên bản & điểm danh')
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Biên bản & kết luận') as HTMLTextAreaElement).value).toBe('Giữ nội dung này')
    fireEvent.submit(screen.getByLabelText('Biên bản & kết luận').closest('form')!)
    expect(api.updateMeetingNotes).toHaveBeenCalledTimes(1)
    click('Tải lại trạng thái'); expect(screen.getByRole('alertdialog').textContent).toContain('bỏ nội dung')
    click('Xác nhận'); await ready(); expect(screen.queryByRole('textbox')).toBeNull()
  })
  it('retries GET only when saving succeeded but reloading failed', async () => {
    api.getMeeting.mockResolvedValueOnce(meeting).mockRejectedValueOnce(new HttpError('unavailable', 503)).mockResolvedValue({ ...meeting, status: 'COMPLETED' })
    mount(); await ready(); click('Hoàn tất cuộc họp'); click('Xác nhận')
    await screen.findByRole('button', { name: 'Tải lại' }); click('Tải lại')
    await screen.findByText('Đã hoàn tất'); expect(api.completeMeeting).toHaveBeenCalledTimes(1)
  })
  it('locks uncertain creation so a failed response cannot create duplicates', async () => {
    api.createMeeting.mockRejectedValue(new TypeError('Network lost'))
    mount({ path: '/project/meetings/new' }); await screen.findByLabelText(/GVHD/)
    input('Tiêu đề', 'Họp'); input('Bắt đầu', '2026-09-23T09:00'); click('Tạo cuộc họp')
    await screen.findByText(/Tạm khóa gửi lại/)
    fireEvent.submit(screen.getByLabelText('Tiêu đề cuộc họp').closest('form')!)
    expect(api.createMeeting).toHaveBeenCalledTimes(1)
    expect((screen.getByLabelText('Tiêu đề cuộc họp') as HTMLInputElement).value).toBe('Họp')
  })
  it('rejects foreign project details and invalid IDs', async () => {
    api.getMeeting.mockResolvedValue({ ...meeting, projectId: 888 })
    mount(); await screen.findByText('Cuộc họp không thuộc đồ án đang mở.')
    expect(screen.queryByText(meeting.title)).toBeNull()
    cleanup(); api.getMeeting.mockClear(); mount({ path: '/project/meetings/invalid' })
    await screen.findByText('Đường dẫn cuộc họp không hợp lệ.'); expect(api.getMeeting).not.toHaveBeenCalled()
  })
  it('does not render unsafe room URLs received from the server', async () => {
    api.getMeeting.mockResolvedValue({ ...meeting, onlineUrl: 'javascript:alert(1)' })
    mount(); await ready(); expect(screen.queryByRole('link', { name: 'Mở phòng họp ↗' })).toBeNull()
  })
  it('applies filters explicitly using VN day boundaries and retains them during pagination', async () => {
    api.getMeetings.mockResolvedValue({ ...listResult(), totalCount: 11, totalPages: 2 })
    mount({ path: '/project/meetings' }); await screen.findByRole('link', { name: /Rà soát tiến độ tuần/ })
    input('Trạng thái', 'COMPLETED'); input('Từ ngày', '2026-09-23'); input('Đến ngày', '2026-09-24')
    expect(api.getMeetings).toHaveBeenCalledTimes(1); click('Áp dụng')
    await waitFor(() => expect(api.getMeetings).toHaveBeenCalledTimes(2))
    expect(api.getMeetings.mock.calls[1][1]).toEqual({ status: 'COMPLETED', from: '2026-09-22T17:00:00.000Z', to: '2026-09-24T16:59:59.999Z', page: 1, pageSize: 10 })
    await screen.findByRole('link', { name: /Rà soát tiến độ tuần/ }); click('Trang sau')
    await waitFor(() => expect(api.getMeetings).toHaveBeenCalledTimes(3))
    expect(api.getMeetings.mock.calls[2][1]).toMatchObject({ status: 'COMPLETED', page: 2 })
  })
  it('shows empty data and recovers from list loading failures', async () => {
    api.getMeetings.mockRejectedValueOnce(new HttpError('Unavailable', 503)).mockResolvedValue(listResult([]))
    mount({ leader: false, userId: 10, path: '/project/meetings' }); await screen.findByRole('alert'); click('Tải lại')
    await screen.findByText('Chưa có lịch họp')
    expect(screen.queryByRole('link', { name: /Lên lịch họp/ })).toBeNull()
  })
})
