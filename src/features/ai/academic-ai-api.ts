import { httpDelete, httpGet, httpGetBlob, httpPost, httpPostForm, httpPostStream } from '../../services/http/http-client'
import type { EvidenceReference } from './ai-api'

export interface KnowledgeCitation { documentId: number; versionId: number; title: string; version: string; documentType: string; section: string | null; page: number | null; effectiveFrom: string | null; excerpt: string }
export interface AssistantMeetingDraft {
  startAt?: string | null; endAt?: string | null
  meetingDeliveryMode?: 'ONSITE' | 'REMOTE' | 'HYBRID' | null
  videoChannel?: 'NONE' | 'IN_APP_VIDEO' | 'EXTERNAL_LINK' | null
  location?: string | null; onlineUrl?: string | null; inviteAll?: boolean
}
export interface AssistantTaskDraft { dueAt?: string | null; priority?: string | null; milestoneTitle?: string | null; assigneeNames?: string[]; primaryMajorName?: string | null }
export interface AssistantReportDraft { periodStart?: string | null; periodEnd?: string | null; completedWork?: string | null; inProgressWork?: string | null; blockers?: string | null; risks?: string | null; nextActions?: string | null; plannedWork?: string | null }

export interface AssistantContextCoverage {
  projectTitle?: string | null
  projectStage?: string | null
  tasksScanned: number
  tasksTotal: number
  deliverablesCount: number
  coldItemsCount: number
  reviewGatesCount: number
}

export interface AssistantDiagnosticItem {
  category: 'DOCUMENT' | 'TASK' | 'REVIEW_GATE' | 'COLD_REPORT' | 'MILESTONE' | 'EVIDENCE'
  title: string
  location: string
  status: 'DONE' | 'IN_PROGRESS' | 'NEEDS_REVISION' | 'BLOCKED' | 'OVERDUE' | 'MISSING' | 'PENDING_REVIEW'
  progressText: string
  issueDetail?: string | null
  owner?: string | null
  dueAt?: string | null
  target?: string | null
  resourceId?: number | null
  citationId?: string | null
}

export interface AssistantStructuredReport {
  summaryTitle: string
  coverage: AssistantContextCoverage
  items: AssistantDiagnosticItem[]
}

export interface AssistantSetupMilestone {
  tempKey: string
  existingMilestoneId?: number | null
  title: string
  description?: string | null
  startDate?: string | null
  dueDate?: string | null
}

export interface AssistantSetupDeliverable {
  tempKey: string
  title: string
  description?: string | null
  deliverableType: string
  milestoneRef?: string | null
  evidenceScope: 'COMMON' | 'MAJOR_SPECIFIC' | string
  targetMajorName?: string | null
  dueAt?: string | null
  acceptanceCriteria: string[]
}

export interface AssistantSetupTask {
  tempKey: string
  title: string
  description?: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string
  milestoneRef?: string | null
  dueAt?: string | null
  assigneeNames: string[]
  primaryMajorName?: string | null
  acceptanceCriteria: string[]
  dependsOnRefs: string[]
}

export interface AssistantProjectSetupPlan {
  summary: string
  milestones: AssistantSetupMilestone[]
  deliverables: AssistantSetupDeliverable[]
  tasks: AssistantSetupTask[]
  warnings: string[]
}

export interface AssistantRubricLevelDraft {
  levelOrder: number
  label: string
  descriptor: string
  scoreFrom?: number | null
  scoreTo?: number | null
}

export interface AssistantRubricCriterionDraft {
  tempKey: string
  parentTempKey?: string | null
  criterionCode?: string | null
  name: string
  description?: string | null
  weightPercent: number
  maxScore?: number | null
  isRequired: boolean
  learningOutcome?: string | null
  evidenceGuidance?: string | null
  levels: AssistantRubricLevelDraft[]
}

