import { httpGet, httpPost } from '../http/http-client'
import type { PagedResult } from '../../types/backend'
import type { EvaluationScoreInput } from '../../features/evaluations/evaluation-types'

export interface WeeklyAssessmentWeek {
  weekNumber: number
  startDate: string
  endDate: string
  hasStarted: boolean
}

export interface WeeklyAssessmentCalendar {
  academicSemesterId: number
  timeZoneId: string
  weeks: WeeklyAssessmentWeek[]
}

export interface RubricCriterion {
  id: number
  criterionId: number
  name: string
  description: string | null
  weightPercent: number
  maxScore: number | null
  sortOrder: number
  isRequired: boolean
  parentId: number | null
  effectiveWeightPercent: number
}

export interface Rubric {
  id: number
  departmentId: number | null
  academicSemesterId: number | null
  code: string
  name: string
  description: string | null
  status: string
  rootRubricId: number
  version: number
  concurrencyToken: string
  isReferenced: boolean
  createdAt: string
  updatedAt: string
  criteria: RubricCriterion[]
}

/** A frozen leaf criterion snapshot plus its score; never re-derived from a live rubric. */
export interface WeeklyAssessmentScore {
  rubricCriterionId: number
  name: string
  description: string | null
  weightPercent: number
  maxScore: number
  sortOrder: number
  isRequired: boolean
  score: number | null
  comments: string | null
}

export type WeeklyAssessmentStatus = 'DRAFT' | 'SUBMITTED' | 'SUPERSEDED' | (string & {})

/** isDemo/affectsOfficialResult are always true/false: weekly feedback never enters StudentResult. */
export interface WeeklyAssessment {
  id: number
  projectId: number
  studentId: number
  majorId: number
  academicSemesterId: number
  weekNumber: number
  startDate: string
  endDate: string
  timeZoneId: string
  version: number
  status: WeeklyAssessmentStatus
  rubricId: number
  rubricName: string
  rubricVersion: number
  scores: WeeklyAssessmentScore[]
  totalScore: number | null
  comments: string | null
  revisionReason: string | null
  concurrencyToken: string
  createdBy: number
  primaryAssignmentId: number
  createdAt: string
  submittedAt: string | null
  canEdit: boolean
  canSubmit: boolean
  isDemo: boolean
  affectsOfficialResult: boolean
}

export const getWeeklyAssessmentWeeks = (projectId: number, signal?: AbortSignal) =>
  httpGet<WeeklyAssessmentCalendar>(`/projects/${projectId}/weekly-assessments/weeks`, signal)

export const getWeeklyAssessmentRubrics = (projectId: number, page = 1, pageSize = 20, signal?: AbortSignal) =>
  httpGet<PagedResult<Rubric>>(`/projects/${projectId}/weekly-assessments/rubrics?page=${page}&pageSize=${pageSize}`, signal)

export const getWeeklyAssessmentHistory = (projectId: number, filter: { studentId?: number; weekNumber?: number }, page = 1, pageSize = 20, signal?: AbortSignal) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (filter.studentId !== undefined) params.set('studentId', String(filter.studentId))
  if (filter.weekNumber !== undefined) params.set('weekNumber', String(filter.weekNumber))
  return httpGet<PagedResult<WeeklyAssessment>>(`/projects/${projectId}/weekly-assessments?${params}`, signal)
}

export const getWeeklyAssessment = (id: number, signal?: AbortSignal) =>
  httpGet<WeeklyAssessment>(`/weekly-assessments/${id}`, signal)

/** Omit concurrencyToken to create the first version; include it to edit the current draft.
 * A revisionReason with no concurrencyToken corrects a SUBMITTED version into version+1. */
export const saveWeeklyAssessment = (projectId: number, body: {
  studentId: number; weekNumber: number; rubricId: number; expectedLatestVersion: number
  scores: EvaluationScoreInput[]; comments?: string | null; concurrencyToken?: string | null; revisionReason?: string | null
}) => httpPost<WeeklyAssessment>(`/projects/${projectId}/weekly-assessments/draft`, body)

export const submitWeeklyAssessment = (id: number, concurrencyToken: string) =>
  httpPost<WeeklyAssessment>(`/weekly-assessments/${id}/submit`, { concurrencyToken })
