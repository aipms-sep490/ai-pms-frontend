import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getWorkspaceRole } from '../auth/utils/role-access'
import { HttpError } from '../../services/http/http-client'
import * as api from './contributions-api'
import type { ContributionEvidence, ContributionSummary } from './contributions-api'

export function ProjectContributionsPage() {
  const routeId = Number(useParams().projectId)
  const journey = useStudentJourney()
  const { session } = useAuthSession()
  const role = getWorkspaceRole(session?.user)
  const projectId = Number.isInteger(routeId) && routeId > 0 ? routeId : journey.project?.id
  const canSnapshot = role === 'department' || role === 'admin'
  const [snapshot, setSnapshot] = useState(false)
  const [page, setPage] = useState(1)
  const [summary, setSummary] = useState<ContributionSummary | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [evidencePage, setEvidencePage] = useState(1)
  const [sourceType, setSourceType] = useState('')
  const [evidence, setEvidence] = useState<ContributionEvidence[]>([])
  const [evidenceTotal, setEvidenceTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true); setSummary(null)
    try { setSummary(await api.getContributions(projectId, page, snapshot)); setError(null) }
    catch (reason) { setError(reason instanceof HttpError && reason.status === 403 ? 'Backend không cấp quyền xem contribution của Project này.' : 'Không thể tải contribution.') }
    finally { setLoading(false) }
  }, [projectId, page, snapshot])
  useEffect(() => { if (role !== 'student' || !journey.isLoading) void load() }, [load, role, journey.isLoading])
  useEffect(() => {
    if (!projectId || !selectedUserId) return
    let active = true
    setEvidenceLoading(true); setEvidence([])
    void api.getContributionEvidence(projectId, selectedUserId, evidencePage, sourceType || undefined).then(result => {
      if (active) { setEvidence(result.items); setEvidenceTotal(result.totalCount); setError(null) }
    }).catch(reason => { if (active) setError(reason instanceof HttpError && reason.status === 403 ? 'Backend không cấp quyền xem chứng cứ đóng góp.' : 'Không thể tải chứng cứ đóng góp.') })
      .finally(() => { if (active) setEvidenceLoading(false) })
    return () => { active = false }
  }, [projectId, selectedUserId, evidencePage, sourceType])

  const rebuild = async () => {
    if (!projectId || !window.confirm('Tạo snapshot contribution theo dữ liệu Project hiện tại?')) return
    setBusy(true)
    try { const next = await api.rebuildContributionSnapshot(projectId); setSummary(next); setSnapshot(true); setPage(1); setError(null) }
    catch (reason) { if (reason instanceof HttpError && reason.status === 409) await load(); setError(reason instanceof HttpError && reason.status === 409 ? 'Dữ liệu đã thay đổi. Đã tải lại contribution; hãy kiểm tra trước khi tạo snapshot mới.' : 'Backend không thể tạo snapshot contribution trong phạm vi này.') }
    finally { setBusy(false) }
  }

  return <main className="mx-auto max-w-5xl space-y-5 pb-12"><header><h1 className="text-2xl font-bold">Đóng góp của thành viên</h1><p className="mt-1 text-sm text-slate-600">Project #{projectId ?? '—'}. Dữ liệu hoạt động và chứng cứ do Backend tổng hợp; activity score không phải điểm học phần hay kết quả cá nhân.</p></header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
    {loading && <p role="status" className="rounded-lg border bg-white p-4 text-sm">Đang tải contribution…</p>}
    {!loading && !projectId && <p className="rounded-lg border bg-white p-4 text-sm">Không tìm thấy Project để xem contribution.</p>}
    {!loading && summary && <><section className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{snapshot ? 'Snapshot đã lưu' : 'Dữ liệu hiện tại'}</h2><p className="mt-1 text-xs text-slate-600">{summary.dataStatus} · quy tắc {summary.ruleVersion}{summary.snapshotAt ? ` · ${new Date(summary.snapshotAt).toLocaleString('vi-VN')}` : ''}{summary.snapshotHash ? ` · mã ${summary.snapshotHash.slice(0, 12)}` : ''}</p></div><div className="flex flex-wrap gap-2"><label className="text-sm">Nguồn<select className="ml-2 min-h-11 rounded-lg border px-2" value={snapshot ? 'snapshot' : 'live'} onChange={event => { setSnapshot(event.target.value === 'snapshot'); setPage(1); setSelectedUserId(null); setSourceType('') }}><option value="live">Hiện tại</option><option value="snapshot">Snapshot</option></select></label>{canSnapshot && <button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-sm font-semibold disabled:opacity-50" onClick={() => void rebuild()}>Tạo snapshot</button>}</div></div>{summary.dataStatus === 'INSUFFICIENT_DATA' && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Chưa đủ chứng cứ để so sánh hoạt động giữa các thành viên. Đây không phải là đánh giá hoặc điểm học phần.</p>}{summary.members.length === 0 ? <p className="mt-4 text-sm text-slate-600">Chưa có dữ liệu đóng góp trong nguồn đã chọn.</p> : <ul className="mt-4 divide-y">{summary.members.map(member => <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><strong>{member.displayName}</strong><p className="text-xs text-slate-600">Task {member.completedTasks}/{member.assignedTasks} · báo cáo {member.submittedReports} · họp {member.attendedMeetings} · deliverable {member.submittedDeliverableVersions} · tệp {member.uploadedFiles}</p><p className="text-xs text-slate-600">Chỉ số hoạt động: {member.activityScore} · {member.evidenceCount} chứng cứ</p></div><button type="button" className="min-h-11 font-semibold text-blue-700 underline" onClick={() => { setSelectedUserId(member.userId); setEvidencePage(1); setSourceType('') }}>Xem chứng cứ</button></li>)}</ul>}{summary.totalCount > 20 && <Pager page={page} total={summary.totalCount} onChange={setPage} />}</section>
      {selectedUserId && <section className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold">Chứng cứ của thành viên #{selectedUserId}</h2><p className="mt-1 text-xs text-slate-600">Chỉ hiển thị hoạt động Backend đã ghi nhận, không phải kết quả chấm điểm.</p></div><label className="text-sm">Nguồn chứng cứ<select className="ml-2 min-h-11 rounded-lg border px-2" value={sourceType} onChange={event => { setSourceType(event.target.value); setEvidencePage(1) }}><option value="">Tất cả</option><option value="TASK">Công việc</option><option value="PROGRESS_REPORT">Báo cáo tiến độ</option><option value="MEETING">Cuộc họp</option><option value="DELIVERABLE_VERSION">Phiên bản hạng mục</option><option value="FILE">Tệp</option></select></label></div>{evidenceLoading && <p role="status" className="mt-3 text-sm">Đang tải chứng cứ…</p>}{!evidenceLoading && evidence.length === 0 && <p className="mt-3 text-sm text-slate-600">Chưa có chứng cứ phù hợp trong trang này.</p>}<ul className="mt-3 divide-y text-sm">{evidence.map(item => <li key={`${item.sourceType}-${item.sourceId}`} className="py-2"><strong>{item.label}</strong><span className="block text-xs text-slate-600">{item.sourceType} #{item.sourceId} · {new Date(item.occurredAt).toLocaleString('vi-VN')}</span></li>)}</ul>{evidenceTotal > 20 && <Pager page={evidencePage} total={evidenceTotal} onChange={setEvidencePage} />}</section>}</>}
  </main>
}

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (next: number) => void }) {
  return <nav aria-label="Phân trang contribution" className="mt-4 flex items-center justify-between text-sm"><button type="button" disabled={page <= 1} className="min-h-11 underline disabled:opacity-40" onClick={() => onChange(page - 1)}>Trước</button><span>{page} / {Math.ceil(total / 20)}</span><button type="button" disabled={page >= Math.ceil(total / 20)} className="min-h-11 underline disabled:opacity-40" onClick={() => onChange(page + 1)}>Sau</button></nav>
}
