import { httpGet, httpPost } from '../http/http-client'
import type { PagedResult } from '../../types/backend'

/** One report slot in a template. Code is a free-form identifier the department
 * chooses (e.g. SOFTWARE_REQUIREMENT); it is not a fixed cross-major enum. */
export interface ColdReportInput {
  code: string
  name: string
  required: boolean
}

/** Immutable once created: a new version is a new template row, never an edit. */
export interface ColdTemplate {
  id: number
  majorId: number
  projectPeriodId: number
  name: string
  version: number
  reports: ColdReportInput[]
}

/** The seven IT SEP490 reports are an explicit worked example only — no automatic
 * policy assignment to any major. Marketing/Design departments author their own. */
export const getColdTemplateItExample = (signal?: AbortSignal) =>
  httpGet<ColdReportInput[]>('/cold-report-templates/examples/it', signal)

export const getColdTemplates = (majorId: number, projectPeriodId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<ColdTemplate>>(`/cold-report-templates?majorId=${majorId}&projectPeriodId=${projectPeriodId}&page=${page}&pageSize=${pageSize}`, signal)

export const createColdTemplate = (body: { majorId: number; projectPeriodId: number; name: string; reports: ColdReportInput[] }) =>
  httpPost<ColdTemplate>('/cold-report-templates', body)
