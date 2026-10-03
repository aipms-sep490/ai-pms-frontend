import { httpGet, httpPost } from '../../services/http/http-client'

export interface EvidenceReference { sourceType: string; sourceId: string; title: string; periodOrDate: string | null; referenceUrl: string | null; excerpt: string | null }
export interface ProjectProgressAnalysis {
  projectId: number; generatedAtUtc: string; analysisTimeUtc: string; dataStatus: string; riskLevel: string; riskScore: number | null; confidence: number | null; trendStatus: string
  progressSummary: { totalMilestones: number; completedMilestones: number; totalTasks: number; doneTasks: number; blockedTasks: number; overdueTasks: number; unassignedTasks: number; progressPercentage: number }
  featureSnapshot: { overdueTaskRatio: number | null; averageTaskDelayDays: number | null; blockedTaskRatio: number | null; milestoneCompletionRate: number | null; milestoneDelayDays: number | null; milestoneNearDueCount: number | null; reportSubmissionDelayDays: number | null; missingReportCount: number | null; meetingFrequencyCount: number | null; unassignedTaskRatio: number | null; contributionVariance: number | null }
  factors: Array<{ code: string; feature: string; observedValue: number; severity: string; explanation: string }>; recommendations: string[]; ruleVersion: string; featureVersion: string; modelVersion: string; limitations: string | null
}
export interface ReportAiSummary { projectId: number; reportId: number; reportType: string; periodStart: string; periodEnd: string; summary: { completed: string; inProgress: string; blockers: string; risks: string; nextActions: string }; contextScope: string; evidence: EvidenceReference[]; limitationNote: string | null; generatedAt: string }
export interface ProjectAssistantResponse { projectId: number; answer: string; contextScope: string; evidence: EvidenceReference[]; limitationNote: string | null; insufficientEvidence: boolean; generatedAt: string }
export const getProjectProgressAnalysis = (projectId: number, signal?: AbortSignal) => httpGet<ProjectProgressAnalysis>(`/projects/${projectId}/progress-analysis`, signal)
export const getReportAiSummary = (projectId: number, reportId: number, signal?: AbortSignal) => httpGet<ReportAiSummary>(`/projects/${projectId}/reports/${reportId}/summary`, signal)
export const askProjectAssistant = (projectId: number, query: string) => httpPost<ProjectAssistantResponse>(`/projects/${projectId}/ai/assistant/ask`, { query })
