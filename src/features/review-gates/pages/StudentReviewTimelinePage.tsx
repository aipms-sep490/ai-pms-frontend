import { useCallback, useContext, useEffect, useRef, useState } from 'react'
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
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import { Button } from '../../../components/ui/Button'
import { ReviewGatesMockNotice } from '../components/ReviewGatesMockNotice'
import { EntityIdentityStrip } from '../../../components/ui/EntityIdentityStrip'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { SubmissionPreflightPanel } from '../../ai-suite/SubmissionPreflightPanel'
import { GateDeadlineChangePanel } from '../components/GateDeadlineChangePanel'

function timelineError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 404) return 'Chưa có tiến trình thẩm định cho đồ án trong phạm vi của bạn. Dữ liệu đồ án hoặc cấu hình cổng cần được chuẩn bị trên hệ thống.'
    if (error.status === 403) return 'Bạn chưa có quyền xem tiến trình thẩm định của đồ án này.'
    if (error.status === 401) return 'Phiên đăng nhập chưa sẵn sàng. Vui lòng đăng nhập lại.'
    if (error.status === 429) return 'Hệ thống đang giới hạn lượt truy cập. Vui lòng thử lại sau.'
  }
  return humanizeHttpError(error, 'Không thể tải tiến trình thẩm định của nhóm.')
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
  const routeGeneration = useRef(0)
  const [feedbackRefreshWarning, setFeedbackRefreshWarning] = useState<string | null>(null)
  const [feedbackRefreshing, setFeedbackRefreshing] = useState(false)

  const applyTimeline = useCallback((value: StudentReviewTimelineDto) => {
    setTimeline(value)
    setReadiness(null)
    const generation = ++readinessId.current
    void getDefenseReadiness(value.projectId).then(result => {
      if (generation === readinessId.current) setReadiness(result)
    }).catch(() => { /* Readiness stays unknown; no fixture conclusion. */ })
  }, [])

  const isLecturer = auth?.session?.user.roles.includes('LECTURER') ?? false
  const isStaff = (auth?.session?.user.roles.includes('DEPARTMENT_STAFF') || auth?.session?.user.roles.includes('ADMIN')) ?? false

  // Leader state: In real sessions, rely on team/project capabilities (deny-by-default if session absent); allow mock preview toggle only in dev sandbox
  const authIsLeader = !isLecturer && !isStaff && Boolean(auth?.session) && Boolean(
    timeline?.capabilities.canSubmitPackage || timeline?.capabilities.canSubmitRevision,
  )
  const [mockLeaderOverride, setMockLeaderOverride] = useState<boolean | null>(null)
  const isLeaderToggleAllowed = Boolean(import.meta.env.DEV && env.reviewGatesMockEnabled)
  const isLeader = isLeaderToggleAllowed && mockLeaderOverride !== null ? mockLeaderOverride : authIsLeader

  const loadTimeline = useCallback(async (silent = false) => {
    const request = ++loadId.current
    try {
      if (!silent) setLoading(true)
      setError(null)
      const data = await getStudentReviewTimeline(effectiveProjectId)
      if (request === loadId.current) applyTimeline(data)
    } catch (err) {
      if (silent && request === loadId.current) throw err
      if (request === loadId.current) setError(timelineError(err))
    } finally {
      if (!silent && request === loadId.current) setLoading(false)
    }
  }, [effectiveProjectId, applyTimeline])

  const invalidateLoads = useCallback(() => {
    loadId.current++
    readinessId.current++
    routeGeneration.current++
  }, [])

  useEffect(() => {
    setFeedbackRefreshWarning(null)
    setFeedbackRefreshing(false)
    void loadTimeline()
    return invalidateLoads
  }, [loadTimeline, invalidateLoads])

  const refreshFeedback = async (generation = routeGeneration.current) => {
    if (generation !== routeGeneration.current) return
    setFeedbackRefreshing(true)
    try {
      await loadTimeline(true)
      if (generation === routeGeneration.current) setFeedbackRefreshWarning(null)
    } catch {
      if (generation === routeGeneration.current) setFeedbackRefreshWarning('Nhận xét đã được lưu nhưng chưa tải lại được tiến trình. Nội dung đang nhập được giữ lại.')
    } finally {
      if (generation === routeGeneration.current) setFeedbackRefreshing(false)
    }
  }

  const handleSubmitRevision = async (
    gateCode: string,
    requirementId: string,
    payload: ReviewSubmissionPayload,
  ) => {
    if (!timeline) return
    const generation = routeGeneration.current
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
    if (generation === routeGeneration.current) applyTimeline(updated)
  }

  const currentGate = timeline?.gates.find((g) => g.code === timeline.currentGateCode) || timeline?.gates[0]

  return (
    <WorkspacePage
      eyebrow={
        isLecturer
          ? 'Giảng viên hướng dẫn · Tiến trình thẩm định'
          : isStaff
          ? 'Khoa / Bộ môn · Tiến trình thẩm định'
          : 'Sinh viên đồ án · Tiến trình cổng kiểm duyệt'
      }
      title="Tiến trình & Hồ sơ Thẩm định Đồ án"
      description="Theo dõi các cổng kiểm duyệt (G1..G4), kiểm tra trạng thái minh chứng và nộp bản cập nhật theo phản hồi của hội đồng thẩm định."
      action={
        <Button
          variant="secondary"
          size="sm"
          icon="refresh"
          aria-label="Làm mới"
          disabled={loading}
          onClick={() => void loadTimeline()}
        />
      }
      identity={timeline ? <EntityIdentityStrip chips={[
        { icon: 'folder_open', label: 'Đồ án', value: timeline.projectCode },
        { icon: 'account_tree', label: 'Ngành', value: timeline.major },
        { icon: 'verified', label: 'Phiên bản chính sách', value: timeline.effectivePolicyVersion },
        { icon: 'flag', label: 'Mốc hiện tại', value: timeline.currentGateCode || 'Chưa có mốc' },
      ]} /> : undefined}
    >
      <ReviewGatesMockNotice />
      {feedbackRefreshWarning && <div role="alert" className="mb-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
        <p>{feedbackRefreshWarning}</p>
        <Button variant="outline" className="mt-2 min-h-11" disabled={feedbackRefreshing} onClick={() => void refreshFeedback()}>
          {feedbackRefreshing ? 'Đang tải lại nhận xét...' : 'Tải lại nhận xét'}
        </Button>
      </div>}
      {loading ? (
        <div className="py-12">
          <PageLoading label="Đang tải tiến trình thẩm định của nhóm..." />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-6 text-center text-status-error-text">
          <p className="font-semibold">{error}</p>
          <Button variant="danger" className="mt-3 min-h-11" onClick={() => void loadTimeline()}>
            Thử lại
          </Button>
        </div>
      ) : timeline ? (
        <div className="space-y-6">
          {isLecturer && currentGate && (
            <SupervisorGateFollowupPanel
              key={`${timeline.projectId}-${currentGate.code}`}
              projectId={timeline.projectId}
              projectName={timeline.projectName}
              projectCode={timeline.projectCode}
              currentGateCode={currentGate.code}
              gateTitle={currentGate.title}
              gateStatus={currentGate.status}
              blockerMessage={currentGate.blockingReasons[0]?.message}
              onSendFeedback={async (feedback) => {
                const generation = routeGeneration.current
                await submitSupervisorFeedback({
                  projectId: timeline.projectId,
                  gateCode: currentGate.code,
                  feedback,
                })
                // A failed refresh must not imply that an acknowledged POST failed.
                void refreshFeedback(generation)
              }}
            />
          )}

          {timeline.gates.length === 0 ? <WorkspaceEmptyState title="Mốc đánh giá chưa được công bố" message="Đồ án này chưa có cổng thẩm định trong tiến trình do máy chủ trả về. Theo dõi lại sau khi khoa công bố cấu hình phù hợp." /> : <StudentReviewTimeline
            timeline={timeline}
            isLeader={isLeader}
            isAuthenticated={Boolean(auth?.session)}
            onToggleRole={isLeaderToggleAllowed ? () => setMockLeaderOverride(!isLeader) : undefined}
            onSubmitRevision={handleSubmitRevision}
            readiness={readiness}
            onReload={() => loadTimeline(true)}
            onSubmitForReview={async (gateCode) => {
              const generation = routeGeneration.current
              const gate = timeline.gates.find(item => item.code === gateCode)
              const updated = await submitGateForReview({ projectId: timeline.projectId, gateCode, concurrencyToken: gate?.concurrencyToken })
              if (generation === routeGeneration.current) applyTimeline(updated)
            }}
          />}
          {Number(timeline.projectId) > 0 && timeline.gates.length > 0 && (
            <GateDeadlineChangePanel
              projectId={Number(timeline.projectId)}
              gates={timeline.gates.map(g => ({ code: g.code, title: g.title }))}
              canRequest={isLeader || isLecturer}
              canReview={false}
              onChanged={() => void loadTimeline(true)}
            />
          )}
          {Number(timeline.projectId) > 0 && (
            <SubmissionPreflightPanel
              projectId={Number(timeline.projectId)}
              target="REVIEW_GATE"
              targetId={currentGate && Number(currentGate.gateInstanceId) > 0 ? Number(currentGate.gateInstanceId) : null}
            />
          )}
        </div>
      ) : null}
    </WorkspacePage>
  )
}
