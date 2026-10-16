import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { ExecutionAccessProvider } from '../execution/context/ExecutionAccessProvider'
import type { ExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { CreateMeetingPage } from './CreateMeetingPage'
import { MeetingDetailPage } from './MeetingDetailPage'
import type { MeetingDetail } from './meeting-types'

const api = vi.hoisted(() => ({
  getMeeting: vi.fn(), getMeetingCandidates: vi.fn(), createMeeting: vi.fn(), createMeetingSeries: vi.fn(),
  getMeetingDecisions: vi.fn(), getMeetingActionItems: vi.fn(),
  getMeetingCollaboration: vi.fn(), respondMeetingRsvp: vi.fn(), lockMeetingNotes: vi.fn(), getMeetingNotesHistory: vi.fn(),
}))
const runtime = vi.hoisted(() => ({ env: {
  apiBaseUrl: '/api/v1', dataMode: 'api' as const, isMockMode: false, aiAdvisoryEnabled: false, videoMeetingEnabled: false,
  meetingCollaborationEnabled: true,
} }))
vi.mock('../../services/api/meetings.api', () => api)
vi.mock('../../app/config/env', () => runtime)

const meeting: MeetingDetail = {
  id: 42, projectId: 2, title: 'Rà soát tiến độ tuần', agenda: 'Đánh giá kết quả', meetingNotes: null,
  startAt: '2026-09-23T02:00:00', endAt: '2026-09-23T03:00:00', location: 'Phòng 302', onlineUrl: null,
  status: 'SCHEDULED', createdBy: 9, createdByName: 'Khang', createdAt: '2026-09-22T08:00:00', updatedAt: '2026-09-22T08:00:00', concurrencyToken: 'meeting-token',
  participants: [{ id: 101, meetingId: 42, userId: 9, fullName: 'Khang', email: 'khang@example.com', attendanceStatus: null, rsvpStatus: 'INVITED', createdAt: '2026-09-22T08:00:00', updatedAt: '2026-09-22T08:00:00' }],
  feedbacks: [],
}
const capabilities = (allowed: boolean) => ({ status: 'ready' as const, get: () => ({ state: allowed ? 'allowed' as const : 'denied' as const, allowed, reasons: [] }) })
function mount({ path, userId = 9 }: { path?: string; userId?: number } = {}) {
  const access: ExecutionAccess = { project: { id: 2, teamId: 3, title: 'Quản lý đồ án', status: 'ACTIVE' } as ExecutionAccess['project'], actor: 'student', canManageStructure: true, executionCapabilities: capabilities(true), currentUserId: userId, routeBase: '/project' }
  const router = createMemoryRouter([{ element: <ExecutionAccessProvider value={access}><Outlet /></ExecutionAccessProvider>, children: [
    { path: '/project/meetings', element: <h1>Danh sách cuộc họp</h1> },
    { path: '/project/meetings/new', element: <CreateMeetingPage /> },
    { path: '/project/meetings/:meetingId', element: <MeetingDetailPage /> },
  ] }], { initialEntries: [path ?? '/project/meetings/42'] })
  render(<RouterProvider router={router} />)
  return router
}
const input = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name, { exact: false }), { target: { value } })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

beforeEach(() => {
  vi.resetAllMocks()
  api.getMeeting.mockResolvedValue(meeting)
  api.getMeetingCandidates.mockResolvedValue({ candidates: [] })
  api.getMeetingDecisions.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  api.getMeetingActionItems.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
  api.getMeetingCollaboration.mockResolvedValue({
    meetingId: 42, concurrencyToken: 'meeting-token', seriesId: null, occurrenceNumber: null, recurrence: 'NONE',
    notesVersion: 1, notesLockedAt: null, notesLockedBy: null, canLockNotes: false,
    myRsvp: { meetingId: 42, userId: 9, status: 'INVITED', concurrencyToken: 'rsvp-token' },
    emailDeliveries: [], hasMoreEmailDeliveries: false,
  })
})
afterEach(cleanup)

