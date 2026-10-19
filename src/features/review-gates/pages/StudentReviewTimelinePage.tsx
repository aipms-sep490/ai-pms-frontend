import { useContext, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AuthSessionContext } from '../../auth/context/auth-session-context'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { PageLoading } from '../../../components/ui/PageLoading'
import { getStudentReviewTimeline, submitRevision, submitSupervisorFeedback } from '../api/review-gates-api'
import type { StudentReviewTimelineDto } from '../types/review-gates.types'
import { StudentReviewTimeline } from '../components/StudentReviewTimeline'
import { SupervisorGateFollowupPanel } from '../components/SupervisorGateFollowupPanel'

export function StudentReviewTimelinePage() {
  const auth = useContext(AuthSessionContext)
  const params = useParams<{ projectId?: string }>()
  const [searchParams] = useSearchParams()
  const effectiveProjectId = params.projectId || searchParams.get('projectId') || undefined

  const [timeline, setTimeline] = useState<StudentReviewTimelineDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLecturer = auth?.session?.user.roles.includes('LECTURER') ?? false
  const isStaff = (auth?.session?.user.roles.includes('DEPARTMENT_STAFF') || auth?.session?.user.roles.includes('ADMIN')) ?? false

  // Leader state: In real sessions, rely on team/project capabilities; allow mock preview toggle
  const authIsLeader = isLecturer || isStaff ? false : (auth?.session?.user.roles.includes('STUDENT_LEADER') ?? true)
  const [isLeader, setIsLeader] = useState(authIsLeader)

  const loadTimeline = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const data = await getStudentReviewTimeline(effectiveProjectId)
      setTimeline(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải tiến trình thẩm định của nhóm.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void loadTimeline()
  }, [effectiveProjectId])

  const handleSubmitRevision = async (
    gateCode: string,
    requirementId: string,
    artifactName: string,
    notes: string,
  ) => {
    if (!timeline) return
    const targetGate = timeline.gates.find((g) => g.code === gateCode)
    const targetReq = targetGate?.requirements.find((r) => r.id === requirementId)
    const expectedVersion = targetReq?.latestArtifact?.version ?? 0

    const updated = await submitRevision(
      {
        projectId: timeline.projectId,
        gateCode,
        requirementId,
        artifactName,
        notes,
        expectedVersion,
      },
      isLeader,
    )
    setTimeline(updated)
  }

  const currentGate = timeline?.gates.find((g) => g.code === timeline.currentGateCode) || timeline?.gates[0]

  return (
    <WorkspacePage
      eyebrow={
        isLecturer
          ? 'Giảng viên Hướng dẫn · Tiến trình Thẩm định'
          : isStaff
          ? 'Khoa / Bộ môn · Tiến trình Thẩm định'
          : 'Sinh viên Đồ án · Review Gate Timeline'
      }
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
        <div className="space-y-6">
          {isLecturer && currentGate && (
            <SupervisorGateFollowupPanel
              projectId={timeline.projectId}
              projectName={timeline.projectName}
              projectCode={timeline.projectCode}
              currentGateCode={currentGate.code}
              gateTitle={currentGate.title}
              gateStatus={currentGate.status}
              blockerMessage={currentGate.blockingReasons[0]?.message}
              onSendFeedback={async (feedback) => {
                await submitSupervisorFeedback({
                  projectId: timeline.projectId,
                  gateCode: currentGate.code,
                  feedback,
                })
                await loadTimeline(true)
              }}
            />
          )}

          <StudentReviewTimeline
            timeline={timeline}
            isLeader={isLeader}
            onToggleRole={() => setIsLeader(!isLeader)}
            onSubmitRevision={handleSubmitRevision}
          />
        </div>
      ) : null}
    </WorkspacePage>
  )
}
