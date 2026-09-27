import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { getDeliverables, getDeliverableVersions } from '../../services/api/deliverables.api'
import { HttpError } from '../../services/http/http-client'
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
    if (reason.status === 403) return 'Backend không cấp quyền thao tác với hồ sơ bàn giao này.'
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
  REQUIREMENTS_NOT_CONFIGURED: 'Bộ môn chưa cấu hình deliverable bắt buộc',
  VERSION_NOT_IN_PROJECT: 'Có phiên bản sản phẩm không thuộc đồ án',
  EMPTY_PACKAGE: 'Gói bàn giao chưa chọn phiên bản sản phẩm',
  DUPLICATE_DELIVERABLE_VERSION: 'Một deliverable đang có nhiều phiên bản trong gói',
}
const describeBlocker = (code: string) => {
  const [kind, id] = code.split(':', 2)
  if (kind === 'VERSION_INELIGIBLE') return `Phiên bản #${id} chưa hợp lệ để bàn giao`
  if (kind === 'FILE_CONTENT_INVALID') return `Nội dung tệp #${id} không còn hợp lệ`
  if (kind === 'REQUIRED_DELIVERABLE_MISSING') return `Thiếu phiên bản hợp lệ cho deliverable bắt buộc #${id}`
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
    if (projectStatus !== 'ACTIVE') { setError('Đồ án không còn ở trạng thái ACTIVE; chỉ có thể xem gói đã khóa nếu Backend cấp quyền.'); return }
    if (!periodId) { setError('Chọn đợt bàn giao do Backend cho phép.'); return }
    const body = { projectPeriodId: periodId, notes: notes.trim() || null, deliverableVersionIds: Object.values(selectedVersionIds) }
    void run(() => draft
      ? api.updateFinalDraft(projectId, { ...body, concurrencyToken: draft.concurrencyToken })
      : api.createFinalDraft(projectId, body))
  }

  const canPrepareDraft = projectStatus === 'ACTIVE' && (draft ? draft.canEdit : periods.some(item => item.canPrepareDraft))
  const canSubmit = projectStatus === 'ACTIVE' && Boolean(checklist?.canSubmit)

  return <main className="mx-auto max-w-5xl space-y-5 pb-12">
    <header><h1 className="text-2xl font-bold text-slate-900">Bàn giao cuối đồ án</h1><p className="mt-1 text-sm text-slate-600">Project #{projectId} · {projectStatus}. Backend kiểm tra hạn, phiên bản tệp và quyền Trưởng nhóm trước khi khóa gói.</p></header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
    {loading && <p role="status" className="rounded-lg border bg-white p-5 text-sm">Đang tải hồ sơ bàn giao…</p>}
    {!loading && loaded && locked && <LockedPackageView projectId={projectId} packageData={locked} />}
    {!loading && loaded && !locked && <>
      <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Bản nháp bàn giao</h2><p className="mt-1 text-sm text-slate-600">Chọn rõ phiên bản của từng deliverable. Bản nháp không tự chọn phiên bản mới nhất.</p>
        <form className="mt-4 space-y-4" onSubmit={saveDraft}>
          <label className="block text-sm font-medium">Đợt bàn giao<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" value={periodId ?? ''} disabled={busy || !canPrepareDraft} onChange={event => setPeriodId(Number(event.target.value) || null)}><option value="">Chọn đợt</option>{periods.map(period => <option key={period.id} value={period.id} disabled={!period.canPrepareDraft && period.id !== draft?.projectPeriodId}>{period.name} · {period.status}</option>)}</select></label>
          <label className="block text-sm font-medium">Ghi chú<textarea className="mt-1 w-full rounded-lg border border-slate-300 p-3" rows={3} maxLength={10000} value={notes} disabled={busy || !canPrepareDraft} onChange={event => setNotes(event.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Deliverable<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" value={selectedDeliverableId ?? ''} disabled={busy || !canPrepareDraft} onChange={event => void chooseDeliverable(Number(event.target.value))}><option value="">Chọn deliverable</option>{deliverables.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-sm font-medium">Phiên bản<select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" value={selectedDeliverableId ? selectedVersionIds[selectedDeliverableId] ?? '' : ''} disabled={!selectedDeliverableId || busy || !canPrepareDraft} onChange={event => { if (selectedDeliverableId) setSelectedVersionIds(current => ({ ...current, [selectedDeliverableId]: Number(event.target.value) })) }}><option value="">Chọn phiên bản hợp lệ</option>{versions.map(item => <option key={item.id} value={item.id}>v{item.versionNumber} · {item.status}</option>)}</select></label></div>
          <ul className="space-y-2 text-sm">{Object.entries(selectedVersionIds).map(([deliverableId, versionId]) => <li key={deliverableId} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3"><span>{deliverables.find(item => item.id === Number(deliverableId))?.title ?? `Deliverable #${deliverableId}`} · version #{versionId}</span><button type="button" disabled={busy || !canPrepareDraft} className="min-h-11 font-semibold text-rose-700 disabled:opacity-50" onClick={() => setSelectedVersionIds(current => { const next = { ...current }; delete next[Number(deliverableId)]; return next })}>Bỏ</button></li>)}</ul>
          {draft?.editBlockers.length ? <p className="text-sm text-amber-800">Không thể sửa: {draft.editBlockers.map(describeBlocker).join(', ')}</p> : null}
          <button type="submit" disabled={busy || !periodId || !canPrepareDraft} className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{draft ? 'Lưu bản nháp' : 'Tạo bản nháp'}</button>
        </form>
      </section>
      {checklist && <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Checklist do Backend xác nhận</h2><p className="mt-1 text-sm text-slate-600">Hạn: {checklist.deadline ? new Date(checklist.deadline).toLocaleString('vi-VN') : 'Chưa có'}</p><ul className="mt-3 space-y-2 text-sm">{checklist.items.map(item => <li key={item.deliverableId} className="rounded-lg bg-slate-50 p-3">{item.isComplete ? '✓' : '○'} {item.title} · {item.selectedVersionId ? `version #${item.selectedVersionId}` : 'chưa chọn'}</li>)}</ul>{checklist.blockers.length > 0 && <p className="mt-3 text-sm text-amber-800">Chưa thể nộp: {checklist.blockers.map(describeBlocker).join(', ')}</p>}<label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={!canSubmit || busy} onChange={event => setConfirmed(event.target.checked)} /><span>Tôi xác nhận khóa gói và nộp bản cuối theo checklist hiện tại.</span></label><button type="button" disabled={!canSubmit || !confirmed || busy || !checklist.draftConcurrencyToken || !checklist.requirementsConcurrencyToken} className="mt-3 min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={() => { if (canSubmit) void run(() => api.submitFinalSubmission(projectId, checklist.draftConcurrencyToken!, checklist.requirementsConcurrencyToken!), true) }}>Nộp và khóa gói</button></section>}
    </>}
    <Link to="/projects/lifecycle" className="inline-block min-h-11 pt-3 text-sm font-semibold text-blue-700">← Hồ sơ đồ án</Link>
  </main>
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
    } catch { setError('Không thể tải tệp trong snapshot đã khóa.') }
    finally { setDownloadingId(null) }
  }
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-semibold text-emerald-900">Gói đã khóa và nộp</h2><p className="mt-1 text-sm">Nộp lúc {formatDate(packageData.submittedAt)} · hạn {formatDate(packageData.deadline)} · {packageData.items.length} phiên bản sản phẩm</p><p className="mt-1 text-xs text-emerald-900">Snapshot bất biến #{packageData.id}; không có thao tác sửa, xóa hoặc nộp lại.</p>{packageData.notes && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-sm text-slate-700"><strong>Ghi chú:</strong> {packageData.notes}</p>}{error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}<ul className="mt-3 space-y-3 text-sm">{packageData.items.map(item => <li key={item.deliverableVersionId} className="rounded-lg bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.title} · phiên bản {item.versionNumber}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{item.wasRequired ? 'Bắt buộc' : 'Tùy chọn'} · {item.statusAtSubmission}</span></div>{item.files.length === 0 ? <p className="mt-2 text-xs text-slate-600">Snapshot không chứa tệp có thể tải.</p> : <ul className="mt-2 space-y-1">{item.files.map(file => <li key={file.id}><button type="button" disabled={downloadingId !== null} className="min-h-11 text-left font-semibold text-blue-700 underline disabled:opacity-50" onClick={() => void download(file.id, file.fileName)}>{downloadingId === file.id ? 'Đang tải…' : `${file.fileName}${file.sizeBytes ? ` · ${formatBytes(file.sizeBytes)}` : ''}`}</button></li>)}</ul>}</li>)}</ul></section>
}

/** Uses the locked-package endpoint only; Backend authorizes each reader's current scope. */
export function FinalSubmissionViewerPage({ backTo = '/projects/lifecycle', backLabel = 'Hồ sơ đồ án' }: { backTo?: string; backLabel?: string }) {
  const projectId = Number(useParams().projectId)
  const [packageData, setPackageData] = useState<LockedFinalSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId < 1) { setError('Project ID không hợp lệ.'); setLoading(false); return }
    setLoading(true); setError(null); setPackageData(null)
    try {
      const result = await api.getLockedFinalSubmission(projectId)
      if (!result) setError('Project chưa có gói bàn giao cuối đã khóa.')
      else setPackageData(result)
    } catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { void load() }, [load])
  return <main className="mx-auto max-w-5xl space-y-5 pb-12"><header><h1 className="text-2xl font-bold text-slate-900">Gói bàn giao cuối</h1><p className="mt-1 text-sm text-slate-600">Project #{Number.isInteger(projectId) ? projectId : '—'} · metadata và tệp lấy từ snapshot đã khóa của Backend.</p></header>{loading && <p role="status" className="rounded-lg border bg-white p-5 text-sm">Đang tải gói bàn giao đã khóa…</p>}{error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}{!loading && packageData && <LockedPackageView projectId={projectId} packageData={packageData} />}<Link to={backTo} className="inline-block min-h-11 pt-3 text-sm font-semibold text-blue-700">← {backLabel}</Link></main>
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
    if (!Number.isInteger(projectId) || projectId < 1) { setError('Project ID không hợp lệ.'); setLoading(false); return }
    setLoading(true)
    setRequirements(null); setDeliverables([])
    try { const [defs, items] = await Promise.all([api.getFinalRequirements(projectId), allDeliverables(projectId)]); setRequirements(defs); setDeliverables(items); setSelectedIds(defs.items.map(item => item.deliverableId)); setError(null) }
    catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { void load() }, [load])
  const save = async () => {
    if (!requirements || selectedIds.length === 0) { setError('Chọn ít nhất một deliverable bắt buộc.'); return }
    setBusy(true)
    try { await api.configureFinalRequirements(projectId, selectedIds, requirements.concurrencyToken); await load() }
    catch (reason) { if (reason instanceof HttpError && reason.status === 409) await load(); setError(message(reason)) }
    finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-4xl space-y-5 pb-12"><header><h1 className="text-2xl font-bold">Yêu cầu bàn giao</h1><p className="mt-1 text-sm text-slate-600">Project #{projectId} · Bộ môn chọn deliverable bắt buộc. Backend kiểm tra phạm vi và khóa cấu hình.</p></header>{error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}{loading && <p role="status">Đang tải yêu cầu…</p>}{!loading && requirements && <><section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Deliverable bắt buộc</h2>{deliverables.length === 0 ? <p className="mt-3 text-sm text-slate-600">Project chưa có deliverable để cấu hình.</p> : <ul className="mt-3 space-y-2">{deliverables.map(item => <li key={item.id}><label className="flex min-h-11 items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={selectedIds.includes(item.id)} disabled={busy} onChange={event => setSelectedIds(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))} />{item.title}</label></li>)}</ul>}<button type="button" className="mt-4 min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !requirements || selectedIds.length === 0} onClick={() => void save()}>Lưu yêu cầu</button></section><Link to={`/department/projects/${projectId}/final-submission`} className="inline-block min-h-11 pt-2 text-sm font-semibold text-blue-700">Xem gói đã khóa →</Link></>}</main>
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Không xác định' : date.toLocaleString('vi-VN') }
function formatBytes(value: number) { return value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB` }
