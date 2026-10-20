import { useEffect, useState } from 'react'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { PageLoading } from '../../../components/ui/PageLoading'
import { getAssignedReviews, submitGateDecision, verifyEvidence } from '../api/review-gates-api'
import type { AssignedReviewItem } from '../types/review-gates.types'
import { AssignedReviewQueue } from '../components/AssignedReviewQueue'

export function AssignedGateReviewPage() {
  const [assignments, setAssignments] = useState<AssignedReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAssignments = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAssignedReviews()
      setAssignments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đồ án được phân công thẩm định.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAssignments()
  }, [])

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
      {loading ? (
        <div className="py-12">
          <PageLoading label="Đang tải các đợt thẩm định được phân công..." />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => void loadAssignments()}
            className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <AssignedReviewQueue
          assignments={assignments}
          onVerifyEvidence={handleVerifyEvidence}
          onSubmitDecision={handleSubmitDecision}
          onReload={loadAssignments}
        />
      )}
    </WorkspacePage>
  )
}