export interface AssistantRubricSetupPlan {
  code: string
  name: string
  description?: string | null
  projectMode: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY' | string
  evaluationStage: 'ON_GOING' | 'COLD' | 'DEFENSE' | string
  evaluationScope: 'COMMON' | 'MAJOR_SPECIFIC' | 'INDIVIDUAL' | string
  majorName?: string | null
  criteria: AssistantRubricCriterionDraft[]
  warnings: string[]
}

export interface ApplyProjectSetupRequest {
  idempotencyKey: string
  runId?: number | null
  milestones: AssistantSetupMilestone[]
  deliverables: AssistantSetupDeliverable[]
  tasks: AssistantSetupTask[]
}

export interface CreatedSetupItemRef {
  tempKey: string
  id: number
  title: string
  kind: 'MILESTONE' | 'DELIVERABLE' | 'TASK' | string
}

export interface ApplyProjectSetupResult {
  projectId: number
  replay: boolean
  milestonesCreated: number
  deliverablesCreated: number
  tasksCreated: number
  taskCriteriaCreated: number
  dependenciesCreated: number
  items: CreatedSetupItemRef[]
  warnings: string[]
}

export interface ApplyRubricSetupRequest {
  idempotencyKey: string
  runId?: number | null
  departmentId?: number | null
  academicSemesterId: number
  majorId?: number | null
  code: string
  name: string
  description?: string | null
  projectMode: string
  evaluationStage: string
  evaluationScope: string
  criteria: AssistantRubricCriterionDraft[]
}

export interface ApplyRubricSetupResult {
  rubricId: number
  code: string
  name: string
  status: string
  criteriaCount: number
  replay: boolean
}

export interface AssistantDraft {
  kind: 'TASK' | 'MEETING' | 'WEEKLY_REPORT' | 'MEETING_MINUTES' | 'WORK_PLAN' | 'PROJECT_SETUP' | 'RUBRIC_SETUP'
  title: string
  description: string
  meeting?: AssistantMeetingDraft | null
  task?: AssistantTaskDraft | null
  report?: AssistantReportDraft | null
  tasks?: AssistantDraft[] | null
  setupPlan?: AssistantProjectSetupPlan | null
  rubricSetup?: AssistantRubricSetupPlan | null
}
export type AssistantToolMode = 'PROGRESS' | 'REPORT_REVIEW' | 'WEEKLY_REPORT' | 'MEETING_MINUTES' | 'WORK_PLAN' | 'PROJECT_SETUP' | 'RUBRIC_SETUP'
export type AssistantExportFormat = 'txt' | 'md' | 'docx' | 'xlsx' | 'pdf'
export interface AssistantRubricOption { id: number; title: string; version: number; assignedToProject: boolean }
export const listAssistantRubrics = (projectId: number, signal?: AbortSignal) => httpGet<AssistantRubricOption[]>(`/academic/assistant/review-rubrics?projectId=${projectId}`, { signal })
export interface AcademicAssistantResponse {
  answer: string
  answerType: string
  citations: KnowledgeCitation[]
  projectEvidence: EvidenceReference[]
  insufficientEvidence: boolean
  limitationNote: string | null
  generationStatus: string
  generatedAt: string
  runId: number | null
  attachments?: { fileName: string; mediaType: string }[]
  conversationId?: number
  revision?: number
  draft?: AssistantDraft
  structuredReport?: AssistantStructuredReport | null
}
export interface AssistantConversation { id: number; title: string; projectId: number | null; scope: string; revision: number; updatedAt: string }
/** A persisted turn includes the server-side start time so history shows when the user sent it. */
export interface AssistantTurn { id: number; query: string; sentAt?: string; response: AcademicAssistantResponse }
export interface ConversationDetail { conversation: AssistantConversation; turns: AssistantTurn[]; hasMore: boolean }
export interface AssistantStreamEvent { type: 'status' | 'preview' | 'completed' | 'error'; text?: string; response?: AcademicAssistantResponse }
export const createAssistantConversation = (projectId?: number, signal?: AbortSignal) => httpPost<AssistantConversation>('/academic/assistant/conversations', { projectId, scope: projectId ? 'COMBINED' : 'ACADEMIC' }, { signal })
export const listAssistantConversations = (projectId?: number, beforeId?: number, signal?: AbortSignal) => httpGet<AssistantConversation[]>(`/academic/assistant/conversations?${new URLSearchParams({ ...(projectId ? { projectId: String(projectId) } : {}), ...(beforeId ? { beforeId: String(beforeId) } : {}) })}`, { signal })
export const getAssistantConversation = (id: number, beforeTurnId?: number, signal?: AbortSignal) => httpGet<ConversationDetail>(`/academic/assistant/conversations/${id}${beforeTurnId ? `?beforeTurnId=${beforeTurnId}` : ''}`, { signal })
export const deleteAssistantConversation = (id: number, signal?: AbortSignal) => httpDelete(`/academic/assistant/conversations/${id}`, { signal })
export const getAssistantCitation = (runId: number, index: number, signal?: AbortSignal) => httpGet<KnowledgeCitation>(`/academic/assistant/runs/${runId}/citations/${index}`, { signal })

