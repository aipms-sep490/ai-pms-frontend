import { httpPost } from '../../services/http/http-client'
import type { EvidenceReference } from './ai-api'

export interface KnowledgeCitation { documentId: number; versionId: number; title: string; version: string; documentType: string; section: string | null; page: number | null; effectiveFrom: string | null; excerpt: string }
export interface AcademicAssistantResponse { answer: string; answerType: string; citations: KnowledgeCitation[]; projectEvidence: EvidenceReference[]; insufficientEvidence: boolean; limitationNote: string | null; generationStatus: string; generatedAt: string; runId: number | null }

export const askAcademicAssistant = (query: string, projectId?: number, signal?: AbortSignal) => httpPost<AcademicAssistantResponse>('/academic/assistant/ask', { query, scope: projectId ? 'COMBINED' : 'ACADEMIC', projectId }, { signal })
