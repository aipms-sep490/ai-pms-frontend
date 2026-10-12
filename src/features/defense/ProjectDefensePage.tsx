import { useEffect, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useStudentJourney } from '../../app/context'
import { HttpError } from '../../services/http/http-client'
import { getProjectDefenseSessions } from './defense-api'
import type { DefenseSession, DefenseSessionStatus } from './defense-types'

const statusText: Record<string, string> = { SCHEDULED: 'Đã lên lịch', CANCELLED: 'Đã hủy' }
const statusTone: Record<string, string> = {
  SCHEDULED: 'border-primary/20 bg-primary-subtle text-primary',
  CANCELLED: 'border-status-error-border bg-status-error-bg text-status-error-text',
}
const describeStatus = (status: DefenseSessionStatus) => statusText[status] ?? status
const toneFor = (status: DefenseSessionStatus) => statusTone[status] ?? 'border-hairline bg-slate-50 text-slate-600'

const formatRange = (start: string, end: string) => {
  const startDate = new Date(start)
  if (Number.isNaN(startDate.getTime())) return start
  const dayPart = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(startDate)
  const startTime = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(startDate)
  const endDate = new Date(end)
  const endTime = !Number.isNaN(endDate.getTime()) ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(endDate) : null
  return `${dayPart} · ${startTime}${endTime ? `–${endTime}` : ''}`
}

export function ProjectDefensePage() {
  const journey = useStudentJourney()
  const projectId = journey.project?.id
  const [sessions, setSessions] = useState<DefenseSession[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    setLoading(true); setError(null)
    getProjectDefenseSessions(projectId, 1, 20, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setSessions(result.items)
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setError(reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa có quyền xem lịch bảo vệ của đồ án này.'
        : 'Chưa tải được lịch bảo vệ. Hãy thử lại.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  const retry = () => { setLoading(true); setError(null); setSessions(null); setRevision((value) => value + 1) }
  const scheduled = sessions?.find((session) => session.status === 'SCHEDULED')
  const mostRecentCancelled = sessions?.filter((session) => session.status === 'CANCELLED').at(-1)
  const highlighted = scheduled ?? mostRecentCancelled ?? null

  return <WorkspacePage className="space-y-5" title="Lịch bảo vệ" eyebrow="Hội đồng đánh giá"
    description="Thời gian và phòng bảo vệ của đồ án. Thành phần hội đồng không hiển thị ở đây.">
    {!projectId && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Không tìm thấy đồ án đang hoạt động để xem lịch bảo vệ.</p>}
    {projectId && loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Đang tải lịch bảo vệ…</p>}
    {projectId && !loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {projectId && !loading && !error && !highlighted && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Đồ án chưa được xếp lịch bảo vệ. Bạn sẽ được thông báo khi có lịch.</p>}
    {projectId && !loading && !error && highlighted && <section className="space-y-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Thời gian</p>
          <h2 className="mt-1 text-base font-bold text-slate-950">{formatRange(highlighted.startAt, highlighted.endAt)}</h2>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneFor(highlighted.status)}`}>{describeStatus(highlighted.status)}</span>
      </div>
      <p className="text-sm text-slate-700"><span className="font-semibold">Phòng:</span> {highlighted.room}</p>
      {highlighted.status === 'CANCELLED' && highlighted.cancellationReason && <p className="text-sm text-status-error-text"><span className="font-semibold">Lý do hủy:</span> {highlighted.cancellationReason}</p>}
    </section>}
  </WorkspacePage>
}
