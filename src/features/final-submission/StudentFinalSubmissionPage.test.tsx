import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const finalApi = vi.hoisted(() => ({ getFinalPeriods: vi.fn(), getFinalDraft: vi.fn(), getFinalChecklist: vi.fn(), getLockedFinalSubmission: vi.fn(), createFinalDraft: vi.fn(), updateFinalDraft: vi.fn(), submitFinalSubmission: vi.fn(), getFinalRequirements: vi.fn(), configureFinalRequirements: vi.fn(), downloadLockedFile: vi.fn() }))
const deliverablesApi = vi.hoisted(() => ({ getDeliverables: vi.fn(), getDeliverableVersions: vi.fn() }))
vi.mock('./final-submission-api', () => finalApi)
vi.mock('../../services/api/deliverables.api', () => deliverablesApi)
vi.mock('../../app/context', () => ({ useStudentJourney: () => ({ isLoading: false, project: { id: 9, status: 'COMPLETED' }, refreshAll: vi.fn() }) }))

import { StudentFinalSubmissionPage } from './FinalSubmissionPage'

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('StudentFinalSubmissionPage', () => {
  it('keeps draft and submit controls disabled outside the backend-derived ACTIVE state', async () => {
    finalApi.getFinalPeriods.mockResolvedValue({ items: [{ id: 3, name: 'Final', status: 'ACTIVE', startAt: '', endAt: '', canPrepareDraft: true, blockers: [] }], page: 1, pageSize: 100, totalCount: 1 })
    finalApi.getFinalDraft.mockResolvedValue(null)
    finalApi.getFinalChecklist.mockResolvedValue({ projectId: 9, projectPeriodId: 3, deadline: null, draftConcurrencyToken: 'draft', requirementsConcurrencyToken: 'requirements', canSubmit: true, blockers: [], items: [] })
    finalApi.getLockedFinalSubmission.mockResolvedValue(null)
    deliverablesApi.getDeliverables.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 })
    render(<MemoryRouter><StudentFinalSubmissionPage /></MemoryRouter>)

    expect(await screen.findByText('Bản nháp bàn giao')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Tạo bản nháp' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Nộp và khóa gói' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
