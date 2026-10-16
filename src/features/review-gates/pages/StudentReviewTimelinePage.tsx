import { useContext, useEffect, useState } from 'react'
import { AuthSessionContext } from '../../auth/context/auth-session-context'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { PageLoading } from '../../../components/ui/PageLoading'
import { getStudentReviewTimeline, submitRevision } from '../api/review-gates-api'
import type { StudentReviewTimelineDto } from '../types/review-gates.types'
import { StudentReviewTimeline } from '../components/StudentReviewTimeline'

export function StudentReviewTimelinePage() {
  const auth = useContext(AuthSessionContext)
  const [timeline, setTimeline] = useState<StudentReviewTimelineDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Default leader state from auth or fallback to true for testing
  const authIsLeader = auth?.session?.user.roles.includes('STUDENT_LEADER') ?? true
  const [isLeader, setIsLeader] = useState(authIsLeader)

  const loadTimeline = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getStudentReviewTimeline()
      setTimeline(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải tiến trình thẩm định của nhóm.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTimeline()
  }, [])

  const handleSubmitRevision = async (
    gateCode: string,
    requirementId: string,
    artifactName: string,
    notes: string,
  ) => {
    if (!timeline) return
    const updated = await submitRevision(
      {
        projectId: timeline.projectId,
        gateCode,
        requirementId,
        artifactName,
        notes,
        expectedVersion: 1,
      },
      isLeader,
    )
    setTimeline(updated)
  }

  return (
    <WorkspacePage
      eyebrow="Sinh viên Đồ án · Review Gate Timeline"
      title="Tiến trình & Hồ sơ Thẩm định Đồ án"
      description="Theo dõi các đợt Review Gates (R1..R4), kiểm tra trạng thái minh chứng và nộp bản cập nhật theo phản hồi của hội đồng thẩm định."
    >
      {loading ? (
        <div className="py-12">
          <PageLoading label="Đang tải tiến trình Review Gates của nhóm..." />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => void loadTimeline()}
            className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
          >
            Thử lại
          </button>
        </div>
      ) : timeline ? (
        <StudentReviewTimeline
          timeline={timeline}
          isLeader={isLeader}
          onToggleRole={() => setIsLeader(!isLeader)}
          onSubmitRevision={handleSubmitRevision}
        />
      ) : null}
    </WorkspacePage>
  )
}
