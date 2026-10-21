import { useContext, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { env } from '../../../app/config/env'
import { AuthSessionContext } from '../../auth/context/auth-session-context'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { PageLoading } from '../../../components/ui/PageLoading'
import { getDefenseReadiness, getStudentReviewTimeline, submitGateForReview, submitRevision, submitSupervisorFeedback } from '../api/review-gates-api'
import type { DefenseReadinessSummary } from '../types/review-gates.types'
import type { StudentReviewTimelineDto } from '../types/review-gates.types'
import { StudentReviewTimeline } from '../components/StudentReviewTimeline'
import type { ReviewSubmissionPayload } from '../components/ReviewSubmissionModal'
import { SupervisorGateFollowupPanel } from '../components/SupervisorGateFollowupPanel'
import { HttpError } from '../../../services/http/http-client'

function timelineError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 404) return 'Chưa có tiến trình thẩm định cho đồ án trong phạm vi của bạn. Dữ liệu đồ án hoặc cấu hình cổng cần được chuẩn bị trên hệ thống.'
    if (error.status === 403) return 'Bạn chưa có quyền xem tiến trình thẩm định của đồ án này.'
    if (error.status === 401) return 'Phiên đăng nhập chưa sẵn sàng. Vui lòng đăng nhập lại.'
    if (error.status === 429) return 'Hệ thống đang giới hạn lượt truy cập. Vui lòng thử lại sau.'
  }
  return error instanceof Error ? error.message : 'Không thể tải tiến trình thẩm định của nhóm.'
}

export function StudentReviewTimelinePage() {
  const auth = useContext(AuthSessionContext)
  const params = useParams<{ projectId?: string }>()
  const [searchParams] = useSearchParams()
  const effectiveProjectId = params.projectId || searchParams.get('projectId') || undefined

  const [timeline, setTimeline] = useState<StudentReviewTimelineDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [readiness, setReadiness] = useState<DefenseReadinessSummary | null>(null)
  const loadId = useRef(0)
  const readinessId = useRef(0)

  const applyTimeline = (value: StudentReviewTimelineDto) => {
    setTimeline(value)
    setReadiness(null)
    const generation = ++readinessId.current
    void getDefenseReadiness(value.projectId).then(result => {
      if (generation === readinessId.current) setReadiness(result)
    }).catch(() => { /* Readiness stays unknown; no fixture conclusion. */ })
  }

  const isLecturer = auth?.session?.user.roles.includes('LECTURER') ?? false
  const isStaff = (auth?.session?.user.roles.includes('DEPARTMENT_STAFF') || auth?.session?.user.roles.includes('ADMIN')) ?? false

  // Leader state: In real sessions, rely on team/project capabilities (deny-by-default if session absent); allow mock preview toggle only in dev sandbox
  const authIsLeader = !isLecturer && !isStaff && Boolean(auth?.session) && Boolean(
    timeline?.capabilities.canSubmitPackage || timeline?.capabilities.canSubmitRevision,
  )
  const [mockLeaderOverride, setMockLeaderOverride] = useState<boolean | null>(null)
  const isLeaderToggleAllowed = Boolean(import.meta.env.DEV && env.reviewGatesMockEnabled)
  const isLeader = isLeaderToggleAllowed && mockLeaderOverride !== null ? mockLeaderOverride : authIsLeader

  const loadTimeline = async (silent = false) => {
    const request = ++loadId.current
    try {
      if (!silent) setLoading(true)
      setError(null)
      const data = await getStudentReviewTimeline(effectiveProjectId)
      if (request === loadId.current) applyTimeline(data)
    } catch (err) {
      if (silent) throw err
      if (request === loadId.current) setError(timelineError(err))
    } finally {
      if (!silent && request === loadId.current) setLoading(false)
    }
  }

  useEffect(() => {
    void loadTimeline()
    return () => { loadId.current++; readinessId.current++ }
  }, [effectiveProjectId])

  const handleSubmitRevision = async (
    gateCode: string,
    requirementId: string,
    payload: ReviewSubmissionPayload,
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
        artifactName: payload.artifactName,
        notes: payload.notes,
        mode: payload.mode,
        file: payload.file || undefined,
        linkUrl: payload.linkUrl,
        expectedVersion,
        concurrencyToken: targetGate?.concurrencyToken,
      },
      isLeader,
    )
    applyTimeline(updated)
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
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
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
              onSendFeedback={env.reviewGatesMockEnabled ? async (feedback) => {
                await submitSupervisorFeedback({
                  projectId: timeline.projectId,
                  gateCode: currentGate.code,
                  feedback,
                })
                await loadTimeline(true)
              } : undefined}
            />
          )}

          <StudentReviewTimeline
            timeline={timeline}
            isLeader={isLeader}
            isAuthenticated={Boolean(auth?.session)}
            onToggleRole={isLeaderToggleAllowed ? () => setMockLeaderOverride(!isLeader) : undefined}
            onSubmitRevision={handleSubmitRevision}
            readiness={readiness}
            onReload={() => loadTimeline(true)}
            onSubmitForReview={async (gateCode) => {
              const gate = timeline.gates.find(item => item.code === gateCode)
              applyTimeline(await submitGateForReview({ projectId: timeline.projectId, gateCode, concurrencyToken: gate?.concurrencyToken }))
            }}
          />
        </div>
      ) : null}
    </WorkspacePage>
  )
}
