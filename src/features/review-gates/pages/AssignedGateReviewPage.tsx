import { useCallback, useEffect, useRef, useState } from 'react'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { PageLoading } from '../../../components/ui/PageLoading'
import { getAssignedReviewPage, submitGateDecision, verifyEvidence } from '../api/review-gates-api'
import { Pagination } from '../../../components/ui/Pagination'
import type { AssignedReviewItem } from '../types/review-gates.types'
import { AssignedReviewQueue } from '../components/AssignedReviewQueue'
import { HttpError } from '../../../services/http/http-client'
import { ReviewGatesMockNotice } from '../components/ReviewGatesMockNotice'

export function AssignedGateReviewPage() {
  const [assignments, setAssignments] = useState<AssignedReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const requestId = useRef(0)

  const loadAssignments = useCallback(async () => {
    const currentRequest = ++requestId.current
    try {
      setLoading(true)
      setError(null)
      const data = await getAssignedReviewPage(page, pageSize)
      if (currentRequest !== requestId.current) return
      setAssignments(data.items)
      setTotalCount(data.totalCount)
      setTotalPages(data.totalPages)
      setHasLoaded(true)
    } catch (err) {
      if (currentRequest === requestId.current) {
        setError(err instanceof HttpError && err.problem?.code === 'REVIEW_QUEUE_BUSY'
          ? 'Hàng đợi thẩm định đang bận. Vui lòng thử lại sau ít giây; ghi chú của bạn được giữ nguyên.'
          : err instanceof Error ? err.message : 'Không thể tải danh sách đồ án được phân công thẩm định.')
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    void loadAssignments()
    return () => { requestId.current++ }
  }, [loadAssignments])

  const handleVerifyEvidence = async (
    assignmentId: string,
    requirementId: string,
    decision: 'ACCEPTED' | 'REJECTED',
    feedback?: string,
    concurrencyToken?: string,
  ) => {
    const updated = await verifyEvidence({
      assignmentId,
      requirementId,
      decision,
      feedback,
      concurrencyToken: concurrencyToken || '',
    })
    setAssignments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  const handleSubmitDecision = async (
    assignmentId: string,
    decision: 'PASSED' | 'REVISION_REQUIRED',
    notes: string,
    concurrencyToken?: string,
  ) => {
    const updated = await submitGateDecision({
      assignmentId,
      decision,
      notes,
      concurrencyToken: concurrencyToken || '',
    })
    setAssignments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
  }

  return (
    <WorkspacePage
      eyebrow="Hội đồng Thẩm định · Review Gate Queue"
      title="Thẩm định Tiến trình Đồ án (Review Gates)"
      description="Xem xét minh chứng học thuật theo phiên bản được nộp, đối chiếu tiêu chí và đưa ra quyết định thẩm định chính thức."
    >
      <ReviewGatesMockNotice />
      {loading && !hasLoaded ? (
        <div className="py-12">
          <PageLoading label="Đang tải các đợt thẩm định được phân công..." />
        </div>
      ) : <>
      {error && (
        <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-6 text-center text-danger-text">
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadAssignments()}
            className="mt-3 rounded-lg bg-danger-strong px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-danger-strong-hover"
          >
            Thử lại
          </button>
        </div>
      )}
      {hasLoaded && <div aria-busy={loading}>
        <AssignedReviewQueue
          assignments={assignments}
          onVerifyEvidence={handleVerifyEvidence}
          onSubmitDecision={handleSubmitDecision}
          onReload={loadAssignments}
          loading={loading || error !== null}
        />
        <Pagination page={page} pages={totalPages} total={totalCount} pageSize={pageSize} busy={loading || error !== null}
          onPage={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
      </div>}
      </>}
    </WorkspacePage>
  )
}
