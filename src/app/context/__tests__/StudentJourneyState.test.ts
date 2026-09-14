import { describe, it, expect } from 'vitest'
import type { TeamDto, ProjectDto, SupervisorAssignmentDto } from '../../../types/backend'
import type { StudentJourneyState } from '../../../features/auth/types/student-journey.types'

function computeStudentJourneyState(
  team: TeamDto | null,
  project: ProjectDto | null,
  assignments: SupervisorAssignmentDto[],
): StudentJourneyState {
  if (!team) {
    return 'NO_TEAM'
  }
  if (team.status === 'FORMING' || !team.eligibility?.canRegister) {
    return 'TEAM_FORMING'
  }
  if (!project || project.status === 'Draft') {
    return 'TEAM_ELIGIBLE'
  }
  if (project.status === 'Submitted' || project.status === 'UnderReview') {
    return 'PROJECT_PENDING'
  }
  if (project.status === 'RevisionRequired') {
    return 'REVISION_REQUIRED'
  }
  if (project.status === 'Approved') {
    if (assignments.some((a) => a.isPrimary)) {
      return 'ACTIVE'
    }
    return 'SUPERVISOR_PENDING'
  }
  if (project.status === 'Active') {
    return 'ACTIVE'
  }
  return 'TEAM_ELIGIBLE'
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
      rosterLocked: true,
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

  it('returns TEAM_ELIGIBLE when team can register but project is draft or null', () => {
    expect(computeStudentJourneyState(dummyTeam, null, [])).toBe('TEAM_ELIGIBLE')
    expect(computeStudentJourneyState(dummyTeam, dummyProject, [])).toBe('TEAM_ELIGIBLE')
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

  it('returns SUPERVISOR_PENDING when project is approved but no supervisor assigned yet', () => {
    const approvedProject: ProjectDto = { ...dummyProject, status: 'Approved' }
    expect(computeStudentJourneyState(dummyTeam, approvedProject, [])).toBe('SUPERVISOR_PENDING')
  })

  it('returns ACTIVE when project is approved and primary supervisor is assigned', () => {
    const approvedProject: ProjectDto = { ...dummyProject, status: 'Approved' }
    const assignment: SupervisorAssignmentDto = {
      id: 1,
      projectId: 10,
      supervisorProfileId: 100,
      supervisorUserId: 200,
      supervisorName: 'Dr. John',
      supervisorRequestId: 5,
      isPrimary: true,
      assignedAt: '2026-09-05T00:00:00Z',
    }
    expect(computeStudentJourneyState(dummyTeam, approvedProject, [assignment])).toBe('ACTIVE')
  })
})
