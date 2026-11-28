import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Modal } from '../../components/ui/Modal'
import { displayLabel } from '../../components/ui/display-label'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { useAssistantActionDraft } from '../ai/useAssistantActionDraft'
import { env } from '../../app/config/env'
import * as api from '../../services/api/meetings.api'
import type { MeetingCollaboration, MeetingDetail } from './meeting-types'
import { attendanceStatuses, recurrenceLabels, rsvpStatusLabels } from './meeting-types'
import { canManageMeeting, formatMeetingTime, meetingDate, meetingVenue, meetingError, mustRefreshAfterError, safeMeetingUrl } from './meeting-utils'
import { MeetingError, MeetingLoading, MeetingShell, MeetingStatusBadge } from './meeting-ui'
import { MeetingScheduleForm } from './MeetingScheduleForm'
import { MeetingNotesForm } from './MeetingNotesForm'
import { MeetingNotesHistoryPanel } from './MeetingNotesHistoryPanel'
import { MeetingUnsavedNotice } from './MeetingUnsavedNotice'
import { useMeetingCandidates } from './useMeetingCandidates'
import { MeetingGovernancePanel } from './MeetingGovernancePanel'
import { MeetingVideoSection } from './video/MeetingVideoSection'
import { MeetingVideoPresencePanel } from './video/MeetingVideoPresencePanel'
import { MeetingAiDetailSection } from './video/ai/MeetingAiDetailSection'

type Confirmation =
  | { type: 'cancel' | 'complete' | 'discard' | 'refresh' }
  | { type: 'remove'; userId: number; name: string }

