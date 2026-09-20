import { useCallback, useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { isActionAllowed, type ProjectDto, type ProjectWorkflowActionsDto } from '../../../types/backend'
import { useAuthSession } from '../../auth/context/useAuthSession'
import {
  decideDepartment,
  decideProjectReview,
  getProjectForReview,
  getReviewActions,
  getReviewDetail,
  getReviewHistory,
  getReviewQueue,
  startReview,
  type QueueQuery,
  type ReviewDetail,
  type ReviewHistory,
  type ReviewProjectSummary,
  type ReviewQueuePage,
} from '../api/project-review-api'

export type ReviewOperation = 'start' | 'revision' | 'approve' | 'reject' | 'department-approve' | 'department-reject'
export type ReviewErrorKind = 'unauthorized' | 'forbidden' | 'not-found' | 'conflict' | 'system'

export interface ReviewError {
  kind: ReviewErrorKind
  message: string
  cause: unknown
}

const initialQuery: QueueQuery = { page: 1, pageSize: 20 }

function classifyError(error: unknown): ReviewError {
  if (error instanceof HttpError || (typeof error === 'object' && error !== null && 'status' in error)) {
    const response = error as { status: number; message?: string }
    const status = response.status
    if (status === 401) return { kind: 'unauthorized', message: 'Phiên đăng nhập đã hết hạn.', cause: error }
    if (status === 403) return { kind: 'forbidden', message: 'Backend từ chối quyền hoặc Department scope.', cause: error }
    if (status === 404) return { kind: 'not-found', message: 'Không tìm thấy Project Review.', cause: error }
    if (status === 409) return { kind: 'conflict', message: `Dữ liệu review vừa thay đổi. ${response.message ?? 'Hãy kiểm tra dữ liệu mới trước khi quyết định lại.'}`, cause: error }
  }
  return { kind: 'system', message: 'Không thể kết nối hoặc tải dữ liệu review.', cause: error }
}

export function useProjectReview(id?: number) {
  const { session } = useAuthSession()
  const [query, setQuery] = useState<QueueQuery>(initialQuery)
  const [queue, setQueue] = useState<ReviewQueuePage<ReviewProjectSummary> | null>(null)
  const [project, setProject] = useState<ProjectDto | null>(null)
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [history, setHistory] = useState<ReviewHistory[]>([])
  const [workflow, setWorkflow] = useState<ProjectWorkflowActionsDto | null>(null)
  const [error, setError] = useState<ReviewError | null>(null)
  const [loading, setLoading] = useState(Boolean(session))
  const [pending, setPending] = useState<ReviewOperation | null>(null)

  const refresh = useCallback(async () => {
    if (!session) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const queuePromise = getReviewQueue(query, session.accessToken)
      if (!id) {
        setQueue(await queuePromise)
        return
      }

      const [nextQueue, nextProject, nextDetail, nextHistory, nextWorkflow] = await Promise.all([
        queuePromise,
        getProjectForReview(id, session.accessToken),
        getReviewDetail(id, session.accessToken),
        getReviewHistory(id, session.accessToken),
        getReviewActions(id, session.accessToken),
      ])
      setQueue(nextQueue)
      setProject(nextProject)
      setDetail(nextDetail)
      setHistory(nextHistory)
      setWorkflow(nextWorkflow)
    } catch (nextError) {
      setError(classifyError(nextError))
    } finally {
      setLoading(false)
    }
  }, [id, query, session])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const execute = useCallback(async (operation: ReviewOperation, request: () => Promise<unknown>) => {
    setPending(operation)
    setError(null)
    try {
      await request()
      await refresh()
      return true
    } catch (nextError) {
      const classified = classifyError(nextError)
      // A 409 is never retried: fetch the authoritative record, then wait for a new user decision.
      if (classified.kind === 'conflict') await refresh()
      setError(classified)
      return false
    } finally {
      setPending(null)
    }
  }, [refresh])

  const requireReviewResource = () => {
    if (!session || !id || !detail) throw new Error('Review resource unavailable')
    return { accessToken: session.accessToken, id, detail }
  }

  const beginReview = useCallback(async () => {
    const resource = requireReviewResource()
    return execute('start', () => startReview(resource.id, resource.detail.concurrencyToken, resource.accessToken))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, execute, id, session])

  const decide = useCallback(async (kind: 'revision' | 'approve' | 'reject', reason?: string) => {
    const resource = requireReviewResource()
    return execute(kind, () => decideProjectReview(resource.id, kind, resource.detail.concurrencyToken, reason, resource.accessToken))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, execute, id, session])

  const decideParticipatingDepartment = useCallback(async (decision: 'APPROVED' | 'REJECTED', reason?: string) => {
    const resource = requireReviewResource()
    const snapshotId = resource.detail.latestSubmission?.id
    if (!snapshotId) throw new Error('Submission snapshot unavailable')
    const operation: ReviewOperation = decision === 'APPROVED' ? 'department-approve' : 'department-reject'
    return execute(operation, () => decideDepartment(resource.id, {
      snapshotId,
      concurrencyToken: resource.detail.concurrencyToken,
      decision,
      reason,
    }, resource.accessToken))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, execute, id, session])

  const allowed = (code: string) => isActionAllowed(workflow?.actions ?? [], code)

  return {
    query,
    queue,
    project,
    detail,
    history,
    workflow,
    error,
    loading,
    pending,
    refresh,
    setSearch: (search: string) => setQuery((current) => ({ ...current, page: 1, search })),
    goToPage: (page: number) => setQuery((current) => ({ ...current, page: Math.max(1, page) })),
    beginReview,
    decide,
    decideParticipatingDepartment,
    canStart: allowed('start_review'),
    canRequestRevision: allowed('request_revision'),
    canApprove: allowed('approve_project'),
    canReject: allowed('reject_project'),
    canApproveDepartment: allowed('approve_department'),
    canRejectDepartment: allowed('reject_department'),
    isUnauthorized: !session || error?.kind === 'unauthorized',
    isForbidden: error?.kind === 'forbidden',
  }
}
