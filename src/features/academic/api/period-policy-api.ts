import { httpGet, httpPut } from '../../../services/http/http-client'

export interface PeriodPolicyFields {
  allowedProjectModes: string
  allowedProposalSources: string
  minTeamSize: number
  maxTeamSize: number
  minDistinctMajors: number
  maxProjectsPerSupervisor: number
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
