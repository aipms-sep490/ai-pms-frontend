export interface WorkflowActionDto {
  code: string
  allowed: boolean
  reasons: string[]
}

export interface WorkflowUserDto {
  id: number
  email: string
  fullName: string
  status: string
  studentCode?: string | null
  employeeCode?: string | null
  roles: string[]
  grantedPermissions: string[]
  effectiveRoles: string[]
  requiresTokenRefresh: boolean
}

export interface AcademicReferenceDto {
  id: number
  code: string
  name: string
  isActive: boolean
}

export interface WorkflowSemesterDto {
  id: number
  organizationId: number
  code: string
  name: string
  status: string
  startDate: string
  endDate: string
  isCurrent: boolean
}

export interface WorkflowPeriodDto {
  id: number
  code: string
  name: string
  periodType: string
  status: string
  startAtUtc: string
  endAtUtc: string
  isOpen: boolean
}

export interface WorkflowTeamSummaryDto {
  id: number
  code: string
  name: string
  status: string
  isLeader: boolean
  projectId?: number | null
  projectStatus?: string | null
}

export interface UserWorkflowContextDto {
  asOfUtc: string
  user: WorkflowUserDto
  academic: {
    organization?: AcademicReferenceDto | null
    department?: AcademicReferenceDto | null
    major?: AcademicReferenceDto | null
    hasActiveDepartmentScope: boolean
    hasEligibleStudentProfile: boolean
    issues: string[]
  }
  currentSemesters: WorkflowSemesterDto[]
  selectedSemester?: WorkflowSemesterDto | null
  semesterSelectionIssues: string[]
  periods: WorkflowPeriodDto[]
  currentTeam?: WorkflowTeamSummaryDto | null
  actions: WorkflowActionDto[]
}

export interface TeamWorkflowActionsDto {
  asOfUtc: string
  teamId: number
  academicSemesterId: number
  status: string
  academicScopeConcurrencyToken?: string | null
  canRegister: boolean
  eligibilityIssues: string[]
  actions: WorkflowActionDto[]
}

export interface ProjectWorkflowActionsDto {
  asOfUtc: string
  projectId: number
  status: string
  concurrencyToken: string
  submissionSnapshotId?: number | null
  actorDepartmentId?: number | null
  actions: WorkflowActionDto[]
}

export function isActionAllowed(actions: WorkflowActionDto[], code: string): boolean {
  return actions.some((action) => action.code === code && action.allowed)
}
