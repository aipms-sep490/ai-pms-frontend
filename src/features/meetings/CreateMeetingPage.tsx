import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { createMeeting, createMeetingSeries } from '../../services/api/meetings.api'
import type { CreateMeeting } from './meeting-types'
import { meetingError, mustRefreshAfterError } from './meeting-utils'
import { MeetingError, MeetingLoading, MeetingShell } from './meeting-ui'
import { MeetingScheduleForm } from './MeetingScheduleForm'
import { MeetingUnsavedNotice } from './MeetingUnsavedNotice'
import { useMeetingCandidates } from './useMeetingCandidates'
import { canUseProjectExecutionAction } from '../execution/execution-authority'
import { readAssistantMeetingDraft } from './assistant-meeting-draft'
import { Pagination, useClientPagination } from '../../components/ui'

export function CreateMeetingPage() {
  const access = useExecutionAccess()
  return <CreateMeetingView key={`${access.project.id}:${access.currentUserId}`} />
}
function CreateMeetingView() {
  const access = useExecutionAccess()
  const { project, routeBase, currentUserId } = access
  const canSchedule = canUseProjectExecutionAction(access, 'schedule_meeting')
  const navigate = useNavigate()
  const location = useLocation()
  const [draftState, setDraftState] = useState(() => ({ key: location.key, draft: readAssistantMeetingDraft(location.state?.assistantDraft, project.id) }))
  useEffect(() => {
    if (!location.state?.assistantDraft) return
    const draft = readAssistantMeetingDraft(location.state.assistantDraft, project.id)
    if (draft) setDraftState({ key: location.key, draft })
    navigate(location.pathname, { replace: true, state: null })
  }, [location, navigate, project.id])
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
      const { recurrence, occurrenceCount, ...schedule } = body
      if (recurrence && recurrence !== 'NONE') {
        await createMeetingSeries(project.id, { meeting: schedule, recurrence, occurrenceCount: occurrenceCount ?? 1 })
        if (alive.current) navigate(`${routeBase}/meetings`, { replace: true })
      } else {
        const meeting = await createMeeting(project.id, schedule)
        if (alive.current) navigate(`${routeBase}/meetings/${meeting.id}`, { replace: true })
      }
    } catch (reason) {
      if (alive.current) { setError(meetingError(reason)); setUncertain(mustRefreshAfterError(reason)) }
    } finally { locked.current = false; if (alive.current) setBusy(false) }
  }
  const candidatesPagination = useClientPagination(candidates.data, 8)
  return <MeetingShell title="Lên lịch họp" projectTitle={project.title} backTo={`${routeBase}/meetings`} action={<Link className="mtg-button mtg-button--secondary" to={`${routeBase}/meetings`}>Danh sách cuộc họp</Link>}>
    <MeetingUnsavedNotice dirty={dirty} busy={busy} />
    {access.executionCapabilities?.status === 'loading' ? <MeetingLoading /> : !canSchedule ? <MeetingError message="Bạn chưa có quyền lên lịch họp cho đồ án này." /> : <>
      {error && <MeetingError message={error} />}
      {uncertain && <p className="mtg-notice">Tạm khóa gửi lại để tránh tạo lịch trùng. Quay về danh sách và kiểm tra lịch vừa tạo trước khi mở một biểu mẫu mới.</p>}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <section className="mtg-panel xl:col-span-8 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <div>
              <h2>Thông tin cuộc họp</h2>
              <p className="text-xs text-ink-muted mt-0.5">Thời gian hiển thị và nhập theo giờ Việt Nam (UTC+7).</p>
            </div>
          </div>
          <div className="mtg-padded">
            {candidates.loading && <p role="status" className="mtg-help">Đang tải thành viên và GVHD…</p>}
            {candidates.error && <MeetingError message={`Chưa tải được danh sách mời. ${candidates.error}`} retry={candidates.retry} />}
            {candidates.notice && <p className="mtg-notice">{candidates.notice}</p>}
            <MeetingScheduleForm key={draftState.key} initialDraft={draftState.draft} busy={busy} locked={uncertain || (!!draftState.draft?.meeting?.inviteAll && (candidates.loading || !!candidates.error))} currentUserId={currentUserId} candidates={candidates.data} onSave={save} onDirty={() => setDirty(true)} />
          </div>
        </section>

        <aside className="xl:col-span-4 xl:sticky xl:top-20 space-y-5 min-w-0">
          <section className="mtg-panel">
            <div className="flex items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <h2>Hướng dẫn lên lịch</h2>
            </div>
            <div className="p-5 space-y-3 text-sm text-ink-soft">
              <p>Điền rõ mục tiêu trao đổi để cả nhóm và GVHD chuẩn bị trước tài liệu, minh chứng liên quan.</p>
              <ul className="space-y-2 text-xs text-ink-muted list-disc pl-4">
                <li>Giờ bắt đầu và kết thúc tính theo giờ Việt Nam (UTC+7).</li>
                <li>Có thể chọn họp trực tiếp, liên kết họp ngoài hoặc phòng họp trực tuyến trong hệ thống.</li>
                <li>Sau khi tạo lịch, bạn vẫn có thể cập nhật biên bản, điểm danh và công việc sau họp.</li>
              </ul>
            </div>
          </section>

          <section className="mtg-panel">
            <div className="flex items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
              <h2>Danh sách có thể mời</h2>
              <span className="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">{candidates.data.length}</span>
            </div>
            <div className="p-5">
              {candidates.loading ? (
                <p className="text-xs text-ink-muted">Đang tải danh sách thành viên…</p>
              ) : candidates.data.length === 0 ? (
                <p className="text-xs text-ink-muted">Chưa có danh sách người tham dự khả dụng.</p>
              ) : (
                <>
                  <ul className="divide-y divide-hairline">
                    {candidatesPagination.paginatedItems.map((person) => (
                      <li key={person.userId} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                        <span className="font-semibold text-ink truncate">{person.fullName}</span>
                        <span className="shrink-0 rounded-full border border-hairline bg-canvas px-2 py-0.5 text-xs text-ink-soft">{person.role}</span>
                      </li>
                    ))}
                  </ul>
                  {candidatesPagination.showPagination && (
                    <Pagination
                      className="mt-3"
                      page={candidatesPagination.page}
                      pages={candidatesPagination.totalPages}
                      total={candidatesPagination.total}
                      pageSize={candidatesPagination.pageSize}
                      onPage={candidatesPagination.setPage}
                    />
                  )}
                </>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>}
  </MeetingShell>
}

