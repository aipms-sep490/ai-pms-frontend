export interface SupervisorExpertiseDto {
  name: string
  proficiencyLevel?: string | null
}

export interface SupervisorProfileDto {
  id: number
  userId: number
  fullName: string
  departmentId: number
  departmentName: string
  bio?: string | null
  isAvailable: boolean
  expertise: SupervisorExpertiseDto[]
}

export interface SupervisorAssignmentDto {
  id: number
  projectId: number
  supervisorProfileId: number
  supervisorUserId: number
  supervisorName: string
  supervisorRequestId: number
  isPrimary: boolean
  assignedAt: string
  endedAt?: string | null
}

export interface SupervisorRequestDto {
  id: number
  projectId: number
  supervisorProfileId: number
  requestedBy: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | string
  requestMessage?: string | null
  responseMessage?: string | null
  requestedAt: string
  respondedAt?: string | null
  assignmentId?: number | null
}

export interface SupervisorCandidateDto {
  id: number
  userId: number
  fullName: string
  departmentId: number
  departmentName: string
  bio?: string | null
  expertise: SupervisorExpertiseDto[]
  activeProjects: number
  semesterActiveProjects: number
  profileLimit?: number | null
  semesterLimit: number
  remainingSlots: number
  selectionPeriodId: number
}
