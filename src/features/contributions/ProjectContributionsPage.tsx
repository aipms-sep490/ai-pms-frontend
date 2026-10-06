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
    catch (reason) { setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền xem đóng góp của đồ án này.' : 'Chưa tải được dữ liệu đóng góp.') }
    finally { setLoading(false) }
  }, [projectId, page, snapshot])
  useEffect(() => { if (role !== 'student' || !journey.isLoading) void load() }, [load, role, journey.isLoading])
  useEffect(() => {
    if (!projectId || !selectedUserId) return
    let active = true
    setEvidenceLoading(true); setEvidence([])
    void api.getContributionEvidence(projectId, selectedUserId, evidencePage, sourceType || undefined).then(result => {
      if (active) { setEvidence(result.items); setEvidenceTotal(result.totalCount); setError(null) }
    }).catch(reason => { if (active) setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền xem minh chứng đóng góp.' : 'Không thể tải chứng cứ đóng góp.') })
      .finally(() => { if (active) setEvidenceLoading(false) })
    return () => { active = false }
  }, [projectId, selectedUserId, evidencePage, sourceType])

  const rebuild = async () => {
    if (!projectId || !window.confirm('Tạo bản tổng hợp đóng góp theo dữ liệu đồ án hiện tại?')) return
    setBusy(true)
    try { const next = await api.rebuildContributionSnapshot(projectId); setSummary(next); setSnapshot(true); setPage(1); setError(null) }
    catch (reason) { if (reason instanceof HttpError && reason.status === 409) await load(); setError(reason instanceof HttpError && reason.status === 409 ? 'Dữ liệu đã thay đổi. Đã tải lại đóng góp; hãy kiểm tra trước khi tạo bản tổng hợp mới.' : 'Hệ thống không thể tạo bản tổng hợp đóng góp trong phạm vi này.') }
    finally { setBusy(false) }
  }

  const selectedMember = summary?.members.find(member => member.userId === selectedUserId)
  const totalEvidence = summary?.members.reduce((total, member) => total + member.evidenceCount, 0) ?? 0
  const completedTasks = summary?.members.reduce((total, member) => total + member.completedTasks, 0) ?? 0
  const assignedTasks = summary?.members.reduce((total, member) => total + member.assignedTasks, 0) ?? 0

  return <main className="workspace-page space-y-5">
    <header className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#edf3f0] text-[#0f5b4e] border border-[#0f5b4e]/20 font-mono text-[10.5px] font-bold uppercase tracking-wider">
            Theo dõi đóng góp
          </span>
          <span className="text-xs text-slate-500 font-medium">Đồ án #{projectId ?? '—'}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Đóng góp của thành viên</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Theo dõi hoạt động và mở từng chứng cứ do hệ thống ghi nhận. Chỉ số hoạt động hỗ trợ đối chiếu, không thay thế điểm học phần.</p>
      </div>
      {summary && <div className="flex shrink-0 flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Nguồn dữ liệu
          <select aria-label="Nguồn dữ liệu" className="min-h-11 rounded-md border border-hairline bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-[#0f5b4e] focus:ring-2 focus:ring-[#0f5b4e]/15" value={snapshot ? 'snapshot' : 'live'} onChange={event => { setSnapshot(event.target.value === 'snapshot'); setPage(1); setSelectedUserId(null); setSourceType('') }}>
            <option value="live">Dữ liệu hiện tại</option><option value="snapshot">Bản tổng hợp đã lưu</option>
          </select>
        </label>
        {canSnapshot && <button type="button" disabled={busy} className="min-h-11 rounded-md bg-[#0f5b4e] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0a493f] shadow-[0_2px_8px_-2px_rgba(15,91,78,0.25)] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void rebuild()}>{busy ? 'Đang tạo…' : 'Lưu bản tổng hợp'}</button>}
      </div>}
    </header>

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button type="button" className="min-h-10 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại</button></div>}
    {loading && <div role="status" className="rounded-lg border border-hairline bg-white p-5 text-sm text-slate-600">Đang tải dữ liệu đóng góp…</div>}
    {!loading && !projectId && <div className="rounded-lg border border-hairline bg-white p-5 text-sm text-slate-600">Không tìm thấy đồ án để xem đóng góp.</div>}

    {!loading && summary && <>
      <section className="grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4" aria-label="Tổng hợp đóng góp">
        <SummaryMetric label="Thành viên" value={summary.totalCount} helper={snapshot ? 'Bản tổng hợp đã lưu' : 'Dữ liệu hiện tại'} />
        <SummaryMetric label="Công việc hoàn tất" value={`${completedTasks}/${assignedTasks}`} helper="Theo nhiệm vụ được giao" />
        <SummaryMetric label="Tổng chứng cứ" value={totalEvidence} helper="Trong trang hiện tại" />
        <SummaryMetric label="Phiên bản quy tắc" value={summary.ruleVersion} helper={summary.snapshotAt ? formatDate(summary.snapshotAt) : summary.dataStatus} compact />
      </section>

      {summary.dataStatus === 'INSUFFICIENT_DATA' && <div role="status" className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><span className="material-symbols-outlined mt-0.5 text-[19px]" aria-hidden="true">info</span><p>Chưa đủ chứng cứ để so sánh hoạt động giữa các thành viên. Đây không phải là đánh giá hoặc điểm học phần.</p></div>}

      <section className="overflow-hidden rounded-lg border border-hairline bg-white" aria-labelledby="contribution-members-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
          <div><h2 id="contribution-members-heading" className="font-semibold text-slate-950">Hoạt động theo thành viên</h2><p className="mt-1 text-xs text-slate-500">{summary.snapshotHash ? `Mã bản tổng hợp ${summary.snapshotHash.slice(0, 12)}` : 'Cập nhật theo hoạt động hiện tại'}</p></div>
          <span className="rounded-full border border-[#a7f3d0] bg-[#edf3f0] px-2.5 py-1 text-xs font-bold text-[#0f5b4e]">{summary.members.length} thành viên trên trang</span>
        </div>
        {summary.members.length === 0 ? <div className="p-8 text-center text-sm text-slate-600">Chưa có dữ liệu đóng góp trong nguồn đã chọn.</div> : <ul className="divide-y divide-hairline">{summary.members.map(member => <li key={member.userId} className={`grid gap-4 p-4 transition-colors sm:p-5 lg:grid-cols-[minmax(14rem,1.3fr)_minmax(20rem,2fr)_auto] lg:items-center ${selectedUserId === member.userId ? 'bg-[#edf3f0]/70' : 'hover:bg-slate-50/80'}`}>
          <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#edf3f0] text-sm font-bold text-[#0f5b4e]">{initials(member.displayName)}</span><div className="min-w-0"><strong className="block truncate text-sm text-slate-950">{member.displayName}</strong><span className="font-mono text-[11px] text-slate-500">USER #{member.userId}</span></div></div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-3"><ContributionStat label="Công việc" value={`${member.completedTasks}/${member.assignedTasks}`} /><ContributionStat label="Báo cáo" value={member.submittedReports} /><ContributionStat label="Cuộc họp" value={member.attendedMeetings} /><ContributionStat label="Bản nộp" value={member.submittedDeliverableVersions} /><ContributionStat label="Tệp" value={member.uploadedFiles} /><ContributionStat label="Hoạt động" value={member.activityScore} /></div>
          <button type="button" aria-label="Xem chứng cứ" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-semibold text-[#0f5b4e] transition-colors hover:border-[#0f5b4e]/30 hover:bg-[#edf3f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f5b4e]" onClick={() => { setSelectedUserId(member.userId); setEvidencePage(1); setSourceType('') }}><span className="font-mono text-xs font-bold">{member.evidenceCount}</span> Xem chứng cứ</button>
        </li>)}</ul>}
        {summary.totalCount > 20 && <Pager page={page} total={summary.totalCount} onChange={setPage} />}
      </section>

      {selectedUserId && <section className="overflow-hidden rounded-lg border border-hairline bg-white" aria-labelledby="member-evidence-heading">
        <div className="flex flex-col gap-4 border-b border-hairline p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5"><div className="min-w-0"><p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#0f5b4e]">Minh chứng · Thành viên #{selectedUserId}</p><h2 id="member-evidence-heading" className="mt-1 truncate text-lg font-semibold text-slate-950">{selectedMember?.displayName ?? `Thành viên #${selectedUserId}`}</h2><p className="mt-1 text-xs leading-5 text-slate-500">Hoạt động đã được ghi nhận; dùng để đối chiếu đóng góp, không thay thế điểm đánh giá.</p></div><label className="grid shrink-0 gap-1 text-xs font-semibold text-slate-600">Nguồn chứng cứ<select aria-label="Nguồn chứng cứ" className="min-h-11 min-w-52 rounded-md border border-hairline bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-[#0f5b4e] focus:ring-2 focus:ring-[#0f5b4e]/15" value={sourceType} onChange={event => { setSourceType(event.target.value); setEvidencePage(1) }}><option value="">Tất cả nguồn</option><option value="TASK">Công việc</option><option value="PROGRESS_REPORT">Báo cáo tiến độ</option><option value="MEETING">Cuộc họp</option><option value="DELIVERABLE_VERSION">Phiên bản hạng mục</option><option value="FILE">Tệp</option></select></label></div>
        {evidenceLoading && <div role="status" className="p-5 text-sm text-slate-600">Đang tải chứng cứ…</div>}
        {!evidenceLoading && evidence.length === 0 && <div className="p-8 text-center text-sm text-slate-600"><span className="material-symbols-outlined mb-2 block text-3xl text-slate-300" aria-hidden="true">inventory_2</span>Chưa có chứng cứ phù hợp.</div>}
        {!evidenceLoading && evidence.length > 0 && <ul className="divide-y divide-hairline">{evidence.map(item => <li key={`${item.sourceType}-${item.sourceId}`} className="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5"><span className="grid size-9 place-items-center rounded-md bg-[#edf3f0] text-[#0f5b4e]"><span className="material-symbols-outlined text-[19px]" aria-hidden="true">description</span></span><div className="min-w-0"><strong className="block truncate text-sm text-slate-950">{item.label}</strong><span className="mt-1 block font-mono text-[11px] text-slate-500">{sourceLabel(item.sourceType)} #{item.sourceId}</span></div><div className="text-left sm:text-right"><span className="block text-xs text-slate-600">{formatDate(item.occurredAt)}</span><span className="mt-1 block font-mono text-[11px] text-slate-500">CREDIT {item.credit}</span></div></li>)}</ul>}
        {evidenceTotal > 20 && <Pager page={evidencePage} total={evidenceTotal} onChange={setEvidencePage} />}
      </section>}
    </>}
  </main>
}

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (next: number) => void }) {
  return <nav aria-label="Phân trang đóng góp" className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm sm:px-5"><button type="button" disabled={page <= 1} className="min-h-10 rounded-md border border-hairline px-3 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onChange(page - 1)}>Trang trước</button><span className="font-mono text-xs text-slate-600">{page} / {Math.ceil(total / 20)}</span><button type="button" disabled={page >= Math.ceil(total / 20)} className="min-h-10 rounded-md border border-hairline px-3 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onChange(page + 1)}>Trang sau</button></nav>
}

function SummaryMetric({ label, value, helper, compact = false }: { label: string; value: string | number; helper: string; compact?: boolean }) {
  return <div className="min-w-0 bg-white p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p><p className={`mt-2 font-mono font-semibold text-slate-950 ${compact ? 'truncate text-base' : 'text-2xl'}`}>{value}</p><p className="mt-1 truncate text-xs text-slate-500">{helper}</p></div>
}

function ContributionStat({ label, value }: { label: string; value: string | number }) {
  return <p className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-1 text-slate-500"><span>{label}</span><strong className="font-mono text-xs text-slate-800">{value}</strong></p>
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase()).join('') || '—'
}

function sourceLabel(value: string) {
  return ({ TASK: 'CÔNG VIỆC', PROGRESS_REPORT: 'BÁO CÁO', MEETING: 'CUỘC HỌP', DELIVERABLE_VERSION: 'BẢN NỘP', FILE: 'TỆP' } as Record<string, string>)[value] ?? value
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('vi-VN')
}


