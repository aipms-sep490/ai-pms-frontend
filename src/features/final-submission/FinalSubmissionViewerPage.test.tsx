import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const api = vi.hoisted(() => ({ getLockedFinalSubmission: vi.fn(), downloadLockedFile: vi.fn() }))
vi.mock('./final-submission-api', () => api)

import { FinalSubmissionViewerPage } from './FinalSubmissionPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('FinalSubmissionViewerPage', () => {
  it('returns from evidence to the scoring assignment that opened it', async () => {
    api.getLockedFinalSubmission.mockResolvedValue(null)
    render(<MemoryRouter initialEntries={[{ pathname: '/evaluator/projects/9/final-submission', state: { assignmentReturn: '/evaluator/assignments/41' } }]}><Routes><Route path="/evaluator/projects/:projectId/final-submission" element={<FinalSubmissionViewerPage backTo="/evaluator/workspace" />} /></Routes></MemoryRouter>)
    await screen.findByText('Đồ án chưa chốt gói bàn giao cuối kỳ.')
    expect(screen.getByRole('link', { name: 'Quay lại chấm điểm' }).getAttribute('href')).toBe('/evaluator/assignments/41')
  })
  it('renders only the immutable package snapshot for an authorized reader', async () => {
    api.getLockedFinalSubmission.mockResolvedValue({ id: 7, projectId: 9, projectPeriodId: 3, status: 'LOCKED', isLocked: true, submittedBy: 2, submittedAt: '2026-09-28T00:00:00Z', deadline: '2026-09-29T00:00:00Z', notes: 'Final review complete', items: [{ deliverableVersionId: 11, deliverableId: 4, title: 'Báo cáo cuối', versionNumber: 2, statusAtSubmission: 'ACCEPTED', wasRequired: true, files: [{ id: 21, fileName: 'final.pdf', contentType: 'application/pdf', sizeBytes: 2048 }] }] })
    render(<MemoryRouter initialEntries={['/evaluator/projects/9/final-submission']}><Routes><Route path="/evaluator/projects/:projectId/final-submission" element={<FinalSubmissionViewerPage backTo="/evaluator/evaluations" backLabel="Danh sách assignments" />} /></Routes></MemoryRouter>)

    expect(await screen.findByText('Gói đã khóa và nộp')).toBeTruthy()
    expect(screen.getByText(/Bản bàn giao đã chốt #7/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /final.pdf/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nộp và khóa gói' })).toBeNull()
    expect(api.getLockedFinalSubmission).toHaveBeenCalledWith(9)
  })

  it('does not invent a package when Backend returns no locked snapshot', async () => {
    api.getLockedFinalSubmission.mockResolvedValue(null)
    render(<MemoryRouter initialEntries={['/department/projects/9/final-submission']}><Routes><Route path="/department/projects/:projectId/final-submission" element={<FinalSubmissionViewerPage />} /></Routes></MemoryRouter>)
    expect(await screen.findByText('Đồ án chưa chốt gói bàn giao cuối kỳ.')).toBeTruthy()
  })
})
