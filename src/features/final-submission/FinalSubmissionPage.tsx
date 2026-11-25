import { displayLabel } from '../../components/ui/display-label'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { getDeliverables, getDeliverableVersions } from '../../services/api/deliverables.api'
import { HttpError } from '../../services/http/http-client'
import { Button } from '../../components/ui/Button'
import { DocumentPreviewModal } from '../../components/ui/DocumentPreviewModal'
import { InlineAlert } from '../../components/ui/InlineAlert'
import { ActionVerdict } from '../../components/ui/ActionVerdict'
import { ListLoading } from '../../components/ui/ListLoading'
import { PageLoading } from '../../components/ui/PageLoading'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { services } from '../../services/service-gateway'
import type { Deliverable, DeliverableVersion } from '../deliverables/deliverable-types'
import * as api from './final-submission-api'
import type { FinalChecklist, FinalDraft, FinalPeriod, FinalRequirements, LockedFinalSubmission } from './final-submission-api'
import { SubmissionPreflightPanel } from '../ai-suite/SubmissionPreflightPanel'

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
    if (reason.status === 422 || reason.status === 400) return 'Thông tin bàn giao chưa hợp lệ hoặc chưa đáp ứng điều kiện hiện tại. Kiểm tra checklist, phiên bản đã chọn và thời hạn rồi thử lại.'
  }
  return 'Không thể xử lý hồ sơ bàn giao. Vui lòng thử lại.'
}

