import { httpGet, httpPost, HttpError } from '../../services/http/http-client'
import type {
  AppealAssistDto,
  ContributionFairnessDto,
  DefenseAnswerEvalDto,
  DefenseAnswerEvalRequest,
  DefenseMockDto,
  DefenseMockRequest,
  DepartmentBriefRequest,
  DepartmentExecutiveBriefDto,
  GateScriptDraftDto,
  GateScriptDraftRequest,
  ProgressReportDraftDto,
  ProgressReportDraftRequest,
  RubricGradingCopilotDto,
  ScoreCalibrationDto,
  SprintRetroDto,
  SubmissionPreflightDto,
  SubmissionPreflightRequest,
  TaskBreakdownDto,
  TaskBreakdownRequest,
  TeamSkillGapDto,
  TeamSkillGapRequest,
  WorkingAgreementDraftDto,
  WorkingAgreementDraftRequest,
} from './ai-suite.types'

// #1 Defense Mock, Voice/Text Answer Evaluation & Gate Script Draft
export const generateDefenseMock = (projectId: number, request?: DefenseMockRequest) =>
  httpPost<DefenseMockDto>(`/ai-suite/projects/${projectId}/defense/mock-questions`, request ?? {})

export const getLatestDefenseMock = async (projectId: number): Promise<DefenseMockDto | null> => {
  const res = await httpGet<DefenseMockDto | undefined>(`/ai-suite/projects/${projectId}/defense/mock-questions/latest`)
  return res ?? null
}

export const evaluateDefenseAnswer = (projectId: number, request: DefenseAnswerEvalRequest) =>
  httpPost<DefenseAnswerEvalDto>(`/ai-suite/projects/${projectId}/defense/evaluate-answer`, request)

export const generateGateScriptDraft = (gateInstanceId: number, request?: GateScriptDraftRequest) =>
  httpPost<GateScriptDraftDto>(`/ai-suite/review-gates/${gateInstanceId}/session-script-draft`, request ?? {})

// #2 Auto Progress Report Draft
export const generateProgressReportDraft = (projectId: number, request?: ProgressReportDraftRequest) =>
  httpPost<ProgressReportDraftDto>(`/ai-suite/projects/${projectId}/progress-reports/draft`, request ?? {})

// #3 Contribution Fairness & Free-rider / Burnout
export const analyzeContributionFairness = (projectId: number) =>
  httpPost<ContributionFairnessDto>(`/ai-suite/projects/${projectId}/contributions/fairness`, {})

export const getLatestContributionFairness = async (projectId: number): Promise<ContributionFairnessDto | null> => {
  const res = await httpGet<ContributionFairnessDto | undefined>(`/ai-suite/projects/${projectId}/contributions/fairness/latest`)
  return res ?? null
}

// #4 Rubric Grading Copilot, Calibration & Appeal Assist
export const generateRubricGradingCopilot = (assignmentId: number) =>
  httpPost<RubricGradingCopilotDto>(`/ai-suite/evaluations/assignments/${assignmentId}/rubric-copilot`, {})

export const checkScoreCalibration = (projectId: number) =>
  httpPost<ScoreCalibrationDto>(`/ai-suite/projects/${projectId}/results/calibration-check`, {})

export const assistAppealReview = (appealId: number) =>
  httpPost<AppealAssistDto>(`/ai-suite/appeals/${appealId}/review-assist`, {})

// #5 Task Breakdown & Sprint Retrospective
export const breakdownTask = (projectId: number, request: TaskBreakdownRequest) =>
  httpPost<TaskBreakdownDto>(`/ai-suite/projects/${projectId}/tasks/breakdown`, request)

export const generateSprintRetro = (projectId: number, sprintId: number) =>
  httpPost<SprintRetroDto>(`/ai-suite/projects/${projectId}/sprints/${sprintId}/retrospective`, {})

// #6 Pre-flight Submission Checker
export const checkSubmissionPreflight = (projectId: number, request: SubmissionPreflightRequest) =>
  httpPost<SubmissionPreflightDto>(`/ai-suite/projects/${projectId}/submissions/preflight`, request)

// #7 Team Skill-Gap & Working Agreement Draft
export const analyzeTeamSkillGap = (teamId: number, request?: TeamSkillGapRequest) =>
  httpPost<TeamSkillGapDto>(`/ai-suite/teams/${teamId}/skill-gap`, request ?? {})

export const draftWorkingAgreement = (projectId: number, request?: WorkingAgreementDraftRequest) =>
  httpPost<WorkingAgreementDraftDto>(`/ai-suite/projects/${projectId}/working-agreement/draft`, request ?? {})

// #8 Department Weekly Executive Brief
export const generateDepartmentBrief = (request?: DepartmentBriefRequest) =>
  httpPost<DepartmentExecutiveBriefDto>(`/ai-suite/department/executive-brief`, request ?? {})

export const getLatestDepartmentBrief = async (departmentId?: number): Promise<DepartmentExecutiveBriefDto | null> => {
  const query = departmentId ? `?departmentId=${departmentId}` : ''
  const res = await httpGet<DepartmentExecutiveBriefDto | undefined>(`/ai-suite/department/executive-brief/latest${query}`)
  return res ?? null
}

export function formatAiSuiteError(error: unknown, fallback = 'Chưa thể chạy phân tích AI lúc này. Vui lòng thử lại.'): string {
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (error.status === 403) return error.problem?.detail || 'Bạn không có quyền sử dụng công cụ AI trong phạm vi này.'
    if (error.status === 404) return error.problem?.detail || 'Không tìm thấy dữ liệu đồ án hoặc mục tiêu cần phân tích.'
    if (error.status === 503) return error.problem?.detail || 'Dịch vụ AI tạm thời quá tải hoặc chưa sẵn sàng. Hãy thử lại sau ít giây.'
    return error.problem?.detail || error.message || fallback
  }
  return error instanceof Error && error.message ? error.message : fallback
}

export function formatVnTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(d)
}

export function scoreFillClass(score: number): string {
  if (score >= 75) return 'ais-score-fill ais-score-fill--high'
  if (score >= 45) return 'ais-score-fill ais-score-fill--mid'
  return 'ais-score-fill ais-score-fill--low'
}