describe('Meeting series creation (BE-N06)', () => {
  it('routes a weekly recurrence through createMeetingSeries instead of createMeeting', async () => {
    api.createMeetingSeries.mockResolvedValue({ seriesId: 's1', recurrence: 'WEEKLY', occurrences: [meeting] })
    mount({ path: '/project/meetings/new' })
    await screen.findByLabelText('Tiêu đề cuộc họp')
    input('Tiêu đề', 'Họp định kỳ'); input('Bắt đầu', '2026-09-23T09:00')
    fireEvent.change(screen.getByLabelText('Tần suất'), { target: { value: 'WEEKLY' } })
    fireEvent.change(screen.getByLabelText('Số lần họp'), { target: { value: '3' } })
    click('Tạo cuộc họp')
    await waitFor(() => expect(api.createMeetingSeries).toHaveBeenCalledWith(2, {
      meeting: { title: 'Họp định kỳ', agenda: null, startAt: '2026-09-23T02:00:00.000Z', endAt: null, location: null, onlineUrl: null, participantUserIds: [] },
      recurrence: 'WEEKLY', occurrenceCount: 3,
    }))
    expect(api.createMeeting).not.toHaveBeenCalled()
  })

  it('still creates a single meeting when recurrence stays NONE', async () => {
    api.createMeeting.mockResolvedValue(meeting)
    mount({ path: '/project/meetings/new' })
    await screen.findByLabelText('Tiêu đề cuộc họp')
    input('Tiêu đề', 'Họp một lần'); input('Bắt đầu', '2026-09-23T09:00')
    click('Tạo cuộc họp')
    await waitFor(() => expect(api.createMeeting).toHaveBeenCalled())
    expect(api.createMeetingSeries).not.toHaveBeenCalled()
  })
})

describe('Meeting RSVP and notes lock (BE-06/N07)', () => {
  it('shows the series badge when the meeting belongs to a recurring series', async () => {
    api.getMeetingCollaboration.mockResolvedValue({
      meetingId: 42, concurrencyToken: 'meeting-token', seriesId: 's1', occurrenceNumber: 2, recurrence: 'WEEKLY',
      notesVersion: 1, notesLockedAt: null, notesLockedBy: null, canLockNotes: false, myRsvp: null, emailDeliveries: [], hasMoreEmailDeliveries: false,
    })
    mount()
    expect(await screen.findByText(/Thuộc chuỗi lặp Hàng tuần/)).toBeTruthy()
    expect(screen.getByText(/Lần thứ 2/)).toBeTruthy()
  })

  it('responds to an RSVP and reflects the server-returned status', async () => {
    api.respondMeetingRsvp.mockResolvedValue({ meetingId: 42, userId: 9, status: 'ACCEPTED', concurrencyToken: 'rsvp-token-2' })
    mount()
    const accept = await screen.findByRole('button', { name: 'Tham dự' })
    fireEvent.click(accept)
    await waitFor(() => expect(api.respondMeetingRsvp).toHaveBeenCalledWith(42, 'ACCEPTED', 'rsvp-token'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tham dự' }).getAttribute('aria-pressed')).toBe('true'))
    expect(screen.queryByText('Chưa phản hồi')).toBeNull()
    expect(screen.getByText(/^Phản hồi của bạn:/).textContent).not.toContain('INVITED')
    fireEvent.click(screen.getByRole('button', { name: 'Có thể' }))
    await waitFor(() => expect(api.respondMeetingRsvp).toHaveBeenLastCalledWith(42, 'TENTATIVE', 'rsvp-token-2'))
  })

  it('locks notes when canLockNotes is true and hides the edit trigger afterward', async () => {
    api.getMeetingCollaboration.mockResolvedValue({
      meetingId: 42, concurrencyToken: 'meeting-token', seriesId: null, occurrenceNumber: null, recurrence: 'NONE',
      notesVersion: 1, notesLockedAt: null, notesLockedBy: null, canLockNotes: true, myRsvp: null, emailDeliveries: [], hasMoreEmailDeliveries: false,
    })
    api.lockMeetingNotes.mockResolvedValue({
      meetingId: 42, concurrencyToken: 'meeting-token-2', seriesId: null, occurrenceNumber: null, recurrence: 'NONE',
      notesVersion: 2, notesLockedAt: '2026-09-23T04:00:00Z', notesLockedBy: 9, canLockNotes: false, myRsvp: null, emailDeliveries: [], hasMoreEmailDeliveries: false,
    })
    mount()
    const lockButton = await screen.findByRole('button', { name: 'Khóa biên bản' })
    fireEvent.click(lockButton)
    await waitFor(() => expect(api.lockMeetingNotes).toHaveBeenCalledWith(42, 'meeting-token'))
    expect(await screen.findByText(/Biên bản đã được khóa/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cập nhật biên bản' })).toBeNull()
  })

  it('expands the notes history panel and fetches the first page', async () => {
    api.getMeetingNotesHistory.mockResolvedValue({
      items: [{ id: 1, meetingId: 42, version: 1, isLocked: false, meetingNotes: 'Đã thống nhất demo', minutes: null, decisions: null, blockers: null, changedBy: 9, changedAt: '2026-09-23T03:30:00Z' }],
      page: 1, pageSize: 20, totalCount: 1, totalPages: 1,
    })
    mount()
    await screen.findByRole('heading', { name: 'Nội dung và địa điểm' })
    click('Xem lịch sử biên bản')
    await waitFor(() => expect(api.getMeetingNotesHistory).toHaveBeenCalledWith(42, 1, 20, expect.any(AbortSignal)))
    expect(await screen.findByText('Đã thống nhất demo')).toBeTruthy()
  })
})
