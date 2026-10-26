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
  concurrencyToken?: string
  progressReportPeriodId?: number | null
  inProgressWork?: string | null
  blockers?: string | null
  risks?: string | null
  nextActions?: string | null
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
  completedWork: string | null
  plannedWork: string | null
  issuesAndRisks?: string | null
  inProgressWork?: string | null
  blockers?: string | null
  risks?: string | null
  nextActions?: string | null
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

export interface FormFieldConfig {
  key: keyof ReportContent
  label: string
  hint: string
  required: boolean
  rows: number
}

export interface FormSectionConfig {
  group: string
  fields: FormFieldConfig[]
}

// 7 form input fields grouped by progressive disclosure (DECISIONS.md Q4)
export const formSections: FormSectionConfig[] = [
  {
    group: 'Tổng quan',
    fields: [
      { key: 'summary', label: 'Tóm tắt tiến độ', hint: 'Mục tiêu chính và tình hình thực hiện trong kỳ.', required: true, rows: 3 },
    ],
  },
  {
    group: 'Công việc đã làm và đang làm',
    fields: [
      { key: 'completedWork', label: 'Công việc đã hoàn thành', hint: 'Nêu kết quả cụ thể, sản phẩm hoặc hạng mục đã hoàn tất.', required: false, rows: 4 },
      { key: 'inProgressWork', label: 'Công việc đang thực hiện', hint: 'Các việc đang triển khai trong kỳ báo cáo.', required: false, rows: 4 },
    ],
  },
  {
    group: 'Vướng mắc và rủi ro',
    fields: [
      { key: 'blockers', label: 'Vướng mắc cần hỗ trợ', hint: 'Việc đang bị chặn, cần người khác hoặc GVHD can thiệp.', required: false, rows: 3 },
      { key: 'risks', label: 'Rủi ro tiềm ẩn', hint: 'Nguy cơ có thể ảnh hưởng tiến độ trong thời gian tới.', required: false, rows: 3 },
    ],
  },
  {
    group: 'Kế hoạch kỳ tiếp theo',
    fields: [
      { key: 'nextActions', label: 'Hành động tiếp theo', hint: 'Các đầu việc cụ thể sẽ thực hiện trong kỳ tới.', required: false, rows: 3 },
      { key: 'plannedWork', label: 'Kế hoạch công việc', hint: 'Phân công và mốc thời gian dự kiến.', required: false, rows: 3 },
    ],
  },
]

export const formInputFields = formSections.flatMap((s) => s.fields)

// Legacy content fields kept for backward compatibility with older components & reading mode
export const contentFields = [
  { key: 'summary', label: 'Tóm tắt tiến độ', hint: 'Mục tiêu chính và tình hình thực hiện trong kỳ.' },
  { key: 'completedWork', label: 'Công việc đã hoàn thành', hint: 'Nêu kết quả cụ thể, sản phẩm hoặc hạng mục đã hoàn tất.' },
  { key: 'plannedWork', label: 'Kế hoạch kỳ tiếp theo', hint: 'Các đầu việc tiếp theo và kết quả dự kiến.' },
  { key: 'issuesAndRisks', label: 'Khó khăn & rủi ro', hint: 'Điểm cần hỗ trợ từ GVHD. Ghi “Không có” nếu chưa phát sinh.' },
] as const

export const canonicalSubmissionFields = [
  { key: 'summary' as const, label: 'Tóm tắt tiến độ' },
  { key: 'completedWork' as const, label: 'Công việc đã hoàn thành' },
  { key: 'inProgressWork' as const, label: 'Công việc đang thực hiện' },
  { key: 'blockers' as const, label: 'Vướng mắc' },
  { key: 'risks' as const, label: 'Rủi ro' },
  { key: 'nextActions' as const, label: 'Hành động tiếp theo' },
] as const

export function missingSubmissionFields(report: Partial<ReportContent>): string[] {
  return report.summary?.trim() ? [] : ['Tóm tắt tiến độ']
}

export function formatReportDate(value: string): string {
  // DateOnly is a calendar date, never convert it through a timezone.
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}
