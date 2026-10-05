import { env } from '../../app/config/env'
import type {
  PagedResult,
  ProjectPeriodQualificationPolicyDto,
  SetProjectPeriodQualificationPolicyPayload,
  StudentQualificationDto,
  SubmitStudentQualificationEvidencePayload,
} from '../../types/backend'
import { httpGet, httpPost, httpPut } from '../http/http-client'
const MOCK_CURRENT_STUDENT_ID = 1

/** The fixture is loaded only for an explicitly selected development data mode. */
async function qualificationMock() {
  return import('../mock/qualification.mock')
}

export async function getMine(qualificationType = 'CAPSTONE_READINESS'): Promise<StudentQualificationDto | null> {
  if (env.isMockMode) return (await qualificationMock()).getMockQualification(MOCK_CURRENT_STUDENT_ID)
  return httpGet<StudentQualificationDto | null>(
    '/student-qualifications/me?qualificationType=' + encodeURIComponent(qualificationType),
  )
}

export async function submitEvidence(payload: SubmitStudentQualificationEvidencePayload): Promise<StudentQualificationDto> {
  if (env.isMockMode) return (await qualificationMock()).submitMockQualificationEvidence(MOCK_CURRENT_STUDENT_ID, payload)
  return httpPost<StudentQualificationDto, SubmitStudentQualificationEvidencePayload>('/student-qualifications/me/evidence', payload)
}

export async function getVerificationQueue(params: {
  status?: string
  search?: string
  page?: number
  pageSize?: number
} = {}): Promise<PagedResult<StudentQualificationDto>> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  if (env.isMockMode) return (await qualificationMock()).getMockQualificationQueue(params.status, params.search, page, pageSize)
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (params.status) query.set('status', params.status)
  if (params.search) query.set('search', params.search)
  return httpGet<PagedResult<StudentQualificationDto>>('/student-qualifications/verification-queue?' + query.toString())
}

export async function verify(id: number): Promise<StudentQualificationDto> {
  if (env.isMockMode) return (await qualificationMock()).decideMockQualification(id, true)
  return httpPost<StudentQualificationDto>('/student-qualifications/' + id + '/verify')
}

export async function reject(id: number, reason: string): Promise<StudentQualificationDto> {
  if (env.isMockMode) return (await qualificationMock()).decideMockQualification(id, false, reason)
  return httpPost<StudentQualificationDto, { reason: string }>('/student-qualifications/' + id + '/reject', { reason })
}

export async function getPeriodPolicy(projectPeriodId: number): Promise<ProjectPeriodQualificationPolicyDto> {
  if (env.isMockMode) return (await qualificationMock()).getMockQualificationPolicy(projectPeriodId)
  return httpGet<ProjectPeriodQualificationPolicyDto>('/academic/project-periods/' + projectPeriodId + '/qualification-policy')
}

export async function setPeriodPolicy(
  projectPeriodId: number,
  payload: SetProjectPeriodQualificationPolicyPayload,
): Promise<ProjectPeriodQualificationPolicyDto> {
  if (env.isMockMode) return (await qualificationMock()).setMockQualificationPolicy(projectPeriodId, payload)
  return httpPut<ProjectPeriodQualificationPolicyDto, SetProjectPeriodQualificationPolicyPayload>(
    '/academic/project-periods/' + projectPeriodId + '/qualification-policy',
    payload,
  )
}
