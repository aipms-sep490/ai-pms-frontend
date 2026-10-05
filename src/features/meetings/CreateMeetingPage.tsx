import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { createMeeting } from '../../services/api/meetings.api'
import type { CreateMeeting } from './meeting-types'
import { meetingError, mustRefreshAfterError } from './meeting-utils'
import { MeetingError, MeetingShell } from './meeting-ui'
import { MeetingScheduleForm } from './MeetingScheduleForm'
import { MeetingUnsavedNotice } from './MeetingUnsavedNotice'
import { useMeetingCandidates } from './useMeetingCandidates'
import { canUseProjectExecutionAction } from '../execution/execution-authority'

export function CreateMeetingPage() {
  const access = useExecutionAccess()
  return <CreateMeetingView key={`${access.project.id}:${access.currentUserId}`} />
}
function CreateMeetingView() {
  const access = useExecutionAccess()
  const { project, routeBase, currentUserId } = access
  const canSchedule = canUseProjectExecutionAction(access, 'schedule_meeting')
  const navigate = useNavigate()
  const candidates = useMeetingCandidates(project.id, project.teamId, canSchedule)
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const alive = useRef(true)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [dirty, setDirty] = useState(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function save(body: CreateMeeting) {
    if (!canSchedule || locked.current || uncertain) return
    locked.current = true; setBusy(true); setError('')
    try {
      const meeting = await createMeeting(project.id, body)
      if (alive.current) navigate(`${routeBase}/meetings/${meeting.id}`, { replace: true })
    } catch (reason) {
      if (alive.current) { setError(meetingError(reason)); setUncertain(mustRefreshAfterError(reason)) }
    } finally { locked.current = false; if (alive.current) setBusy(false) }
  }
  return <MeetingShell title="Lên lịch họp" projectTitle={project.title} backTo={`${routeBase}/workspace`} action={<Link className="mtg-button mtg-button--secondary" to={`${routeBase}/meetings`}>Danh sách cuộc họp</Link>}>
    <MeetingUnsavedNotice dirty={dirty} busy={busy} />
    {!canSchedule ? <MeetingError message="Backend hiện không cho phép bạn lên lịch họp cho đồ án này." /> : <>
      {error && <MeetingError message={error} />}
      {uncertain && <p className="mtg-notice">Tạm khóa gửi lại để tránh tạo lịch trùng. Quay về danh sách và kiểm tra lịch vừa tạo trước khi mở một biểu mẫu mới.</p>}
      <section className="mtg-panel mtg-padded"><h2>Thông tin cuộc họp</h2><p className="mtg-help">Thời gian hiển thị và nhập theo giờ Việt Nam (UTC+7).</p>
        {candidates.loading && <p role="status" className="mtg-help">Đang tải thành viên và GVHD…</p>}
        {candidates.error && <MeetingError message={`Chưa tải được danh sách mời. ${candidates.error}`} retry={candidates.retry} />}
        {candidates.notice && <p className="mtg-notice">{candidates.notice}</p>}
        <MeetingScheduleForm busy={busy} locked={uncertain} currentUserId={currentUserId} candidates={candidates.data} onSave={save} onDirty={() => setDirty(true)} />
      </section>
    </>}
  </MeetingShell>
}
