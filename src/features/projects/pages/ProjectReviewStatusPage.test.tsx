import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ProjectReviewStatusPage } from './ProjectReviewStatusPage'

const journey = vi.hoisted(() => ({ useStudentJourney: vi.fn() }))
const registration = vi.hoisted(() => ({ useProjectRegistration: vi.fn() }))
vi.mock('../../../app/context', () => journey)
vi.mock('../hooks/useProjectRegistration', () => registration)

const project = (status: string) => ({ id: 9, code: 'P-9', teamName: 'Team 4', title: 'Project', status })
const state = (status: string) => ({ status, canEdit: status === 'DRAFT' || status === 'REVISIONREQUIRED', latestRevision: status === 'REVISIONREQUIRED' ? { reason: 'Clarify scope', changedByName: 'Staff', changedAt: '2026-09-15' } : null, error: null, history: [], historyLoading: false, loadHistory: vi.fn() })

describe('ProjectReviewStatusPage', () => {
  afterEach(cleanup)
  beforeEach(() => {
    journey.useStudentJourney.mockReturnValue({ project: project('Draft'), isLoading: false, error: null, refreshAll: vi.fn() })
  })

  it.each([
    ['DRAFT', 'Bản nháp'], ['SUBMITTED', 'Đã nộp'], ['UNDERREVIEW', 'Đang thẩm định'],
    ['REVISIONREQUIRED', 'Cần chỉnh sửa'], ['REJECTED', 'Không được chấp thuận'], ['APPROVED', 'Đã được phê duyệt'],
  ])('renders backend %s state without a local transition control', (status, title) => {
    journey.useStudentJourney.mockReturnValue({ project: project(status), isLoading: false, error: null, refreshAll: vi.fn() })
    registration.useProjectRegistration.mockReturnValue(state(status))
    render(<MemoryRouter><ProjectReviewStatusPage /></MemoryRouter>)
    expect(screen.getByText(title)).toBeTruthy()
  })

  it('keeps revision feedback visible and only offers the student edit route', () => {
    journey.useStudentJourney.mockReturnValue({ project: project('RevisionRequired'), isLoading: false, error: null, refreshAll: vi.fn() })
    registration.useProjectRegistration.mockReturnValue(state('REVISIONREQUIRED'))
    render(<MemoryRouter><ProjectReviewStatusPage /></MemoryRouter>)
    expect(screen.getByText(/Clarify scope/)).toBeTruthy()
    expect(screen.getByText('Xem phản hồi và chỉnh sửa')).toBeTruthy()
    expect(screen.queryByText('Approve')).toBeNull()
  })
})
