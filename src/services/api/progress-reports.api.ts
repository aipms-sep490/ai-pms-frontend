import { httpGet, httpPost, httpPut } from '../http/http-client'
import type { PagedResult } from '../../types/backend'
import type { CreateReport, ProgressReport, ReportContent, ReportDetail, ReportFeedback, ReportStatus, ReportType } from '../../features/reports/report-types'

export interface ReportFilters {
  reportType?: ReportType
  status?: ReportStatus
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export function getProgressReports(projectId: number, filters: ReportFilters = {}, signal?: AbortSignal) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries({ page: 1, pageSize: 10, ...filters })) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  return httpGet<PagedResult<ProgressReport>>(`/projects/${projectId}/progress-reports?${query}`, signal)
}
export const getProgressReport = (id: number, signal?: AbortSignal) => httpGet<ReportDetail>(`/progress-reports/${id}`, signal)
export const createProgressReport = (projectId: number, body: CreateReport) => httpPost<ProgressReport>(`/projects/${projectId}/progress-reports`, body)
export const updateProgressReport = (id: number, body: ReportContent) => httpPut<ProgressReport>(`/progress-reports/${id}`, body)
export const submitProgressReport = (id: number) => httpPost<ProgressReport>(`/progress-reports/${id}/submit`)
export const addProgressReportFeedback = (id: number, feedbackText: string) => httpPost<ReportFeedback>(`/progress-reports/${id}/feedback`, { feedbackText })
