import { env } from '../../app/config/env'
import type {
  PagedResult,
  ProjectPeriodQualificationPolicyDto,
  SetProjectPeriodQualificationPolicyPayload,
  StudentQualificationDto,
  SubmitStudentQualificationEvidencePayload,
} from '../../types/backend'
import { HttpError, httpGet, httpPost, httpPostForm, httpPut } from '../http/http-client'
const MOCK_CURRENT_STUDENT_ID = 1

export interface QualificationTypeOption {
  code: string
  name: string
  description: string
}

export const DEFAULT_QUALIFICATION_TYPES: readonly QualificationTypeOption[] = [
  { code: 'CAPSTONE_READINESS', name: 'Đủ điều kiện làm đồ án tốt nghiệp', description: 'Điều kiện học vụ chung để đăng ký đồ án tốt nghiệp.' },
  { code: 'CREDITS_THRESHOLD', name: 'Đủ tín chỉ tích lũy', description: 'Đạt ngưỡng tín chỉ tích lũy tối thiểu.' },
  { code: 'ENGLISH_PROFICIENCY', name: 'Chuẩn ngoại ngữ', description: 'Đạt chuẩn ngoại ngữ theo quy định chương trình.' },
  { code: 'INTERNSHIP_COMPLETED', name: 'Hoàn thành thực tập doanh nghiệp', description: 'Đã hoàn thành học phần thực tập doanh nghiệp (OJT).' },
]

export interface StudentQualificationImportRow {
  rowNumber: number
  studentCode: string
  qualificationType: string
  certificateNumber?: string | null
  issuedAt?: string | null
  expiresAt?: string | null
}

export interface StudentQualificationImportPreviewRow {
  row: StudentQualificationImportRow
  matchedUserId: number | null
  studentFullName: string | null
  errors: string[]
}

export interface StudentQualificationImportPreview {
  departmentId: number
  departmentName: string
  rows: StudentQualificationImportPreviewRow[]
  canCommit: boolean
}

export interface StudentQualificationImportResult {
  upsertedCount: number
  createdCount: number
  updatedCount: number
}

export interface UploadQualificationCertificatePayload {
  file: File
  qualificationType?: string
  certificateNumber?: string
  issuedAt?: string
  expiresAt?: string
}

export async function getQualificationTypes(): Promise<readonly QualificationTypeOption[]> {
  if (env.isMockMode) return DEFAULT_QUALIFICATION_TYPES
  try {
    const list = await httpGet<QualificationTypeOption[]>('/student-qualifications/types')
    return list.length > 0 ? list : DEFAULT_QUALIFICATION_TYPES
  } catch {
    return DEFAULT_QUALIFICATION_TYPES
  }
}

export async function previewQualificationImport(file: File, signal?: AbortSignal): Promise<StudentQualificationImportPreview> {
  if (env.isMockMode) throw new HttpError('Qualification import requires API mode.', 503)
  const form = new FormData()
  form.append('File', file)
  return httpPostForm<StudentQualificationImportPreview>('/student-qualifications/import/preview', form, { signal })
}

export async function commitQualificationImport(
  rows: StudentQualificationImportRow[],
  signal?: AbortSignal,
): Promise<StudentQualificationImportResult> {
  if (env.isMockMode) throw new HttpError('Qualification import requires API mode.', 503)
  return httpPost<StudentQualificationImportResult>('/student-qualifications/import/commit', { rows }, { signal })
}

/** This endpoint stores the certificate AND submits the evidence in one transaction. */
export async function uploadCertificate(payload: UploadQualificationCertificatePayload): Promise<StudentQualificationDto> {
  if (env.isMockMode) throw new HttpError('Certificate upload requires API mode.', 503)
  const body = new FormData()
  body.append('File', payload.file)
  body.append('QualificationType', payload.qualificationType?.trim() || 'CAPSTONE_READINESS')
  body.append('TrainingStatus', 'TRAINING_COMPLETED')
  if (payload.certificateNumber) body.append('CertificateNumber', payload.certificateNumber)
  if (payload.issuedAt) body.append('IssuedAt', payload.issuedAt)
  if (payload.expiresAt) body.append('ExpiresAt', payload.expiresAt)
  return httpPostForm<StudentQualificationDto>('/student-qualifications/me/certificate', body)
}

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

export async function verify(id: number, expectedConcurrencyToken?: string): Promise<StudentQualificationDto> {
  if (env.isMockMode) return (await qualificationMock()).decideMockQualification(id, true, undefined, expectedConcurrencyToken)
  return httpPost<StudentQualificationDto>('/student-qualifications/' + id + '/verify', { expectedConcurrencyToken })
}

export async function reject(id: number, reason: string, expectedConcurrencyToken?: string): Promise<StudentQualificationDto> {
  if (env.isMockMode) return (await qualificationMock()).decideMockQualification(id, false, reason, expectedConcurrencyToken)
  return httpPost<StudentQualificationDto>('/student-qualifications/' + id + '/reject', { reason, expectedConcurrencyToken })
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
