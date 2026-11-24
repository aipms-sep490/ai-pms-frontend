import { displayLabel } from '../../components/ui/display-label'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { getDeliverables, getDeliverableVersions } from '../../services/api/deliverables.api'
import { HttpError } from '../../services/http/http-client'
import { Button } from '../../components/ui/Button'
import { ActionVerdict } from '../../components/ui/ActionVerdict'
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
    if (reason.status === 422 || reason.status === 400) return 'Thông tin bàn giao chưa hợp lệ hoặc chưa đáp ứng điều kiện hiện tại. Kiểm tra checklist, phiên bản đã chọn và thời hạn rồi thử lại.'
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
  return blockerLabels[code] ?? 'Điều kiện bàn giao chưa được đáp ứng. Tải lại checklist để kiểm tra.'
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
  const submissionReasons = checklist ? [
    ...checklist.blockers.map(describeBlocker),
    ...(projectStatus !== 'ACTIVE' && !checklist.blockers.includes('PROJECT_NOT_ACTIVE') ? ['Đồ án chưa ở trạng thái ACTIVE'] : []),
    ...(!checklist.canSubmit && checklist.blockers.length === 0 ? ['Checklist chưa xác nhận có thể nộp bản cuối.'] : []),
    ...(!checklist.draftConcurrencyToken || !checklist.requirementsConcurrencyToken ? ['Thiếu phiên bản xác nhận của bản nháp hoặc cấu hình. Tải lại checklist.'] : []),
  ] : []

  const selectedEntries = useMemo(() => Object.entries(selectedVersionIds), [selectedVersionIds])
  const selectedPagination = useClientPagination(selectedEntries, 8)
  const checklistItems = useMemo(() => checklist?.items ?? [], [checklist])
  const checklistPagination = useClientPagination(checklistItems, 8)

  const totalRequiredCount = locked
    ? locked.items.filter(item => item.wasRequired).length
    : checklistItems.length
  const readyCount = locked
    ? locked.items.length
    : checklistItems.filter(item => item.isComplete).length
  const totalFilesCount = locked
    ? locked.items.reduce((sum, item) => sum + item.files.length, 0)
    : selectedEntries.length
  const eligiblePeriodCount = periods.filter(item => item.canPrepareDraft).length

  return <WorkspacePage className="space-y-5 pb-10" title="Bàn giao cuối đồ án" eyebrow="Hoàn tất đồ án" description="Chuẩn bị các phiên bản sản phẩm và gửi gói bàn giao của nhóm.">
    {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" className="min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
    {loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Đang tải hồ sơ bàn giao…</p>}
    {!loading && loaded && (
      <StatTileRow tiles={locked ? [
        { icon: 'inventory_2', label: 'Hạng mục trong gói', value: locked.items.length, hero: true, caption: `Gói đã khóa #${locked.id}` },
        { icon: 'fact_check', label: 'Hạng mục bắt buộc', value: totalRequiredCount, tone: 'success' },
        { icon: 'attach_file', label: 'Tệp đính kèm', value: totalFilesCount, tone: 'info' },
        { icon: 'verified', label: 'Đã chấp nhận', value: locked.items.filter(item => item.statusAtSubmission === 'ACCEPTED').length, tone: 'success', caption: 'Không thể chỉnh sửa hay nộp lại' },
      ] : [
        { icon: 'fact_check', label: 'Tổng hạng mục bắt buộc', value: totalRequiredCount, hero: true, caption: canSubmit ? 'Đủ điều kiện nộp bản cuối' : 'Đang chuẩn bị gói bàn giao' },
        { icon: 'task_alt', label: 'Đã sẵn sàng', value: readyCount, tone: totalRequiredCount > 0 && readyCount === totalRequiredCount ? 'success' : 'warning' },
        { icon: 'attach_file', label: 'Phiên bản trong nháp', value: totalFilesCount, tone: 'info' },
        { icon: 'event_available', label: 'Đợt bàn giao khả dụng', value: eligiblePeriodCount, tone: eligiblePeriodCount > 0 ? 'success' : 'neutral', caption: draft ? 'Đã lưu bản nháp' : 'Chưa tạo bản nháp' },
      ]} />
    )}
    {!loading && loaded && locked && <LockedPackageView projectId={projectId} packageData={locked} />}
    {!loading && loaded && !locked && <>
      {(draft?.editBlockers.includes('LEADER_REQUIRED') || checklist?.blockers.includes('LEADER_REQUIRED')) && (
        <div className="rounded-xl border border-primary/20 bg-primary-subtle p-4 text-xs text-primary shadow-2xs">
          <strong>Thông báo quyền hạn:</strong> Bạn đang đăng nhập với vai trò Thành viên (Student Member). Quyền chuẩn bị bản nháp và nộp gói bàn giao cuối cùng thuộc về Trưởng nhóm (Student Leader). Thành viên có quyền rà soát danh mục và kiểm tra các tệp đính kèm.
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <section className={`overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs ${checklist ? 'xl:col-span-7' : 'xl:col-span-12'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <div>
              <h2 className="font-semibold text-ink">Bản nháp bàn giao</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Chọn rõ phiên bản của từng hạng mục. Bản nháp không tự chọn phiên bản mới nhất.</p>
            </div>
            <StatusBadge tone={draft ? 'info' : 'neutral'} label={draft ? `${selectedEntries.length} hạng mục đã chọn` : 'Chưa lưu nháp'} />
          </div>
          <form className="space-y-4 p-5" onSubmit={saveDraft}>
            <label className="block text-sm font-medium text-ink-soft">Đợt bàn giao<select className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-canvas disabled:text-ink-muted" value={periodId ?? ''} disabled={busy || !canPrepareDraft} onChange={event => setPeriodId(Number(event.target.value) || null)}><option value="">Chọn đợt</option>{periods.map(period => <option key={period.id} value={period.id} disabled={!period.canPrepareDraft && period.id !== draft?.projectPeriodId}>{period.name} · {displayLabel(period.status)}</option>)}</select></label>
            <label className="block text-sm font-medium text-ink-soft">Ghi chú<textarea className="mt-1 w-full rounded-lg border border-hairline bg-card p-3 font-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-canvas disabled:text-ink-muted" rows={3} maxLength={10000} value={notes} disabled={busy || !canPrepareDraft} onChange={event => setNotes(event.target.value)} /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-ink-soft">Hạng mục<select className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-canvas disabled:text-ink-muted" value={selectedDeliverableId ?? ''} disabled={busy || !canPrepareDraft} onChange={event => void chooseDeliverable(Number(event.target.value))}><option value="">Chọn hạng mục</option>{deliverables.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-sm font-medium text-ink-soft">Phiên bản<select className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-canvas disabled:text-ink-muted" value={selectedDeliverableId ? selectedVersionIds[selectedDeliverableId] ?? '' : ''} disabled={!selectedDeliverableId || busy || !canPrepareDraft} onChange={event => { if (selectedDeliverableId) setSelectedVersionIds(current => ({ ...current, [selectedDeliverableId]: Number(event.target.value) })) }}><option value="">Chọn phiên bản hợp lệ</option>{versions.map(item => <option key={item.id} value={item.id}>v{item.versionNumber} · {item.status === 'ACCEPTED' ? 'Đã chấp nhận' : displayLabel(item.status)}</option>)}</select></label></div>
            {selectedEntries.length > 0 && (
              <div className="space-y-3">
                <ul className="space-y-2 text-sm">{selectedPagination.paginatedItems.map(([deliverableId, versionId]) => <li key={deliverableId} className="workspace-record-row flex flex-wrap items-center justify-between gap-3"><span>{deliverables.find(item => item.id === Number(deliverableId))?.title ?? `Hạng mục #${deliverableId}`} · phiên bản #{versionId}</span><Button variant="danger" size="sm" disabled={busy || !canPrepareDraft} onClick={() => setSelectedVersionIds(current => { const next = { ...current }; delete next[Number(deliverableId)]; return next })}>Bỏ</Button></li>)}</ul>
                {selectedPagination.showPagination && (
                  <Pagination
                    page={selectedPagination.page}
                    pages={selectedPagination.totalPages}
                    total={selectedPagination.total}
                    pageSize={selectedPagination.pageSize}
                    pageSizeOptions={[8, 16, 30]}
                    onPage={selectedPagination.setPage}
                    onPageSizeChange={selectedPagination.setPageSize}
                  />
                )}
              </div>
            )}
            {draft?.editBlockers.length ? <p className="text-sm text-status-warning-text">Không thể sửa: {draft.editBlockers.map(describeBlocker).join(', ')}</p> : null}
            <div><Button type="submit" disabled={busy || !periodId || !canPrepareDraft}>{draft ? 'Lưu bản nháp' : 'Tạo bản nháp'}</Button></div>
          </form>
        </section>
        {checklist && (
          <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs xl:col-span-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <div>
                <h2 className="font-semibold text-ink">Kiểm tra trước khi bàn giao</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Hạn: {checklist.deadline ? new Date(checklist.deadline).toLocaleString('vi-VN') : 'Chưa có'}</p>
              </div>
              <StatusBadge tone={canSubmit ? 'success' : 'warning'} label={canSubmit ? 'Sẵn sàng nộp' : `${readyCount}/${checklistItems.length} đạt`} />
            </div>
            <div className="space-y-4 p-5">
              <ul className="space-y-2 text-sm">{checklistPagination.paginatedItems.map(item => <li key={item.deliverableId} className="workspace-record-row flex items-center justify-between gap-2"><span>{item.isComplete ? '✓' : '○'} {item.title} · {item.selectedVersionId ? `phiên bản #${item.selectedVersionId}` : 'chưa chọn'}</span><StatusBadge tone={item.isComplete ? 'success' : 'warning'} label={item.isComplete ? 'Đạt' : 'Thiếu'} /></li>)}</ul>
              {checklistPagination.showPagination && (
                <Pagination
                  page={checklistPagination.page}
                  pages={checklistPagination.totalPages}
                  total={checklistPagination.total}
                  pageSize={checklistPagination.pageSize}
                  onPage={checklistPagination.setPage}
                />
              )}
              <div id="final-submission-blockers"><ActionVerdict actions={[{ code: 'SUBMIT_FINAL_PACKAGE', allowed: canSubmit && Boolean(checklist.draftConcurrencyToken) && Boolean(checklist.requirementsConcurrencyToken), reasons: submissionReasons }]} actionCode="SUBMIT_FINAL_PACKAGE" status="ready" okLabel="Đủ điều kiện nộp bản cuối" blockedLabel="Chưa đủ điều kiện nộp bản cuối" /></div>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={!canSubmit || busy} onChange={event => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-hairline text-primary focus:ring-primary" /><span>Tôi xác nhận khóa gói và nộp bản cuối theo checklist hiện tại.</span></label>
              <div><Button type="button" aria-describedby={!canSubmit && checklist.blockers.length > 0 ? "final-submission-blockers" : undefined} disabled={!canSubmit || !confirmed || busy || !checklist.draftConcurrencyToken || !checklist.requirementsConcurrencyToken} onClick={() => { if (canSubmit) void run(() => api.submitFinalSubmission(projectId, checklist.draftConcurrencyToken!, checklist.requirementsConcurrencyToken!), true) }}>{busy ? 'Đang nộp…' : 'Nộp và khóa gói'}</Button></div>
            </div>
          </section>
        )}
      </div>
    </>}
    <div>
      <Link to="/projects/lifecycle" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline bg-card px-3.5 py-2 text-sm font-semibold text-ink-soft transition-all hover:bg-canvas">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        <span>Về hồ sơ đồ án</span>
      </Link>
    </div>
  </WorkspacePage>
}

function LockedPackageItemCard({
  item,
  downloadingId,
  onDownload,
}: {
  item: LockedFinalSubmission['items'][number]
  downloadingId: number | null
  onDownload: (fileId: number, fileName: string) => Promise<void>
}) {
  const filePagination = useClientPagination(item.files, 8)
  return (
    <li className="overflow-hidden rounded-xl border border-hairline bg-card shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-4 py-3">
        <strong className="text-sm text-ink">{item.title} · phiên bản {item.versionNumber}</strong>
        <span className="rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
          {item.wasRequired ? 'Bắt buộc' : 'Tùy chọn'} · {item.statusAtSubmission === 'ACCEPTED' ? 'Đã chấp nhận' : displayLabel(item.statusAtSubmission)}
        </span>
      </div>
      <div className="p-4">
        {item.files.length === 0 ? (
          <p className="text-xs text-ink-muted">Bản bàn giao này không có tệp để tải xuống.</p>
        ) : (
          <div className="space-y-2">
            <ul className="divide-y divide-hairline">
              {filePagination.paginatedItems.map(file => (
                <li key={file.id} className="py-1 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    disabled={downloadingId !== null}
                    className="inline-flex min-h-11 items-center gap-2 text-left text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                    onClick={() => void onDownload(file.id, file.fileName)}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>
                    <span>{downloadingId === file.id ? 'Đang tải…' : `${file.fileName}${file.sizeBytes ? ` · ${formatBytes(file.sizeBytes)}` : ''}`}</span>
                  </button>
                </li>
              ))}
            </ul>
            {filePagination.showPagination && (
              <Pagination
                page={filePagination.page}
                pages={filePagination.totalPages}
                total={filePagination.total}
                pageSize={filePagination.pageSize}
                onPage={filePagination.setPage}
              />
            )}
          </div>
        )}
      </div>
    </li>
  )
}

export function LockedPackageView({ projectId, packageData }: { projectId: number; packageData: LockedFinalSubmission }) {
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const itemPagination = useClientPagination(packageData.items, 8)
  const totalFiles = packageData.items.reduce((sum, item) => sum + item.files.length, 0)

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
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
      <section className="overflow-hidden rounded-2xl border border-status-success-border bg-card shadow-xs xl:col-span-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-status-success-border bg-status-success-bg px-5 py-3.5">
          <h2 className="font-semibold text-status-success-text">Gói đã khóa và nộp</h2>
          <StatusBadge tone="success" label={`#${packageData.id}`} />
        </div>
        <div className="space-y-3 p-5 text-sm">
          <p className="text-ink">Nộp lúc <strong>{formatDate(packageData.submittedAt)}</strong> · hạn {formatDate(packageData.deadline)} · <span className="tabular-nums font-semibold">{packageData.items.length}</span> phiên bản sản phẩm</p>
          <p className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-xs text-status-success-text">Bản bàn giao đã chốt #{packageData.id}; không có thao tác sửa, xóa hoặc nộp lại.</p>
          {packageData.notes && <p className="whitespace-pre-wrap rounded-lg border border-hairline bg-canvas p-3 text-sm text-ink-soft"><strong>Ghi chú:</strong> {packageData.notes}</p>}
          {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs xl:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
          <h3 className="font-semibold text-ink">Hạng mục & tệp đính kèm trong gói</h3>
          <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">
            {packageData.items.length} hạng mục · {totalFiles} tệp
          </span>
        </div>
        <div className="space-y-4 p-5">
          <ul className="space-y-3 text-sm">
            {itemPagination.paginatedItems.map(item => (
              <LockedPackageItemCard
                key={item.deliverableVersionId}
                item={item}
                downloadingId={downloadingId}
                onDownload={download}
              />
            ))}
          </ul>
          {itemPagination.showPagination && (
            <Pagination
              page={itemPagination.page}
              pages={itemPagination.totalPages}
              total={itemPagination.total}
              pageSize={itemPagination.pageSize}
              pageSizeOptions={[8, 16, 30]}
              onPage={itemPagination.setPage}
              onPageSizeChange={itemPagination.setPageSize}
            />
          )}
        </div>
      </section>
    </div>
  )
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
    if (!Number.isInteger(projectId) || projectId < 1) { setError('Mã đồ án không hợp lệ.'); setLoading(false); return }
    setLoading(true); setError(null); setPackageData(null)
    try {
      const result = await api.getLockedFinalSubmission(projectId)
      setPackageData(result)
    } catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { void load() }, [load])

  const totalFiles = packageData ? packageData.items.reduce((sum, item) => sum + item.files.length, 0) : 0
  const requiredCount = packageData ? packageData.items.filter(item => item.wasRequired).length : 0
  const acceptedCount = packageData ? packageData.items.filter(item => item.statusAtSubmission === 'ACCEPTED').length : 0

  return (
    <div className="workspace-page space-y-5 pb-10">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <div className="workspace-context">
            <span className="workspace-kicker">Hồ sơ bàn giao</span>
            <span className="workspace-context-detail">Đồ án #{Number.isInteger(projectId) ? projectId : '—'}</span>
          </div>
          <h1>Gói bàn giao cuối</h1>
          <p>Đồ án #{Number.isInteger(projectId) ? projectId : '—'} · Nội dung và tệp trong bản bàn giao đã chốt.</p>
        </div>
        <div className="workspace-heading-actions">
          <Link to={assignmentReturn ?? backTo} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline bg-card px-3.5 py-2 text-sm font-semibold text-ink-soft transition-all hover:bg-canvas">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
            <span>{assignmentReturn ? 'Quay lại chấm điểm' : backLabel}</span>
          </Link>
        </div>
      </header>
      {loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Đang tải gói bàn giao đã khóa…</p>}
      {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" className="min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
      {!loading && !error && !packageData && (
        <section className="rounded-2xl border border-hairline bg-card p-8 text-center shadow-xs">
          <span className="material-symbols-outlined text-4xl text-ink-muted" aria-hidden="true">inventory_2</span>
          <h3 className="mt-3 font-semibold text-ink">Chưa có gói bàn giao cuối đã khóa</h3>
          <p className="mt-1 text-sm text-ink-muted">Đồ án chưa chốt gói bàn giao cuối kỳ.</p>
        </section>
      )}
      {!loading && packageData && (
        <>
          <StatTileRow tiles={[
            { icon: 'fact_check', label: 'Hạng mục bắt buộc', value: requiredCount, hero: true, caption: `Tổng ${packageData.items.length} hạng mục đã nộp` },
            { icon: 'verified', label: 'Đã chấp nhận', value: acceptedCount, tone: 'success' },
            { icon: 'attach_file', label: 'Tệp đính kèm', value: totalFiles, tone: 'info' },
            { icon: 'playlist_add_check', label: 'Hạng mục tùy chọn', value: Math.max(0, packageData.items.length - requiredCount), tone: 'neutral', caption: `Gói đã khóa #${packageData.id} · bất biến` },
          ]} />
          <LockedPackageView projectId={projectId} packageData={packageData} />
        </>
      )}
    </div>
  )
}

export function FinalRequirementsPage() {
  const projectId = Number(useParams().projectId)
  const [success, setSuccess] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<FinalRequirements | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!Number.isInteger(projectId) || projectId < 1) { setError('Mã đồ án không hợp lệ.'); setLoading(false); return }
    setLoading(true)
    setRequirements(null); setDeliverables([])
    try { const [defs, items] = await Promise.all([api.getFinalRequirements(projectId), allDeliverables(projectId)]); setRequirements(defs); setDeliverables(items); setSelectedIds(defs.items.map(item => item.deliverableId)); setError(null) }
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
  const filteredDeliverables = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return keyword ? deliverables.filter(item => item.title.toLowerCase().includes(keyword)) : deliverables
  }, [deliverables, query])
  const reqPagination = useClientPagination(filteredDeliverables, 8)

  return (
    <div className="workspace-page space-y-5 pb-10">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <div className="workspace-context">
            <span className="workspace-kicker">Cấu hình bàn giao</span>
            <span className="workspace-context-detail">Đồ án #{Number.isInteger(projectId) ? projectId : '—'}</span>
          </div>
          <h1>Yêu cầu bàn giao</h1>
          <p>Đồ án #{projectId} · Chọn các hạng mục nhóm cần nộp trước khi chốt bàn giao.</p>
        </div>
        <div className="workspace-heading-actions">
          <Link
            to={`/department/projects/${projectId}/final-submission`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline bg-card px-3.5 py-2 text-sm font-semibold text-ink-soft transition-all hover:bg-canvas"
          >
            <span>Xem gói đã khóa</span>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
          </Link>
        </div>
      </header>
      {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" className="min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
      {success && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text">{success}</p>}
      {loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Đang tải yêu cầu…</p>}
      {!loading && requirements && (
        <>
          <StatTileRow tiles={[
            { icon: 'fact_check', label: 'Hạng mục bắt buộc', value: selectedIds.length, hero: true, caption: selectedIds.length > 0 ? 'Sẵn sàng lưu cấu hình' : 'Cần chọn ít nhất 1 hạng mục' },
            { icon: 'inventory_2', label: 'Tổng hạng mục đồ án', value: deliverables.length, tone: 'info' },
            { icon: 'playlist_add_check', label: 'Hạng mục tùy chọn', value: Math.max(0, deliverables.length - selectedIds.length), tone: 'neutral' },
            { icon: 'verified', label: 'Đã lưu trên máy chủ', value: requirements.items.length, tone: 'success' },
          ]} />
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
            <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs xl:col-span-4">
              <div className="border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <h2 className="font-semibold text-ink">Trạng thái cấu hình</h2>
              </div>
              <div className="space-y-4 p-5 text-sm">
                <p className="text-ink-soft">Sinh viên phải nộp phiên bản hợp lệ cho toàn bộ <strong className="tabular-nums text-ink">{selectedIds.length}</strong> hạng mục bắt buộc trước khi khóa gói bàn giao cuối kỳ.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={selectedIds.length > 0 ? 'success' : 'warning'} label={selectedIds.length > 0 ? 'Đủ điều kiện lưu' : 'Chưa chọn hạng mục'} />
                </div>
                <Button
                  type="button"
                  disabled={busy || !requirements || selectedIds.length === 0}
                  onClick={() => void save()}
                >
                  {busy ? 'Đang lưu…' : 'Lưu yêu cầu'}
                </Button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs xl:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-ink">Hạng mục bắt buộc</h2>
                  <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">{selectedIds.length}/{deliverables.length}</span>
                </div>
                {deliverables.length > 5 && (
                  <input
                    type="search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Lọc theo tên hạng mục…"
                    aria-label="Lọc hạng mục"
                    className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none"
                  />
                )}
              </div>
              <div className="space-y-4 p-5">
                {deliverables.length === 0 ? (
                  <p className="text-sm text-ink-muted">Đồ án chưa có hạng mục cần nộp.</p>
                ) : filteredDeliverables.length === 0 ? (
                  <p className="text-sm text-ink-muted">Không có hạng mục nào khớp từ khóa lọc.</p>
                ) : (
                  <ul className="space-y-2">
                    {reqPagination.paginatedItems.map(item => (
                      <li key={item.id}>
                        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-hairline p-3 text-sm transition-colors hover:bg-canvas">
                          <span className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              disabled={busy}
                              onChange={event => setSelectedIds(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}
                              className="h-4 w-4 rounded border-hairline text-primary focus:ring-primary"
                            />
                            <span className="font-medium text-ink">{item.title}</span>
                          </span>
                          <StatusBadge tone={selectedIds.includes(item.id) ? 'success' : 'neutral'} label={selectedIds.includes(item.id) ? 'Bắt buộc' : 'Tùy chọn'} />
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                {reqPagination.showPagination && (
                  <Pagination
                    page={reqPagination.page}
                    pages={reqPagination.totalPages}
                    total={reqPagination.total}
                    pageSize={reqPagination.pageSize}
                    pageSizeOptions={[8, 16, 30]}
                    onPage={reqPagination.setPage}
                    onPageSizeChange={reqPagination.setPageSize}
                  />
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Không xác định' : date.toLocaleString('vi-VN') }
function formatBytes(value: number) { return value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB` }

