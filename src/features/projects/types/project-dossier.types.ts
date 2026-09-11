import type { MajorType } from '../../../components/ui/MultidisciplinaryTag'

export interface ProjectMember {
  id: string
  name: string
  studentId: string
  role: string
  major: MajorType
  responsibility: string
  storyPoints: number
  contributionPercent: number
  email: string
}

export interface SupervisorInfo {
  name: string
  title: string
  department: string
  email: string
  hasDigitalSignature: boolean
  signatureDate?: string
}

export interface ApprovalStage {
  step: number
  title: string
  date: string
  status: 'completed' | 'current' | 'upcoming'
  decision: string
  reviewer: string
  note?: string
}

export interface ProjectDossier {
  titleVi: string
  titleEn: string
  projectCode: string
  groupCode: string
  semester: string
  status: 'approved' | 'active' | 'pending'
  statusLabel: string
  cdioScore: number
  supervisor: SupervisorInfo
  reviewer: SupervisorInfo
  members: ProjectMember[]
  timeline: ApprovalStage[]
  majorBreakdown: {
    major: MajorType
    label: string
    percent: number
    count: number
  }[]
  isSimulation: boolean
}
