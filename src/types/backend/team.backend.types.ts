export interface TeamMemberDto {
  userId: number
  fullName: string
  majorId?: number | null
  organizationId?: number | null
  isEligibleStudent: boolean
  isLeader: boolean
  isProjectQualificationEligible?: boolean
  qualificationStatus?: string
}

export interface TeamEligibilityDto {
  canRegister: boolean
  rosterLocked: boolean
  registrationPeriodId?: number | null
  policyVersion?: string | null
  reasons: string[]
}

export interface TeamDto {
  id: number
  academicSemesterId: number
  code: string
  name: string
  description?: string | null
  status: string
  members: TeamMemberDto[]
  eligibility: TeamEligibilityDto
  academicScope?: TeamAcademicScopeDto | null
}

export interface MajorRequirementDto {
  majorId: number
  minMembers: number
  maxMembers: number
  responsibility: string
}

export interface TeamAcademicScopeDto {
  projectMode: string
  primaryMajorId?: number | null
  leadDepartmentId: number
  requirements: MajorRequirementDto[]
  concurrencyToken: string
}

export interface TeamAcademicScopeRequest extends Omit<TeamAcademicScopeDto, 'concurrencyToken'> {
  concurrencyToken?: string | null
}

export interface TeamInvitationCandidateDto {
  userId: number
  fullName: string
  email: string
  studentCode?: string | null
  majorId: number
  majorCode: string
  majorName: string
  invitationStatus: string
  pendingInvitationId?: number | null
  pendingInvitationExpiresAt?: string | null
  canInvite: boolean
}

export interface TeamInvitationDto {
  id: number
  teamId: number
  invitedUserId: number
  invitedBy: number
  status: string
  message?: string | null
  expiresAt?: string | null
  respondedAt?: string | null
  createdAt: string
}

export interface TeamLeaderChangeRequestDto {
  id: number
  teamId: number
  projectId: number
  requestedBy: number
  currentLeaderUserId: number
  newLeaderUserId: number
  mentorProfileId: number
  mentorUserId: number
  mentorName: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string
  requestMessage?: string | null
  responseMessage?: string | null
  requestedAt: string
  respondedAt?: string | null
}
