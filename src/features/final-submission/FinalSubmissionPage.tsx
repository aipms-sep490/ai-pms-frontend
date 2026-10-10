import { displayLabel } from '../../components/ui/display-label'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { getDeliverables, getDeliverableVersions } from '../../services/api/deliverables.api'
import { HttpError } from '../../services/http/http-client'
import { Button } from '../../components/ui/Button'
import type { Deliverable, DeliverableVersion } from '../deliverables/deliverable-types'
import * as api from './final-submission-api'
import type { FinalChecklist, FinalDraft, FinalPeriod, FinalRequirements, LockedFinalSubmission } from './final-submission-api'

async function allDeliverables(projectId: number): Promise<Deliverable[]> {
  const result: Deliverable[] = []
  let page = 1
  while (true) {
    const response = await getDeliverables(projectId, { page, pageSize: 100 })
    result.push(...response.items)
    if (result.length >= response.totalCount || response.items.length === 0) return result
    page += 1
  }
}

async function allPeriods(projectId: number): Promise<FinalPeriod[]> {
  const periods: FinalPeriod[] = []
  let page = 1
  while (true) {
    const response = await api.getFinalPeriods(projectId, page)
    periods.push(...response.items)
    if (periods.length >= response.totalCount || response.items.length === 0) return periods
    page += 1
  }
}

async function allEligibleVersions(deliverableId: number): Promise<DeliverableVersion[]> {
  const versions: DeliverableVersion[] = []
  let page = 1
  while (true) {
    const response = await getDeliverableVersions(deliverableId, page, 100)
    versions.push(...response.items.filter(item => item.status === 'SUBMITTED' || item.status === 'ACCEPTED'))
    if (page * 100 >= response.totalCount || response.items.length === 0) return versions
    page += 1
  }
}

function message(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    if (reason.status === 403) return 'Hệ thống không cấp quyền thao tác với hồ sơ bàn giao này.'
    if (reason.status === 404) return 'Không tìm thấy hồ sơ hoặc gói bàn giao trong phạm vi hiện tại.'
    if (reason.status === 409) return 'Dữ liệu hoặc hạn nộp đã thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra trước khi thao tác tiếp.'
    if (reason.status === 422 || reason.status === 400) return reason.problem?.detail || 'Dữ liệu không hợp lệ hoặc chưa đáp ứng điều kiện bàn giao.'
  }
  return 'Không thể xử lý hồ sơ bàn giao. Vui lòng thử lại.'
}

const blockerLabels: Record<string, string> = {
  LEADER_REQUIRED: 'Chỉ trưởng nhóm được chuẩn bị và nộp bản cuối',
  PROJECT_NOT_ACTIVE: 'Đồ án chưa ở trạng thái ACTIVE',
  ACADEMIC_SCOPE_INACTIVE: 'Phạm vi học vụ của đồ án chưa còn hiệu lực',
  FINAL_SUBMISSION_PERIOD_REQUIRED: 'Chưa đến đợt bàn giao cuối đang hiệu lực',
  SEMESTER_CLOSED: 'Học kỳ đã đóng',
  PERIOD_INACTIVE: 'Đợt bàn giao cuối chưa hoạt động',
  WINDOW_NOT_STARTED: 'Chưa đến thời gian mở bàn giao cuối',
  WINDOW_CLOSED: 'Đã hết thời gian bàn giao cuối',
  AMBIGUOUS_FINAL_SUBMISSION_WINDOW: 'Có nhiều cửa sổ bàn giao cuối trùng thời gian; cần cán bộ học vụ xử lý',
  ALREADY_SUBMITTED: 'Gói cuối đã được nộp và khóa',
  DRAFT_REQUIRED: 'Chưa có bản nháp bàn giao',
  REQUIREMENTS_NOT_CONFIGURED: 'Bộ môn chưa cấu hình hạng mục bắt buộc',
  VERSION_NOT_IN_PROJECT: 'Có phiên bản sản phẩm không thuộc đồ án',
  EMPTY_PACKAGE: 'Gói bàn giao chưa chọn phiên bản sản phẩm',
  DUPLICATE_DELIVERABLE_VERSION: 'Một hạng mục đang có nhiều phiên bản trong gói',
}
const describeBlocker = (code: string) => {
  const [kind, id] = code.split(':', 2)
  if (kind === 'VERSION_INELIGIBLE') return `Phiên bản #${id} chưa hợp lệ để bàn giao`
  if (kind === 'FILE_CONTENT_INVALID') return `Nội dung tệp #${id} không còn hợp lệ`
  if (kind === 'REQUIRED_DELIVERABLE_MISSING') return `Thiếu phiên bản hợp lệ cho hạng mục bắt buộc #${id}`
  return blockerLabels[code] ?? code
}