function initialsOf(name: string): string {
  const cleaned = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function durationText(startAt: string, endAt: string | null): string | null {
  if (!endAt) return null
  const start = meetingDate(startAt).getTime()
  const end = meetingDate(endAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null
  const mins = Math.round((end - start) / 60_000)
  if (mins < 60) return `${mins} phút`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`
}

function attendanceTone(status: string | null | undefined): string {
  if (status === 'PRESENT' || status === 'ATTENDED') return 'success'
  if (status === 'ABSENT') return 'error'
  if (status === 'LATE' || status === 'EXCUSED') return 'warning'
  return 'neutral'
}

function rsvpTone(status: string | null | undefined): string {
  if (status === 'ACCEPTED') return 'success'
  if (status === 'DECLINED') return 'error'
  if (status === 'TENTATIVE') return 'warning'
  return 'neutral'
}

export function MeetingDetailPage() {
  const { meetingId } = useParams()
  const access = useExecutionAccess()
  return <MeetingDetailView key={`${access.project.id}:${access.currentUserId}:${meetingId}`} id={Number(meetingId)} />
}

function MeetingDetailView({ id }: { id: number }) {
  const access = useExecutionAccess()
  const { project, routeBase } = access
  const assistant = useAssistantActionDraft(project.id, 'MEETING_MINUTES')
  const [appliedDraft, setAppliedDraft] = useState<{ key: string; notes: string } | null>(null)
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [revision, setRevision] = useState(0)
  const [editor, setEditor] = useState<'schedule' | 'notes' | 'feedback' | null>(null)
  const [dirty, setDirty] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [participantId, setParticipantId] = useState('')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [collaboration, setCollaboration] = useState<MeetingCollaboration | null>(null)
  const [rsvpBusy, setRsvpBusy] = useState(false)
  const [lockBusy, setLockBusy] = useState(false)
  const lock = useRef(false)
  const alive = useRef(true)

  const manage = Boolean(meeting && canManageMeeting(access, meeting))
  const scheduled = meeting?.status === 'SCHEDULED'
  const writableNotes = meeting?.status === 'SCHEDULED' || meeting?.status === 'COMPLETED'
  const notesLocked = Boolean(collaboration?.notesLockedAt)
  const notesEditable = writableNotes && !notesLocked
  const candidates = useMeetingCandidates(project.id, project.teamId, manage && meeting?.status !== 'CANCELLED')
  const disabled = busy || needsRefresh

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setLoadError('Đường dẫn cuộc họp không hợp lệ.')
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    api
      .getMeeting(id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (result.projectId !== project.id) {
          setLoadError('Cuộc họp không thuộc đồ án đang mở.')
          return
        }
        setMeeting(result)
        setNeedsRefresh(false)
        setParticipantId('')
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setLoadError(meetingError(reason))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [project.id, id, revision])

  useEffect(() => {
    if (!env.meetingCollaborationEnabled || !Number.isSafeInteger(id) || id < 1) {
      setCollaboration(null)
      return
    }
    const controller = new AbortController()
    api
      .getMeetingCollaboration(id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setCollaboration(result)
      })
      .catch(() => {
        if (!controller.signal.aborted) setCollaboration(null)
      })
    return () => controller.abort()
  }, [id, revision])

  async function mutate(operation: () => Promise<unknown>, message: string) {
    if (lock.current || needsRefresh) return
    lock.current = true
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await operation()
      if (!alive.current) return
      setSuccess(message)
      setDirty(false)
      setEditor(null)
      setAppliedDraft(null)
      setFeedback('')
      setConfirmation(null)
      // The next GET owns detail/status. If it fails, expose retry GET only, never repeat a successful mutation.
      setLoading(true)
      setRevision((value) => value + 1)
    } catch (reason) {
      if (alive.current) {
        setError(meetingError(reason))
        setNeedsRefresh(mustRefreshAfterError(reason))
        setConfirmation(null)
      }
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }

  function reload() {
    setDirty(false)
    setEditor(null)
    setFeedback('')
    setConfirmation(null)
    setError('')
    setRevision((value) => value + 1)
  }

  function closeEditor() {
    if (dirty) setConfirmation({ type: 'discard' })
    else {
      setEditor(null)
      setFeedback('')
    }
  }

  async function confirm() {
    if (!confirmation || busy) return
    if (confirmation.type === 'refresh') {
      reload()
      return
    }
    if (confirmation.type === 'discard') {
      setDirty(false)
      setEditor(null)
      setFeedback('')
      setConfirmation(null)
      return
    }
    if (!meeting || !manage || !scheduled) return
    const token = meeting.concurrencyToken
    if (!token) {
      setError('Không có token phiên bản của cuộc họp. Hãy tải lại trước khi cập nhật.')
      setNeedsRefresh(true)
      return
    }
    if (confirmation.type === 'remove')
      await mutate(() => api.removeMeetingParticipant(id, confirmation.userId, token), 'Đã cập nhật danh sách người tham gia.')
    else if (confirmation.type === 'cancel')
      await mutate(() => api.cancelMeeting(id, token), 'Đã hủy lịch họp. Lịch sử cuộc họp vẫn được giữ lại.')
    else await mutate(() => api.completeMeeting(id, token), 'Đã đánh dấu cuộc họp hoàn tất.')
  }

  async function respondRsvp(status: string) {
    if (rsvpBusy || !collaboration?.myRsvp || meeting?.status !== 'SCHEDULED') return
    setRsvpBusy(true)
    setError('')
    try {
      const updated = await api.respondMeetingRsvp(id, status, collaboration.myRsvp.concurrencyToken)
      if (alive.current) {
        setCollaboration((current) => (current ? { ...current, myRsvp: updated } : current))
        setMeeting((current) =>
          current
            ? {
                ...current,
                participants: current.participants.map((participant) =>
                  participant.userId === updated.userId ? { ...participant, rsvpStatus: updated.status } : participant,
                ),
              }
            : current,
        )
      }
    } catch (reason) {
      if (alive.current) setError(meetingError(reason))
    } finally {
      if (alive.current) setRsvpBusy(false)
    }
  }

  async function lockNotes() {
    if (lockBusy || !collaboration?.canLockNotes) return
    setLockBusy(true)
    setError('')
    try {
      const updated = await api.lockMeetingNotes(id, collaboration.concurrencyToken)
      if (alive.current) {
        setCollaboration(updated)
        setSuccess('Đã khóa biên bản cuộc họp.')
      }
    } catch (reason) {
      if (alive.current) setError(meetingError(reason))
    } finally {
      if (alive.current) setLockBusy(false)
    }
  }

  const [unlockOpen, setUnlockOpen] = useState(false)
  const [unlockReason, setUnlockReason] = useState('')

  async function unlockNotes(event: FormEvent) {
    event.preventDefault()
    const cleanReason = unlockReason.trim()
    if (lockBusy || !collaboration?.canUnlockNotes || cleanReason.length < 10) return
    setLockBusy(true)
    setError('')
    try {
      const updated = await api.unlockMeetingNotes(id, collaboration.concurrencyToken, cleanReason)
      if (alive.current) {
        setCollaboration(updated)
        setUnlockOpen(false)
        setUnlockReason('')
        setSuccess('Đã mở khóa biên bản cuộc họp và ghi nhật ký kiểm toán.')
      }
    } catch (reason) {
      if (alive.current) setError(meetingError(reason))
    } finally {
      if (alive.current) setLockBusy(false)
    }
  }

  function sendFeedback(event: FormEvent) {
    event.preventDefault()
    if (access.readOnly || access.actor !== 'supervisor' || !writableNotes || !feedback.trim()) return
    const token = meeting?.concurrencyToken
    if (!token) {
      setError('Không có token phiên bản của cuộc họp. Hãy tải lại trước khi gửi nhận xét.')
      setNeedsRefresh(true)
      return
    }
    void mutate(() => api.addMeetingFeedback(id, feedback.trim(), token), 'Đã gửi nhận xét cho nhóm.')
  }

  const confirmTitle =
    confirmation?.type === 'cancel'
      ? 'Hủy lịch cuộc họp'
      : confirmation?.type === 'complete'
        ? 'Hoàn tất cuộc họp'
        : confirmation?.type === 'remove'
          ? 'Bỏ người tham gia'
          : confirmation?.type === 'refresh'
            ? 'Tải lại dữ liệu'
            : 'Bỏ thay đổi chưa lưu'

  const confirmationText =
    confirmation?.type === 'cancel'
      ? 'Hủy cuộc họp này? Sau khi hủy, cuộc họp chỉ được xem và không thể mở lại.'
      : confirmation?.type === 'complete'
        ? 'Xác nhận cuộc họp đã diễn ra? Lịch và danh sách tham gia sẽ được khóa; bạn vẫn có thể bổ sung biên bản.'
        : confirmation?.type === 'remove'
          ? `Bỏ ${confirmation.name} khỏi cuộc họp?`
          : confirmation?.type === 'refresh'
            ? 'Tải lại dữ liệu mới nhất sẽ bỏ nội dung đang sửa. Tiếp tục?'
            : 'Bỏ các thay đổi chưa lưu trong biểu mẫu này?'

  const isDangerConfirm = confirmation?.type === 'cancel' || confirmation?.type === 'remove' || confirmation?.type === 'discard'
  const onlineUrl = safeMeetingUrl(meeting?.onlineUrl ?? null)
  const durationLabel = meeting ? durationText(meeting.startAt, meeting.endAt) : null
  const availableToAdd = meeting
    ? candidates.data.filter((candidate) => !meeting.participants.some((participant) => participant.userId === candidate.userId))
    : []

  return (
    <MeetingShell
      title={meeting && !loadError ? meeting.title : 'Chi tiết cuộc họp'}
      projectTitle={project.title}
      backTo={`${routeBase}/meetings`}
      backLabel="Danh sách cuộc họp"
      description="Theo dõi thời gian, mở phòng họp trực tuyến, ghi biên bản và chốt đầu việc sau họp."
    >
      <MeetingUnsavedNotice dirty={dirty} busy={busy} />
      {success && (
        <p role="status" className="mtg-notice mtg-notice--success">
          {success}
        </p>
      )}
      {error && <MeetingError message={error} />}
      {needsRefresh && !loadError && (
        <div className="mtg-notice">
          <p>Thao tác đang tạm khóa cho đến khi tải lại trạng thái mới nhất.</p>
          <button
            type="button"
            className="mtg-button mtg-button--secondary"
            disabled={busy}
            onClick={() => (dirty ? setConfirmation({ type: 'refresh' }) : reload())}
          >
            Tải lại trạng thái
          </button>
        </div>
      )}
      {confirmation && (
        <Modal
          open
          role="alertdialog"
          title={confirmTitle}
          description={confirmationText}
          busy={busy}
          onClose={() => setConfirmation(null)}
        >
          <div className="app-modal__actions">
            <button type="button" className="app-modal__button" disabled={busy} onClick={() => setConfirmation(null)}>
              Quay lại
            </button>
            <button
              type="button"
              className={`app-modal__button ${isDangerConfirm ? 'app-modal__button--danger' : 'app-modal__button--primary'}`}
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy ? 'Đang xử lý…' : 'Xác nhận'}
            </button>
          </div>
        </Modal>
      )}

      {loading ? (
        <MeetingLoading />
      ) : loadError ? (
        <MeetingError message={loadError} retry={reload} />
      ) : (
        meeting && (
          <div className="mtg-detail-page">
            {/* Compact Hero Overview Bar */}
            <div className="mtg-detail-hero">
              <div className="mtg-detail-hero__left">
                <div className="mtg-detail-hero__badges">
                  <MeetingStatusBadge status={meeting.status} />
                  {durationLabel && <span className="mtg-detail-meta-pill">{durationLabel}</span>}
                  {collaboration?.seriesId && (
                    <span className="mtg-detail-meta-pill mtg-detail-meta-pill--accent">
                      <span className="material-symbols-outlined" aria-hidden="true">repeat</span>
                      Thuộc chuỗi lặp {recurrenceLabels[collaboration.recurrence as keyof typeof recurrenceLabels] ?? collaboration.recurrence}
                      {collaboration.occurrenceNumber ? ` · Lần thứ ${collaboration.occurrenceNumber}` : ''}
                    </span>
                  )}
                </div>

                <div className="mtg-detail-hero__time">
                  <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                  <div>
                    <p className="mtg-detail-hero__kicker">Thời gian · Giờ Việt Nam (UTC+7)</p>
                    <p className="mtg-detail-hero__value">
                      <strong>{formatMeetingTime(meeting.startAt)}</strong>
                      <span className="mtg-detail-hero__end">
                        {meeting.endAt ? `Kết thúc: ${formatMeetingTime(meeting.endAt)}` : 'Chưa xác định giờ kết thúc'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mtg-detail-hero__chips">
                  <span className="mtg-detail-chip">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {meeting.videoChannel === 'IN_APP_VIDEO' || meeting.onlineUrl ? 'videocam' : 'location_on'}
                    </span>
                    {meetingVenue(meeting)}
                  </span>
                  <span className="mtg-detail-chip">
                    <span className="material-symbols-outlined" aria-hidden="true">person</span>
                    Tổ chức: {meeting.createdByName}
                  </span>
                  <span className="mtg-detail-chip">
                    <span className="material-symbols-outlined" aria-hidden="true">group</span>
                    {meeting.participants.length} người tham gia
                  </span>
                </div>
              </div>

              <div className="mtg-detail-hero__actions">
                {onlineUrl && (
                  <a className="mtg-button" href={onlineUrl} target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>
                    Mở phòng họp ↗
                  </a>
                )}
                {!needsRefresh && (
                  <button
                    type="button"
                    className="mtg-button mtg-button--secondary"
                    disabled={busy}
                    onClick={() => (dirty ? setConfirmation({ type: 'refresh' }) : reload())}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                    Tải lại trạng thái
                  </button>
                )}
              </div>
            </div>

            {/* Primary Video Room Action Banner — Immediately visible above the fold */}
            <MeetingVideoSection meeting={meeting} routeBase={routeBase} />

            {/* Unified 2-Column Detail Workspace */}
            <div className="mtg-detail-workspace">
              {/* Left Main Column: Content, Minutes, AI Copilot, Governance & Feedback */}
              <div className="mtg-detail-main">
                {/* 1. Agenda & Venue Card */}
                <section className="mtg-schedule-card">
                  <div className="mtg-schedule-card__head">
                    <div className="mtg-schedule-card__title-group">
                      <span className="mtg-schedule-card__icon" aria-hidden="true">
                        <span className="material-symbols-outlined">description</span>
                      </span>
                      <div>
                        <h2>Nội dung và địa điểm</h2>
                        <p className="mtg-schedule-card__sub">Chương trình dự kiến và thông tin tổ chức buổi họp</p>
                      </div>
                    </div>
                    {manage && scheduled && editor !== 'schedule' && (
                      <button
                        type="button"
                        className="mtg-button mtg-button--secondary mtg-button--small"
                        disabled={disabled || dirty}
                        onClick={() => setEditor('schedule')}
                      >
                        Sửa lịch
                      </button>
                    )}
                  </div>

                  <div className="mtg-schedule-card__body">
                    {editor === 'schedule' ? (
                      <MeetingScheduleForm
                        meeting={meeting}
                        busy={busy}
                        locked={needsRefresh}
                        onDirty={() => setDirty(true)}
                        onCancel={closeEditor}
                        onSave={async (body) => {
                          if (!manage || !scheduled) return
                          const token = meeting.concurrencyToken
                          if (!token) {
                            setError('Không có token phiên bản của cuộc họp. Hãy tải lại trước khi lưu.')
                            setNeedsRefresh(true)
                            return
                          }
                          const { participantUserIds: _participants, ...schedule } = body
                          await mutate(
                            () => api.updateMeeting(id, { ...schedule, concurrencyToken: token }),
                            'Đã lưu thay đổi lịch họp.',
                          )
                        }}
                      />
                    ) : (
                      <>
                        <div className="mtg-prose-box">
                          <p className="mtg-prose">{meeting.agenda || 'Chưa có nội dung dự kiến.'}</p>
                        </div>
                        <dl className="mtg-facts mtg-facts--card">
                          <div>
                            <dt>Địa điểm</dt>
                            <dd>{meetingVenue(meeting)}</dd>
                          </div>
                          <div>
                            <dt>Người tổ chức</dt>
                            <dd>{meeting.createdByName}</dd>
                          </div>
                        </dl>
                        {!onlineUrl && meeting.onlineUrl && (
                          <p className="mtg-help mtg-help--tight">Liên kết họp không hợp lệ. Liên hệ người tổ chức để cập nhật.</p>
                        )}
                      </>
                    )}
                  </div>
                </section>

                {/* 2. Minutes & Attendance Card */}
                <section className="mtg-schedule-card">
                  <div className="mtg-schedule-card__head">
                    <div className="mtg-schedule-card__title-group">
                      <span className="mtg-schedule-card__icon" aria-hidden="true">
                        <span className="material-symbols-outlined">assignment</span>
                      </span>
                      <div>
                        <h2>Biên bản và điểm danh</h2>
                        <p className="mtg-schedule-card__sub">Lưu nội dung đã thống nhất và ghi nhận điểm danh chính thức</p>
                      </div>
                    </div>
                    <div className="mtg-actions">
                      {env.meetingCollaborationEnabled && collaboration?.canLockNotes && (
                        <button
                          type="button"
                          className="mtg-button mtg-button--secondary mtg-button--small"
                          disabled={disabled || dirty || lockBusy}
                          onClick={() => void lockNotes()}
                        >
                          {lockBusy ? 'Đang khóa…' : 'Khóa biên bản'}
                        </button>
                      )}
                      {env.meetingCollaborationEnabled && collaboration?.canUnlockNotes && (
                        <button
                          type="button"
                          className="mtg-button mtg-button--secondary mtg-button--small"
                          disabled={disabled || lockBusy}
                          onClick={() => setUnlockOpen(open => !open)}
                        >
                          Mở khóa biên bản
                        </button>
                      )}
                      {manage && notesEditable && editor !== 'notes' && (
                        <button
                          type="button"
                          className="mtg-button mtg-button--secondary mtg-button--small"
                          disabled={disabled || dirty}
                          onClick={() => {
                            setAppliedDraft(null)
                            setEditor('notes')
                          }}
                        >
                          Cập nhật biên bản
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mtg-schedule-card__body">
                    {notesLocked && (
                      <p className="mtg-info-inline">
                        <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                        <span>
                          Biên bản đã được khóa
                          {formatMeetingTime(collaboration?.notesLockedAt ?? '') !== 'Chưa rõ thời gian'
                            ? ` lúc ${formatMeetingTime(collaboration?.notesLockedAt ?? '')}`
                            : ''}
                          , không thể chỉnh sửa thêm.
                        </span>
                      </p>
                    )}

                    {unlockOpen && collaboration?.canUnlockNotes && (
                      <form className="mtg-form mt-3 rounded-lg border border-hairline bg-canvas p-3" onSubmit={unlockNotes}>
                        <label className="block text-sm font-medium text-ink">
                          Lý do mở khóa biên bản (tối thiểu 10 ký tự)
                          <textarea
                            required
                            minLength={10}
                            maxLength={1000}
                            rows={2}
                            value={unlockReason}
                            disabled={lockBusy}
                            onChange={(event) => setUnlockReason(event.target.value)}
                            placeholder="Nêu rõ lý do cần chỉnh sửa lại biên bản đã khóa (ghi AuditLog)…"
                          />
                        </label>
                        <div className="mtg-actions mt-2">
                          <button
                            type="button"
                            className="mtg-button mtg-button--secondary mtg-button--small"
                            disabled={lockBusy}
                            onClick={() => { setUnlockOpen(false); setUnlockReason('') }}
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            className="mtg-button mtg-button--small"
                            disabled={lockBusy || unlockReason.trim().length < 10}
                          >
                            {lockBusy ? 'Đang mở khóa…' : 'Xác nhận mở khóa'}
                          </button>
                        </div>
                      </form>
                    )}

                    {assistant.draft && (
                      <div className="mtg-notice mtg-notice--compact">
                        <p>Bản nháp AI: {assistant.draft.title}. Kiểm tra nội dung trước khi lưu. Điểm danh được giữ nguyên.</p>
                        {manage && notesEditable && (!env.meetingCollaborationEnabled || !!collaboration) ? (
                          <button
                            type="button"
                            className="mtg-button mtg-button--secondary mtg-button--small"
                            disabled={disabled || dirty}
                            onClick={() => {
                              setAppliedDraft({ key: assistant.key, notes: assistant.draft!.description })
                              setEditor('notes')
                              setDirty(true)
                            }}
                          >
                            Điền bản nháp vào biên bản
                          </button>
                        ) : (
                          <p>Chưa thể áp dụng bản nháp: cần quyền sửa và biên bản chưa khóa.</p>
                        )}
                      </div>
                    )}

                    {editor === 'notes' ? (
                      <MeetingNotesForm
                        key={appliedDraft?.key ?? 'manual'}
                        initialNotes={appliedDraft?.notes}
                        meeting={meeting}
                        busy={busy}
                        locked={needsRefresh || notesLocked}
                        onDirty={() => setDirty(true)}
                        onCancel={closeEditor}
                        onSave={async (body) => {
                          if (manage && notesEditable) {
                            const token = meeting.concurrencyToken
                            if (!token) {
                              setError('Không có token phiên bản của cuộc họp. Hãy tải lại trước khi lưu biên bản.')
                              setNeedsRefresh(true)
                              return
                            }
                            await mutate(
                              () => api.updateMeetingNotes(id, { ...body, concurrencyToken: token }),
                              'Đã lưu biên bản và điểm danh.',
                            )
                          }
                        }}
                      />
                    ) : (
                      <div className="mtg-prose-box">
                        <p className="mtg-prose">
                          {meeting.meetingNotes || 'Chưa có biên bản. Ghi lại kết luận sau buổi trao đổi để cả nhóm cùng theo dõi.'}
                        </p>
                      </div>
                    )}

                    {editor !== 'notes' && (
                      <section className="mtg-attendance-summary" aria-label="Điểm danh chính thức">
                        <div className="mtg-attendance-summary__head">
                          <h3 className="mtg-subheading">Điểm danh người tham gia</h3>
                          <span className="mtg-optional-pill">{meeting.participants.length} thành viên</span>
                        </div>
                        {meeting.participants.length === 0 ? (
                          <p className="mtg-help mtg-help--tight">Chưa có người tham gia để điểm danh.</p>
                        ) : (
                          <ul className="mtg-attendance-grid">
                            {meeting.participants.map((participant) => {
                              const label =
                                participant.attendanceStatus && participant.attendanceStatus !== 'INVITED'
                                  ? attendanceStatuses[participant.attendanceStatus] ?? 'Chưa cập nhật điểm danh'
                                  : 'Chưa cập nhật điểm danh'
                              const tone = attendanceTone(participant.attendanceStatus)
                              return (
                                <li key={participant.userId} className="mtg-attendance-pill-card">
                                  <span className="mtg-participant-card__avatar" aria-hidden="true">
                                    {initialsOf(participant.fullName)}
                                  </span>
                                  <div className="mtg-attendance-pill-card__copy">
                                    <strong>{participant.fullName}</strong>
                                    <span className={`mtg-mini-pill mtg-mini-pill--${tone}`}>{label}</span>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                        <p className="mtg-help mtg-help--tight">
                          Điểm danh do người quản lý ghi nhận, độc lập với phản hồi lời mời và dữ liệu kết nối Video.
                        </p>
                      </section>
                    )}

                    {env.meetingCollaborationEnabled && (
                      <div className="mtg-notes-history-wrap">
                        <MeetingNotesHistoryPanel meetingId={id} refreshKey={collaboration?.notesVersion ?? 0} />
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. AI Copilot Section */}
                <MeetingAiDetailSection
                  meeting={meeting}
                  canManage={manage}
                  isSupervisor={!access.readOnly && access.actor === 'supervisor'}
                  currentUserId={access.currentUserId ?? null}
                  teamMemberUserIds={(access.team?.members ?? []).map((m) => m.userId)}
                  onApplyMinutesToNotes={
                    manage && notesEditable
                      ? (minutes) => {
                          setAppliedDraft({ key: `video-ai-${Date.now()}`, notes: minutes })
                          setEditor('notes')
                          setDirty(true)
                          setSuccess('Đã điền biên bản AI vào khung Biên bản cuộc họp phía trên. Kiểm tra lại trước khi lưu.')
                        }
                      : undefined
                  }
                  onApplySupervisorFeedback={
                    !access.readOnly && access.actor === 'supervisor' && writableNotes
                      ? (draft) => {
                          setFeedback(draft)
                          setEditor('feedback')
                          setDirty(true)
                          setSuccess('Đã điền bản nháp nhận xét vào khung Nhận xét của GVHD bên dưới.')
                        }
                      : undefined
                  }
                  onMeetingChanged={reload}
                />

                {/* 4. Decisions & Action Items */}
                {meeting.concurrencyToken ? (
                  <MeetingGovernancePanel
                    meeting={meeting}
                    concurrencyToken={meeting.concurrencyToken}
                    candidates={candidates.data}
                    canManage={manage}
                    disabled={disabled || dirty}
                    onChanged={reload}
                  />
                ) : (
                  <section className="mtg-schedule-card">
                    <div className="mtg-schedule-card__head">
                      <h2>Kết luận và công việc sau họp</h2>
                    </div>
                    <div className="mtg-schedule-card__body">
                      <p className="mtg-help mtg-help--tight">Thông tin cuộc họp chưa đầy đủ. Tải lại trước khi chỉnh sửa.</p>
                    </div>
                  </section>
                )}

                {/* 5. Supervisor Feedback */}
                <section className="mtg-schedule-card" aria-labelledby="meeting-feedback-title">
                  <div className="mtg-schedule-card__head">
                    <div className="mtg-schedule-card__title-group">
                      <span className="mtg-schedule-card__icon" aria-hidden="true">
                        <span className="material-symbols-outlined">rate_review</span>
                      </span>
                      <div>
                        <h2 id="meeting-feedback-title">
                          Nhận xét của GVHD <span className="mtg-count">{meeting.feedbacks.length}</span>
                        </h2>
                        <p className="mtg-schedule-card__sub">Góp ý chuyên môn từ giảng viên hướng dẫn sau buổi họp</p>
                      </div>
                    </div>
                    {!access.readOnly && access.actor === 'supervisor' && writableNotes && editor !== 'feedback' && (
                      <button
                        type="button"
                        className="mtg-button mtg-button--secondary mtg-button--small"
                        disabled={disabled || dirty}
                        onClick={() => setEditor('feedback')}
                      >
                        Viết nhận xét
                      </button>
                    )}
                  </div>

                  <div className="mtg-schedule-card__body">
                    {meeting.feedbacks.length === 0 ? (
                      <p className="mtg-help mtg-help--tight">Chưa có nhận xét từ giảng viên.</p>
                    ) : (
                      <ol className="mtg-feedback-list">
                        {meeting.feedbacks.map((item) => (
                          <li key={item.id}>
                            <strong>{item.supervisorName}</strong>
                            <time dateTime={item.createdAt}>{formatMeetingTime(item.createdAt)}</time>
                            <p className="mtg-prose">{item.feedbackText}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                    {editor === 'feedback' && (
                      <form className="mtg-form" onSubmit={sendFeedback}>
                        <fieldset disabled={disabled}>
                          <label>
                            Nhận xét mới
                            <textarea
                              rows={4}
                              required
                              value={feedback}
                              onChange={(event) => {
                                setFeedback(event.target.value)
                                setDirty(true)
                              }}
                            />
                          </label>
                          <div className="mtg-form-actions">
                            <button type="button" className="mtg-button mtg-button--secondary" onClick={closeEditor}>
                              Đóng chỉnh sửa
                            </button>
                            <button className="mtg-button" disabled={!feedback.trim()} type="submit">
                              Gửi nhận xét
                            </button>
                          </div>
                        </fieldset>
                      </form>
                    )}
                  </div>
                </section>
              </div>

              {/* Right Sidebar: RSVP, Participants, Lifecycle Controls & Connection Evidence */}
              <aside className="mtg-detail-aside">
                {/* Card 1: Participants & RSVP */}
                <section className="mtg-schedule-card">
                  <div className="mtg-schedule-card__head">
                    <div className="mtg-schedule-card__title-group">
                      <span className="mtg-schedule-card__icon" aria-hidden="true">
                        <span className="material-symbols-outlined">group</span>
                      </span>
                      <div>
                        <h2>
                          Người tham gia <span className="mtg-count">{meeting.participants.length}</span>
                        </h2>
                        <p className="mtg-schedule-card__sub">Xác nhận tham dự và quản lý danh sách mời</p>
                      </div>
                    </div>
                  </div>

                  <div className="mtg-schedule-card__body">
                    {/* RSVP block cleanly highlighted at top of participants card */}
                    {env.meetingCollaborationEnabled && collaboration?.myRsvp && scheduled && (
                      <div className="mtg-rsvp mtg-rsvp-box" role="group" aria-label="Phản hồi tham dự">
                        <div className="mtg-rsvp-box__head">
                          <p className="mtg-rsvp-box__question">Bạn tham dự cuộc họp này?</p>
                          <p role="status" className="mtg-rsvp-box__status">
                            {rsvpBusy
                              ? 'Đang lưu phản hồi…'
                              : `Phản hồi của bạn: ${rsvpStatusLabels[collaboration.myRsvp.status] ?? collaboration.myRsvp.status}`}
                          </p>
                        </div>
                        <div className="mtg-rsvp-pills">
                          {([
                            ['ACCEPTED', 'Tham dự'],
                            ['TENTATIVE', 'Có thể'],
                            ['DECLINED', 'Từ chối'],
                          ] as const).map(([status, label]) => (
                            <button
                              key={status}
                              type="button"
                              className="mtg-button mtg-button--secondary mtg-button--small"
                              aria-pressed={collaboration.myRsvp?.status === status}
                              disabled={rsvpBusy}
                              onClick={() => void respondRsvp(status)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Participants list with avatar + pills */}
                    {meeting.participants.length === 0 ? (
                      <p className="mtg-help mtg-help--tight">Chưa có người tham gia.</p>
                    ) : (
                      <ul className="mtg-detail-participants">
                        {meeting.participants.map((participant) => {
                          const attLabel = participant.attendanceStatus
                            ? attendanceStatuses[participant.attendanceStatus] ?? participant.attendanceStatus
                            : 'Chưa cập nhật'
                          const rsvpLabel =
                            env.meetingCollaborationEnabled && participant.rsvpStatus
                              ? rsvpStatusLabels[participant.rsvpStatus] ?? participant.rsvpStatus
                              : null
                          return (
                            <li key={participant.userId} className="mtg-detail-participant">
                              <span className="mtg-participant-card__avatar" aria-hidden="true">
                                {initialsOf(participant.fullName)}
                              </span>
                              <div className="mtg-detail-participant__info">
                                <div className="mtg-detail-participant__name">
                                  <strong>{participant.fullName}</strong>
                                  {participant.userId === meeting.createdBy && <span className="mtg-organizer">Tổ chức</span>}
                                </div>
                                <div className="mtg-detail-participant__badges">
                                  <span className={`mtg-mini-pill mtg-mini-pill--${attendanceTone(participant.attendanceStatus)}`}>
                                    {attLabel}
                                  </span>
                                  {rsvpLabel && (
                                    <span className={`mtg-mini-pill mtg-mini-pill--${rsvpTone(participant.rsvpStatus)}`}>
                                      {rsvpLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {manage && scheduled && (
                                <button
                                  type="button"
                                  className="mtg-text-button mtg-remove-btn"
                                  aria-label={`Bỏ ${participant.fullName} khỏi cuộc họp`}
                                  disabled={disabled || dirty}
                                  onClick={() =>
                                    setConfirmation({ type: 'remove', userId: participant.userId, name: participant.fullName })
                                  }
                                >
                                  Bỏ
                                </button>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    {manage && scheduled && candidates.notice && <p className="mtg-help mtg-help--tight">{candidates.notice}</p>}

                    {manage && scheduled && (
                      <div className="mtg-add-participant-box">
                        {candidates.loading ? (
                          <p role="status" className="mtg-help mtg-help--tight">
                            Đang tải danh sách mời…
                          </p>
                        ) : candidates.error ? (
                          <MeetingError message={candidates.error} retry={candidates.retry} />
                        ) : (
                          <form
                            className="mtg-add-participant-form"
                            onSubmit={(event) => {
                              event.preventDefault()
                              const selected = Number(participantId)
                              if (
                                !candidates.data.some((candidate) => candidate.userId === selected) ||
                                meeting.participants.some((participant) => participant.userId === selected) ||
                                dirty
                              )
                                return
                              const token = meeting.concurrencyToken
                              if (!token) {
                                setError('Không có token phiên bản của cuộc họp. Hãy tải lại trước khi thêm người tham gia.')
                                setNeedsRefresh(true)
                                return
                              }
                              void mutate(
                                () => api.addMeetingParticipant(id, selected, token),
                                'Đã thêm người tham gia.',
                              )
                            }}
                          >
                            <label>
                              Thêm người tham gia
                              <select
                                value={participantId}
                                disabled={disabled || dirty}
                                onChange={(event) => setParticipantId(event.target.value)}
                              >
                                <option value="">Chọn thành viên hoặc GVHD</option>
                                {availableToAdd.map((candidate) => (
                                  <option key={candidate.userId} value={candidate.userId}>
                                    {candidate.fullName} · {displayLabel(candidate.role)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              className="mtg-button mtg-button--secondary mtg-button--full"
                              disabled={disabled || dirty || !participantId}
                              type="submit"
                            >
                              Thêm vào cuộc họp
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Card 2: Meeting Lifecycle Status & Email Deliveries */}
                <section className="mtg-schedule-card mtg-status-panel">
                  <div className="mtg-schedule-card__head">
                    <div className="mtg-schedule-card__title-group">
                      <span className="mtg-schedule-card__icon" aria-hidden="true">
                        <span className="material-symbols-outlined">tune</span>
                      </span>
                      <div>
                        <h2>Trạng thái cuộc họp</h2>
                        <p className="mtg-schedule-card__sub">Đóng buổi họp khi kết thúc hoặc hủy lịch</p>
                      </div>
                    </div>
                  </div>

                  <div className="mtg-schedule-card__body">
                    <p className="mtg-help mtg-help--tight">
                      {scheduled
                        ? 'Hoàn tất khi buổi trao đổi kết thúc. Hủy lịch nếu cuộc họp không diễn ra.'
                        : meeting.status === 'COMPLETED'
                          ? 'Lịch và danh sách tham gia đã được khóa. Người quản lý vẫn có thể bổ sung biên bản và điểm danh.'
                          : 'Cuộc họp đã hủy. Nội dung và lịch sử được giữ lại để tra cứu.'}
                    </p>

                    {manage && scheduled && (
                      <div className="mtg-lifecycle-actions">
                        <button
                          type="button"
                          className="mtg-button mtg-button--secondary"
                          disabled={disabled || dirty}
                          onClick={() => setConfirmation({ type: 'complete' })}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">task_alt</span>
                          Hoàn tất cuộc họp
                        </button>
                        <button
                          type="button"
                          className="mtg-button mtg-button--danger"
                          disabled={disabled || dirty}
                          onClick={() => setConfirmation({ type: 'cancel' })}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
                          Hủy lịch họp
                        </button>
                      </div>
                    )}

                    {dirty && (
                      <p className="mtg-help mtg-help--tight">
                        Lưu hoặc đóng phần đang chỉnh sửa trước khi thực hiện thao tác khác.
                      </p>
                    )}

                    {env.meetingCollaborationEnabled && manage && collaboration && collaboration.emailDeliveries.length > 0 && (
                      <div className="mtg-email-box">
                        <h3 className="mtg-email-box__title">Gửi email nhắc</h3>
                        <ul className="mtg-email-deliveries">
                          {collaboration.emailDeliveries.map((delivery, index) => (
                            <li key={`${delivery.userId}-${delivery.notificationType}-${index}`}>
                              <span className="mtg-email-deliveries__type">{displayLabel(delivery.notificationType)}</span>
                              <span className="mtg-mini-pill mtg-mini-pill--neutral">
                                {displayLabel(delivery.status)}
                                {delivery.attemptCount > 1 ? ` · ${delivery.attemptCount} lần thử` : ''}
                                {delivery.sentAt ? ` · ${formatMeetingTime(delivery.sentAt)}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {collaboration.hasMoreEmailDeliveries && (
                          <p className="mtg-help mtg-help--tight">Còn thêm lượt gửi email chưa hiển thị.</p>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Card 3: Connection Evidence (compact in right rail) */}
                <MeetingVideoPresencePanel meeting={meeting} />
              </aside>
            </div>
          </div>
        )
      )}
    </MeetingShell>
  )
}
