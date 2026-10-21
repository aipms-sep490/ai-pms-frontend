import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthSessionContext } from '../../auth/context/auth-session-context'
import type { AuthSessionContextValue } from '../../auth/context/auth-session-context'
import { StudentReviewTimelinePage } from './StudentReviewTimelinePage'
import { AssignedGateReviewPage } from './AssignedGateReviewPage'

vi.mock('../../../app/config/env', () => ({ env: { reviewGatesMockEnabled: false, apiBaseUrl: '/api/v1' } }))

const requirement = { id: '21', code: 'DOC', title: 'Report', type: 'DOCUMENT', scope: 'COMMON', isMandatory: true, verificationStatus: 'REJECTED', latestArtifact: null }
const gate = { gateInstanceId: '11', code: 'R1', title: 'Review', objective: '', status: 'REVISION_REQUIRED', reviewEligibility: 'BLOCKED', isRequired: true, windowStart: null, windowEnd: null, concurrencyToken: 'gate-token', blockingReasons: [], requirements: [requirement] }
const timeline = { projectId: '1', projectCode: 'P1', projectName: 'Real contract project', projectMode: 'SINGLE_MAJOR', major: 'Engineering', effectivePolicyVersion: '1', currentGateCode: 'R1', gates: [gate], capabilities: { canSubmitPackage: false, canSubmitRevision: true, blockingReasons: [] } }
const assignment = { id: '31', projectId: '1', projectCode: 'P1', projectName: 'Real contract project', gateCode: 'R1', gateTitle: 'Review', scope: 'COMMON', dueAt: null, status: 'PENDING_REVIEW', requirements: [{ ...requirement, verificationStatus: 'SUBMITTED', latestArtifact: { filename: 'report.pdf', version: 1, submittedAt: '2026-10-20', submittedBy: '1', downloadUrl: '/api/v1/projects/1/review-gates/R1/requirements/21/evidence/1/download' } }], concurrencyToken: 'assignment-token' }
const fetchMock = vi.fn<typeof fetch>()
const auth: AuthSessionContextValue = {
  session: { user: { id: 1, email: 'student@example.test', fullName: 'Student', roles: ['STUDENT'] }, accessToken: 'test', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: 'test', refreshTokenExpiresAtUtc: '' },
  status: 'authenticated', error: null, login: vi.fn(), logout: vi.fn(), refreshProfile: vi.fn(), restoreSession: vi.fn(),
}

describe('Review Gates UI using real contract (controlled HTTP responses)', () => {
  beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); fetchMock.mockResolvedValue(Response.json(timeline)) })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('allows a STUDENT contextual leader to revise from the server capability', async () => {
    render(<AuthSessionContext.Provider value={auth}><MemoryRouter><StudentReviewTimelinePage /></MemoryRouter></AuthSessionContext.Provider>)
    const button = await screen.findByRole('button', { name: 'Nộp bản sửa' })
    expect((button as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(button)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Liên kết ngoài/ })).toBeNull()
  })

  it('does not enable uploads on a future locked gate using the current gate capability', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...timeline, gates: [gate, { ...gate, gateInstanceId: '12', code: 'R2', title: 'Future review', status: 'LOCKED' }] }))
    render(<AuthSessionContext.Provider value={auth}><MemoryRouter><StudentReviewTimelinePage /></MemoryRouter></AuthSessionContext.Provider>)
    fireEvent.click(await screen.findByRole('button', { name: /R2/ }))
    const buttons = screen.getAllByRole('button', { name: /Nộp bản sửa/ })
    expect(buttons.every(button => (button as HTMLButtonElement).disabled)).toBe(true)
  })

  it('lets the leader revise an accepted artifact when the gate decision requires revision', async () => {
    fetchMock.mockResolvedValue(Response.json({ ...timeline, gates: [{ ...gate, requirements: [{ ...requirement, verificationStatus: 'ACCEPTED' }] }] }))
    render(<AuthSessionContext.Provider value={auth}><MemoryRouter><StudentReviewTimelinePage /></MemoryRouter></AuthSessionContext.Provider>)
    expect((await screen.findByRole('button', { name: 'Nộp bản sửa' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('loads the paged queue and keeps notes after a structured 409 and refresh', async () => {
    fetchMock.mockImplementation(async (_url, init) => init?.method === 'POST'
      ? Response.json({ detail: 'The review gate changed; reload before retrying.' }, { status: 409 })
      : Response.json({ items: [assignment], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 }))
    render(<MemoryRouter><AssignedGateReviewPage /></MemoryRouter>)
    await screen.findByText('Hàng đợi Thẩm định (1)')
    const notes = screen.getByPlaceholderText(/Nhập chi tiết đánh giá/)
    fireEvent.change(notes, { target: { value: 'Keep my review draft' } })
    fireEvent.click(screen.getByRole('button', { name: /Yêu cầu nhóm chỉnh sửa/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tải lại dữ liệu mới nhất' }))
    expect((await screen.findByPlaceholderText(/Nhập chi tiết đánh giá/)).getAttribute('placeholder')).toBeTruthy()
    expect((screen.getByPlaceholderText(/Nhập chi tiết đánh giá/) as HTMLTextAreaElement).value).toBe('Keep my review draft')
  })
})
