/**
 * ProjectReviewStatusPage – targeted behaviour tests
 *
 * Backend research results (embedded so tests are self-documenting):
 *
 * - REVISION_REQUIRED: backend workflow returns edit_project_draft=allowed for leader.
 *   Page shows "Chinh sua & Nop lai" button navigating to /project/edit.
 *   Authorization enforced at form layer by backend projectActions.
 *
 * - REJECTED: ProjectStateMachine has Rejected=[] — no transitions allowed.
 *   HasActiveProjectAsync EXCLUDES REJECTED from ActiveStatuses, so the same team
 *   CAN create a new project draft. "Dang ky De tai Moi" CTA is backend-backed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectReviewStatusPage } from './ProjectReviewStatusPage'

const mocks = vi.hoisted(() => ({
  useStudentJourney: vi.fn(),
  getHistory: vi.fn(),
}))

vi.mock('../../../app/context', () => ({
  useStudentJourney: mocks.useStudentJourney,
}))

vi.mock('../../../services/service-gateway', () => ({
  services: {
    project: {
      getHistory: mocks.getHistory,
      simulateDepartmentReview: vi.fn(),
    },
  },
}))

const baseTeam = {
  id: 1, academicSemesterId: 1, code: 'SEP490_G01', name: 'Team Alpha', status: 'ACTIVE',
  members: [
    { userId: 10, fullName: 'Le Van A', majorId: 3, isEligibleStudent: true, isLeader: true },
    { userId: 11, fullName: 'Tran Thi B', majorId: 3, isEligibleStudent: true, isLeader: false },
  ],
  eligibility: { canRegister: false, rosterLocked: true, reasons: [] },
}

function makeProject(status: string) {
  return {
    id: 5, teamId: 1, teamName: 'Team Alpha', code: 'SEP490-FA26-ALPHA',
    title: 'Project Title', status, concurrencyToken: 'tok',
    createdBy: 10, createdByName: 'Le Van A', createdAt: '2026-09-01', updatedAt: '2026-09-10',
    majors: [{ id: 1, majorId: 3, majorCode: 'SE', majorName: 'Software Engineering' }],
    tags: [], problemStatement: 'Problem.', objectives: 'Objectives.', expectedOutput: 'Output.',
  }
}

function journeyFor(status: string) {
  return {
    project: makeProject(status), team: baseTeam,
    profile: { id: 10 }, isLoading: false, error: null, refreshAll: vi.fn(),
  }
}

/**
 * Wait for the page's main h1 to appear — signals that isLoadingHistory resolved
 * and the full page has rendered (skeleton cleared).
 */
async function waitForPageReady() {
  await screen.findByRole('heading', { level: 1 })
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ProjectReviewStatusPage', () => {
  describe('REVISION_REQUIRED', () => {
    beforeEach(() => {
      mocks.useStudentJourney.mockReturnValue(journeyFor('REVISION_REQUIRED'))
      mocks.getHistory.mockResolvedValue([{
        id: 1, oldStatus: 'UNDER_REVIEW', newStatus: 'REVISION_REQUIRED',
        changedByName: 'Coord', changedAt: '2026-09-12T10:00:00Z',
        reason: 'Can sua kien truc.',
      }])
    })

    it('shows Edit & Resubmit button when project is REVISION_REQUIRED', async () => {
      render(<ProjectReviewStatusPage />, { wrapper: MemoryRouter })
      await waitForPageReady()
      const buttons = screen.getAllByRole('button')
      const editBtn = buttons.find(b => b.className.includes('bg-amber-600') || b.textContent?.includes('edit_note'))
      expect(editBtn).toBeDefined()
    })

    it('does NOT show Register New Project CTA when status is REVISION_REQUIRED', async () => {
      render(<ProjectReviewStatusPage />, { wrapper: MemoryRouter })
      await waitForPageReady()
      const buttons = screen.getAllByRole('button')
      const newBtn = buttons.find(b => b.className.includes('bg-rose-600') || b.textContent?.includes('add_circle'))
      expect(newBtn).toBeUndefined()
    })

    it('displays revision reason from history via RevisionAlert', async () => {
      render(<ProjectReviewStatusPage />, { wrapper: MemoryRouter })
      await waitForPageReady()
      await waitFor(() => {
        expect(document.body.textContent).toContain('Can sua kien truc.')
      })
    })
  })

  describe('REJECTED', () => {
    beforeEach(() => {
      mocks.useStudentJourney.mockReturnValue(journeyFor('REJECTED'))
      mocks.getHistory.mockResolvedValue([{
        id: 1, oldStatus: 'UNDER_REVIEW', newStatus: 'REJECTED',
        changedByName: 'Coord', changedAt: '2026-09-12T10:00:00Z',
        reason: 'Khong du tieu chi.',
      }])
    })

    it('NEVER shows Edit & Resubmit button when project is REJECTED', async () => {
      render(<ProjectReviewStatusPage />, { wrapper: MemoryRouter })
      await waitForPageReady()
      const buttons = screen.getAllByRole('button')
      const editBtn = buttons.find(b => b.className.includes('bg-amber-600') || b.textContent?.includes('edit_note'))
      expect(editBtn).toBeUndefined()
    })

    it('shows Register New Project CTA — backend allows create_project_draft after REJECTED', async () => {
      render(<ProjectReviewStatusPage />, { wrapper: MemoryRouter })
      await waitForPageReady()
      const buttons = screen.getAllByRole('button')
      const newBtns = buttons.filter(b => b.className.includes('bg-rose-600') || b.textContent?.includes('add_circle'))
      expect(newBtns.length).toBeGreaterThanOrEqual(1)
    })

    it('shows the rose-coloured rejection banner when status is REJECTED', async () => {
      render(<ProjectReviewStatusPage />, { wrapper: MemoryRouter })
      await waitForPageReady()
      const banner = document.querySelector('.bg-rose-50.border-rose-200.rounded-2xl')
      expect(banner).not.toBeNull()
    })

    it('shows rejection reason from history inside the banner', async () => {
      render(<ProjectReviewStatusPage />, { wrapper: MemoryRouter })
      await waitForPageReady()
      const elems = await screen.findAllByText((_, el) => Boolean(el?.textContent?.includes('Khong du tieu chi.')))
      expect(elems.length).toBeGreaterThan(0)
    })
  })

  describe('other statuses — no edit CTA', () => {
    it('SUBMITTED: does not show Edit & Resubmit button', async () => {
      mocks.useStudentJourney.mockReturnValue(journeyFor('SUBMITTED'))
      mocks.getHistory.mockResolvedValue([])
      render(<ProjectReviewStatusPage />, { wrapper: MemoryRouter })
      await waitForPageReady()
      const buttons = screen.getAllByRole('button')
      expect(buttons.find(b => b.className.includes('bg-amber-600'))).toBeUndefined()
    })

    it('APPROVED: does not show Edit & Resubmit button', async () => {
      mocks.useStudentJourney.mockReturnValue(journeyFor('APPROVED'))
      mocks.getHistory.mockResolvedValue([])
      render(<ProjectReviewStatusPage />, { wrapper: MemoryRouter })
      await waitForPageReady()
      const buttons = screen.getAllByRole('button')
      expect(buttons.find(b => b.className.includes('bg-amber-600'))).toBeUndefined()
    })
  })
})