export function StudentFinalSubmissionPage() {
  const journey = useStudentJourney()
  if (journey.isLoading) return <p role="status" className="p-6">Đang tải đồ án…</p>
  if (!journey.project) return <p role="alert" className="p-6">Không tìm thấy đồ án thuộc nhóm hiện tại.</p>
  return <FinalSubmissionWorkspace key={journey.project.id} projectId={journey.project.id} projectStatus={journey.project.status} onSubmitted={journey.refreshAll} />
}

function FinalSubmissionWorkspace({ projectId, projectStatus, onSubmitted }: { projectId: number; projectStatus: string; onSubmitted: () => Promise<void> }) {
  const [periods, setPeriods] = useState<FinalPeriod[]>([])
  const [draft, setDraft] = useState<FinalDraft | null>(null)
  const [checklist, setChecklist] = useState<FinalChecklist | null>(null)
  const [locked, setLocked] = useState<LockedFinalSubmission | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [versions, setVersions] = useState<DeliverableVersion[]>([])
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<number | null>(null)
  const [selectedVersionIds, setSelectedVersionIds] = useState<Record<number, number>>({})
  const [periodId, setPeriodId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoaded(false)
    setDraft(null); setChecklist(null); setLocked(null); setDeliverables([])
    try {
      const [periodOptions, nextDraft, nextChecklist, nextLocked, nextDeliverables] = await Promise.all([
        allPeriods(projectId), api.getFinalDraft(projectId), api.getFinalChecklist(projectId),
        api.getLockedFinalSubmission(projectId), allDeliverables(projectId),
      ])
      setPeriods(periodOptions)
      setDraft(nextDraft)
      setChecklist(nextChecklist)
      setLocked(nextLocked)
      setDeliverables(nextDeliverables)
      setPeriodId(nextDraft?.projectPeriodId ?? periodOptions.find(item => item.canPrepareDraft)?.id ?? null)
      setNotes(nextDraft?.notes ?? '')
      setSelectedVersionIds(Object.fromEntries(nextDraft?.items.map(item => [item.deliverableId, item.deliverableVersionId]) ?? []))
      setConfirmed(false)
      setLoaded(true)
      setError(null)
    } catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { void load() }, [load])

  const chooseDeliverable = async (id: number) => {
    setSelectedDeliverableId(id || null)
    setVersions([])
    if (!id) return
    try { setVersions(await allEligibleVersions(id)) }
    catch (reason) { setError(message(reason)) }
  }

  const run = async (operation: () => Promise<unknown>, submitted = false) => {
    setBusy(true)
    setError(null)
    try { await operation(); await load(); if (submitted) await onSubmitted() }
    catch (reason) { if (reason instanceof HttpError && reason.status === 409) await load(); setError(message(reason)) }
    finally { setBusy(false) }
  }

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (projectStatus !== 'ACTIVE') { setError('Đồ án đã kết thúc giai đoạn thực hiện. Bạn có thể xem bản bàn giao đã chốt nếu được cấp quyền.'); return }
    if (!periodId) { setError('Chọn đợt bàn giao do hệ thống cho phép.'); return }
    const body = { projectPeriodId: periodId, notes: notes.trim() || null, deliverableVersionIds: Object.values(selectedVersionIds) }
    void run(() => draft
      ? api.updateFinalDraft(projectId, { ...body, concurrencyToken: draft.concurrencyToken })
      : api.createFinalDraft(projectId, body))
  }

  const canPrepareDraft = projectStatus === 'ACTIVE' && (draft ? draft.canEdit : periods.some(item => item.canPrepareDraft))
  const canSubmit = projectStatus === 'ACTIVE' && Boolean(checklist?.canSubmit)

  return <WorkspacePage className="space-y-5" title="Bàn giao cuối đồ án" eyebrow="Hoàn tất đồ án" description="Chuẩn bị các phiên bản sản phẩm và gửi gói bàn giao của nhóm.">
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
    {loading && <p role="status" className="rounded-lg border bg-white p-5 text-sm">Đang tải hồ sơ bàn giao…</p>}
    {!loading && loaded && locked && <LockedPackageView projectId={projectId} packageData={locked} />}
    {!loading && loaded && !locked && <>
      <section className="workspace-surface workspace-surface-padding"><h2 className="font-semibold text-slate-900">Bản nháp bàn giao</h2><p className="mt-1 text-sm text-slate-600">Chọn rõ phiên bản của từng hạng mục. Bản nháp không tự chọn phiên bản mới nhất.</p>
        <form className="mt-4 space-y-4" onSubmit={saveDraft}>
          <label className="block text-sm font-medium text-slate-700">Đợt bàn giao<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" value={periodId ?? ''} disabled={busy || !canPrepareDraft} onChange={event => setPeriodId(Number(event.target.value) || null)}><option value="">Chọn đợt</option>{periods.map(period => <option key={period.id} value={period.id} disabled={!period.canPrepareDraft && period.id !== draft?.projectPeriodId}>{period.name} · {displayLabel(period.status)}</option>)}</select></label>
          <label className="block text-sm font-medium text-slate-700">Ghi chú<textarea className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" rows={3} maxLength={10000} value={notes} disabled={busy || !canPrepareDraft} onChange={event => setNotes(event.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Hạng mục<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" value={selectedDeliverableId ?? ''} disabled={busy || !canPrepareDraft} onChange={event => void chooseDeliverable(Number(event.target.value))}><option value="">Chọn hạng mục</option>{deliverables.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-sm font-medium text-slate-700">Phiên bản<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" value={selectedDeliverableId ? selectedVersionIds[selectedDeliverableId] ?? '' : ''} disabled={!selectedDeliverableId || busy || !canPrepareDraft} onChange={event => { if (selectedDeliverableId) setSelectedVersionIds(current => ({ ...current, [selectedDeliverableId]: Number(event.target.value) })) }}><option value="">Chọn phiên bản hợp lệ</option>{versions.map(item => <option key={item.id} value={item.id}>v{item.versionNumber} · {displayLabel(item.status)}</option>)}</select></label></div>
          <ul className="space-y-2 text-sm">{Object.entries(selectedVersionIds).map(([deliverableId, versionId]) => <li key={deliverableId} className="workspace-record-row flex flex-wrap items-center justify-between gap-3"><span>{deliverables.find(item => item.id === Number(deliverableId))?.title ?? `Hạng mục #${deliverableId}`} · phiên bản #{versionId}</span><Button variant="danger" size="sm" disabled={busy || !canPrepareDraft} onClick={() => setSelectedVersionIds(current => { const next = { ...current }; delete next[Number(deliverableId)]; return next })}>Bỏ</Button></li>)}</ul>
          {draft?.editBlockers.length ? <p className="text-sm text-amber-800">Không thể sửa: {draft.editBlockers.map(describeBlocker).join(', ')}</p> : null}
          <div><Button type="submit" disabled={busy || !periodId || !canPrepareDraft}>{draft ? 'Lưu bản nháp' : 'Tạo bản nháp'}</Button></div>
        </form>
      </section>
      {checklist && <section className="workspace-surface workspace-surface-padding"><h2 className="font-semibold text-slate-900">Kiểm tra trước khi bàn giao</h2><p className="mt-1 text-sm text-slate-600">Hạn: {checklist.deadline ? new Date(checklist.deadline).toLocaleString('vi-VN') : 'Chưa có'}</p><ul className="mt-3 space-y-2 text-sm">{checklist.items.map(item => <li key={item.deliverableId} className="workspace-record-row">{item.isComplete ? '✓' : '○'} {item.title} · {item.selectedVersionId ? `version #${item.selectedVersionId}` : 'chưa chọn'}</li>)}</ul>{checklist.blockers.length > 0 && <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-status-warning-bg p-4 text-xs font-medium text-amber-900"><span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0 mt-0.5" aria-hidden="true">warning</span><div className="leading-relaxed"><strong className="font-bold block text-amber-950 mb-0.5">Chưa thể nộp:</strong>{checklist.blockers.map(describeBlocker).join(' • ')}</div></div>}<label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={!canSubmit || busy} onChange={event => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" /><span>Tôi xác nhận khóa gói và nộp bản cuối theo checklist hiện tại.</span></label><div className="mt-4"><Button type="button" disabled={!canSubmit || !confirmed || busy || !checklist.draftConcurrencyToken || !checklist.requirementsConcurrencyToken} onClick={() => { if (canSubmit) void run(() => api.submitFinalSubmission(projectId, checklist.draftConcurrencyToken!, checklist.requirementsConcurrencyToken!), true) }}>{busy ? 'Đang nộp…' : 'Nộp và khóa gói'}</Button></div></section>}
    </>}
    <div>
      <Link to="/projects/lifecycle" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        <span>Về hồ sơ đồ án</span>
      </Link>
    </div>
  </WorkspacePage>
}

export function LockedPackageView({ projectId, packageData }: { projectId: number; packageData: LockedFinalSubmission }) {
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const download = async (fileId: number, fileName: string) => {
    setDownloadingId(fileId)
    try {
      const blob = await api.downloadLockedFile(projectId, fileId)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setError(null)
    } catch { setError('Không thể tải tệp trong bản tổng hợp đã khóa.') }
    finally { setDownloadingId(null) }
  }
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-semibold text-emerald-900">Gói đã khóa và nộp</h2><p className="mt-1 text-sm">Nộp lúc {formatDate(packageData.submittedAt)} · hạn {formatDate(packageData.deadline)} · {packageData.items.length} phiên bản sản phẩm</p><p className="mt-1 text-xs text-emerald-900">Bản bàn giao đã chốt #{packageData.id}; không có thao tác sửa, xóa hoặc nộp lại.</p>{packageData.notes && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-sm text-slate-700"><strong>Ghi chú:</strong> {packageData.notes}</p>}{error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}<ul className="mt-3 space-y-3 text-sm">{packageData.items.map(item => <li key={item.deliverableVersionId} className="rounded-lg bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.title} · phiên bản {item.versionNumber}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{item.wasRequired ? 'Bắt buộc' : 'Tùy chọn'} · {item.statusAtSubmission}</span></div>{item.files.length === 0 ? <p className="mt-2 text-xs text-slate-600">Bản bàn giao này không có tệp để tải xuống.</p> : <ul className="mt-2 space-y-1">{item.files.map(file => <li key={file.id}><button type="button" disabled={downloadingId !== null} className="min-h-11 text-left font-semibold text-primary hover:underline disabled:opacity-50" onClick={() => void download(file.id, file.fileName)}>{downloadingId === file.id ? 'Đang tải…' : `${file.fileName}${file.sizeBytes ? ` · ${formatBytes(file.sizeBytes)}` : ''}`}</button></li>)}</ul>}</li>)}</ul></section>
}

/** Uses the locked-package endpoint only; Backend authorizes each reader's current scope. */
export function FinalSubmissionViewerPage({ backTo = '/projects/lifecycle', backLabel = 'Hồ sơ đồ án' }: { backTo?: string; backLabel?: string }) {
  const location = useLocation()
  const assignmentReturn = location.pathname.startsWith('/evaluator/') && typeof location.state?.assignmentReturn === 'string' && /^\/evaluator\/assignments\/[1-9]\d*$/.test(location.state.assignmentReturn) ? location.state.assignmentReturn : null
  const projectId = Number(useParams().projectId)
  const [packageData, setPackageData] = useState<LockedFinalSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId < 1) { setError('đồ án ID không hợp lệ.'); setLoading(false); return }
    setLoading(true); setError(null); setPackageData(null)
    try {
      const result = await api.getLockedFinalSubmission(projectId)
      setPackageData(result)
    } catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { void load() }, [load])
  return (
    <main className="workspace-page mx-auto max-w-5xl space-y-5 pb-12">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Gói bàn giao cuối</h1>
        <p className="mt-1 text-sm text-slate-600">Đồ án #{Number.isInteger(projectId) ? projectId : '—'} · Nội dung và tệp trong bản bàn giao đã chốt.</p>
      </header>
      {loading && <p role="status" className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Đang tải gói bàn giao đã khóa…</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
      {!loading && !error && !packageData && (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <span className="material-symbols-outlined text-4xl text-slate-400">inventory_2</span>
          <h3 className="mt-3 font-semibold text-slate-900">Chưa có gói bàn giao cuối đã khóa</h3>
          <p className="mt-1 text-sm text-slate-600">Đồ án chưa chốt gói bàn giao cuối kỳ.</p>
        </section>
      )}
      {!loading && packageData && <LockedPackageView projectId={projectId} packageData={packageData} />}
      <div>
        <Link to={assignmentReturn ?? backTo} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          <span>{assignmentReturn ? 'Quay lại chấm điểm' : backLabel}</span>
        </Link>
      </div>
    </main>
  )
}

export function FinalRequirementsPage() {
  const projectId = Number(useParams().projectId)
  const [requirements, setRequirements] = useState<FinalRequirements | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId < 1) { setError('đồ án ID không hợp lệ.'); setLoading(false); return }
    setLoading(true)
    setRequirements(null); setDeliverables([])
    try { const [defs, items] = await Promise.all([api.getFinalRequirements(projectId), allDeliverables(projectId)]); setRequirements(defs); setDeliverables(items); setSelectedIds(defs.items.map(item => item.deliverableId)); setError(null) }
    catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { void load() }, [load])
  const save = async () => {
    if (!requirements || selectedIds.length === 0) { setError('Chọn ít nhất một hạng mục bắt buộc.'); return }
    setBusy(true)
    try { await api.configureFinalRequirements(projectId, selectedIds, requirements.concurrencyToken); await load() }
    catch (reason) { if (reason instanceof HttpError && reason.status === 409) await load(); setError(message(reason)) }
    finally { setBusy(false) }
  }
  return (
    <main className="workspace-page mx-auto max-w-4xl space-y-5 pb-12">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Yêu cầu bàn giao</h1>
        <p className="mt-1 text-sm text-slate-600">Đồ án #{projectId} · Chọn các hạng mục nhóm cần nộp trước khi chốt bàn giao.</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
      {loading && <p role="status" className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Đang tải yêu cầu…</p>}
      {!loading && requirements && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="font-semibold text-slate-900">hạng mục bắt buộc</h2>
            {deliverables.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">Đồ án chưa có hạng mục cần nộp.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {deliverables.map(item => (
                  <li key={item.id}>
                    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        disabled={busy}
                        onChange={event => setSelectedIds(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="font-medium text-slate-800">{item.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Button
                type="button"
                disabled={busy || !requirements || selectedIds.length === 0}
                onClick={() => void save()}
              >
                {busy ? 'Đang lưu…' : 'Lưu yêu cầu'}
              </Button>
            </div>
          </section>
          <div>
            <Link
              to={`/department/projects/${projectId}/final-submission`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <span>Xem gói đã khóa</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </>
      )}
    </main>
  )
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Không xác định' : date.toLocaleString('vi-VN') }
function formatBytes(value: number) { return value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB` }

