import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { env } from '../../../app/config/env'
import * as meetingsApi from '../../../services/api/meetings.api'
import * as milestonesApi from '../../../services/api/milestones.api'
import * as tasksApi from '../../../services/api/tasks.api'
import type { MilestoneDto } from '../../../types/backend'
import type { MeetingDetail } from '../meeting-types'
import { MeetingError, MeetingLoading, MeetingShell } from '../meeting-ui'
import { canManageMeeting, meetingError } from '../meeting-utils'
import { MeetingNotesForm } from '../MeetingNotesForm'
import { MeetingGovernancePanel } from '../MeetingGovernancePanel'
import type { MeetingAiActionItem } from './ai/meeting-video-ai.types'
import { meetingVideoError, meetingVideoErrorCode } from './meeting-video-errors'
import { endMeetingVideo, joinMeetingVideo } from './meeting-video-api'
import { MeetingVideoPreflight, type MeetingVideoPreflightSelection } from './MeetingVideoPreflight'
import type { MeetingVideoJoinResponse } from './meeting-video.types'
import { useMeetingVideoAccess } from './useMeetingVideoAccess'

const LiveKitRoomAdapter = lazy(() =>
  import('./providers/livekit/LiveKitRoomAdapter').then((module) => ({ default: module.LiveKitRoomAdapter })),
)

export function MeetingVideoRoomPage() {
  const { meetingId } = useParams()
  const access = useExecutionAccess()
  return <MeetingVideoRoomView key={`${access.project.id}:${meetingId}`} id={Number(meetingId)} />
}

function MeetingVideoRoomView({ id }: { id: number }) {
  const access = useExecutionAccess()
  const { project, routeBase } = access
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const backTo = `${routeBase}/meetings/${id}`

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setError('Đường dẫn cuộc họp không hợp lệ.')
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError('')
    meetingsApi
      .getMeeting(id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (result.projectId !== project.id) {
          setError('Cuộc họp không thuộc đồ án đang mở.')
          return
        }
        if (!env.videoMeetingEnabled) {
          setError('Phòng họp trực tuyến trong PMS hiện chưa được bật.')
          return
        }
        if (result.videoChannel !== 'IN_APP_VIDEO') {
          setError('Cuộc họp này không sử dụng phòng họp trực tuyến trong PMS.')
          return
        }
        setMeeting(result)
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(meetingError(reason))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [id, project.id, revision])

  return (
    <MeetingShell
      title="Phòng họp trực tuyến"
      description="Kiểm tra thiết bị trước khi tham gia, trao đổi trực tiếp cùng nhóm và sử dụng Trợ lý AI cuộc họp."
      projectTitle={project.title}
      backTo={backTo}
      action={
        <Link className="mtg-button mtg-button--secondary" to={backTo}>
          Chi tiết cuộc họp
        </Link>
      }
    >
      {loading ? (
        <MeetingLoading />
      ) : error ? (
        <MeetingError message={error} retry={() => setRevision((value) => value + 1)} />
      ) : (
        meeting && (
          <MeetingVideoRoomAccess
            meeting={meeting}
            backTo={backTo}
            onMeetingUpdated={setMeeting}
          />
        )
      )}
    </MeetingShell>
  )
}

