import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { PageLoading } from '../../../components/ui/PageLoading'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { getAssignedReviewPage, submitGateDecision, verifyEvidence } from '../api/review-gates-api'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { readAllPages } from '../../../services/api/paged-read'
import type { AssignedReviewItem } from '../types/review-gates.types'
import { AssignedReviewQueue } from '../components/AssignedReviewQueue'
import { HttpError } from '../../../services/http/http-client'
import { ReviewGatesMockNotice } from '../components/ReviewGatesMockNotice'

export function AssignedGateReviewPage() {
  const [assignments, setAssignments] = useState<AssignedReviewItem[]>([])
  const [allAssignments, setAllAssignments] = useState<AssignedReviewItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterLoading, setFilterLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const requestId = useRef(0)
  const allRequestId = useRef(0)

  const loadAssignments = useCallback(async () => {
    const currentRequest = ++requestId.current
    try {
      setLoading(true)
      setError(null)
      setAllAssignments(null)
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
    const activeRequest = requestId
    void loadAssignments()
    return () => { activeRequest.current++ }
  }, [loadAssignments])

  const isFiltering = searchQuery.trim() !== '' || statusFilter !== 'ALL'

  useEffect(() => {
    if (!isFiltering || totalPages <= 1 || allAssignments !== null) return
    const current = ++allRequestId.current
    setFilterLoading(true)
    void readAllPages(p => getAssignedReviewPage(p, 50))
      .then(items => { if (current === allRequestId.current) setAllAssignments(items) })
      .catch(() => { /* fall back to loaded page items */ })
      .finally(() => { if (current === allRequestId.current) setFilterLoading(false) })
    return () => { allRequestId.current++ }
  }, [isFiltering, totalPages, allAssignments])

  const filteredAllItems = useMemo(() => {
    const source = isFiltering && allAssignments ? allAssignments : assignments
    const q = searchQuery.trim().toLowerCase()
    return source.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
      if (!q) return true
      return (
        item.projectName.toLowerCase().includes(q) ||
        item.projectCode.toLowerCase().includes(q) ||
        item.gateCode.toLowerCase().includes(q)
      )
    })
  }, [isFiltering, allAssignments, assignments, searchQuery, statusFilter])

  const filteredPagination = useClientPagination(filteredAllItems, pageSize)
  const visibleAssignments = isFiltering ? filteredPagination.paginatedItems : assignments

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
    setAllAssignments((prev) => prev ? prev.map((item) => (item.id === updated.id ? updated : item)) : null)
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
    setAllAssignments((prev) => prev ? prev.map((item) => (item.id === updated.id ? updated : item)) : null)
  }

  const statSource = isFiltering && allAssignments ? allAssignments : assignments
  const pendingOrInReviewCount = statSource.filter(a => a.status === 'PENDING_REVIEW' || a.status === 'IN_REVIEW').length
  const decidedCount = statSource.filter(a => a.status === 'DECIDED').length
  const needsAttentionCount = statSource.filter(
    a => a.status !== 'DECIDED' && a.requirements.some(r => r.verificationStatus === 'REJECTED' || (r.isMandatory && !r.latestArtifact)),
  ).length

  return (
    <WorkspacePage
      className="space-y-5"
      eyebrow="Hội đồng Thẩm định · Review Gate Queue"
      title="Thẩm định Tiến trình Đồ án (Review Gates)"
      description="Xem xét minh chứng học thuật theo phiên bản được nộp, đối chiếu tiêu chí và đưa ra quyết định thẩm định chính thức."
    >
      <ReviewGatesMockNotice />
      {loading && !hasLoaded ? (
        <div className="py-12">
          <PageLoading label="Đang tải các đợt thẩm định được phân công..." />
        </div>
      ) : (
        <>
          {error && (
            <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-6 text-center text-status-error-text">
              <p className="font-semibold">{error}</p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadAssignments()}
                className="mt-3 min-h-11 rounded-lg bg-status-error-text px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-90"
              >
                Thử lại
              </button>
            </div>
          )}
          {hasLoaded && (
            <div aria-busy={loading} className="space-y-5">
              <StatTileRow
                tiles={[
                  {
                    icon: 'pending_actions',
                    label: 'Chờ chấm',
                    value: pendingOrInReviewCount,
                    caption: `Trên tổng ${totalCount} phân công thẩm định`,
                    hero: true,
                  },
                  {
                    icon: 'task_alt',
                    label: 'Đã hoàn tất',
                    value: decidedCount,
                    tone: decidedCount > 0 ? 'success' : 'neutral',
                    caption: 'Đã chốt quyết định thẩm định (trang này)',
                  },
                  {
                    icon: 'warning',
                    label: 'Cần chú ý',
                    value: needsAttentionCount,
                    tone: needsAttentionCount > 0 ? 'warning' : 'neutral',
                    caption: 'Thiếu minh chứng bắt buộc hoặc bị từ chối',
                  },
                  {
                    icon: 'layers',
                    label: 'Tổng phân công',
                    value: totalCount,
                    tone: 'info',
                    caption: `Trang ${page} / ${Math.max(1, totalPages)}`,
                  },
                ]}
              />

              <AssignedReviewQueue
                assignments={visibleAssignments}
                totalFilteredCount={isFiltering ? filteredAllItems.length : undefined}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onVerifyEvidence={handleVerifyEvidence}
                onSubmitDecision={handleSubmitDecision}
                onReload={loadAssignments}
                loading={loading || filterLoading || error !== null}
              />

              {isFiltering ? (
                filteredPagination.showPagination && (
                  <Pagination
                    page={filteredPagination.page}
                    pages={filteredPagination.totalPages}
                    total={filteredPagination.total}
                    pageSize={filteredPagination.pageSize}
                    busy={filterLoading}
                    onPage={filteredPagination.setPage}
                    onPageSizeChange={(size) => { setPageSize(size); filteredPagination.setPageSize(size) }}
                  />
                )
              ) : (
                totalPages > 1 && (
                  <Pagination
                    page={page}
                    pages={totalPages}
                    total={totalCount}
                    pageSize={pageSize}
                    busy={loading || error !== null}
                    onPage={setPage}
                    onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
                  />
                )
              )}
            </div>
          )}
        </>
      )}
    </WorkspacePage>
  )
}
