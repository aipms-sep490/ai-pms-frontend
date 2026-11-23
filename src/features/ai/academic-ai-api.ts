import { httpDelete, httpGet, httpGetBlob, httpPatch, httpPost, httpPostForm, httpPostStream } from '../../services/http/http-client'
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

export const ASSISTANT_ACCEPTED_FILES = '.png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,.txt,.md,.csv,.json'

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
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

export interface ApplyRubricSetupResult {
  rubricId: number
  code: string
  name: string
  status: string
  criteriaCount: number
  replay: boolean
  warnings?: string[] | null
}

export interface AssistantReviewGateRequirementDraft {
  code: string
  title: string
  description?: string | null
  type: 'FILE' | 'EXTERNAL_LINK' | 'TEXT' | 'ARTIFACT' | string
  scope: 'COMMON' | 'MAJOR_SPECIFIC' | string
  majorName?: string | null
  verification: 'HUMAN' | 'AUTO' | string
  required: boolean
}

export interface AssistantReviewGateDraft {
  code: string
  sequence: number
  title: string
  objective: string
  weight?: number | null
  startDate?: string | null
  endDate?: string | null
  required: boolean
  blockNextGate: boolean
  blocksDefense: boolean
  reviewerPolicy: string
  reviewScope: string
  requirements: AssistantReviewGateRequirementDraft[]
}

export interface AssistantReviewGateSetupPlan {
  code: string
  name: string
  mode: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY' | string
  majorCode?: string | null
  summary: string
  gates: AssistantReviewGateDraft[]
  warnings: string[]
}

export interface ApplyReviewGateSetupRequest {
  idempotencyKey: string
  runId?: number | null
  projectPeriodId?: number | null
  code: string
  name: string
  mode: string
  major?: string | null
  gates: AssistantReviewGateDraft[]
}

export interface ApplyReviewGateSetupResult {
  templateId: number
  code: string
  name: string
  status: string
  gatesCount: number
  replay: boolean
  warnings?: string[] | null
}

export interface AssistantTopicRequirementDraft {
  majorId?: number | null
  majorName?: string | null
  minMembers: number
  maxMembers: number
  responsibility: string
}

export interface AssistantTopicDraft {
  tempKey: string
  code: string
  title: string
  description?: string | null
  problemStatement?: string | null
  objectives?: string | null
  expectedOutput?: string | null
  domain?: string | null
  technologies: string[]
  keywords: string[]
  projectMode: 'SINGLE_MAJOR' | 'INTERDISCIPLINARY' | string
  primaryMajorId?: number | null
  primaryMajorName?: string | null
  requirements: AssistantTopicRequirementDraft[]
  duplicateTitleConflict?: boolean
  duplicateTitleDetail?: string | null
  similarityWarning?: string | null
  highestSimilarityScore?: number | null
}

export interface AssistantTopicBatchPlan {
  summary: string
  topics: AssistantTopicDraft[]
  warnings: string[]
}

export interface ApplyTopicBatchSetupRequest {
  idempotencyKey: string
  runId?: number | null
  projectPeriodId: number
  leadDepartmentId?: number | null
  topics: AssistantTopicDraft[]
}

export interface TopicBatchCreatedItem {
  tempKey: string
  topicId: number
  code: string
  title: string
  status: string
}

export interface TopicBatchSkippedItem {
  tempKey: string
  code: string
  title: string
  reason: string
}

export interface ApplyTopicBatchSetupResult {
  createdCount: number
  skippedCount: number
  replay: boolean
  created: TopicBatchCreatedItem[]
  skipped: TopicBatchSkippedItem[]
  warnings: string[]
}

export interface AssistantColdReportItemDraft {
  code: string
  name: string
  required: boolean
}

export interface AssistantColdTemplateSetupPlan {
  name: string
  scope: 'COMMON' | 'MAJOR_SPECIFIC' | string
  majorName?: string | null
  summary: string
  reports: AssistantColdReportItemDraft[]
  warnings: string[]
}

export interface ApplyColdTemplateSetupRequest {
  idempotencyKey: string
  runId?: number | null
  projectPeriodId: number
  scope: string
  majorId?: number | null
  name: string
  reports: AssistantColdReportItemDraft[]
}

