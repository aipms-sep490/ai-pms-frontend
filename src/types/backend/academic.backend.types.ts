export interface SemesterDto {
  id: number
  organizationId: number
  organizationCode: string
  organizationName: string
  code: string
  name: string
  startDate: string
  endDate: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface ProjectPeriodDto {
  id: number
  academicSemesterId: number
  semesterCode: string
  semesterName: string
  code: string
  name: string
  periodType: string
  startAt: string
  endAt: string
  status: string
  minTeamSize?: number | null
  maxTeamSize?: number | null
  minDistinctMajors?: number | null
  maxProjectsPerSupervisor?: number | null
  milestoneTemplateId?: number | null
  rubricId?: number | null
  createdAt: string
  updatedAt: string
}

export interface UserAccountDto {
  id: number
  departmentId?: number | null
  majorId?: number | null
  email: string
  fullName: string
  phone?: string | null
  studentCode?: string | null
  employeeCode?: string | null
  title?: string | null
  status: string
  roles: string[]
}

export interface AuthUserDto {
  id: number
  email: string
  fullName: string
  roles: string[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponseDto {
  accessToken: string
  tokenType: string
  expiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
  user: AuthUserDto
}

export interface MajorDto {
  id: number
  departmentId: number
  departmentCode: string
  departmentName: string
  organizationId: number
  organizationCode: string
  code: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}
