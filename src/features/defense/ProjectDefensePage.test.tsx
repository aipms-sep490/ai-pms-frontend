import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectDefensePage } from './ProjectDefensePage'
import { HttpError } from '../../services/http/http-client'

const mocks = vi.hoisted(() => ({ journey: { project: { id: 9 } as { id: number } | null }, getProjectDefenseSession: vi.fn() }))
vi.mock('../../app/context', () => ({ useStudentJourney: () => mocks.journey }))
vi.mock('./defense-api', () => ({ getProjectDefenseSession: mocks.getProjectDefenseSession }))

const render_ = () => render(<MemoryRouter><ProjectDefensePage /></MemoryRouter>)

beforeEach(() => { mocks.journey.project = { id: 9 } })
afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('ProjectDefensePage', () => {
  it('renders the schedule, location and committee roster', async () => {
    mocks.getProjectDefenseSession.mockResolvedValue({
      id: 1, committeeId: 2, projectId: 9, committeeName: 'HĐ CNTT 01',
      startAt: '2026-12-20T02:00:00Z', endAt: '2026-12-20T03:00:00Z', location: 'Phòng A1.01', status: 'SCHEDULED',
      members: [
        { userId: 3, userName: 'TS. An', role: 'CHAIR' },
        { userId: 4, userName: 'ThS. Bình', role: 'SECRETARY' },
      ],
    })
    render_()
    expect(await screen.findByText('HĐ CNTT 01', { exact: false })).toBeTruthy()
    expect(screen.getByText(/Phòng A1\.01/)).toBeTruthy()
    expect(screen.getByText('TS. An')).toBeTruthy()
    expect(screen.getByText('Chủ tịch')).toBeTruthy()
    expect(screen.getByText('Thư ký')).toBeTruthy()
    expect(screen.getByText('Đã lên lịch')).toBeTruthy()
  })

  it('shows an online link when there is no room', async () => {
    mocks.getProjectDefenseSession.mockResolvedValue({
      id: 1, committeeId: 2, projectId: 9, startAt: '2026-12-20T02:00:00Z', status: 'SCHEDULED',
      onlineUrl: 'https://meet.example.com/abc', members: [],
    })
    render_()
    expect((await screen.findByRole('link', { name: 'https://meet.example.com/abc' })).getAttribute('href')).toBe('https://meet.example.com/abc')
  })

  it('shows a not-scheduled message on 404', async () => {
    mocks.getProjectDefenseSession.mockRejectedValue(new HttpError('none', 404))
    render_()
    expect(await screen.findByText(/chưa được xếp lịch bảo vệ/)).toBeTruthy()
  })

  it('shows a distinct message when access is denied', async () => {
    mocks.getProjectDefenseSession.mockRejectedValue(new HttpError('forbidden', 403))
    render_()
    expect((await screen.findByRole('alert')).textContent).toContain('chưa có quyền')
  })

  it('handles no active project', async () => {
    mocks.journey.project = null
    render_()
    expect(await screen.findByText(/Không tìm thấy đồ án đang hoạt động/)).toBeTruthy()
    expect(mocks.getProjectDefenseSession).not.toHaveBeenCalled()
  })
})
