import { httpGet, httpPost, httpPut } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import type { MyPeerEvaluation, PeerEvaluationSubmission, PeerRatingInput, PeerRound } from './peer-eval-types'

export const createPeerRound = (projectId: number, body: { title: string; opensAt: string; closesAt: string }) =>
  httpPost<PeerRound>(`/projects/${projectId}/peer-evaluations/rounds`, body)

export const closePeerRound = (projectId: number, roundId: number, concurrencyToken: string) =>
  httpPost<PeerRound>(`/projects/${projectId}/peer-evaluations/rounds/${roundId}/close`, { concurrencyToken })

export const getPeerSubmissions = (projectId: number, roundId: number, page = 1, pageSize = 10, signal?: AbortSignal) =>
  httpGet<PagedResult<PeerEvaluationSubmission>>(`/projects/${projectId}/peer-evaluations?roundId=${roundId}&page=${page}&pageSize=${pageSize}`, signal)

// BE-19b endpoints (AIPMS.Api/Controllers/PeerEvaluationsController.cs). `mine` auto-resolves the
// project's current OPEN round when roundId is omitted; NO_OPEN_ROUND is an explicit, valid
// status, never silently substituted by the client.
export const getMyPeerEvaluation = (projectId: number, roundId?: number, signal?: AbortSignal) =>
  httpGet<MyPeerEvaluation>(
    `/projects/${projectId}/peer-evaluations/mine${roundId != null ? `?roundId=${roundId}` : ''}`, signal,
  )

/** `mine` doesn't carry the roster (who to rate) — that lives on the round itself. Rounds are
 * listed newest-first and at most one is OPEN, so the active round is reliably near the top. */
export const getPeerRounds = (projectId: number, page = 1, pageSize = 50, signal?: AbortSignal) =>
  httpGet<PagedResult<PeerRound>>(
    `/projects/${projectId}/peer-evaluations/rounds?page=${page}&pageSize=${pageSize}`, signal,
  )

/**
 * Upserts the draft. `concurrencyToken` must be the existing draft's current token, or omitted to
 * create the first draft for this round — a token sent with no existing draft, or a stale one, is
 * a 409 `PEER_STALE`. Partial items are fine (draft-save doesn't require covering every member);
 * `submit` is what enforces completeness.
 */
export const savePeerEvaluationDraft = (
  projectId: number, roundId: number, items: PeerRatingInput[], concurrencyToken?: string,
) => httpPut<PeerEvaluationSubmission, { concurrencyToken?: string; items: PeerRatingInput[] }>(
  `/projects/${projectId}/peer-evaluations/rounds/${roundId}/mine`,
  { concurrencyToken, items },
)

/** Requires a draft covering every other current roster member (409 `PEER_INCOMPLETE` otherwise).
 * Idempotent once already SUBMITTED — a double click just returns the same submission. */
export const submitPeerEvaluation = (projectId: number, roundId: number, concurrencyToken: string) =>
  httpPost<PeerEvaluationSubmission, { concurrencyToken: string }>(
    `/projects/${projectId}/peer-evaluations/rounds/${roundId}/mine/submit`,
    { concurrencyToken },
  )
