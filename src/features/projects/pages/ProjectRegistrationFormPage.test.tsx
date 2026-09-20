/**
 * ProjectRegistrationFormPage – targeted behaviour tests
 *
 * Backend rules verified before writing:
 *  - edit_project_draft: allowed ONLY for team leader + status DRAFT|REVISION_REQUIRED
 *  - canEdit in form = isActionAllowed(projectActions?.actions, 'edit_project_draft')
 *  - null projectActions → isActionAllowed returns false → buttons disabled (correct)
 *  - REJECTED: isEditableLifecycle=false → read-only guard shown, no <form>
 *  - Prefill: useEffect fills fields from project.* when project exists
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectRegistrationFormPage } from './ProjectRegistrationFormPage'

const mocks = vi.hoisted(() => ({
  useStudentJourney: vi.fn(),
  navigate: vi.fn(),
  getHistory: vi.fn(),
}))

vi.mock('../../../app/context', () => ({
  useStudentJourney: mocks.useStudentJourney,
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

vi.mock('../../../services/service-gateway', () => ({
  services: {
    project: { getHistory: mocks.getHistory, updateDraft: vi.fn(), resubmit: vi.fn() },
    topic: { getTopicById: vi.fn() },
  },
}))

vi.mock('../../../app/config/env', () => ({
  env: { isMockMode: false },
}))

const baseTeam = {
  id: 1, academicSemesterId: 1, code: 'SEP490_G01', name: 'Team Alpha', status: 'ACTIVE',
  members: [
    { userId: 10, fullName: 'Le Van A', majorId: 3, isEligibleStudent: true, isLeader: true },
    { userId: 11, fullName: 'Tran Thi B', majorId: 3, isEligibleStudent: true, isLeader: false },
  ],
  eligibility: { canRegister: false, rosterLocked: true, reasons: [] },
  academicScope: null,
}

function makeProject(status: string) {
  return {
    id: 5, teamId: 1, teamName: 'Team Alpha', code: 'SEP490-FA26-ALPHA',
    title: 'Prefilled Project Title', status, concurrencyToken: 'tok',
    createdBy: 10, createdByName: 'Le Van A', createdAt: '2026-09-01', updatedAt: '2026-09-10',
    majors: [{ id: 1, majorId: 3, majorCode: 'SE', majorName: 'Software Engineering' }],
    tags: [], problemStatement: 'Prefilled problem.',
    objectives: 'Prefilled objectives.', expectedOutput: 'Prefilled output.',
  }
}

function makeProjectActions(allowEdit: boolean, allowResubmit: boolean) {
  return {
    asOfUtc: '2026-09-15T00:00:00Z', projectId: 5,
    status: 'REVISION_REQUIRED', concurrencyToken: 'tok',
    actions: [
      { code: 'edit_project_draft', allowed: allowEdit, issues: allowEdit ? [] : ['TEAM_LEADER_REQUIRED'] },
      { code: 'resubmit_project', allowed: allowResubmit, issues: allowResubmit ? [] : ['TEAM_LEADER_REQUIRED'] },
    ],
  }
}

/** Wait for the loading spinner/skeleton to clear */
async function waitForForm() {
  await waitFor(() => {
    expect(document.querySelector('.animate-pulse')).toBeNull()
  })
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ProjectRegistrationFormPage', () => {
  describe('REVISION_REQUIRED + leader + edit_project_draft granted by backend', () => {
    beforeEach(() => {
      mocks.useStudentJourney.mockReturnValue({
        project: makeProject('REVISION_REQUIRED'), team: baseTeam,
        profile: { id: 10, fullName: 'Le Van A', majorId: 3 },
        teamActions: null, projectActions: makeProjectActions(true, true),
        isLoading: false, error: null, refreshAll: vi.fn(),
      })
      mocks.getHistory.mockResolvedValue([])
    })

    it('renders the edit form — not the read-only guard', async () => {
      render(<ProjectRegistrationFormPage />, { wrapper: MemoryRouter })
      await waitForForm()
      expect(document.querySelector('form')).not.toBeNull()
    })

    it('prefills title from existing project data', async () => {
      render(<ProjectRegistrationFormPage />, { wrapper: MemoryRouter })
      await waitForForm()
      // Wait for useEffect to populate state from project
      const titleInput = await screen.findByDisplayValue('Prefilled Project Title')
      expect(titleInput).toBeDefined()
    })

    it('renders STUDENT_PROPOSAL provenance from the Backend Project', async () => {
      render(<ProjectRegistrationFormPage />, { wrapper: MemoryRouter })
      await waitForForm()
      expect(screen.getByText('STUDENT_PROPOSAL')).toBeTruthy()
      expect(screen.getByText(/Đề tài do sinh viên đề xuất/)).toBeTruthy()
    })

    it('renders the Backend-selected Published Topic without copying its content into the draft', async () => {
      mocks.useStudentJourney.mockReturnValue({
        project: { ...makeProject('REVISION_REQUIRED'), proposalSource: 'PUBLISHED_TOPIC', selectedTopic: { id: 5, code: 'TOP-5', title: 'AI topic' } }, team: baseTeam,
        profile: { id: 10, fullName: 'Le Van A', majorId: 3 }, teamActions: null, projectActions: makeProjectActions(true, true), isLoading: false, error: null, refreshAll: vi.fn(),
      })
      render(<ProjectRegistrationFormPage />, { wrapper: MemoryRouter })
      await waitForForm()
      expect(screen.getByText('PUBLISHED_TOPIC')).toBeTruthy()
      expect(screen.getByText(/TOP-5 · AI topic/)).toBeTruthy()
      expect(screen.getByDisplayValue('Prefilled Project Title')).toBeTruthy()
    })

    it('Save Draft button is ENABLED when edit_project_draft is explicitly granted', async () => {
      render(<ProjectRegistrationFormPage />, { wrapper: MemoryRouter })
      await waitForForm()
      const saveBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('save') || b.textContent?.includes('Lưu'))
      expect(saveBtn).toBeDefined()
      expect((saveBtn as HTMLButtonElement).disabled).toBe(false)
    })
  })

  describe('REVISION_REQUIRED + projectActions null (backend response not yet received)', () => {
    it('Save Draft button is DISABLED while projectActions is null', async () => {
      mocks.useStudentJourney.mockReturnValue({
        project: makeProject('REVISION_REQUIRED'), team: baseTeam,
        profile: { id: 10, fullName: 'Le Van A', majorId: 3 },
        teamActions: null,
        projectActions: null,  // not yet loaded — backend actions authoritative
        isLoading: false, error: null, refreshAll: vi.fn(),
      })
      mocks.getHistory.mockResolvedValue([])

      render(<ProjectRegistrationFormPage />, { wrapper: MemoryRouter })
      await waitForForm()
      const saveBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('save') || b.textContent?.includes('Lưu'))
      expect(saveBtn).toBeDefined()
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('REVISION_REQUIRED + non-leader (backend denies edit_project_draft)', () => {
    it('Save Draft button is DISABLED when backend denies edit_project_draft for non-leader', async () => {
      mocks.useStudentJourney.mockReturnValue({
        project: makeProject('REVISION_REQUIRED'),
        team: baseTeam,
        profile: { id: 11, fullName: 'Tran Thi B', majorId: 3 },
        teamActions: null,
        projectActions: makeProjectActions(false, false),
        isLoading: false, error: null, refreshAll: vi.fn(),
      })
      mocks.getHistory.mockResolvedValue([])

      render(<ProjectRegistrationFormPage />, { wrapper: MemoryRouter })
      await waitForForm()
      const saveBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('save') || b.textContent?.includes('Lưu'))
      expect(saveBtn).toBeDefined()
      expect((saveBtn as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('REJECTED — read-only guard (backend blocks edit + resubmit)', () => {
    beforeEach(() => {
      mocks.useStudentJourney.mockReturnValue({
        project: makeProject('REJECTED'), team: baseTeam,
        profile: { id: 10, fullName: 'Le Van A', majorId: 3 },
        teamActions: null, projectActions: null,
        isLoading: false, error: null, refreshAll: vi.fn(),
      })
      mocks.getHistory.mockResolvedValue([])
    })

    it('shows read-only guard section instead of the edit form', async () => {
      render(<ProjectRegistrationFormPage />, { wrapper: MemoryRouter })
      await waitForForm()
      expect(document.querySelector('form')).toBeNull()
      expect(document.querySelector('section')).not.toBeNull()
    })

    it('does NOT render any form input fields for REJECTED project', async () => {
      render(<ProjectRegistrationFormPage />, { wrapper: MemoryRouter })
      await waitForForm()
      expect(document.querySelector('textarea')).toBeNull()
    })

    it('starts a clean draft on /project/register when Backend grants create_project_draft', async () => {
      mocks.useStudentJourney.mockReturnValue({
        project: makeProject('REJECTED'),
        team: { ...baseTeam, eligibility: { canRegister: true, rosterLocked: true, reasons: [] } },
        profile: { id: 10, fullName: 'Le Van A', majorId: 3 },
        teamActions: { canRegister: true, actions: [{ code: 'create_project_draft', allowed: true, issues: [] }] },
        projectActions: null,
        isLoading: false, error: null, refreshAll: vi.fn(),
      })

      render(<MemoryRouter initialEntries={['/project/register']}><ProjectRegistrationFormPage /></MemoryRouter>)
      await waitForForm()
      expect(document.querySelector('form')).not.toBeNull()
      expect(screen.queryByDisplayValue('Prefilled Project Title')).toBeNull()
      expect(screen.getByText(/Đăng ký đề tài mới sau khi đề tài trước bị từ chối/)).toBeTruthy()
    })
  })

  describe('SUBMITTED — read-only guard', () => {
    it('shows read-only guard for SUBMITTED project', async () => {
      mocks.useStudentJourney.mockReturnValue({
        project: makeProject('SUBMITTED'), team: baseTeam,
        profile: { id: 10, fullName: 'Le Van A', majorId: 3 },
        teamActions: null, projectActions: null,
        isLoading: false, error: null, refreshAll: vi.fn(),
      })
      mocks.getHistory.mockResolvedValue([])

      render(<ProjectRegistrationFormPage />, { wrapper: MemoryRouter })
      await waitForForm()
      expect(document.querySelector('form')).toBeNull()
    })
  })
})