function MeetingVideoRoomAccess({
  meeting,
  backTo,
  onMeetingUpdated,
}: {
  meeting: MeetingDetail
  backTo: string
  onMeetingUpdated: (updated: MeetingDetail) => void
}) {
  const navigate = useNavigate()
  const access = useExecutionAccess()
  const { state, refresh } = useMeetingVideoAccess(meeting)
  const [credential, setCredential] = useState<MeetingVideoJoinResponse | null>(null)
  const [preferences, setPreferences] = useState<MeetingVideoPreflightSelection | null>(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [sidePanel, setSidePanel] = useState<'none' | 'governance' | 'ai'>('none')
  const [draftMinutes, setDraftMinutes] = useState<{ key: string; notes: string } | null>(null)
  const [milestones, setMilestones] = useState<MilestoneDto[]>([])
  const joinLock = useRef(false)
  const endLock = useRef(false)
  const endDialogRef = useRef<HTMLDivElement>(null)
  const canManage = canManageMeeting(access, meeting)
  const isSupervisor = access.actor === 'supervisor'
  const teamMemberUserIds = (access.team?.members ?? []).map((m) => m.userId)
  const denialMessages = state.status === 'ready' ? state.resource.denialReasons.map(meetingVideoErrorCode) : []

  useEffect(() => {
    if (confirmEnd) endDialogRef.current?.focus()
  }, [confirmEnd])

  useEffect(() => {
    if (!credential || !canManage) return
    const controller = new AbortController()
    milestonesApi
      .getProjectMilestones(meeting.projectId, controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setMilestones(list)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [credential, canManage, meeting.projectId])

  async function requestConnect(selection: MeetingVideoPreflightSelection) {
    if (joinLock.current || state.status !== 'ready' || !state.resource.capabilities.canJoin) return
    joinLock.current = true
    setJoining(true)
    setJoinError('')
    try {
      const response = await joinMeetingVideo(meeting.id)
      if (response.provider !== 'LIVEKIT') {
        setJoinError('Nhà cung cấp Video không được hỗ trợ trên ứng dụng này.')
        return
      }
      // Response-scoped credential is passed directly into the lazy provider adapter and never persisted.
      setPreferences(selection)
      setCredential(response)
    } catch (reason) {
      setJoinError(meetingVideoError(reason))
      refresh()
    } finally {
      joinLock.current = false
      setJoining(false)
    }
  }

  async function endRoom() {
    if (endLock.current || state.status !== 'ready' || !state.resource.capabilities.canEnd) return
    endLock.current = true
    setEnding(true)
    setEndError('')
    try {
      await endMeetingVideo(meeting.id)
      setCredential(null)
      setPreferences(null)
      refresh()
      navigate(backTo)
    } catch (reason) {
      setEndError(meetingVideoError(reason))
      refresh()
    } finally {
      endLock.current = false
      setEnding(false)
      setConfirmEnd(false)
    }
  }

  function leaveRoom() {
    setCredential(null)
    setPreferences(null)
    navigate(backTo)
  }

  function terminal(message: string) {
    setCredential(null)
    setPreferences(null)
    setJoinError(message)
    refresh()
  }

  async function refreshMeetingDetail() {
    try {
      const fresh = await meetingsApi.getMeeting(meeting.id)
      onMeetingUpdated(fresh)
      return fresh
    } catch {
      return meeting
    }
  }

  function handleApplyMinutes(minutes: string) {
    setDraftMinutes({ key: `ai-${Date.now()}`, notes: minutes })
    setSidePanel('governance')
  }

  async function handleApplyDecision(content: string) {
    const fresh = await refreshMeetingDetail()
    if (!fresh.concurrencyToken) throw new Error('Thiếu token phiên bản cuộc họp.')
    await meetingsApi.createMeetingDecision(fresh.id, content, fresh.concurrencyToken)
    await refreshMeetingDetail()
  }

  async function handleCreateActionItem(item: MeetingAiActionItem, milestoneId: number | null) {
    const fresh = await refreshMeetingDetail()
    if (!fresh.concurrencyToken) throw new Error('Thiếu token phiên bản cuộc họp.')
    const dueAt = item.dueAt && new Date(item.dueAt).getTime() > Date.now() ? item.dueAt : null
    let description = item.description?.trim() || ''

    if (milestoneId && canManage) {
      const meetingRef = `Nguồn: Trợ lý AI Cuộc họp #${fresh.id}: ${fresh.title}`
      const taskDesc = description ? `${description}\n\n${meetingRef}` : meetingRef
      const assignees =
        item.assigneeUserId && teamMemberUserIds.includes(item.assigneeUserId)
          ? [item.assigneeUserId]
          : []
      const createdTask = await tasksApi.createTask({
        milestoneId,
        title: item.title,
        description: taskDesc,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(item.priority)
          ? item.priority
          : 'MEDIUM',
        dueAt,
        assigneeUserIds: assignees,
      })
      description = `[Task #${createdTask.id}] ${description}`.trim()
    }

    await meetingsApi.createMeetingActionItem(fresh.id, {
      title: item.title,
      description: description || null,
      assigneeUserId: item.assigneeUserId,
      dueAt,
      status: 'OPEN',
      concurrencyToken: fresh.concurrencyToken,
    })
    await refreshMeetingDetail()
  }

  if (state.status === 'loading' || state.status === 'idle') return <MeetingLoading />
  if (state.status === 'error') return <MeetingError message={state.message} retry={refresh} />
  if (!state.resource.capabilities.canJoin) {
    return (
      <section className="mtg-panel mtg-padded">
        <h2>Chưa thể tham gia phòng họp</h2>
        {denialMessages.length > 0 ? (
          <ul className="mtg-video-denials" role="alert">
            {denialMessages.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        ) : (
          <p className="mtg-help">Bạn chưa được cấp quyền tham gia phòng họp ở thời điểm này.</p>
        )}
        <Link className="mtg-button mtg-button--secondary" to={backTo}>
          Quay lại chi tiết cuộc họp
        </Link>
      </section>
    )
  }

  const governanceOpen = sidePanel === 'governance'
  const aiOpen = sidePanel === 'ai'

  if (credential && preferences) {
    return (
      <>
        <Suspense fallback={<MeetingLoading />}>
          <LiveKitRoomAdapter
            credential={credential}
            preferences={preferences}
            title={meeting.title}
            canEnd={state.resource.capabilities.canEnd}
            onLeave={leaveRoom}
            onEndRequested={() => setConfirmEnd(true)}
            onTerminal={terminal}
            governance={
              <RoomGovernanceDrawer
                meeting={meeting}
                backTo={backTo}
                canManage={canManage}
                open={governanceOpen}
                draftMinutes={draftMinutes}
                onDraftConsumed={() => setDraftMinutes(null)}
                onMeetingSynced={onMeetingUpdated}
                onClose={() => setSidePanel('none')}
              />
            }
            governanceOpen={governanceOpen}
            onGovernance={() => setSidePanel((value) => (value === 'governance' ? 'none' : 'governance'))}
            ai={{
              meeting,
              canManage,
              isSupervisor,
              currentUserId: access.currentUserId ?? null,
              milestones: milestones.map((m) => ({ id: m.id, title: m.title })),
              aiOpen,
              onAiToggle: () => setSidePanel((value) => (value === 'ai' ? 'none' : 'ai')),
              onAiClose: () => setSidePanel('none'),
              onApplyMinutesToNotes: canManage ? handleApplyMinutes : undefined,
              onApplyDecision: canManage ? handleApplyDecision : undefined,
              onCreateActionItem: canManage ? handleCreateActionItem : undefined,
            }}
          />
        </Suspense>
        {confirmEnd && (
          <div ref={endDialogRef} tabIndex={-1} className="mtg-confirm" role="alertdialog" aria-label="Xác nhận kết thúc phòng">
            <p>Kết thúc phòng họp với tất cả người tham gia? Cuộc họp vẫn được giữ nguyên trên lịch.</p>
            {endError && <p role="alert">{endError}</p>}
            <div className="mtg-actions">
              <button className="mtg-button mtg-button--secondary" disabled={ending} onClick={() => setConfirmEnd(false)}>
                Quay lại
              </button>
              <button className="mtg-button mtg-button--danger" disabled={ending} onClick={() => void endRoom()}>
                {ending ? 'Đang kết thúc…' : 'Kết thúc phòng'}
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {joinError && (
        <p className="mtg-notice mtg-notice--error" role="alert">
          {joinError}
        </p>
      )}
      <MeetingVideoPreflight
        onBack={() => navigate(backTo)}
        onConnectRequested={(selection) => void requestConnect(selection)}
      />
      {joining && (
        <p className="mtg-loading" role="status">
          Đang chuẩn bị phòng họp…
        </p>
      )}
    </>
  )
}

function RoomGovernanceDrawer({
  meeting: externalMeeting,
  backTo,
  canManage,
  open,
  draftMinutes,
  onDraftConsumed,
  onMeetingSynced,
  onClose,
}: {
  meeting: MeetingDetail
  backTo: string
  canManage: boolean
  open: boolean
  draftMinutes: { key: string; notes: string } | null
  onDraftConsumed: () => void
  onMeetingSynced: (updated: MeetingDetail) => void
  onClose: () => void
}) {
  const [meeting, setMeeting] = useState(externalMeeting)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const saveLock = useRef(false)

  useEffect(() => {
    setMeeting(externalMeeting)
  }, [externalMeeting])

  async function reload() {
    try {
      const fresh = await meetingsApi.getMeeting(externalMeeting.id)
      setMeeting(fresh)
      onMeetingSynced(fresh)
      setNeedsRefresh(false)
      setError('')
    } catch (reason) {
      setError(meetingError(reason))
    }
  }

  async function save(body: Parameters<typeof meetingsApi.updateMeetingNotes>[1]) {
    if (saveLock.current || needsRefresh) return
    saveLock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await meetingsApi.updateMeetingNotes(meeting.id, { ...body, concurrencyToken: meeting.concurrencyToken })
      onDraftConsumed()
      setNotice('Đã lưu biên bản và điểm danh.')
      await reload()
    } catch (reason) {
      setError(meetingError(reason))
      setNeedsRefresh(true)
    } finally {
      saveLock.current = false
      setBusy(false)
    }
  }

  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null
  const writableNotes = canManage && (meeting.status === 'SCHEDULED' || meeting.status === 'COMPLETED')
  return (
    <aside className="mtg-video-governance" aria-label="Quản trị cuộc họp">
      <div className="mtg-section-heading">
        <h2>Quản trị cuộc họp</h2>
        <button ref={closeRef} className="mtg-button mtg-button--secondary" onClick={onClose}>
          Đóng
        </button>
      </div>
      <h3>Nội dung dự kiến</h3>
      <p className="mtg-prose">{meeting.agenda || 'Chưa có nội dung dự kiến.'}</p>
      {draftMinutes && (
        <p className="mtg-notice" role="status">
          Đã điền sẵn biên bản do Trợ lý AI tạo vào biểu mẫu bên dưới. Kiểm tra lại rồi bấm Lưu để ghi nhận chính thức.
        </p>
      )}
      {writableNotes && meeting.concurrencyToken && (
        <>
          <MeetingNotesForm
            key={draftMinutes?.key ?? 'room-manual'}
            initialNotes={draftMinutes?.notes}
            meeting={meeting}
            busy={busy}
            locked={needsRefresh}
            onDirty={() => setNotice('')}
            onCancel={onClose}
            onSave={save}
          />
          {notice && <p role="status">{notice}</p>}
          {error && <p role="alert">{error}</p>}
          {needsRefresh && (
            <button className="mtg-button mtg-button--secondary" disabled={busy} onClick={() => void reload()}>
              Tải lại phiên bản để tiếp tục
            </button>
          )}
        </>
      )}
      {meeting.concurrencyToken && (
        <MeetingGovernancePanel
          meeting={meeting}
          concurrencyToken={meeting.concurrencyToken}
          candidates={[]}
          canManage={canManage}
          disabled={busy || needsRefresh}
          onChanged={() => void reload()}
        />
      )}
      <Link className="mtg-button mtg-button--secondary" to={backTo}>
        Mở quản trị cuộc họp
      </Link>
    </aside>
  )
}
