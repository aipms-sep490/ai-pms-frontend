import { httpGet, httpPost, httpPut } from '../../../services/http/http-client'

export interface PeriodPolicyFields {
  allowedProjectModes: string
  allowedProposalSources: string
  minTeamSize: number
  maxTeamSize: number
  minDistinctMajors: number
  maxProjectsPerSupervisor: number
  requireWorkingAgreement?: boolean
}

export interface PeriodPolicy {
  id: number
  projectPeriodId: number
  version: number
  status: 'DRAFT' | 'PUBLISHED' | 'LOCKED' | string
  effectiveFrom: string
  effectiveTo: string
  concurrencyToken: string
  policy: PeriodPolicyFields
}

export interface SavePeriodPolicyInput {
  expectedVersion: number
  operation: 'SUCCESSOR' | 'UPDATE_DRAFT' | 'PUBLISH'
  policy: PeriodPolicyFields
  effectiveFrom: string
  effectiveTo: string
  concurrencyToken?: string
}

const root = (periodId: number) => `/project-periods/${periodId}`

export const getEffectivePeriodPolicy = (periodId: number, signal?: AbortSignal) => httpGet<PeriodPolicy>(`${root(periodId)}/effective-policy`, signal)
export const getPeriodPolicyHistory = (periodId: number, signal?: AbortSignal) => httpGet<PeriodPolicy[]>(`${root(periodId)}/policy-versions`, signal)
export const savePeriodPolicy = (periodId: number, body: SavePeriodPolicyInput) => httpPut<PeriodPolicy>(`${root(periodId)}/policy`, body)

export interface HolidayItem {
  date: string
  name: string
  isRecurring: boolean
}

export interface PeriodCalendar {
  projectPeriodId: number
  workingDaysOfWeek: number
  workingDaysDescription: string
  holidays: HolidayItem[]
  concurrencyToken: string
}

export interface SavePeriodCalendarRequest {
  workingDaysOfWeek: number
  holidays: HolidayItem[]
  concurrencyToken: string
}

export interface LoadVietnamHolidaysRequest {
  year: number
  concurrencyToken: string
}

export const getPeriodCalendar = (periodId: number, signal?: AbortSignal) =>
  httpGet<PeriodCalendar>(`${root(periodId)}/calendar`, signal)

export const savePeriodCalendar = (periodId: number, body: SavePeriodCalendarRequest) =>
  httpPut<PeriodCalendar>(`${root(periodId)}/calendar`, body)

export const loadVietnamHolidays = (periodId: number, body: LoadVietnamHolidaysRequest) =>
  httpPost<PeriodCalendar>(`${root(periodId)}/calendar/load-vn-holidays`, body)
