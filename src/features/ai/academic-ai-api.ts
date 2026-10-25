import { httpDelete, httpGet, httpGetBlob, httpPost, httpPostForm, httpPostStream } from '../../services/http/http-client'
import type { EvidenceReference } from './ai-api'

export interface KnowledgeCitation { documentId: number; versionId: number; title: string; version: string; documentType: string; section: string | null; page: number | null; effectiveFrom: string | null; excerpt: string }
export interface AssistantDraft { kind: 'TASK' | 'MEETING'; title: string; description: string }
export interface AcademicAssistantResponse { answer: string; answerType: string; citations: KnowledgeCitation[]; projectEvidence: EvidenceReference[]; insufficientEvidence: boolean; limitationNote: string | null; generationStatus: string; generatedAt: string; runId: number | null; attachments?: { fileName: string; mediaType: string }[]; conversationId?: number; revision?: number; draft?: AssistantDraft }
export interface AssistantConversation { id: number; title: string; projectId: number | null; scope: string; revision: number; updatedAt: string }
export interface AssistantTurn { id: number; query: string; response: AcademicAssistantResponse }
export interface ConversationDetail { conversation: AssistantConversation; turns: AssistantTurn[]; hasMore: boolean }
export interface AssistantStreamEvent { type: 'preview' | 'completed' | 'error'; text?: string; response?: AcademicAssistantResponse }
export const createAssistantConversation = (projectId?: number, signal?: AbortSignal) => httpPost<AssistantConversation>('/academic/assistant/conversations', { projectId, scope: projectId ? 'COMBINED' : 'ACADEMIC' }, { signal })
export const listAssistantConversations = (projectId?: number, beforeId?: number, signal?: AbortSignal) => httpGet<AssistantConversation[]>(`/academic/assistant/conversations?${new URLSearchParams({ ...(projectId ? { projectId: String(projectId) } : {}), ...(beforeId ? { beforeId: String(beforeId) } : {}) })}`, { signal })
export const getAssistantConversation = (id: number, beforeTurnId?: number, signal?: AbortSignal) => httpGet<ConversationDetail>(`/academic/assistant/conversations/${id}${beforeTurnId ? `?beforeTurnId=${beforeTurnId}` : ''}`, { signal })
export const deleteAssistantConversation = (id: number, signal?: AbortSignal) => httpDelete(`/academic/assistant/conversations/${id}`, { signal })
export const getAssistantCitation = (runId: number, index: number, signal?: AbortSignal) => httpGet<KnowledgeCitation>(`/academic/assistant/runs/${runId}/citations/${index}`, { signal })

export async function streamAssistant(query: string, files: File[], conversation: AssistantConversation, pageContext: string, draftKind: AssistantDraft['kind'] | undefined, onPreview: (text: string) => void, signal: AbortSignal): Promise<AcademicAssistantResponse> {
  const form = new FormData()
  form.set('query', query); form.set('scope', conversation.scope)
  form.set('conversationId', String(conversation.id)); form.set('expectedRevision', String(conversation.revision))
  if (conversation.projectId) form.set('projectId', String(conversation.projectId))
  form.set('pageContext', pageContext.slice(0, 160))
  if (draftKind) form.set('draftKind', draftKind)
  files.forEach(file => form.append('files', file))
  let result: AcademicAssistantResponse | undefined
  await httpPostStream<AssistantStreamEvent>('/academic/assistant/stream', form, event => {
    if (event.type === 'preview') onPreview(event.text ?? '')
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

export const downloadAssistantAnswer = (id: number, format: 'txt' | 'md', signal?: AbortSignal) =>
  httpGetBlob(`/academic/assistant/runs/${id}/download?format=${format}`, { signal })
