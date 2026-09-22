export type DeliverableStatus = 'DRAFT' | 'OPEN' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'CLOSED'
export type DeliverableVersionStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'

export interface Deliverable {
  id: number
  projectId: number
  milestoneId: number | null
  title: string
  description: string | null
  deliverableType: string | null
  dueAt: string | null
  status: DeliverableStatus
  createdBy: number
  latestVersion: number
}

export interface DeliverableVersion {
  id: number
  deliverableId: number
  versionNumber: number
  submittedBy: number
  note: string | null
  status: DeliverableVersionStatus
  submittedAt: string
  files: Array<{ id: number; fileName: string; contentType: string; sizeBytes: number; uploadedBy: number; createdAt: string }>
}

export interface DeliverableFeedback {
  id: number
  projectId: number
  versionId: number
  assignmentId: number
  supervisorUserId: number
  feedback: string
  createdAt: string
}

export interface SaveDeliverable {
  milestoneId: number | null
  title: string
  description: string | null
  deliverableType: string | null
  dueAt: string | null
}
