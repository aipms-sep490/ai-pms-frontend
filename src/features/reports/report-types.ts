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
  plannedWork: string | null
  issuesAndRisks: string | null
  status: ReportStatus
  submittedAt: string | null
  isLate: boolean | null
  createdAt: string
  updatedAt: string
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

export interface ReportDetail extends ProgressReport { feedbacks: ReportFeedback[] }
export interface ReportContent {
  summary: string
  completedWork: string | null
  plannedWork: string | null
  issuesAndRisks: string | null
}
export interface CreateReport extends ReportContent {
  reportType: ReportType
  periodStart: string
  periodEnd: string
}

export const reportStatusLabels: Record<ReportStatus, string> = {
  DRAFT: 'Bản nháp', SUBMITTED: 'Đã nộp', REVIEWED: 'Đã nhận xét',
}
export const reportTypeLabels: Record<ReportType, string> = { WEEKLY: 'Báo cáo tuần', MONTHLY: 'Báo cáo tháng' }
export const contentFields = [
  { key: 'summary', label: 'Tóm tắt tiến độ', hint: 'Mục tiêu chính và tình hình thực hiện trong kỳ.' },
  { key: 'completedWork', label: 'Công việc đã hoàn thành', hint: 'Nêu kết quả cụ thể, sản phẩm hoặc hạng mục đã hoàn tất.' },
  { key: 'plannedWork', label: 'Kế hoạch kỳ tiếp theo', hint: 'Các đầu việc tiếp theo và kết quả dự kiến.' },
  { key: 'issuesAndRisks', label: 'Khó khăn & rủi ro', hint: 'Điểm cần hỗ trợ từ GVHD. Ghi “Không có” nếu chưa phát sinh.' },
] as const

export function missingSubmissionFields(report: ReportContent): string[] {
  return contentFields.filter(({ key }) => !report[key]?.trim()).map(({ label }) => label)
}

export function formatReportDate(value: string): string {
  // DateOnly is a calendar date, never convert it through a timezone.
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}
