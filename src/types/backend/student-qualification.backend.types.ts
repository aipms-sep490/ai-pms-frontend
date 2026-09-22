export type StudentTrainingStatus = 'PENDING_TRAINING' | 'TRAINING_COMPLETED'
export type StudentQualificationStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'

export interface StudentQualificationDto {
  id: number
  userId: number
  fullName: string
  studentCode?: string | null
  organizationId: number
  departmentId: number
  majorId?: number | null
  qualificationType: string
  trainingStatus: StudentTrainingStatus | string
  verificationStatus: StudentQualificationStatus | string
  certificateNumber?: string | null
  certificateFileId?: number | null
  issuedAt?: string | null
  expiresAt?: string | null
  verifiedBy?: number | null
  verifiedAt?: string | null
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectPeriodQualificationPolicyDto {
  projectPeriodId: number
  requireStudentQualification: boolean
  qualificationType: string
  requireCertificate: boolean
  checkExpiration: boolean
  updatedAt: string
}

export interface SubmitStudentQualificationEvidencePayload {
  qualificationType: string
  trainingStatus: StudentTrainingStatus | string
  certificateNumber?: string | null
  certificateFileId?: number | null
  issuedAt?: string | null
  expiresAt?: string | null
}

export interface SetProjectPeriodQualificationPolicyPayload {
  requireStudentQualification: boolean
  qualificationType: string
  requireCertificate: boolean
  checkExpiration: boolean
}
