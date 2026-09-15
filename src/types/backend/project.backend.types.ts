export type BackendProjectStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'RevisionRequired'
  | 'Rejected'
  | 'Approved'
  | 'SupervisorPending'
  | 'Active'
  | 'FinalSubmission'
  | 'Completed'
  | 'Archived'

export interface ProjectMajorDto {
  id: number
  majorId: number
  majorCode: string
  majorName: string
}

export interface ProjectTagDto {
  id: number
  name: string
  tagType: string
}

export interface ProjectStatusHistoryDto {
  id: number
  projectId: number
  oldStatus?: string | null
  newStatus: string
  changedBy: number
  changedByName: string
  reason?: string | null
  changedAt: string
}

export interface ProjectDto {
  id: number
  teamId: number
  teamName: string
  code: string
  title: string
  description?: string | null
  objectives?: string | null
  status: BackendProjectStatus | string
  registeredAt: string
  submittedAt?: string | null
  approvedAt?: string | null
  completedAt?: string | null
  createdBy: number
  createdByName: string
  createdAt: string
  updatedAt: string
  problemStatement?: string | null
  expectedOutput?: string | null
  concurrencyToken: string
  majors: ProjectMajorDto[]
  tags: ProjectTagDto[]
  /**
   * Backend-governed team scope captured on the project when it is available.
   * It is display-only in the student registration UI.
   */
  academicScope?: import('./team.backend.types').TeamAcademicScopeDto | null
}

export interface ProjectSummaryDto {
  id: number
  teamId: number
  teamName: string
  code: string
  title: string
  status: string
  createdAt: string
  submittedAt?: string | null
  majors: ProjectMajorDto[]
  tags: ProjectTagDto[]
}

export interface ProjectStateDto {
  name: string
  allowedNextStates: string[]
}

export interface ProjectLifecycleDto {
  states: ProjectStateDto[]
}
