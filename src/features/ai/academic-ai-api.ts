import { httpGetBlob, httpPost, httpPostForm } from '../../services/http/http-client'
import type { EvidenceReference } from './ai-api'

export interface KnowledgeCitation { documentId: number; versionId: number; title: string; version: string; documentType: string; section: string | null; page: number | null; effectiveFrom: string | null; excerpt: string }
export interface AcademicAssistantResponse { answer: string; answerType: string; citations: KnowledgeCitation[]; projectEvidence: EvidenceReference[]; insufficientEvidence: boolean; limitationNote: string | null; generationStatus: string; generatedAt: string; runId: number | null; attachments?: { fileName: string; mediaType: string }[] }

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
