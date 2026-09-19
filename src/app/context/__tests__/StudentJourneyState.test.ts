import { describe, it, expect } from 'vitest'
import type { TeamDto, ProjectDto, SupervisorAssignmentDto } from '../../../types/backend'
import type { StudentJourneyState } from '../../../features/auth/types/student-journey.types'
import { resolveStudentNextAction } from '../../../features/auth/utils/resolve-student-next-action'
import { resolveStudentJourneyState } from '../resolve-student-journey-state'

function computeStudentJourneyState(
  team: TeamDto | null,
  project: ProjectDto | null,
  assignments: SupervisorAssignmentDto[],
): StudentJourneyState {
  return resolveStudentJourneyState(team, project, assignments, null)
}

describe('computeStudentJourneyState', () => {
  const dummyTeam: TeamDto = {
    id: 1,
    academicSemesterId: 1,
    code: 'SE01',
    name: 'Team 1',
    status: 'ELIGIBLE',
    members: [],
    eligibility: {
      canRegister: true,
      rosterLocked: false,
      reasons: [],
    },
  }

  const dummyProject: ProjectDto = {
    id: 10,
    teamId: 1,
    teamName: 'Team 1',
    code: 'PRJ01',
    title: 'Capstone AI',
    status: 'Draft',
    registeredAt: '2026-09-01T00:00:00Z',
    createdBy: 1,
    createdByName: 'Student A',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    concurrencyToken: 'token1',
    majors: [],
    tags: [],
  }

  const activePrimaryAssignment: SupervisorAssignmentDto = {
    id: 1,
    projectId: 10,
    supervisorProfileId: 100,
    supervisorUserId: 200,
    supervisorName: 'Dr. John',
    supervisorRequestId: 5,
    isPrimary: true,
    assignedAt: '2026-09-05T00:00:00Z',
  }

  it('returns NO_TEAM when student has no team', () => {
    expect(computeStudentJourneyState(null, null, [])).toBe('NO_TEAM')
  })

  it('returns TEAM_FORMING when team eligibility cannot register', () => {
    const formingTeam: TeamDto = {
      ...dummyTeam,
      status: 'FORMING',
      eligibility: { canRegister: false, rosterLocked: false, reasons: ['TOO_FEW_MEMBERS'] },
    }
    expect(computeStudentJourneyState(formingTeam, null, [])).toBe('TEAM_FORMING')
  })

  it('keeps DRAFT project state primary over roster state and routes it to editing', () => {
    expect(computeStudentJourneyState(dummyTeam, null, [])).toBe('TEAM_ELIGIBLE')
    expect(computeStudentJourneyState(dummyTeam, dummyProject, [])).toBe('TEAM_ELIGIBLE')
    expect(resolveStudentNextAction({ journeyState: 'TEAM_ELIGIBLE', projectStatus: dummyProject.status }).route).toBe('/project/edit')
  })

  it('returns PROJECT_PENDING when project is submitted or under review', () => {
    const submittedProject: ProjectDto = { ...dummyProject, status: 'Submitted' }
    expect(computeStudentJourneyState(dummyTeam, submittedProject, [])).toBe('PROJECT_PENDING')

    const underReviewProject: ProjectDto = { ...dummyProject, status: 'UnderReview' }
    expect(computeStudentJourneyState(dummyTeam, underReviewProject, [])).toBe('PROJECT_PENDING')
  })

  it('returns REVISION_REQUIRED when project is returned with revision request', () => {
    const revisionProject: ProjectDto = { ...dummyProject, status: 'RevisionRequired' }
    expect(computeStudentJourneyState(dummyTeam, revisionProject, [])).toBe('REVISION_REQUIRED')
  })

  it('keeps APPROVED projects SUPERVISOR_PENDING even with an active primary assignment', () => {
    const approvedProject: ProjectDto = { ...dummyProject, status: 'Approved' }
    expect(computeStudentJourneyState(dummyTeam, approvedProject, [activePrimaryAssignment])).toBe('SUPERVISOR_PENDING')
  })

  it('keeps SUPERVISOR_PENDING projects in the supervisor flow even with an active primary assignment', () => {
    const pendingProject: ProjectDto = { ...dummyProject, status: 'SupervisorPending' }
    expect(computeStudentJourneyState(dummyTeam, pendingProject, [activePrimaryAssignment])).toBe('SUPERVISOR_PENDING')
    expect(resolveStudentNextAction({ journeyState: 'SUPERVISOR_PENDING', projectStatus: pendingProject.status }).route).toBe('/project/supervisor')
  })

  it('returns ACTIVE only for Backend Project status ACTIVE', () => {
    expect(computeStudentJourneyState(dummyTeam, { ...dummyProject, status: 'Active' }, [activePrimaryAssignment])).toBe('ACTIVE')
  })

  it('does not treat an ended primary assignment as ACTIVE', () => {
    const approvedProject: ProjectDto = { ...dummyProject, status: 'Approved' }
    const endedAssignment: SupervisorAssignmentDto = {
      id: 1,
      projectId: 10,
      supervisorProfileId: 100,
      supervisorUserId: 200,
      supervisorName: 'Dr. John',
      supervisorRequestId: 5,
      isPrimary: true,
      assignedAt: '2026-09-05T00:00:00Z',
      endedAt: '2026-09-06T00:00:00Z',
    }
    expect(computeStudentJourneyState(dummyTeam, approvedProject, [endedAssignment])).toBe('SUPERVISOR_PENDING')
  })

  it('returns PROJECT_REJECTED for a Backend rejected project', () => {
    expect(computeStudentJourneyState(dummyTeam, { ...dummyProject, status: 'Rejected' }, [])).toBe('PROJECT_REJECTED')
  })

  it('keeps an active project active even when its roster is locked', () => {
    const lockedTeam: TeamDto = {
      ...dummyTeam,
      status: 'LOCKED',
      eligibility: { canRegister: false, rosterLocked: true, reasons: ['ROSTER_LOCKED'] },
    }
    expect(computeStudentJourneyState(lockedTeam, { ...dummyProject, status: 'Active' }, [])).toBe('ACTIVE')
  })
})
