import { useEffect, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useStudentJourney } from '../../app/context'
import { HttpError } from '../../services/http/http-client'
import { getProjectDefenseSession } from './defense-api'
import type { CommitteeRole, DefenseSession, DefenseSessionStatus } from './defense-types'

const roleLabel: Record<string, string> = { CHAIR: 'Chủ tịch', SECRETARY: 'Thư ký', MEMBER: 'Ủy viên', INDUSTRY: 'Chuyên gia doanh nghiệp' }
const describeRole = (role: CommitteeRole) => roleLabel[role] ?? role
const statusText: Record<string, string> = { SCHEDULED: 'Đã lên lịch', IN_PROGRESS: 'Đang diễn ra', COMPLETED: 'Đã hoàn thành', CANCELLED: 'Đã hủy' }
const statusTone: Record<string, string> = {
  SCHEDULED: 'border-primary/20 bg-primary-subtle text-primary',
  IN_PROGRESS: 'border-status-warning-border bg-status-warning-bg text-status-warning-text',
  COMPLETED: 'border-status-success-border bg-status-success-bg text-status-success-text',
  CANCELLED: 'border-status-error-border bg-status-error-bg text-status-error-text',
}
const describeStatus = (status: DefenseSessionStatus) => statusText[status] ?? status
const toneFor = (status: DefenseSessionStatus) => statusTone[status] ?? 'border-hairline bg-slate-50 text-slate-600'

const formatRange = (start: string, end?: string | null) => {
  const startDate = new Date(start)
  if (Number.isNaN(startDate.getTime())) return start
  const dayPart = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(startDate)
  const startTime = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(startDate)
  const endDate = end ? new Date(end) : null
  const endTime = endDate && !Number.isNaN(endDate.getTime()) ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(endDate) : null
  return `${dayPart} · ${startTime}${endTime ? `–${endTime}` : ''}`
}

export function ProjectDefensePage() {
  const journey = useStudentJourney()
  const projectId = journey.project?.id
  const [session, setSession] = useState<DefenseSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scheduled, setScheduled] = useState(true)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    void getProjectDefenseSession(projectId, controller.signal).then(data => {
      if (controller.signal.aborted) return
      setSession(data); setScheduled(true); setError(null)
    }).catch(reason => {
      if (controller.signal.aborted) return
      if (reason instanceof HttpError && reason.status === 404) { setScheduled(false); setError(null); return }
      setError(reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa có quyền xem lịch bảo vệ của đồ án này.'
        : 'Chưa tải được lịch bảo vệ. Hãy thử lại.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  const retry = () => { setLoading(true); setError(null); setSession(null); setScheduled(true); setRevision(value => value + 1) }

  return <WorkspacePage className="space-y-5" title="Lịch bảo vệ" eyebrow="Hội đồng đánh giá"
    description="Thông tin buổi bảo vệ và thành phần hội đồng của đồ án.">
    {!projectId && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Không tìm thấy đồ án đang hoạt động để xem lịch bảo vệ.</p>}
    {projectId && loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Đang tải lịch bảo vệ…</p>}
    {projectId && !loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {projectId && !loading && !error && !scheduled && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Đồ án chưa được xếp lịch bảo vệ. Bạn sẽ được thông báo khi có lịch.</p>}
    {projectId && !loading && !error && scheduled && session && <>
      <section className="space-y-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Thời gian</p>
            <h2 className="mt-1 text-base font-bold text-slate-950">{formatRange(session.startAt, session.endAt)}</h2>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneFor(session.status)}`}>{describeStatus(session.status)}</span>
        </div>
        {session.location?.trim() && <p className="text-sm text-slate-700"><span className="font-semibold">Địa điểm:</span> {session.location}</p>}
        {session.onlineUrl?.trim() && <p className="text-sm text-slate-700"><span className="font-semibold">Trực tuyến:</span> <a className="text-primary underline" href={session.onlineUrl} target="_blank" rel="noreferrer">{session.onlineUrl}</a></p>}
        {!session.location?.trim() && !session.onlineUrl?.trim() && <p className="text-sm text-slate-500">Địa điểm sẽ được cập nhật.</p>}
      </section>

      <section className="space-y-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Hội đồng{session.committeeName?.trim() ? ` · ${session.committeeName}` : ''}</h2>
        {session.members.length === 0 && <p className="text-sm text-slate-500">Thành phần hội đồng sẽ được cập nhật.</p>}
        {session.members.length > 0 && <ul className="space-y-2">
          {session.members.map(member => <li key={member.userId} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900">{member.userName?.trim() || `Thành viên #${member.userId}`}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{describeRole(member.role)}</span>
          </li>)}
        </ul>}
      </section>
    </>}
  </WorkspacePage>
}
