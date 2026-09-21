import type {
  PagedResult,
  ProjectPeriodQualificationPolicyDto,
  SetProjectPeriodQualificationPolicyPayload,
  StudentQualificationDto,
  SubmitStudentQualificationEvidencePayload,
} from '../../types/backend'

const now = () => new Date().toISOString()

let policy: ProjectPeriodQualificationPolicyDto = {
  projectPeriodId: 1,
  requireStudentQualification: true,
  qualificationType: 'CAPSTONE_READINESS',
  requireCertificate: true,
  checkExpiration: true,
  updatedAt: now(),
}

let qualifications: StudentQualificationDto[] = [
  ...[1, 2, 3, 4, 6].map((userId) => ({
    id: userId,
    userId,
    fullName: userId === 1 ? 'Phạm Ngọc Hoàng Anh' : 'Sinh viên ' + userId,
    studentCode: 'SE' + String(userId).padStart(4, '0'),
    organizationId: 1,
    departmentId: 10,
    majorId: 101,
    qualificationType: 'CAPSTONE_READINESS',
    trainingStatus: 'TRAINING_COMPLETED',
    verificationStatus: 'VERIFIED',
    certificateNumber: 'CAP-2026-' + String(userId).padStart(4, '0'),
    issuedAt: '2026-08-20T00:00:00Z',
    expiresAt: '2027-08-20T00:00:00Z',
    verifiedBy: 20,
    verifiedAt: '2026-08-25T00:00:00Z',
    rejectionReason: null,
    certificateFileId: null,
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-25T00:00:00Z',
  } satisfies StudentQualificationDto)),
  {
    id: 5,
    userId: 5,
    fullName: 'Nguyễn Minh Châu',
    studentCode: 'SE0005',
    organizationId: 1,
    departmentId: 10,
    majorId: 101,
    qualificationType: 'CAPSTONE_READINESS',
    trainingStatus: 'TRAINING_COMPLETED',
    verificationStatus: 'PENDING_VERIFICATION',
    certificateNumber: 'CAP-2026-0005',
    certificateFileId: null,
    issuedAt: '2026-09-01T00:00:00Z',
    expiresAt: '2027-09-01T00:00:00Z',
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
]

export function getMockQualificationPolicy(projectPeriodId: number): ProjectPeriodQualificationPolicyDto {
  return projectPeriodId === policy.projectPeriodId
    ? { ...policy }
    : { ...policy, projectPeriodId, requireStudentQualification: false }
}

export function setMockQualificationPolicy(
  projectPeriodId: number,
  payload: SetProjectPeriodQualificationPolicyPayload,
): ProjectPeriodQualificationPolicyDto {
  policy = { projectPeriodId, ...payload, updatedAt: now() }
  return { ...policy }
}

export function getMockQualification(userId: number): StudentQualificationDto | null {
  return qualifications.find((item) => item.userId === userId && item.qualificationType === policy.qualificationType) ?? null
}

export function isMockStudentQualificationEligible(userId: number, at = new Date()): boolean {
  if (!policy.requireStudentQualification) return true
  const qualification = getMockQualification(userId)
  if (!qualification) return false
  if (qualification.trainingStatus !== 'TRAINING_COMPLETED' || qualification.verificationStatus !== 'VERIFIED') return false
  if (policy.requireCertificate && !qualification.certificateNumber && !qualification.certificateFileId) return false
  if (policy.checkExpiration && qualification.expiresAt && new Date(qualification.expiresAt) <= at) return false
  return true
}

export function submitMockQualificationEvidence(
  userId: number,
  payload: SubmitStudentQualificationEvidencePayload,
): StudentQualificationDto {
  if (payload.trainingStatus !== 'TRAINING_COMPLETED') throw new Error('TRAINING_INCOMPLETE')
  const existing = getMockQualification(userId)
  const item: StudentQualificationDto = {
    id: existing?.id ?? Math.max(0, ...qualifications.map((x) => x.id)) + 1,
    userId,
    fullName: existing?.fullName ?? 'Sinh viên ' + userId,
    studentCode: existing?.studentCode ?? 'SE' + String(userId).padStart(4, '0'),
    organizationId: existing?.organizationId ?? 1,
    departmentId: existing?.departmentId ?? 10,
    majorId: existing?.majorId ?? 101,
    qualificationType: payload.qualificationType,
    trainingStatus: payload.trainingStatus,
    verificationStatus: 'PENDING_VERIFICATION',
    certificateNumber: payload.certificateNumber ?? null,
    certificateFileId: payload.certificateFileId ?? null,
    issuedAt: payload.issuedAt ?? null,
    expiresAt: payload.expiresAt ?? null,
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now(),
  }
  qualifications = [...qualifications.filter((x) => x.id !== item.id), item]
  return { ...item }
}

export function getMockQualificationQueue(
  status = 'PENDING_VERIFICATION',
  search = '',
  page = 1,
  pageSize = 20,
): PagedResult<StudentQualificationDto> {
  const query = search.trim().toLowerCase()
  const filtered = qualifications.filter((item) =>
    (!status || item.verificationStatus === status)
    && (!query || item.fullName.toLowerCase().includes(query) || item.studentCode?.toLowerCase().includes(query)),
  )
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)
  return { items, page, pageSize, totalCount: filtered.length, totalPages: Math.ceil(filtered.length / pageSize) }
}

export function decideMockQualification(id: number, verified: boolean, reason?: string): StudentQualificationDto {
  const index = qualifications.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('Qualification #' + id + ' not found.')
  const current = qualifications[index]
  if (current.verificationStatus !== 'PENDING_VERIFICATION') throw new Error('QUALIFICATION_ALREADY_PROCESSED')
  const updated: StudentQualificationDto = {
    ...current,
    verificationStatus: verified ? 'VERIFIED' : 'REJECTED',
    verifiedBy: 20,
    verifiedAt: now(),
    rejectionReason: verified ? null : (reason?.trim() || 'Không đạt yêu cầu xác minh'),
    updatedAt: now(),
  }
  qualifications = qualifications.map((item, i) => i === index ? updated : item)
  return { ...updated }
}
