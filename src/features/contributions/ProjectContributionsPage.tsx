import { dateTimeLabel } from '../execution/execution-utils'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { Pagination, StatTileRow, StatusBadge } from '../../components/ui'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { useAuthSession } from '../auth/context/useAuthSession'
import { getWorkspaceRole } from '../auth/utils/role-access'
import { HttpError } from '../../services/http/http-client'
import * as api from './contributions-api'
import type { ContributionEvidence, ContributionSummary } from './contributions-api'

export function ProjectContributionsPage() {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
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
    if (!projectId || await requestConfirmation({ title: 'Lưu bản tổng hợp đóng góp?', description: 'Ghi lại hoạt động của các thành viên theo dữ liệu hiện tại để đối chiếu sau này.', confirmLabel: 'Lưu bản tổng hợp' }) === null) return
    setBusy(true)
    try { const next = await api.rebuildContributionSnapshot(projectId); setSummary(next); setSnapshot(true); setPage(1); setError(null) }
    catch (reason) { if (reason instanceof HttpError && reason.status === 409) await load(); setError(reason instanceof HttpError && reason.status === 409 ? 'Dữ liệu đã thay đổi. Đã tải lại đóng góp; hãy kiểm tra trước khi tạo bản tổng hợp mới.' : 'Hệ thống không thể tạo bản tổng hợp đóng góp trong phạm vi này.') }
    finally { setBusy(false) }
  }

  const exportCsv = () => {
    if (!summary?.members.length) return
    const headers = [
      'Mã thành viên',
      'Họ và tên',
      'Công việc hoàn tất',
      'Công việc được giao',
      'Báo cáo đã nộp',
      'Cuộc họp tham gia',
      'Bản nộp hoàn tất',
      'Tệp tải lên',
      'Tổng minh chứng',
      'Điểm hoạt động',
    ]
    const rows = summary.members.map((m) => [
      m.userId,
      `"${m.displayName.replace(/"/g, '""')}"`,
      m.completedTasks,
      m.assignedTasks,
      m.submittedReports,
      m.attendedMeetings,
      m.submittedDeliverableVersions,
      m.uploadedFiles,
      m.evidenceCount,
      m.activityScore,
    ])
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `bao-cao-dong-gop-do-an-${projectId ?? 'summary'}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const selectedMember = summary?.members.find(member => member.userId === selectedUserId)
  const totalEvidence = summary?.members.reduce((total, member) => total + member.evidenceCount, 0) ?? 0
  const completedTasks = summary?.members.reduce((total, member) => total + member.completedTasks, 0) ?? 0
  const assignedTasks = summary?.members.reduce((total, member) => total + member.assignedTasks, 0) ?? 0
  const averageScore = summary?.members.length
    ? Math.round(summary.members.reduce((total, member) => total + member.activityScore, 0) / summary.members.length)
    : 0
  const memberTotalPages = summary ? Math.max(1, Math.ceil(summary.totalCount / 20)) : 1
  const evidenceTotalPages = Math.max(1, Math.ceil(evidenceTotal / 20))

  return <div className="workspace-page space-y-5">{confirmationDialog}
    <header className="workspace-heading flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="workspace-kicker inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary/20 font-mono text-xs font-bold uppercase tracking-wider">
            Theo dõi đóng góp
          </span>
          <span className="text-xs text-ink-muted font-medium">Đồ án #{projectId ?? '—'}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Đóng góp của thành viên</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">Theo dõi hoạt động và mở từng chứng cứ do hệ thống ghi nhận. Chỉ số hoạt động hỗ trợ đối chiếu, không thay thế điểm học phần.</p>
      </div>
      {summary && <div className="flex shrink-0 flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Nguồn dữ liệu
          <select aria-label="Nguồn dữ liệu" className="min-h-11 rounded-md border border-hairline bg-card px-3 text-sm font-normal normal-case tracking-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" value={snapshot ? 'snapshot' : 'live'} onChange={event => { setSnapshot(event.target.value === 'snapshot'); setPage(1); setSelectedUserId(null); setSourceType('') }}>
            <option value="live">Dữ liệu hiện tại</option><option value="snapshot">Bản tổng hợp đã lưu</option>
          </select>
        </label>
        <button type="button" onClick={exportCsv} className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md border border-hairline bg-card px-3 text-sm font-semibold text-ink-soft hover:bg-canvas hover:text-ink transition-colors shadow-2xs">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>
          Xuất báo cáo (CSV)
        </button>
        {canSnapshot && <button type="button" disabled={busy} className="min-h-11 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover shadow-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void rebuild()}>{busy ? 'Đang tạo…' : 'Lưu bản tổng hợp'}</button>}
      </div>}
    </header>

    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-10 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại</button></div>}
    {loading && <div role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Đang tải dữ liệu đóng góp…</div>}
    {!loading && !projectId && <div className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Không tìm thấy đồ án để xem đóng góp.</div>}

    {!loading && summary && <>
      <StatTileRow
        tiles={[
          { icon: 'groups', label: 'Thành viên', value: summary.totalCount, caption: snapshot ? 'Bản tổng hợp đã lưu' : 'Dữ liệu hoạt động hiện tại', hero: true },
          { icon: 'task_alt', label: 'Công việc hoàn tất', value: completedTasks, caption: `Trên ${assignedTasks} nhiệm vụ được giao`, tone: 'success' },
          { icon: 'fact_check', label: 'Tổng chứng cứ', value: totalEvidence, caption: 'Hoạt động ghi nhận trong trang này', tone: 'info' },
          { icon: 'insights', label: 'Điểm hoạt động TB', value: averageScore, caption: `${summary.ruleVersion} · ${summary.snapshotAt ? formatDate(summary.snapshotAt) : ({ SUFFICIENT: 'Đủ dữ liệu', INSUFFICIENT_DATA: 'Chưa đủ dữ liệu' }[summary.dataStatus] ?? 'Đang cập nhật')}`, tone: summary.dataStatus === 'INSUFFICIENT_DATA' ? 'warning' : 'neutral' },
        ]}
      />

      {summary.dataStatus === 'INSUFFICIENT_DATA' && <div role="status" className="flex gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm leading-6 text-status-warning-text"><span className="material-symbols-outlined mt-0.5 text-[19px]" aria-hidden="true">info</span><p>Chưa đủ chứng cứ để so sánh hoạt động giữa các thành viên. Đây không phải là đánh giá hoặc điểm học phần.</p></div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs xl:col-span-7 min-w-0" aria-labelledby="contribution-members-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <div>
              <h2 id="contribution-members-heading" className="text-[15px] font-bold text-ink">Hoạt động theo thành viên</h2>
              <p className="mt-0.5 text-xs text-ink-muted">{summary.snapshotHash ? `Mã bản tổng hợp ${summary.snapshotHash.slice(0, 12)}` : 'Cập nhật theo hoạt động hiện tại'}</p>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">{summary.members.length} thành viên</span>
          </div>
          {summary.members.length === 0 ? <div className="p-8 text-center text-sm text-ink-muted">Chưa có dữ liệu đóng góp trong nguồn đã chọn.</div> : (
            <ul className="divide-y divide-hairline">{summary.members.map(member => <li key={member.userId} className={`grid gap-4 p-4 transition-colors sm:px-5 lg:grid-cols-[minmax(12rem,1.2fr)_minmax(16rem,2fr)_auto] lg:items-center ${selectedUserId === member.userId ? 'bg-primary-subtle/60 border-l-2 border-l-primary' : 'hover:bg-canvas/70'}`}>
              <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-subtle text-sm font-bold text-primary">{initials(member.displayName)}</span><div className="min-w-0"><strong className="block truncate text-sm text-ink">{member.displayName}</strong><span className="text-xs text-ink-muted tabular-nums">{member.evidenceCount} chứng cứ đã ghi nhận</span></div></div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3"><ContributionStat label="Công việc" value={`${member.completedTasks}/${member.assignedTasks}`} /><ContributionStat label="Báo cáo" value={member.submittedReports} /><ContributionStat label="Cuộc họp" value={member.attendedMeetings} /><ContributionStat label="Bản nộp" value={member.submittedDeliverableVersions} /><ContributionStat label="Tệp" value={member.uploadedFiles} /><ContributionStat label="Hoạt động" value={member.activityScore} /></div>
              <button type="button" aria-label="Xem chứng cứ" className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selectedUserId === member.userId ? 'border-primary bg-primary text-white' : 'border-hairline bg-card text-primary hover:border-primary/30 hover:bg-primary-subtle'}`} onClick={() => { setSelectedUserId(member.userId); setEvidencePage(1); setSourceType('') }}><span className="font-mono text-xs font-bold">{member.evidenceCount}</span> Xem chứng cứ</button>
            </li>)}</ul>
          )}
          {memberTotalPages > 1 && (
            <div className="border-t border-hairline bg-canvas/50 px-5 py-3.5">
              <Pagination page={page} pages={memberTotalPages} total={summary.totalCount} pageSize={20} busy={loading} onPage={setPage} />
            </div>
          )}
        </section>

        <aside className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs xl:col-span-5 xl:sticky xl:top-20 min-w-0" aria-label="Nhật ký hoạt động và chứng cứ">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <div>
              <h2 className="text-[15px] font-bold text-ink">Minh chứng đóng góp</h2>
              <p className="mt-0.5 text-xs text-ink-muted">{selectedUserId ? (selectedMember?.displayName ?? `Thành viên #${selectedUserId}`) : 'Chọn thành viên để đối chiếu nhật ký'}</p>
            </div>
            {selectedUserId && (
              <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setSelectedUserId(null)}>Đóng</button>
            )}
          </div>
          {!selectedUserId ? (
            <div className="p-8 text-center text-sm text-ink-muted">
              <span className="material-symbols-outlined mb-2 block text-3xl text-ink-muted" aria-hidden="true">fact_check</span>
              <p>Nhấn <strong>Xem chứng cứ</strong> ở một thành viên bên trái để đối chiếu từng hoạt động đã ghi nhận.</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {error && <p role="alert" className="text-sm text-status-error-text">{error}</p>}
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-4">
                <p className="flex-1 min-w-44 text-xs leading-5 text-ink-muted">Hoạt động được ghi nhận để đối chiếu đóng góp của thành viên.</p>
                <label className="grid shrink-0 gap-1 text-xs font-semibold text-ink-muted">Nguồn chứng cứ
                  <select aria-label="Nguồn chứng cứ" className="min-h-10 min-w-48 rounded-md border border-hairline bg-card px-3 text-sm font-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" value={sourceType} onChange={event => { setSourceType(event.target.value); setEvidencePage(1) }}>
                    <option value="">Tất cả nguồn</option><option value="TASK">Công việc</option><option value="PROGRESS_REPORT">Báo cáo tiến độ</option><option value="MEETING">Cuộc họp</option><option value="DELIVERABLE_VERSION">Phiên bản hạng mục</option><option value="FILE">Tệp</option>
                  </select>
                </label>
              </div>
              {evidenceLoading && <div role="status" className="py-5 text-sm text-ink-muted">Đang tải chứng cứ…</div>}
              {!evidenceLoading && evidence.length === 0 && <div className="py-8 text-center text-sm text-ink-muted"><span className="material-symbols-outlined mb-2 block text-3xl text-ink-muted" aria-hidden="true">inventory_2</span>Chưa có chứng cứ phù hợp.</div>}
              {!evidenceLoading && evidence.length > 0 && (
                <ul className="divide-y divide-hairline">{evidence.map(item => <li key={`${item.sourceType}-${item.sourceId}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><span className="grid size-9 place-items-center rounded-md bg-primary-subtle text-primary"><span className="material-symbols-outlined text-[19px]" aria-hidden="true">description</span></span><div className="min-w-0"><strong className="block break-words text-sm text-ink">{item.sourceType === 'PROGRESS_REPORT' ? ({ WEEKLY: 'Báo cáo tuần', MONTHLY: 'Báo cáo tháng' }[item.label] ?? item.label) : item.label}</strong><div className="mt-1 flex flex-wrap items-center gap-1.5"><StatusBadge tone="info" label={sourceLabel(item.sourceType)} /><span className="font-mono text-xs text-ink-muted">#{item.sourceId}</span></div></div><div className="col-start-2 text-left sm:col-start-auto sm:text-right"><span className="block text-xs text-ink-muted tabular-nums">{formatDate(item.occurredAt)}</span><span className="mt-1 block font-mono text-xs text-ink-soft">Mức đóng góp: {item.credit}</span></div></li>)}</ul>
              )}
              {evidenceTotalPages > 1 && (
                <div className="border-t border-hairline pt-3">
                  <Pagination page={evidencePage} pages={evidenceTotalPages} total={evidenceTotal} pageSize={20} busy={evidenceLoading} onPage={setEvidencePage} />
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </>}
  </div>
}

function ContributionStat({ label, value }: { label: string; value: string | number }) {
  return <p className="flex items-baseline justify-between gap-2 border-b border-line pb-1 text-ink-muted"><span>{label}</span><strong className="font-mono text-xs text-ink-soft">{value}</strong></p>
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase()).join('') || '—'
}

function sourceLabel(value: string) {
  return ({ TASK: 'Công việc', PROGRESS_REPORT: 'Báo cáo', MEETING: 'Cuộc họp', DELIVERABLE_VERSION: 'Bản nộp', FILE: 'Tệp' } as Record<string, string>)[value] ?? value
}

function formatDate(value: string) {
  return dateTimeLabel(value)
}


