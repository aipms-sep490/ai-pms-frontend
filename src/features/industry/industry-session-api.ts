import { httpGet, httpPost } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type { LoginSession } from '../auth/types/auth.types'

export interface IndustryAssignment {
  id: number; projectId: number; projectCode: string; projectTitle: string; expertId: number; scope: string; majorId: number | null
  startsAt: string; endsAt: string; status: string; concurrencyToken: string; allowedActions: string[]; advisoryOnly: boolean
}
export interface IndustryChallenge { challengeId: string; clientId: string; nonce: string; expiresAtUtc: string }
export const getIndustryAssignments = (page = 1, signal?: AbortSignal) => httpGet<PagedResult<IndustryAssignment>>(`/industry/assignments?page=${page}&pageSize=20`, signal)
export const getIndustryAssignment = (id: number, signal?: AbortSignal) => httpGet<IndustryAssignment>(`/industry/assignments/${id}`, signal)
/** The challenge cookie uses shared HTTP credentials; never persist invitation tokens or log inputs. */
export const createIndustryChallenge = () => httpPost<IndustryChallenge>('/auth/industry/google/challenge', undefined, { skipAuthRefresh: true })
export const enrollIndustryExpert = (input: { challengeId: string; idToken: string; invitationToken: string }) => httpPost<LoginSession>('/auth/industry/google/enroll', input, { skipAuthRefresh: true })
