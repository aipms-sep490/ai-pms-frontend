import { useEffect, useMemo, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useStudentJourney } from '../../app/context'
import { HttpError } from '../../services/http/http-client'
import { acceptWorkingAgreement, getWorkingAgreement, parseAgreementSections } from './working-agreement-api'
import type { WorkingAgreement } from './working-agreement-types'

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function ProjectWorkingAgreementPage() {
  const journey = useStudentJourney()
  const projectId = journey.project?.id
  const myId = journey.profile?.id
  const [agreement, setAgreement] = useState<WorkingAgreement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    const controller = new AbortController()
    void getWorkingAgreement(projectId, controller.signal).then(data => {
      if (controller.signal.aborted) return
      setAgreement(data); setError(null)
    }).catch(reason => {
      if (controller.signal.aborted) return
      if (reason instanceof HttpError && reason.status === 404) { setAgreement(null); setError(null); return }
      setError(reason instanceof HttpError && reason.status === 403
        ? 'Bạn chưa có quyền xem cam kết nhóm của đồ án này.'
        : 'Chưa tải được cam kết nhóm. Hãy thử lại.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId, revision])

  const retry = () => { setLoading(true); setError(null); setAgreement(null); setRevision(value => value + 1) }

  const accept = () => {
    if (!projectId || !agreement) return
    setAccepting(true); setAcceptError(null)
    void acceptWorkingAgreement(projectId, agreement.id)
      .then(() => { setRevision(value => value + 1) })
      .catch(() => setAcceptError('Chưa ghi nhận được xác nhận. Hãy thử lại.'))
      .finally(() => setAccepting(false))
  }

  const sections = useMemo(() => agreement ? parseAgreementSections(agreement.contentJson) : [], [agreement])
  const acceptedByMe = agreement?.acceptedByMe
    ?? (myId != null && agreement?.acceptances.some(a => a.userId === myId))
    ?? false
  const acceptedCount = agreement?.acceptances.length ?? 0
  const incomplete = agreement?.required && typeof agreement.memberCount === 'number' && acceptedCount < agreement.memberCount

  return <WorkspacePage className="space-y-5" title="Cam kết làm việc nhóm" eyebrow="Working Agreement"
    description="Thống nhất nguyên tắc làm việc của nhóm. Mỗi thành viên xác nhận một lần cho phiên bản hiện tại.">
    {!projectId && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Không tìm thấy đồ án đang hoạt động để xem cam kết nhóm.</p>}
    {projectId && loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Đang tải cam kết nhóm…</p>}
    {projectId && !loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={retry}>Tải lại</button></div>}
    {projectId && !loading && !error && !agreement && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Nhóm chưa có bản cam kết làm việc nào.</p>}
    {projectId && !loading && !error && agreement && <>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full border border-hairline bg-slate-50 px-2 py-0.5 font-semibold text-slate-600">Phiên bản {agreement.version}</span>
        <span>Cập nhật {formatDateTime(agreement.createdAt)}</span>
        {agreement.createdByName?.trim() && <span>· {agreement.createdByName}</span>}
      </div>

      {incomplete && <div role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">
        Kỳ này yêu cầu đủ xác nhận trước khi đồ án được kích hoạt. Đã xác nhận {acceptedCount}/{agreement.memberCount} thành viên.
      </div>}

      <article className="space-y-4 rounded-xl border border-hairline bg-card p-5 shadow-xs">
        {sections.length === 0 && <p className="text-sm text-slate-600">Bản cam kết chưa có nội dung.</p>}
        {sections.map((section, index) => <section key={index} className="space-y-1">
          {section.title.trim() && <h2 className="text-base font-bold text-slate-950">{section.title}</h2>}
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{section.body}</p>
        </section>)}
      </article>

      <section className="space-y-3 rounded-xl border border-hairline bg-card p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Xác nhận của thành viên {typeof agreement.memberCount === 'number' ? `(${acceptedCount}/${agreement.memberCount})` : `(${acceptedCount})`}</h2>
        {acceptedCount === 0 && <p className="text-sm text-slate-500">Chưa có thành viên nào xác nhận.</p>}
        {acceptedCount > 0 && <ul className="space-y-2">
          {agreement.acceptances.map(a => <li key={a.userId} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <span className="material-symbols-outlined text-base text-status-success-text" aria-hidden="true">check_circle</span>
            <span className="font-semibold text-slate-900">{a.userName?.trim() || `Thành viên #${a.userId}`}</span>
            <span className="text-xs text-slate-500">{formatDateTime(a.acceptedAt)}</span>
          </li>)}
        </ul>}
      </section>

      {acceptError && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{acceptError}</div>}
      {acceptedByMe
        ? <p className="flex items-center gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm font-semibold text-status-success-text"><span className="material-symbols-outlined text-base" aria-hidden="true">task_alt</span>Bạn đã xác nhận bản cam kết này.</p>
        : <button type="button" onClick={accept} disabled={accepting} className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white disabled:opacity-60">{accepting ? 'Đang gửi…' : 'Tôi đồng ý với cam kết'}</button>}
    </>}
  </WorkspacePage>
}
