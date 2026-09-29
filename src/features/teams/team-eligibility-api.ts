import { httpGet, httpPost } from '../../services/http/http-client'
import type { TeamDto } from '../../types/backend'
export interface EligibilityCheck { checkId: number; result: string; freshness: string; checkedAt: string; validUntilAt: string | null; policyVersion: string; issues: Array<{ id: number; ruleCode: string; message: string; sortOrder: number }> }
export const getEligibilityCheck = (teamId: number) => httpGet<EligibilityCheck>(`/teams/${teamId}/eligibility`)
export const getEligibilityHistory = (teamId: number) => httpGet<EligibilityCheck[]>(`/teams/${teamId}/eligibility/history`)
export const checkEligibility = (teamId: number) => httpPost<EligibilityCheck>(`/teams/${teamId}/eligibility/check`)
export const lockEligibility = (teamId: number) => httpPost<TeamDto>(`/teams/${teamId}/eligibility/lock`)
