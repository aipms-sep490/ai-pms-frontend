export type ReportType = 'WEEKLY' | 'MONTHLY'
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED'

export interface ProgressReport {
  id: number
  projectId: number
  submittedBy: number
  submittedByName: string
  reportType: ReportType
  periodStart: string
  periodEnd: string
  summary: string
  completedWork: string | null
  inProgressWork?: string | null
  blockers?: string | null
  risks?: string | null
  nextActions?: string | null
  plannedWork: string | null
  issuesAndRisks?: string | null
  status: ReportStatus
  submittedAt: string | null
  isLate: boolean | null
  createdAt: string
  updatedAt: string
  concurrencyToken?: string
  progressReportPeriodId?: number | null
  dueAt?: string | null
}

export interface ReportFeedback {
  id: number
  projectId: number
  supervisorAssignmentId: number
  supervisorUserId: number
  supervisorName: string
  progressReportId: number | null
  feedbackText: string
  createdAt: string
  updatedAt: string
}

export interface ReportDetail extends ProgressReport {
  feedbacks: ReportFeedback[]
}

export interface ReportContent {
  summary: string
  completedWork?: string | null
  inProgressWork?: string | null
  blockers?: string | null
  risks?: string | null
  nextActions?: string | null
  plannedWork?: string | null
  issuesAndRisks?: string | null
  progressReportPeriodId?: number | null
}

export interface CreateReport extends ReportContent {
  reportType: ReportType
  periodStart: string
  periodEnd: string
  progressReportPeriodId?: number | null
}

export const reportStatusLabels: Record<ReportStatus, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Đã nộp',
  REVIEWED: 'Đã nhận xét',
}

export const reportTypeLabels: Record<ReportType, string> = {
  WEEKLY: 'Báo cáo tuần',
  MONTHLY: 'Báo cáo tháng',
}

export interface ContentFieldConfig {
  key: 'summary' | 'completedWork' | 'inProgressWork' | 'blockers' | 'risks' | 'nextActions' | 'plannedWork'
  label: string
  hint: string
  required?: boolean
}

export const contentFields: readonly ContentFieldConfig[] = [
  { key: 'summary', label: 'Tóm tắt tiến độ', hint: 'Mục tiêu chính và tình hình thực hiện trong kỳ.', required: true },
  { key: 'completedWork', label: 'Công việc đã hoàn thành', hint: 'Nêu kết quả cụ thể, sản phẩm hoặc hạng mục đã hoàn tất.' },
  { key: 'inProgressWork', label: 'Công việc đang thực hiện', hint: 'Các công việc đang tiến hành trong kỳ này.' },
  { key: 'blockers', label: 'Vướng mắc (Blockers)', hint: 'Việc đang bị chặn, cần người khác xử lý ngay.' },
  { key: 'risks', label: 'Rủi ro tiềm ẩn', hint: 'Nguy cơ có thể xảy ra, cần theo dõi.' },
  { key: 'nextActions', label: 'Hành động tiếp theo', hint: 'Các việc cần ưu tiên thực hiện kế tiếp.' },
  { key: 'plannedWork', label: 'Kế hoạch kỳ tiếp theo', hint: 'Các đầu việc tiếp theo và kết quả dự kiến.' },
]

export function missingSubmissionFields(report: ReportContent): string[] {
  const missing: string[] = []
  if (!report.summary?.trim()) missing.push('Tóm tắt tiến độ')
  if (!report.progressReportPeriodId) missing.push('Kỳ báo cáo')
  return missing
}

export function formatReportDate(value: string): string {
  // DateOnly is a calendar date, never convert it through a timezone.
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}
