import { httpGet, httpPost } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'

export interface EvidenceReference { sourceType: string; sourceId: string; title: string; periodOrDate: string | null; referenceUrl: string | null; excerpt: string | null }

export interface ProgressSummary {
  /** Null (not zero) when the actor's scope cannot see the whole project — e.g. a discipline mentor. */
  totalMilestones: number | null
  completedMilestones: number | null
  totalTasks: number; doneTasks: number; blockedTasks: number; overdueTasks: number; unassignedTasks: number; progressPercentage: number
}
export interface FeatureSnapshot { overdueTaskRatio: number | null; averageTaskDelayDays: number | null; blockedTaskRatio: number | null; milestoneCompletionRate: number | null; milestoneDelayDays: number | null; milestoneNearDueCount: number | null; reportSubmissionDelayDays: number | null; missingReportCount: number | null; meetingFrequencyCount: number | null; unassignedTaskRatio: number | null; contributionVariance: number | null }
export interface RiskFactor { code: string; feature: string; observedValue: number; severity: string; explanation: string }

export interface ProjectProgressAnalysis {
  projectId: number; generatedAtUtc: string; analysisTimeUtc: string; dataStatus: string; riskLevel: string; riskScore: number | null; confidence: number | null; trendStatus: string
  progressSummary: ProgressSummary
  featureSnapshot: FeatureSnapshot
  factors: RiskFactor[]; recommendations: string[]; ruleVersion: string; featureVersion: string; modelVersion: string; limitations: string | null
  /** Set only when this analysis was recorded into history (the POST action below), never on a transient GET. */
  runId: number | null
  /** "PROJECT_WITH_INVITED_MEETINGS" for whole-project visibility, "MAJOR" for a discipline-scoped actor (e.g. a mentor). */
  contextScope: string
  /** Populated only in MAJOR scope: the major IDs the actor's view is limited to. */
  majorIds: number[]
  /** Metric groups this scope cannot compute — render as explicitly unavailable, never as zero or absent. */
  unavailableMetrics: string[]
}
export interface ReportAiSummary { projectId: number; reportId: number; reportType: string; periodStart: string; periodEnd: string; summary: { completed: string; inProgress: string; blockers: string; risks: string; nextActions: string }; contextScope: string; evidence: EvidenceReference[]; limitationNote: string | null; generatedAt: string; generationStatus: string; runId: number | null }
export interface ProjectAssistantResponse { projectId: number; answer: string; contextScope: string; evidence: EvidenceReference[]; limitationNote: string | null; insufficientEvidence: boolean; generatedAt: string; generationStatus: string; runId: number | null }

// BE-15 · Saved AI run history (AiAssistantController + AiRunDtos). Runs are actor- and
// scope-hash-scoped server-side: a run whose evidence is no longer visible in the current
// scope comes back with errorCode "AI_HISTORY_SCOPE_CHANGED" and emptied evidence/result,
// not a hard failure. Never generate a new run on page mount — only explicit user actions do.
export type AiRunKind = 'PROJECT_ASK' | 'REPORT_SUMMARY' | 'PROGRESS_ANALYSIS' | string
export interface AiRunDto {
  id: number; projectId: number; kind: AiRunKind; status: string; modelVersion: string; configVersion: string
  startedAt: string; completedAt: string | null; errorCode: string | null
  evidence: EvidenceReference[]
  answer?: ProjectAssistantResponse | null
  reportSummary?: ReportAiSummary | null
  progressAnalysis?: ProjectProgressAnalysis | null
}
export const getProjectAiRuns = (projectId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<AiRunDto>>(`/projects/${projectId}/ai/runs?page=${page}&pageSize=${pageSize}`, signal)
export const getAiRun = (projectId: number, runId: number, signal?: AbortSignal) =>
  httpGet<AiRunDto>(`/projects/${projectId}/ai/runs/${runId}`, signal)

/** Transient read — never persisted. This is the default path for display. */
export const getProjectProgressAnalysis = (projectId: number, signal?: AbortSignal) => httpGet<ProjectProgressAnalysis>(`/projects/${projectId}/progress-analysis`, signal)
/** Explicit user action: records this analysis into history (shows up via getProjectAiRuns/getAiRun afterward). */
export const recordProjectProgressAnalysis = (projectId: number, signal?: AbortSignal) => httpPost<ProjectProgressAnalysis>(`/projects/${projectId}/ai/progress-analysis`, undefined, signal)
export const getReportAiSummary = (projectId: number, reportId: number, signal?: AbortSignal) => httpGet<ReportAiSummary>(`/projects/${projectId}/reports/${reportId}/summary`, signal)
export const askProjectAssistant = (projectId: number, query: string) => httpPost<ProjectAssistantResponse>(`/projects/${projectId}/ai/assistant/ask`, { query })