export interface ApplyColdTemplateSetupResult {
  templateId: number
  name: string
  version: number
  scope: string
  reportsCount: number
  replay: boolean
  warnings?: string[] | null
}

export interface AssistantMilestoneTemplateItemDraft {
  title: string
  description?: string | null
  startOffsetDays?: number | null
  dueOffsetDays?: number | null
  sortOrder: number
}

export interface AssistantMilestoneTemplateSetupPlan {
  name: string
  description?: string | null
  summary: string
  items: AssistantMilestoneTemplateItemDraft[]
  warnings: string[]
}

export interface ApplyMilestoneTemplateSetupRequest {
  idempotencyKey: string
  runId?: number | null
  existingTemplateId?: number | null
  name: string
  description?: string | null
  items: AssistantMilestoneTemplateItemDraft[]
}

export interface ApplyMilestoneTemplateSetupResult {
  templateId: number
  versionId: number
  versionNumber: number
  name: string
  status: string
  itemsCount: number
  replay: boolean
  warnings?: string[] | null
}

export interface AssistantDraft {
  kind: 'TASK' | 'MEETING' | 'WEEKLY_REPORT' | 'MEETING_MINUTES' | 'WORK_PLAN' | 'PROJECT_SETUP' | 'RUBRIC_SETUP' | 'REVIEW_GATE_SETUP' | 'TOPIC_BATCH_SETUP' | 'COLD_TEMPLATE_SETUP' | 'MILESTONE_TEMPLATE_SETUP'
  title: string
  description: string
  meeting?: AssistantMeetingDraft | null
  task?: AssistantTaskDraft | null
  report?: AssistantReportDraft | null
  tasks?: AssistantDraft[] | null
  setupPlan?: AssistantProjectSetupPlan | null
  rubricSetup?: AssistantRubricSetupPlan | null
  reviewGateSetup?: AssistantReviewGateSetupPlan | null
  topicBatchSetup?: AssistantTopicBatchPlan | null
  coldTemplateSetup?: AssistantColdTemplateSetupPlan | null
  milestoneTemplateSetup?: AssistantMilestoneTemplateSetupPlan | null
}
export type AssistantToolMode = 'PROGRESS' | 'REPORT_REVIEW' | 'WEEKLY_REPORT' | 'MEETING_MINUTES' | 'WORK_PLAN' | 'PROJECT_SETUP' | 'RUBRIC_SETUP' | 'REVIEW_GATE_SETUP' | 'TOPIC_BATCH_SETUP' | 'COLD_TEMPLATE_SETUP' | 'MILESTONE_TEMPLATE_SETUP'
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
  followUpSuggestions?: string[] | null
  feedbackRating?: number | null
}
export interface AssistantConversation {
  id: number
  title: string
  projectId: number | null
  scope: string
  revision: number
  updatedAt: string
  isPinned?: boolean
  turnCount?: number
}
export interface AssistantProjectOption {
  id: number
  code: string
  title: string
  status: string
  roleLabel: string
}
export interface AssistantFeedbackResult {
  runId: number
  rating: number
  note: string | null
  feedbackAt: string
}
/** A persisted turn includes the server-side start time so history shows when the user sent it. */
export interface AssistantTurn { id: number; query: string; sentAt?: string; response: AcademicAssistantResponse }
export interface ConversationDetail { conversation: AssistantConversation; turns: AssistantTurn[]; hasMore: boolean }
export interface AssistantStreamEvent { type: 'status' | 'preview' | 'completed' | 'error'; text?: string; response?: AcademicAssistantResponse }
export const createAssistantConversation = (projectId?: number, signal?: AbortSignal) => httpPost<AssistantConversation>('/academic/assistant/conversations', { projectId, scope: projectId ? 'COMBINED' : 'ACADEMIC' }, { signal })
export const listAssistantConversations = (projectId?: number, beforeId?: number, signal?: AbortSignal, search?: string) => {
  const params = new URLSearchParams({
    ...(projectId ? { projectId: String(projectId) } : {}),
    ...(beforeId ? { beforeId: String(beforeId) } : {}),
    ...(search?.trim() ? { search: search.trim() } : {}),
  })
  return httpGet<AssistantConversation[]>(`/academic/assistant/conversations?${params}`, { signal })
}
export const getAssistantConversation = (id: number, beforeTurnId?: number, signal?: AbortSignal) => httpGet<ConversationDetail>(`/academic/assistant/conversations/${id}${beforeTurnId ? `?beforeTurnId=${beforeTurnId}` : ''}`, { signal })
export const updateAssistantConversation = (id: number, payload: { title?: string; isPinned?: boolean }, signal?: AbortSignal) =>
  httpPatch<AssistantConversation>(`/academic/assistant/conversations/${id}`, payload, { signal })
