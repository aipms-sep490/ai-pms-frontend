import { httpGet, httpPost, httpPostForm } from '../../../services/http/http-client'

export interface PreSemesterReadinessItem {
  key: string
  label: string
  description: string
  status: 'MISSING' | 'DRAFT' | 'READY' | string
  totalCount: number
  draftCount: number
  publishedCount: number
  route: string
  supportsRollover: boolean
  supportsAiDraft: boolean
  allowedByRole: boolean
}

export interface PreSemesterReadiness {
  semesterId: number
  semesterCode: string
  semesterName: string
  semesterStatus: string
  departmentId: number | null
  departmentName: string | null
  isAdmin: boolean
  isDepartmentStaff: boolean
  readyCount: number
  totalRelevantCount: number
  items: PreSemesterReadinessItem[]
}

export interface RolloverPreviewRequest {
  sourceSemesterId: number
  targetSemesterId: number
  departmentId?: number | null
  includeRubrics: boolean
  includeReviewGates: boolean
  includeColdTemplates: boolean
  includePolicies: boolean
  shiftDates: boolean
  loadVietnamHolidays: boolean
}

export interface RolloverDateShift {
  label: string
  oldStart?: string | null
  oldEnd?: string | null
  newStart?: string | null
  newEnd?: string | null
}

export interface RolloverPreviewItem {
  category: 'RUBRIC' | 'REVIEW_GATE' | 'COLD_TEMPLATE' | 'POLICY' | string
  sourceId: number
  sourceCode: string
  sourceName: string
  proposedCode: string
  proposedName: string
  targetPeriodId?: number | null
  targetPeriodName?: string | null
  willSkip: boolean
  skipReason?: string | null
  dateShifts: RolloverDateShift[]
}

export interface RolloverPreview {
  sourceSemesterId: number
  sourceSemesterCode: string
  targetSemesterId: number
  targetSemesterCode: string
  shiftDays: number
  totalCandidates: number
  actionableCount: number
  items: RolloverPreviewItem[]
  warnings: string[]
}

export interface RolloverApplyRequest extends RolloverPreviewRequest {
  idempotencyKey: string
}

export interface RolloverCreatedItem {
  category: string
  sourceId: number
  createdId: number
  code: string
  name: string
  status: string
}

export interface RolloverSkippedItem {
  category: string
  sourceId: number
  name: string
  reason: string
}

export interface RolloverApplyResult {
  replay: boolean
  createdCount: number
  skippedCount: number
  holidaysLoadedCount: number
  created: RolloverCreatedItem[]
  skipped: RolloverSkippedItem[]
  warnings: string[]
}

export interface PreSemesterDiffFinding {
  area: string
  severity: 'HIGH' | 'MEDIUM' | 'INFO' | string
  title: string
  currentState: string
  documentRequirement: string
  recommendedAction: string
  route?: string | null
}

export interface PreSemesterAiDiffResponse {
  sourceFileName: string
  targetSemesterId: number
  summary: string
  usedAi: boolean
  findings: PreSemesterDiffFinding[]
  warnings: string[]
}

export function getPreSemesterReadiness(semesterId?: number, departmentId?: number, signal?: AbortSignal) {
  const params = new URLSearchParams()
  if (semesterId) params.set('semesterId', String(semesterId))
  if (departmentId) params.set('departmentId', String(departmentId))
  const qs = params.toString()
  return httpGet<PreSemesterReadiness>(`/academic/pre-semester/readiness${qs ? `?${qs}` : ''}`, { signal })
}

export function previewPreSemesterRollover(payload: RolloverPreviewRequest, signal?: AbortSignal) {
  return httpPost<RolloverPreview>('/academic/pre-semester/rollover/preview', payload, { signal })
}

export function applyPreSemesterRollover(payload: RolloverApplyRequest, signal?: AbortSignal) {
  return httpPost<RolloverApplyResult>('/academic/pre-semester/rollover/apply', payload, { signal })
}

export function checkPreSemesterAiDiff(targetSemesterId: number, file: File, departmentId?: number | null, signal?: AbortSignal) {
  const form = new FormData()
  form.set('targetSemesterId', String(targetSemesterId))
  if (departmentId) form.set('departmentId', String(departmentId))
  form.append('file', file)
  return httpPostForm<PreSemesterAiDiffResponse>('/academic/pre-semester/ai-diff-check', form, { signal })
}