export const applyProjectAiSetup = (projectId: number, payload: ApplyProjectSetupRequest, signal?: AbortSignal) =>
  httpPost<ApplyProjectSetupResult>(`/projects/${projectId}/ai/setup/apply`, payload, { signal })

export const applyRubricAiSetup = (payload: ApplyRubricSetupRequest, signal?: AbortSignal) =>
  httpPost<ApplyRubricSetupResult>('/academic/ai/rubric-setup/apply', payload, { signal })

export async function streamAssistant(query: string, files: File[], conversation: AssistantConversation, pageContext: string, draftKind: AssistantDraft['kind'] | undefined, onPreview: (text: string) => void, signal: AbortSignal, tool?: { mode: AssistantToolMode; rubricId?: number }): Promise<AcademicAssistantResponse> {
  const form = new FormData()
  form.set('query', query); form.set('scope', conversation.scope)
  form.set('conversationId', String(conversation.id)); form.set('expectedRevision', String(conversation.revision))
  if (conversation.projectId) form.set('projectId', String(conversation.projectId))
  form.set('pageContext', pageContext.slice(0, 160))
  if (draftKind) form.set('draftKind', draftKind)
  if (tool) form.set('toolMode', tool.mode)
  if (tool?.rubricId) form.set('rubricId', String(tool.rubricId))
  files.forEach(file => form.append('files', file))
  let result: AcademicAssistantResponse | undefined
  await httpPostStream<AssistantStreamEvent>('/academic/assistant/stream', form, event => {
    if (event.type === 'status' || event.type === 'preview') onPreview(event.text ?? '')
    if (event.type === 'completed') result = event.response
    if (event.type === 'error') throw new Error(event.text)
  }, { signal })
  if (!result) throw new Error('Kết nối bị ngắt trước khi lưu câu trả lời. Mở lại lịch sử để kiểm tra.')
  return result
}

export const askAcademicAssistant = (query: string, projectId?: number, signal?: AbortSignal) => httpPost<AcademicAssistantResponse>('/academic/assistant/ask', { query, scope: projectId ? 'COMBINED' : 'ACADEMIC', projectId }, { signal })

export function askAcademicAssistantWithFiles(query: string, files: File[], projectId?: number, signal?: AbortSignal) {
  const form = new FormData()
  form.set('query', query)
  form.set('scope', projectId ? 'COMBINED' : 'ACADEMIC')
  if (projectId) form.set('projectId', String(projectId))
  files.forEach(file => form.append('files', file))
  return httpPostForm<AcademicAssistantResponse>('/academic/assistant/ask-with-files', form, { signal })
}

export const downloadAssistantAnswer = (id: number, format: AssistantExportFormat, signal?: AbortSignal) =>
  httpGetBlob(`/academic/assistant/runs/${id}/download?format=${format}`, { signal })
