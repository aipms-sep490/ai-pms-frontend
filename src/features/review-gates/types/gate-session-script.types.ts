export type GateDeliveryMode = 'ONLINE' | 'OFFLINE'

export interface ScriptQaEntry {
  id: string
  askerName: string
  askerRole: 'CHAIR' | 'REVIEWER' | 'MEMBER'
  question: string
  answeredBy: string
  evaluation: 'SATISFACTORY' | 'ACCEPTABLE' | 'NEEDS_REVISION'
  notes?: string
}

export interface ScriptRemediationItem {
  id: string
  title: string
  assignee: string
  dueDate: string
  required: boolean
}

export interface GateParticipantPresence {
  userId: number | string
  name: string
  role: string
  isPresent: boolean
  joinedAt?: string
  leftAt?: string
  durationMinutes?: number
}

export interface GateSessionScript {
  gateCode: string // 'R1' | 'R2' | 'R3' | 'R4'
  gateTitle: string
  projectId: number | string
  projectCode: string
  projectTitle: string
  mode: GateDeliveryMode
  // Offline specific fields:
  roomCode?: string
  building?: string
  floor?: number
  // Online specific fields:
  liveKitRoomName?: string
  liveKitSessionId?: string
  recordingUrl?: string
  // Session Timestamps:
  scheduledStartAt: string
  scheduledEndAt: string
  actualStartAt?: string
  actualEndAt?: string
  totalElapsedMinutes?: number
  // Content & Records:
  presences: GateParticipantPresence[]
  agendaStages: {
    stage: string
    durationMinutes: number
    status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'
  }[]
  qaLog: ScriptQaEntry[]
  remediationItems: ScriptRemediationItem[]
  generalNotes: string
  verdict: 'PENDING' | 'PASSED' | 'REVISION_REQUIRED' | 'FAILED'
  signedBySecretary?: string
  signedByChair?: string
  savedAt?: string
}
