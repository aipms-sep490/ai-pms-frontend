import { httpGet, httpGetBlob, httpPost, httpPut } from '../../../services/http/http-client'
import type { AcademicProfile } from '../../academic/api/profile-verification-api'

export interface DepartmentSpecialization {
  id: number
  departmentId: number
  majorId: number | null
  majorCode: string | null
  majorName: string | null
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateDepartmentSpecializationInput {
  majorId: number | null
  code: string
  name: string
  description: string | null
}

export interface UpdateDepartmentSpecializationInput extends CreateDepartmentSpecializationInput {
  isActive: boolean
}

export interface DepartmentStudentQuery {
  semesterId?: number
  search?: string
  majorId?: number
  specializationId?: number
  classCode?: string
  curriculumCode?: string
  profileStatus?: string
  qualificationStatus?: string
  teamStatus?: string
  page?: number
  pageSize?: number
}

export interface DepartmentStudentSummary {
  userId: number
  studentCode: string | null
  fullName: string
  email: string
  phone: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | string
  departmentId: number | null
  departmentName: string | null
  majorId: number | null
  majorCode: string | null
  majorName: string | null
  classCode: string | null
  specializationId: number | null
  specializationCode: string | null
  specializationName: string | null
  curriculumCode: string | null
  academicProfileStatus: string
  qualificationStatus: string
  teamId: number | null
  teamCode: string | null
  isTeamLeader: boolean
  projectId: number | null
  projectCode: string | null
  projectStatus: string | null
  lastLoginAt: string | null
}

export interface DepartmentStudentDirectoryStats {
  totalStudents: number
  pendingVerificationCount: number
  qualifiedCount: number
  withoutTeamCount: number
}

export interface DepartmentStudentDirectoryPage {
  items: DepartmentStudentSummary[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  stats: DepartmentStudentDirectoryStats
}

export interface DepartmentStudentDetail {
  summary: DepartmentStudentSummary
  academicProfileRejectionReason: string | null
  academicProfileReviewedAt: string | null
  academicProfileReviewedBy: number | null
  qualificationId: number | null
  trainingStatus: string | null
  certificateNumber: string | null
  certificateFileId: number | null
  qualificationIssuedAt: string | null
  qualificationExpiresAt: string | null
  qualificationRejectionReason: string | null
  qualificationConcurrencyToken: string | null
  projectTitle: string | null
  trackCode: string | null
  concurrencyToken: string
}

export interface UpdateDepartmentStudentAcademicInput {
  majorId: number | null
  classCode: string | null
  specializationId: number | null
  curriculumCode: string | null
  concurrencyToken: string
}

export interface UpdateMyStudentAcademicInput {
  classCode: string
  specializationId: number | null
}

function buildQuery(path: string, values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  return params.size ? `${path}?${params.toString()}` : path
}

export function listSpecializations(
  filters: { departmentId?: number; majorId?: number; includeInactive?: boolean } = {},
  signal?: AbortSignal,
) {
  return httpGet<DepartmentSpecialization[]>(
    buildQuery('/departments/specializations', {
      departmentId: filters.departmentId,
      majorId: filters.majorId,
      includeInactive: filters.includeInactive ? true : undefined,
    }),
    signal,
  )
}

export function createDepartmentSpecialization(body: CreateDepartmentSpecializationInput) {
  return httpPost<DepartmentSpecialization>('/departments/me/specializations', body)
}

export function updateDepartmentSpecialization(id: number, body: UpdateDepartmentSpecializationInput) {
  return httpPut<DepartmentSpecialization>(`/departments/me/specializations/${id}`, body)
}

export function listDepartmentStudents(filters: DepartmentStudentQuery = {}, signal?: AbortSignal) {
  return httpGet<DepartmentStudentDirectoryPage>(
    buildQuery('/departments/me/students', {
      semesterId: filters.semesterId,
      search: filters.search?.trim() || undefined,
      majorId: filters.majorId,
      specializationId: filters.specializationId,
      classCode: filters.classCode?.trim() || undefined,
      curriculumCode: filters.curriculumCode?.trim() || undefined,
      profileStatus: filters.profileStatus || undefined,
      qualificationStatus: filters.qualificationStatus || undefined,
      teamStatus: filters.teamStatus || undefined,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 12,
    }),
    signal,
  )
}

export function getDepartmentStudentDetail(userId: number, semesterId?: number, signal?: AbortSignal) {
  return httpGet<DepartmentStudentDetail>(
    buildQuery(`/departments/me/students/${userId}`, { semesterId }),
    signal,
  )
}

export function updateDepartmentStudentAcademic(
  userId: number,
  body: UpdateDepartmentStudentAcademicInput,
  semesterId?: number,
) {
  return httpPut<DepartmentStudentDetail>(
    buildQuery(`/departments/me/students/${userId}/academic`, { semesterId }),
    body,
  )
}

export function exportDepartmentStudents(
  filters: Omit<DepartmentStudentQuery, 'page' | 'pageSize'>,
  accessToken: string,
  signal?: AbortSignal,
) {
  return httpGetBlob(
    buildQuery('/departments/me/students/export', {
      semesterId: filters.semesterId,
      search: filters.search?.trim() || undefined,
      majorId: filters.majorId,
      specializationId: filters.specializationId,
      classCode: filters.classCode?.trim() || undefined,
      curriculumCode: filters.curriculumCode?.trim() || undefined,
      profileStatus: filters.profileStatus || undefined,
      qualificationStatus: filters.qualificationStatus || undefined,
      teamStatus: filters.teamStatus || undefined,
    }),
    { accessToken, signal },
  )
}

export function exportEmergencyContacts(
  filters: Omit<DepartmentStudentQuery, 'page' | 'pageSize'>,
  accessToken: string,
  signal?: AbortSignal,
) {
  return httpGetBlob(
    buildQuery('/departments/me/emergency-contacts/export', {
      semesterId: filters.semesterId,
      search: filters.search?.trim() || undefined,
      majorId: filters.majorId,
      specializationId: filters.specializationId,
      classCode: filters.classCode?.trim() || undefined,
      curriculumCode: filters.curriculumCode?.trim() || undefined,
      profileStatus: filters.profileStatus || undefined,
      qualificationStatus: filters.qualificationStatus || undefined,
      teamStatus: filters.teamStatus || undefined,
    }),
    { accessToken, signal },
  )
}

export function updateMyStudentAcademic(body: UpdateMyStudentAcademicInput) {
  return httpPut<AcademicProfile>('/users/me/academic-profile', body)
}