const blockerLabels: Record<string, string> = {
  LEADER_REQUIRED: 'Chỉ trưởng nhóm được chuẩn bị và nộp bản cuối',
  PROJECT_NOT_ACTIVE: 'Đồ án chưa ở trạng thái đang thực hiện',
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
const describeBlocker = (code: string, deliverables: Deliverable[] = []) => {
  const [kind, id] = code.split(':', 2)
  const numericId = Number(id)
  const matchedDeliverable = Number.isInteger(numericId) ? deliverables.find(d => d.id === numericId)?.title : undefined
  if (kind === 'VERSION_INELIGIBLE') return 'Một phiên bản đã chọn chưa hợp lệ để bàn giao'
  if (kind === 'FILE_CONTENT_INVALID') return 'Một tệp đính kèm không còn hợp lệ để bàn giao'
  if (kind === 'REQUIRED_DELIVERABLE_MISSING') return matchedDeliverable ? `Thiếu phiên bản hợp lệ cho hạng mục bắt buộc: ${matchedDeliverable}` : 'Thiếu phiên bản hợp lệ cho một hạng mục bắt buộc'
  return blockerLabels[code] ?? 'Điều kiện bàn giao chưa được đáp ứng. Tải lại danh sách kiểm tra.'
}

export function StudentFinalSubmissionPage() {
  const journey = useStudentJourney()
  if (journey.isLoading) return <PageLoading label="Đang tải hồ sơ bàn giao…" />
  if (!journey.project) return <WorkspacePage title="Bàn giao cuối đồ án" eyebrow="Hoàn tất đồ án"><p role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-5 text-sm text-status-warning-text">Không tìm thấy đồ án thuộc nhóm hiện tại.</p></WorkspacePage>
  return <FinalSubmissionWorkspace key={journey.project.id} projectId={journey.project.id} projectStatus={journey.project.status} onSubmitted={journey.refreshAll} />
}

function FinalSubmissionWorkspace({ projectId, projectStatus, onSubmitted }: { projectId: number; projectStatus: string; onSubmitted: () => Promise<void> }) {
  const [periods, setPeriods] = useState<FinalPeriod[]>([])
  const [draft, setDraft] = useState<FinalDraft | null>(null)
  const [checklist, setChecklist] = useState<FinalChecklist | null>(null)
  const [locked, setLocked] = useState<LockedFinalSubmission | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [versions, setVersions] = useState<DeliverableVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<number | null>(null)
  const [selectedVersionIds, setSelectedVersionIds] = useState<Record<number, number>>({})
  const [versionNumberById, setVersionNumberById] = useState<Record<number, number>>({})
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
      setVersionNumberById(Object.fromEntries(nextDraft?.items.map(item => [item.deliverableVersionId, item.versionNumber]) ?? []))
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
    setLoadingVersions(true)
    try {
      const nextVersions = await allEligibleVersions(id)
      setVersions(nextVersions)
      setVersionNumberById(current => ({
        ...current,
        ...Object.fromEntries(nextVersions.map(v => [v.id, v.versionNumber])),
      }))
    }
    catch (reason) { setError(message(reason)) }
    finally { setLoadingVersions(false) }
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
  const submissionReasons = checklist ? [
    ...checklist.blockers.map(code => describeBlocker(code, deliverables)),
    ...(projectStatus !== 'ACTIVE' && !checklist.blockers.includes('PROJECT_NOT_ACTIVE') ? ['Đồ án chưa ở trạng thái đang thực hiện'] : []),
    ...(!checklist.canSubmit && checklist.blockers.length === 0 ? ['Danh mục kiểm tra chưa xác nhận đủ điều kiện nộp bản cuối.'] : []),
    ...(!checklist.draftConcurrencyToken || !checklist.requirementsConcurrencyToken ? ['Thiếu phiên bản xác nhận của bản nháp hoặc cấu hình. Hãy tải lại trang.'] : []),
  ] : []

  const formatVersionBadge = (versionId: number | null, explicitNumber?: number | null) => {
    if (!versionId) return 'chưa chọn'
    const num = explicitNumber ?? versionNumberById[versionId]
    return num ? `phiên bản v${num}` : 'đã chọn phiên bản'
  }

  return <WorkspacePage
    size="wide"
    className="space-y-5"
    title="Bàn giao cuối đồ án"
    eyebrow="Hoàn tất đồ án"
    description="Chuẩn bị các phiên bản sản phẩm và gửi gói bàn giao của nhóm."
    action={
      <Button variant="secondary" size="sm" icon="refresh" aria-label="Làm mới" disabled={loading || busy} onClick={() => void load()} />
    }
  >
    {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" className="min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
    {loading && <ListLoading label="Đang tải hồ sơ bàn giao…" />}
    {!loading && loaded && locked && <LockedPackageView projectId={projectId} packageData={locked} />}
    {!loading && loaded && !locked && <>
      <StatTileRow
        tiles={[
          { icon: 'inventory_2', label: 'Trạng thái bàn giao', value: draft ? 'Đang soạn nháp' : 'Chưa khởi tạo', hero: true, caption: canSubmit ? 'Sẵn sàng khóa và nộp gói cuối.' : 'Hoàn thiện checklist trước khi nộp.' },
          { icon: 'checklist', label: 'Hạng mục đã đủ', value: checklist ? `${checklist.items.filter(i => i.isComplete).length}/${checklist.items.length}` : '—', tone: 'success', caption: 'Theo danh mục yêu cầu bắt buộc.' },
          { icon: 'layers', label: 'Phiên bản đã chọn', value: Object.keys(selectedVersionIds).length, tone: 'info', caption: 'Số sản phẩm đính kèm vào gói cuối.' },
          { icon: 'warning', label: 'Điều kiện chưa đạt', value: submissionReasons.length, tone: submissionReasons.length > 0 ? 'warning' : 'success', caption: submissionReasons.length > 0 ? 'Cần xử lý trước khi khóa gói.' : 'Không còn vướng mắc.' },
        ]}
      />
      {(draft?.editBlockers.includes('LEADER_REQUIRED') || checklist?.blockers.includes('LEADER_REQUIRED')) && (
        <div className="rounded-xl border border-primary/20 bg-primary-subtle p-4 text-xs text-primary shadow-2xs">
          <strong>Thông báo quyền hạn:</strong> Bạn đang đăng nhập với vai trò Thành viên nhóm. Quyền chuẩn bị bản nháp và nộp gói bàn giao cuối cùng thuộc về Trưởng nhóm. Bạn vẫn có thể rà soát danh mục và kiểm tra các tệp đính kèm.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:items-stretch">
        <section className="workspace-surface workspace-surface-padding flex h-full flex-col"><h2 className="font-semibold text-ink">Bản nháp bàn giao</h2><p className="mt-1 text-sm text-ink-muted">Chọn rõ phiên bản của từng hạng mục. Bản nháp không tự chọn phiên bản mới nhất.</p>
          <form className="mt-4 flex flex-1 flex-col space-y-4" onSubmit={saveDraft}>
            <label className="block text-sm font-medium text-ink-soft">Đợt bàn giao<select className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-canvas disabled:text-ink-muted" value={periodId ?? ''} disabled={busy || !canPrepareDraft} onChange={event => setPeriodId(Number(event.target.value) || null)}><option value="">Chọn đợt</option>{periods.map(period => <option key={period.id} value={period.id} disabled={!period.canPrepareDraft && period.id !== draft?.projectPeriodId}>{period.name} · {displayLabel(period.status)}</option>)}</select></label>
            <label className="block text-sm font-medium text-ink-soft">Ghi chú<textarea className="mt-1 w-full rounded-lg border border-hairline bg-card p-3 font-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-canvas disabled:text-ink-muted" rows={3} maxLength={10000} value={notes} disabled={busy || !canPrepareDraft} onChange={event => setNotes(event.target.value)} /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-ink-soft">Hạng mục<select className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-canvas disabled:text-ink-muted" value={selectedDeliverableId ?? ''} disabled={busy || !canPrepareDraft} onChange={event => void chooseDeliverable(Number(event.target.value))}><option value="">Chọn hạng mục</option>{deliverables.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-sm font-medium text-ink-soft">Phiên bản<select className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-canvas disabled:text-ink-muted" value={selectedDeliverableId ? selectedVersionIds[selectedDeliverableId] ?? '' : ''} disabled={!selectedDeliverableId || loadingVersions || busy || !canPrepareDraft} onChange={event => { if (selectedDeliverableId) setSelectedVersionIds(current => ({ ...current, [selectedDeliverableId]: Number(event.target.value) })) }}><option value="">{loadingVersions ? 'Đang tải phiên bản hợp lệ…' : 'Chọn phiên bản hợp lệ'}</option>{versions.map(item => <option key={item.id} value={item.id}>v{item.versionNumber} · {item.status === 'ACCEPTED' ? 'Đã chấp nhận' : displayLabel(item.status)}</option>)}</select></label></div>
            {Object.keys(selectedVersionIds).length > 0 && (
              <ul className="space-y-2 text-sm">{Object.entries(selectedVersionIds).map(([deliverableId, versionId]) => <li key={deliverableId} className="workspace-record-row flex flex-wrap items-center justify-between gap-3"><span className="font-medium text-ink">{deliverables.find(item => item.id === Number(deliverableId))?.title ?? 'Hạng mục sản phẩm'} · <span className="text-primary">{formatVersionBadge(versionId)}</span></span><Button variant="ghost" size="sm" disabled={busy || !canPrepareDraft} onClick={() => setSelectedVersionIds(current => { const next = { ...current }; delete next[Number(deliverableId)]; return next })}>Bỏ</Button></li>)}</ul>
            )}
            {draft?.editBlockers.length ? <p className="text-sm text-status-warning-text">Không thể sửa: {draft.editBlockers.map(code => describeBlocker(code, deliverables)).join(', ')}</p> : null}
            <div className="mt-auto pt-2"><Button type="submit" variant="secondary" disabled={busy || !periodId || !canPrepareDraft}>{draft ? 'Lưu bản nháp' : 'Tạo bản nháp'}</Button></div>
          </form>
        </section>
        {checklist && <section className="workspace-surface workspace-surface-padding flex h-full flex-col"><h2 className="font-semibold text-ink">Kiểm tra trước khi bàn giao</h2><p className="mt-1 text-sm text-ink-muted">Hạn: {checklist.deadline ? formatDate(checklist.deadline) : 'Chưa có'}</p><ul className="mt-3 space-y-2 text-sm">{checklist.items.map(item => <li key={item.deliverableId} className="workspace-record-row flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className={`material-symbols-outlined text-[18px] ${item.isComplete ? 'text-status-success-text' : 'text-ink-muted'}`} aria-hidden="true">{item.isComplete ? 'check_circle' : 'radio_button_unchecked'}</span><span>{item.title}</span></span><span className="text-xs font-semibold text-ink-muted">{formatVersionBadge(item.selectedVersionId, item.selectedVersionNumber)}</span></li>)}</ul><div id="final-submission-blockers" className="mt-4"><ActionVerdict actions={[{ code: 'SUBMIT_FINAL_PACKAGE', allowed: canSubmit && Boolean(checklist.draftConcurrencyToken) && Boolean(checklist.requirementsConcurrencyToken), reasons: submissionReasons }]} actionCode="SUBMIT_FINAL_PACKAGE" status="ready" okLabel="Đủ điều kiện nộp bản cuối" blockedLabel="Chưa đủ điều kiện nộp bản cuối" /></div><label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={!canSubmit || busy} onChange={event => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line-strong text-primary focus:ring-primary" /><span>Tôi xác nhận khóa gói và nộp bản cuối theo danh mục kiểm tra hiện tại.</span></label><div className="mt-auto pt-4"><Button type="button" aria-describedby={!canSubmit && checklist.blockers.length > 0 ? "final-submission-blockers" : undefined} disabled={!canSubmit || !confirmed || busy || !checklist.draftConcurrencyToken || !checklist.requirementsConcurrencyToken} onClick={() => { if (canSubmit) void run(() => api.submitFinalSubmission(projectId, checklist.draftConcurrencyToken!, checklist.requirementsConcurrencyToken!), true) }}>{busy ? 'Đang nộp…' : 'Nộp và khóa gói'}</Button></div></section>}
      </div>
      <SubmissionPreflightPanel projectId={projectId} target="FINAL_SUBMISSION" />
    </>}
  </WorkspacePage>
}

export function LockedPackageView({ projectId, packageData }: { projectId: number; packageData: LockedFinalSubmission }) {
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<{ id: number; fileName: string; contentType?: string; sizeBytes?: number } | null>(null)
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
  return (
    <section className="rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-5 text-ink shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-status-success-text" aria-hidden="true">verified</span>
          <h2 className="font-semibold text-ink">Gói đã khóa và nộp</h2>
        </div>
        <span className="inline-flex items-center rounded-full border border-status-success-border bg-status-success-bg px-2.5 py-0.5 text-xs font-semibold text-status-success-text">
          Đã khóa
        </span>
      </div>
      <p className="mt-1.5 text-sm text-ink-soft">Nộp lúc {formatDate(packageData.submittedAt)} · hạn {formatDate(packageData.deadline)} · {packageData.items.length} phiên bản sản phẩm</p>
      <p className="mt-1 text-xs font-medium text-status-success-text">Bản bàn giao đã chốt · Không có thao tác sửa, xóa hoặc nộp lại.</p>
      {packageData.notes && <p className="mt-3 whitespace-pre-wrap rounded-lg border border-hairline bg-canvas p-3 text-sm text-ink-soft"><strong>Ghi chú:</strong> {packageData.notes}</p>}
      {error && <InlineAlert tone="error" className="mt-3">{error}</InlineAlert>}
      <ul className="mt-3 space-y-3 text-sm">
        {packageData.items.map(item => (
          <li key={item.deliverableVersionId} className="rounded-lg border border-hairline bg-canvas p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-ink">{item.title} · phiên bản v{item.versionNumber}</strong>
              <span className="rounded-full border border-hairline bg-card px-2.5 py-1 text-xs text-ink-soft">
                {item.wasRequired ? 'Bắt buộc' : 'Tùy chọn'} · {item.statusAtSubmission === 'ACCEPTED' ? 'Đã chấp nhận' : displayLabel(item.statusAtSubmission)}
              </span>
            </div>
            {item.files.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">Bản bàn giao này không có tệp để tải xuống.</p>
            ) : (
              <ul className="mt-2.5 space-y-1.5">
                {item.files.map(file => (
                  <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-card px-3 py-2">
                    <button
                      type="button"
                      className="inline-flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left font-semibold text-ink transition-colors hover:text-primary hover:underline"
                      onClick={() => setPreviewFile(file)}
                      title="Nhấn để xem trước tài liệu"
                    >
                      <span className="material-symbols-outlined shrink-0 text-[18px] text-primary" aria-hidden="true">description</span>
                      <span className="truncate">{file.fileName}</span>
                      {file.sizeBytes ? <span className="shrink-0 font-mono text-xs font-normal text-ink-muted">· {formatBytes(file.sizeBytes)}</span> : null}
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        disabled={downloadingId !== null}
                        className="inline-flex min-h-9 items-center gap-1 rounded-md border border-primary/25 bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
                        onClick={() => setPreviewFile(file)}
                      >
                        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">visibility</span>
                        <span>Xem trước</span>
                      </button>
                      <button
                        type="button"
                        disabled={downloadingId !== null}
                        className="inline-flex min-h-9 items-center gap-1 rounded-md border border-hairline bg-card px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-primary/35 hover:text-primary disabled:opacity-50"
                        onClick={() => void download(file.id, file.fileName)}
                      >
                        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>
                        <span>{downloadingId === file.id ? 'Đang tải…' : 'Tải xuống'}</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {previewFile && (
        <DocumentPreviewModal
          open
          fileId={previewFile.id}
          fileName={previewFile.fileName}
          fileSize={previewFile.sizeBytes}
          contentType={previewFile.contentType}
          loadBlob={() => api.downloadLockedFile(projectId, previewFile.id)}
          onDownload={() => void download(previewFile.id, previewFile.fileName)}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </section>
  )
}

/** Uses the locked-package endpoint only; Backend authorizes each reader's current scope. */
export function FinalSubmissionViewerPage({ backTo = '/projects/lifecycle', backLabel = 'Hồ sơ đồ án' }: { backTo?: string; backLabel?: string }) {
  const location = useLocation()
  const assignmentReturn = location.pathname.startsWith('/evaluator/') && typeof location.state?.assignmentReturn === 'string' && /^\/evaluator\/assignments\/[1-9]\d*$/.test(location.state.assignmentReturn) ? location.state.assignmentReturn : null
  const projectId = Number(useParams().projectId)
  const [projectMeta, setProjectMeta] = useState<{ code: string; title: string } | null>(null)
  const [packageData, setPackageData] = useState<LockedFinalSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId < 1) { setError('Mã đồ án không hợp lệ.'); setLoading(false); return }
    setLoading(true); setError(null); setPackageData(null)
    try {
      const [result, proj] = await Promise.all([
        api.getLockedFinalSubmission(projectId),
        services.project?.getProject ? services.project.getProject(projectId).catch(() => null) : Promise.resolve(null),
      ])
      setPackageData(result)
      if (proj) setProjectMeta({ code: proj.code, title: proj.title })
    } catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { void load() }, [load])
  return (
    <WorkspacePage
      className="space-y-5"
      title="Gói bàn giao cuối"
      eyebrow={projectMeta?.code ?? 'Bàn giao cuối kỳ'}
      backTo={assignmentReturn ?? backTo}
      backLabel={assignmentReturn ? 'Quay lại chấm điểm' : backLabel}
      description={projectMeta ? `${projectMeta.title} · Nội dung và tệp trong bản bàn giao đã chốt.` : 'Nội dung và tệp trong bản bàn giao đã chốt.'}
    >
      {loading && <ListLoading label="Đang tải gói bàn giao đã khóa…" />}
      {error && (
        <InlineAlert
          tone="error"
          action={<button type="button" className="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-bold text-primary hover:bg-card/80" onClick={() => void load()}>Tải lại</button>}
        >
          {error}
        </InlineAlert>
      )}
      {!loading && !error && !packageData && (
        <section className="rounded-2xl border border-hairline bg-card p-8 text-center shadow-xs">
          <span className="material-symbols-outlined text-4xl text-ink-muted" aria-hidden="true">inventory_2</span>
          <h2 className="mt-3 text-base font-semibold text-ink">Chưa có gói bàn giao cuối đã khóa</h2>
          <p className="mt-1 text-sm text-ink-muted">Đồ án chưa chốt gói bàn giao cuối kỳ.</p>
        </section>
      )}
      {!loading && packageData && <LockedPackageView projectId={projectId} packageData={packageData} />}
    </WorkspacePage>
  )
}

export function FinalRequirementsPage() {
  const projectId = Number(useParams().projectId)
  const [projectMeta, setProjectMeta] = useState<{ code: string; title: string } | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<FinalRequirements | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId < 1) { setError('Mã đồ án không hợp lệ.'); setLoading(false); return }
    setLoading(true)
    setRequirements(null); setDeliverables([])
    try {
      const [defs, items, proj] = await Promise.all([
        api.getFinalRequirements(projectId),
        allDeliverables(projectId),
        services.project?.getProject ? services.project.getProject(projectId).catch(() => null) : Promise.resolve(null),
      ])
      setRequirements(defs); setDeliverables(items); setSelectedIds(defs.items.map(item => item.deliverableId))
      if (proj) setProjectMeta({ code: proj.code, title: proj.title })
      setError(null)
    }
    catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { void load() }, [load])
  const save = async () => {
    if (!requirements || selectedIds.length === 0) { setError('Chọn ít nhất một hạng mục bắt buộc.'); return }
    setBusy(true); setSuccess(null); setError(null)
    try { await api.configureFinalRequirements(projectId, selectedIds, requirements.concurrencyToken); await load(); setSuccess('Đã lưu bộ yêu cầu bàn giao.') }
    catch (reason) { if (reason instanceof HttpError && reason.status === 409) await load(); setError(message(reason)) }
    finally { setBusy(false) }
  }
  return (
    <WorkspacePage
      className="space-y-5"
      title="Yêu cầu bàn giao"
      eyebrow={projectMeta?.code ?? 'Cấu hình bàn giao'}
      backTo="/department/portfolio"
      backLabel="Danh mục đồ án"
      description={projectMeta ? `${projectMeta.title} · Chọn các hạng mục nhóm cần nộp trước khi chốt bàn giao.` : 'Chọn các hạng mục nhóm cần nộp trước khi chốt bàn giao.'}
    >
      {error && (
        <InlineAlert
          tone="error"
          action={<button type="button" className="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-bold text-primary hover:bg-card/80" onClick={() => void load()}>Tải lại</button>}
        >
          {error}
        </InlineAlert>
      )}
      {success && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-4 text-sm text-ink shadow-xs">
          <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
          <span>{success}</span>
        </p>
      )}
      {loading && <ListLoading label="Đang tải yêu cầu…" />}
      {!loading && requirements && (
        <>
          <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
            <h2 className="font-semibold text-ink">Hạng mục bắt buộc</h2>
            {deliverables.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Đồ án chưa có hạng mục cần nộp.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {deliverables.map(item => (
                  <li key={item.id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-hairline p-3 text-sm transition-colors hover:bg-canvas">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        disabled={busy}
                        onChange={event => setSelectedIds(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}
                        className="h-4 w-4 rounded border-hairline text-primary focus:ring-primary"
                      />
                      <span className="font-medium text-ink-soft">{item.title}</span>
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
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline bg-card px-3.5 py-2 text-sm font-semibold text-ink-soft transition-all hover:bg-canvas"
            >
              <span>Xem gói đã khóa</span>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
            </Link>
          </div>
        </>
      )}
    </WorkspacePage>
  )
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Không xác định' : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }) }
function formatBytes(value: number) { return value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB` }