export const downloadAssistantConversation = (id: number, format: 'md' | 'txt' | 'docx' | 'pdf', signal?: AbortSignal) =>
  httpGetBlob(`/academic/assistant/conversations/${id}/download?format=${format}`, { signal })
export const deleteAssistantConversation = (id: number, signal?: AbortSignal) => httpDelete(`/academic/assistant/conversations/${id}`, { signal })
export const submitAssistantFeedback = (runId: number, rating: 1 | -1, note?: string, signal?: AbortSignal) =>
  httpPost<AssistantFeedbackResult>(`/academic/assistant/runs/${runId}/feedback`, { rating, note: note?.trim() || null }, { signal })
export const listAssistantProjects = (signal?: AbortSignal) =>
  httpGet<AssistantProjectOption[]>('/academic/assistant/projects', { signal })
export const getAssistantCitation = (runId: number, index: number, signal?: AbortSignal) => httpGet<KnowledgeCitation>(`/academic/assistant/runs/${runId}/citations/${index}`, { signal })

export const applyProjectAiSetup = (projectId: number, payload: ApplyProjectSetupRequest, signal?: AbortSignal) =>
  httpPost<ApplyProjectSetupResult>(`/projects/${projectId}/ai/setup/apply`, payload, { signal })

export const applyRubricAiSetup = (payload: ApplyRubricSetupRequest, signal?: AbortSignal) =>
  httpPost<ApplyRubricSetupResult>('/academic/ai/rubric-setup/apply', payload, { signal })

export const applyReviewGateAiSetup = (payload: ApplyReviewGateSetupRequest, signal?: AbortSignal) =>
  httpPost<ApplyReviewGateSetupResult>('/academic/ai/review-gate-setup/apply', payload, { signal })

export const applyTopicBatchAiSetup = (payload: ApplyTopicBatchSetupRequest, signal?: AbortSignal) =>
  httpPost<ApplyTopicBatchSetupResult>('/academic/ai/topic-batch-setup/apply', payload, { signal })

export const applyColdTemplateAiSetup = (payload: ApplyColdTemplateSetupRequest, signal?: AbortSignal) =>
  httpPost<ApplyColdTemplateSetupResult>('/academic/ai/cold-template-setup/apply', payload, { signal })

export const applyMilestoneTemplateAiSetup = (payload: ApplyMilestoneTemplateSetupRequest, signal?: AbortSignal) =>
  httpPost<ApplyMilestoneTemplateSetupResult>('/academic/ai/milestone-template-setup/apply', payload, { signal })

export async function streamAssistant(query: string, files: File[], conversation: AssistantConversation, pageContext: string, draftKind: AssistantDraft['kind'] | undefined, onPreview: (text: string) => void, signal: AbortSignal, tool?: { mode: AssistantToolMode; rubricId?: number; projectPeriodId?: number }): Promise<AcademicAssistantResponse> {
  const form = new FormData()
  form.set('query', query); form.set('scope', conversation.scope)
  form.set('conversationId', String(conversation.id)); form.set('expectedRevision', String(conversation.revision))
  if (conversation.projectId) form.set('projectId', String(conversation.projectId))
  form.set('pageContext', pageContext.slice(0, 160))
  if (draftKind) form.set('draftKind', draftKind)
  if (tool) form.set('toolMode', tool.mode)
  if (tool?.rubricId) form.set('rubricId', String(tool.rubricId))
  if (tool?.projectPeriodId) form.set('projectPeriodId', String(tool.projectPeriodId))
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
