import { httpGet, httpPost } from '../../../services/http/http-client'
import type { ProjectDto, ProjectMajorDto, ProjectStatusHistoryDto } from '../../../types/backend'
import type { ProjectResult, ResultRevisionSummary, StudentResult } from '../../results/result-types'

export interface ArchiveDossierMember {
  userId: number
  studentCode: string | null
  fullName: string
  email: string
  majorId: number | null
  majorName: string | null
  isLeader: boolean
}

export interface ArchiveDossierSupervisor {
  userId: number
  fullName: string
  email: string
  assignmentType: string
  isPrimary: boolean
  majorId: number | null
  majorName: string | null
  isActive: boolean
  assignedAt: string
  endedAt: string | null
}

export interface ArchiveDossierDefenseMember {
  userId: number
  fullName: string
  majorId: number
  majorName: string | null
  role: string
}

export interface ArchiveDossierDefense {
  committeeName: string | null
  committeeStatus: string | null
  room: string | null
  startAt: string | null
  endAt: string | null
  members: ArchiveDossierDefenseMember[]
}

export interface ArchiveDossierFinalFile {
  fileId: number
  fileName: string
  sha256: string | null
  sizeBytes: number
  downloadUrl: string
  majorId: number | null
  scope: string
}

export interface ArchiveDossierFinalItem {
  deliverableId: number
  title: string
  deliverableVersionId: number | null
  files: ArchiveDossierFinalFile[]
}

export interface ArchiveDossierFinalSubmission {
  finalSubmissionId: number
  submittedAt: string
  lockedAt: string | null
  lockedByName: string | null
  items: ArchiveDossierFinalItem[]
}

export interface ArchiveDossierAppeal {
  id: number
  source: string
  appealKind: string
  targetLabel: string
  componentName: string | null
  status: string
  resultVersion: number
  requestedAt: string
  decisionReason: string | null
}

export interface ArchiveDossierAppealsSummary {
  totalCount: number
  acceptedCount: number
  rejectedCount: number
  withdrawnCount: number
  pendingCount: number
  items: ArchiveDossierAppeal[]
}

export interface ArchiveDossierResults {
  projectResult: ProjectResult | null
  studentResults: StudentResult[]
  revisionHistory: ResultRevisionSummary[]
}

export interface ProjectArchiveDossier {
  id: number
  code: string
  title: string
  description: string | null
  status: string
  trackCode: string | null
  semesterCode: string | null
  semesterName: string | null
  leadDepartmentId: number | null
  leadDepartmentName: string | null
  departmentNames: string[]
  majors: ProjectMajorDto[]
  registeredAt: string
  submittedAt: string | null
  approvedAt: string | null
  completedAt: string | null
  archivedAt: string | null
  concurrencyToken: string
  canUnarchive: boolean
  members: ArchiveDossierMember[]
  supervisors: ArchiveDossierSupervisor[]
  results: ArchiveDossierResults
  defense: ArchiveDossierDefense | null
  finalSubmission: ArchiveDossierFinalSubmission | null
  appeals: ArchiveDossierAppealsSummary
  statusHistory: ProjectStatusHistoryDto[]
}

/** The dashboard summary has no concurrency token. Read the current Project before archive. */
export async function archiveProject(projectId: number, reason: string | null): Promise<ProjectDto> {
  const project = await httpGet<ProjectDto>(`/v1/projects/${projectId}`)
  return httpPost<ProjectDto>(`/v1/projects/${projectId}/archive`, {
    concurrencyToken: project.concurrencyToken,
    reason,
  })
}

export async function unarchiveProject(projectId: number, concurrencyToken: string, reason: string): Promise<ProjectDto> {
  return httpPost<ProjectDto>(`/v1/projects/${projectId}/unarchive`, {
    concurrencyToken,
    reason,
  })
}

export function getArchiveDossier(projectId: number, signal?: AbortSignal): Promise<ProjectArchiveDossier> {
  return httpGet<ProjectArchiveDossier>(`/v1/projects/${projectId}/archive-dossier`, signal)
}

export function getArchiveView(projectId: number): Promise<[ProjectDto, ProjectStatusHistoryDto[]]> {
  return Promise.all([
    httpGet<ProjectDto>(`/v1/projects/${projectId}`),
    httpGet<ProjectStatusHistoryDto[]>(`/v1/projects/${projectId}/history`),
  ])
}
