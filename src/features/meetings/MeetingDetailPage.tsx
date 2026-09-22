import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/meetings.api'
import type { MeetingDetail } from './meeting-types'
import { attendanceStatuses } from './meeting-types'
import { canManageMeeting, formatMeetingTime, meetingError, mustRefreshAfterError, safeMeetingUrl } from './meeting-utils'
import { MeetingError, MeetingLoading, MeetingShell, MeetingStatusBadge } from './meeting-ui'
import { MeetingScheduleForm } from './MeetingScheduleForm'
import { MeetingNotesForm } from './MeetingNotesForm'
import { MeetingUnsavedNotice } from './MeetingUnsavedNotice'
import { useMeetingCandidates } from './useMeetingCandidates'

type Confirmation = { type: 'cancel' | 'complete' | 'discard' | 'refresh' } | { type: 'remove'; userId: number; name: string }
export function MeetingDetailPage() {
  const { meetingId } = useParams()
  const access = useExecutionAccess()
  return <MeetingDetailView key={`${access.project.id}:${access.currentUserId}:${meetingId}`} id={Number(meetingId)} />
}
function MeetingDetailView({ id }: { id: number }) {
  const access = useExecutionAccess()
  const { project, routeBase } = access
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
  const confirmationRef = useRef<HTMLDivElement>(null)
  const lock = useRef(false)
  const alive = useRef(true)
  const manage = Boolean(meeting && canManageMeeting(access, meeting))
  const scheduled = meeting?.status === 'SCHEDULED'
  const writableNotes = meeting?.status === 'SCHEDULED' || meeting?.status === 'COMPLETED'
  const candidates = useMeetingCandidates(project.id, project.teamId, manage && scheduled)
  const disabled = busy || needsRefresh
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { if (confirmation) confirmationRef.current?.focus() }, [confirmation])
  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) { setLoadError('Đường dẫn cuộc họp không hợp lệ.'); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true); setLoadError('')
    api.getMeeting(id, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      if (result.projectId !== project.id) { setLoadError('Cuộc họp không thuộc đồ án đang mở.'); return }
      setMeeting(result); setNeedsRefresh(false); setParticipantId('')
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setLoadError(meetingError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [project.id, id, revision])

  async function mutate(operation: () => Promise<unknown>, message: string) {
    if (lock.current || needsRefresh) return
    lock.current = true; setBusy(true); setError(''); setSuccess('')
    try {
      await operation()
      if (!alive.current) return
      setSuccess(message); setDirty(false); setEditor(null); setFeedback(''); setConfirmation(null)
      // The next GET owns detail/status. If it fails, expose retry GET only, never repeat a successful mutation.
      setLoading(true); setRevision((value) => value + 1)
    } catch (reason) {
      if (alive.current) { setError(meetingError(reason)); setNeedsRefresh(mustRefreshAfterError(reason)); setConfirmation(null) }
    } finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  function reload() {
    setDirty(false); setEditor(null); setFeedback(''); setConfirmation(null); setError(''); setRevision((value) => value + 1)
  }
  function closeEditor() {
    if (dirty) setConfirmation({ type: 'discard' })
    else { setEditor(null); setFeedback('') }
  }
  async function confirm() {
    if (!confirmation || busy) return
    if (confirmation.type === 'refresh') { reload(); return }
    if (confirmation.type === 'discard') { setDirty(false); setEditor(null); setFeedback(''); setConfirmation(null); return }
    if (!meeting || !manage || !scheduled) return
    if (confirmation.type === 'remove') await mutate(() => api.removeMeetingParticipant(id, confirmation.userId), 'Đã cập nhật danh sách người tham gia.')
    else if (confirmation.type === 'cancel') await mutate(() => api.cancelMeeting(id), 'Đã hủy lịch họp. Lịch sử cuộc họp vẫn được giữ lại.')
    else await mutate(() => api.completeMeeting(id), 'Đã đánh dấu cuộc họp hoàn tất.')
  }
  function sendFeedback(event: FormEvent) {
    event.preventDefault()
    if (access.actor !== 'supervisor' || !writableNotes || !feedback.trim()) return
    void mutate(() => api.addMeetingFeedback(id, feedback.trim()), 'Đã gửi nhận xét cho nhóm.')
  }
  const confirmationText = confirmation?.type === 'cancel' ? 'Hủy cuộc họp này? Sau khi hủy, cuộc họp chỉ được xem và không thể mở lại.'
    : confirmation?.type === 'complete' ? 'Xác nhận cuộc họp đã diễn ra? Lịch và danh sách tham gia sẽ được khóa; bạn vẫn có thể bổ sung biên bản.'
    : confirmation?.type === 'remove' ? `Bỏ ${confirmation.name} khỏi cuộc họp?`
    : confirmation?.type === 'refresh' ? 'Tải lại dữ liệu mới nhất sẽ bỏ nội dung đang sửa. Tiếp tục?'
    : 'Bỏ các thay đổi chưa lưu trong biểu mẫu này?'
  const onlineUrl = safeMeetingUrl(meeting?.onlineUrl ?? null)
  return <MeetingShell title={meeting && !loadError ? meeting.title : 'Chi tiết cuộc họp'} projectTitle={project.title} backTo={`${routeBase}/workspace`} action={<Link className="mtg-button mtg-button--secondary" to={`${routeBase}/meetings`}>Danh sách cuộc họp</Link>}>
    <MeetingUnsavedNotice dirty={dirty} busy={busy} />
    {success && <p role="status" className="mtg-notice mtg-notice--success">{success}</p>}
    {error && <MeetingError message={error} />}
    {needsRefresh && !loadError && <div className="mtg-notice"><p>Thao tác đang tạm khóa cho đến khi tải lại trạng thái mới nhất.</p><button className="mtg-button mtg-button--secondary" disabled={busy} onClick={() => dirty ? setConfirmation({ type: 'refresh' }) : reload()}>Tải lại trạng thái</button></div>}
    {confirmation && <div ref={confirmationRef} tabIndex={-1} className="mtg-confirm" role="alertdialog" aria-label="Xác nhận thao tác"><p>{confirmationText}</p><div className="mtg-actions"><button className="mtg-button mtg-button--secondary" disabled={busy} onClick={() => setConfirmation(null)}>Quay lại</button><button className="mtg-button" disabled={busy} onClick={() => void confirm()}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</button></div></div>}
    {loading ? <MeetingLoading /> : loadError ? <MeetingError message={loadError} retry={reload} /> : meeting && <>
      <div className="mtg-detail-banner"><div><p className="mtg-eyebrow">Thời gian · Giờ Việt Nam (UTC+7)</p><h2>{formatMeetingTime(meeting.startAt)}</h2><p>{meeting.endAt ? `Kết thúc: ${formatMeetingTime(meeting.endAt)}` : 'Chưa xác định giờ kết thúc'}</p></div><MeetingStatusBadge status={meeting.status} /></div>
      <div className="mtg-detail-grid"><div className="mtg-stack">
        <section className="mtg-panel mtg-padded"><div className="mtg-section-heading"><h2>Nội dung & địa điểm</h2>{manage && scheduled && editor !== 'schedule' && <button className="mtg-text-button" disabled={disabled || dirty} onClick={() => setEditor('schedule')}>Sửa lịch</button>}</div>
          {editor === 'schedule' ? <MeetingScheduleForm meeting={meeting} busy={busy} locked={needsRefresh} onDirty={() => setDirty(true)} onCancel={closeEditor} onSave={async (body) => {
            if (!manage || !scheduled) return
            const { participantUserIds: _participants, ...schedule } = body
            await mutate(() => api.updateMeeting(id, schedule), 'Đã lưu thay đổi lịch họp.')
          }} /> : <><p className="mtg-prose">{meeting.agenda || 'Chưa có nội dung dự kiến.'}</p><dl className="mtg-facts"><div><dt>Địa điểm</dt><dd>{meeting.location || 'Chưa xác định'}</dd></div><div><dt>Người tổ chức</dt><dd>{meeting.createdByName}</dd></div></dl>{onlineUrl ? <a className="mtg-button mtg-button--secondary" href={onlineUrl} target="_blank" rel="noopener noreferrer">Mở phòng họp ↗</a> : meeting.onlineUrl && <p className="mtg-help">Liên kết họp không hợp lệ. Liên hệ người tổ chức để cập nhật.</p>}</>}
        </section>
        <section className="mtg-panel mtg-padded"><div className="mtg-section-heading"><h2>Biên bản & điểm danh</h2>{manage && writableNotes && editor !== 'notes' && <button className="mtg-text-button" disabled={disabled || dirty} onClick={() => setEditor('notes')}>Cập nhật biên bản</button>}</div>
          {editor === 'notes' ? <MeetingNotesForm meeting={meeting} busy={busy} locked={needsRefresh} onDirty={() => setDirty(true)} onCancel={closeEditor} onSave={async (body) => { if (manage && writableNotes) await mutate(() => api.updateMeetingNotes(id, body), 'Đã lưu biên bản và điểm danh.') }} /> : <p className="mtg-prose">{meeting.meetingNotes || 'Chưa có biên bản. Ghi lại kết luận sau buổi trao đổi để cả nhóm cùng theo dõi.'}</p>}
        </section>
        <section className="mtg-panel mtg-padded" aria-labelledby="meeting-feedback-title"><div className="mtg-section-heading"><h2 id="meeting-feedback-title">Nhận xét của GVHD <span className="mtg-count">{meeting.feedbacks.length}</span></h2>{access.actor === 'supervisor' && writableNotes && editor !== 'feedback' && <button className="mtg-text-button" disabled={disabled || dirty} onClick={() => setEditor('feedback')}>Viết nhận xét</button>}</div>
          {meeting.feedbacks.length === 0 ? <p className="mtg-help">Chưa có nhận xét từ giảng viên.</p> : <ol className="mtg-feedback-list">{meeting.feedbacks.map((item) => <li key={item.id}><strong>{item.supervisorName}</strong><time dateTime={item.createdAt}>{formatMeetingTime(item.createdAt)}</time><p className="mtg-prose">{item.feedbackText}</p></li>)}</ol>}
          {editor === 'feedback' && <form className="mtg-form" onSubmit={sendFeedback}><fieldset disabled={disabled}><label>Nhận xét mới<textarea rows={4} required value={feedback} onChange={(event) => { setFeedback(event.target.value); setDirty(true) }} /></label><div className="mtg-form-actions"><button type="button" className="mtg-button mtg-button--secondary" onClick={closeEditor}>Đóng chỉnh sửa</button><button className="mtg-button" disabled={!feedback.trim()} type="submit">Gửi nhận xét</button></div></fieldset></form>}
        </section>
      </div><aside className="mtg-stack">
        <section className="mtg-panel mtg-padded"><h2>Người tham gia <span className="mtg-count">{meeting.participants.length}</span></h2>
          <ul className="mtg-participants">{meeting.participants.map((participant) => (
            <li key={participant.userId}>
              <div>
                <strong>{participant.fullName}</strong>
                {participant.userId === meeting.createdBy && <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Tổ chức</span>}
                <small>{participant.attendanceStatus ? attendanceStatuses[participant.attendanceStatus] ?? participant.attendanceStatus : 'Chưa cập nhật'}</small>
              </div>
              {manage && scheduled && (
                <button className="mtg-text-button" aria-label={`Bỏ ${participant.fullName} khỏi cuộc họp`} disabled={disabled || dirty} onClick={() => setConfirmation({ type: 'remove', userId: participant.userId, name: participant.fullName })}>Bỏ</button>
              )}
            </li>
          ))}</ul>
          {meeting.participants.length === 0 && <p className="mtg-help">Chưa có người tham gia.</p>}
          {manage && scheduled && candidates.notice && <p className="mtg-help">{candidates.notice}</p>}
          {manage && scheduled && <>{candidates.loading ? <p role="status" className="mtg-help">Đang tải danh sách mời…</p> : candidates.error ? <MeetingError message={candidates.error} retry={candidates.retry} /> : <form className="mtg-form" onSubmit={(event) => {
            event.preventDefault()
            const selected = Number(participantId)
            if (!candidates.data.some((candidate) => candidate.userId === selected) || meeting.participants.some((participant) => participant.userId === selected) || dirty) return
            void mutate(() => api.addMeetingParticipant(id, selected), 'Đã thêm người tham gia.')
          }}><label>Thêm người tham gia<select value={participantId} disabled={disabled || dirty} onChange={(event) => setParticipantId(event.target.value)}><option value="">Chọn thành viên hoặc GVHD</option>{candidates.data.filter((candidate) => !meeting.participants.some((participant) => participant.userId === candidate.userId)).map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.fullName} · {candidate.role}</option>)}</select></label><button className="mtg-button mtg-button--secondary" disabled={disabled || dirty || !participantId} type="submit">Thêm vào cuộc họp</button></form>}</>}
        </section>
        <section className="mtg-panel mtg-padded"><h2>Trạng thái cuộc họp</h2><p className="mtg-help">{scheduled ? 'Hoàn tất khi buổi trao đổi kết thúc. Hủy lịch nếu cuộc họp không diễn ra.' : meeting.status === 'COMPLETED' ? 'Lịch và danh sách tham gia đã được khóa. Người quản lý vẫn có thể bổ sung biên bản và điểm danh.' : 'Cuộc họp đã hủy. Nội dung và lịch sử được giữ lại để tra cứu.'}</p>
          {manage && scheduled && <div className="mtg-stack"><button className="mtg-button" disabled={disabled || dirty} onClick={() => setConfirmation({ type: 'complete' })}>Hoàn tất cuộc họp</button><button className="mtg-button mtg-button--danger" disabled={disabled || dirty} onClick={() => setConfirmation({ type: 'cancel' })}>Hủy lịch họp</button></div>}
          {dirty && <p className="mtg-help">Lưu hoặc đóng phần đang chỉnh sửa trước khi thực hiện thao tác khác.</p>}
          {!needsRefresh && <button className="mtg-text-button mtg-refresh" disabled={busy} onClick={() => dirty ? setConfirmation({ type: 'refresh' }) : reload()}>Tải lại trạng thái</button>}
        </section>
      </aside></div>
    </>}
  </MeetingShell>
}
