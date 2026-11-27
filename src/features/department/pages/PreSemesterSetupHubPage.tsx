import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AcademicWorkflowContext } from '../../../app/context/academic-workflow-context'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getSemesters } from '../../academic/api/governance-api'
import { AcademicBlueprintPanel } from '../../academic/components/AcademicBlueprintPanel'
import { readAllPages } from '../../../services/api/paged-read'
import { HttpError } from '../../../services/http/http-client'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import type { SemesterDto } from '../../../types/backend'
import {
  applyPreSemesterRollover,
  checkPreSemesterAiDiff,
  getPreSemesterReadiness,
  previewPreSemesterRollover,
  type PreSemesterAiDiffResponse,
  type PreSemesterReadiness,
  type RolloverApplyResult,
  type RolloverPreview,
} from '../api/pre-semester-api'

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = Math.floor(Math.random() * 16)
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

const statusMeta: Record<string, { label: string; tone: BadgeTone }> = {
  READY: { label: 'Đã công bố', tone: 'success' },
  DRAFT: { label: 'Đang nháp', tone: 'warning' },
  MISSING: { label: 'Chưa có', tone: 'neutral' },
}

const categoryLabels: Record<string, string> = {
  RUBRIC: 'Rubric đánh giá',
  REVIEW_GATE: 'Khung cổng thẩm định',
  COLD_TEMPLATE: 'Mẫu chấm nguội',
  POLICY: 'Chính sách kỳ',
}

const severityMeta: Record<string, { label: string; tone: BadgeTone }> = {
  HIGH: { label: 'Cần xử lý ngay', tone: 'danger' },
  MEDIUM: { label: 'Nên rà soát', tone: 'warning' },
  INFO: { label: 'Thông tin', tone: 'info' },
}

export function PreSemesterSetupHubPage() {
  const { session } = useAuthSession()
  const workflow = useContext(AcademicWorkflowContext)
  const [semesters, setSemesters] = useState<SemesterDto[]>([])
  const [targetSemesterId, setTargetSemesterId] = useState<number>(workflow?.academic?.selectedSemester?.id ?? 0)
  const [readiness, setReadiness] = useState<PreSemesterReadiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Rollover Wizard state (3 steps)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
  const [sourceSemesterId, setSourceSemesterId] = useState<number>(0)
  const [includeRubrics, setIncludeRubrics] = useState(true)
  const [includeReviewGates, setIncludeReviewGates] = useState(true)
  const [includeColdTemplates, setIncludeColdTemplates] = useState(true)
  const [includePolicies, setIncludePolicies] = useState(true)
  const [shiftDates, setShiftDates] = useState(true)
  const [loadVietnamHolidays, setLoadVietnamHolidays] = useState(true)
  const [wizardBusy, setWizardBusy] = useState(false)
  const [wizardError, setWizardError] = useState<string | null>(null)
  const [preview, setPreview] = useState<RolloverPreview | null>(null)
  const [applyResult, setApplyResult] = useState<RolloverApplyResult | null>(null)
  const rolloverKeyRef = useRef<string>(createIdempotencyKey())

  // AI Diff Check Modal state
  const [diffOpen, setDiffOpen] = useState(false)
  const [diffFile, setDiffFile] = useState<File | null>(null)
  const [diffBusy, setDiffBusy] = useState(false)
  const [diffError, setDiffError] = useState<string | null>(null)
  const [diffResult, setDiffResult] = useState<PreSemesterAiDiffResponse | null>(null)

  const loadReadiness = useCallback(async (semId?: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPreSemesterReadiness(semId && semId > 0 ? semId : undefined)
      setReadiness(data)
      if (!semId || semId <= 0) setTargetSemesterId(data.semesterId)
    } catch (reason) {
      setError(
        reason instanceof HttpError
          ? humanizeHttpError(reason, 'Chưa tải được trạng thái chuẩn bị đầu kỳ.')
          : 'Chưa tải được trạng thái chuẩn bị đầu kỳ.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!session?.accessToken) return
    let active = true
    void readAllPages(page => getSemesters(session.accessToken, { search: '' }, undefined, page))
      .then(list => {
        if (!active) return
        setSemesters(list)
      })
      .catch(() => { /* keep workflow context semesters if list fails */ })
    return () => { active = false }
  }, [session?.accessToken])

  useEffect(() => {
    void loadReadiness(targetSemesterId > 0 ? targetSemesterId : undefined)
  }, [loadReadiness, targetSemesterId])

  const sourceSemesterOptions = useMemo(
    () => semesters.filter(s => s.id !== (readiness?.semesterId ?? targetSemesterId)),
    [semesters, readiness?.semesterId, targetSemesterId],
  )

  function openRolloverWizard(presetCategory?: string) {
    rolloverKeyRef.current = createIdempotencyKey()
    setWizardStep(1)
    setPreview(null)
    setApplyResult(null)
    setWizardError(null)
    if (!sourceSemesterId && sourceSemesterOptions.length > 0) {
      setSourceSemesterId(sourceSemesterOptions[0].id)
    }
    if (presetCategory) {
      setIncludeRubrics(presetCategory === 'RUBRICS')
      setIncludeReviewGates(presetCategory === 'REVIEW_GATES')
      setIncludeColdTemplates(presetCategory === 'COLD_TEMPLATES')
      setIncludePolicies(presetCategory === 'POLICY')
    } else {
      setIncludeRubrics(true)
      setIncludeReviewGates(readiness?.isDepartmentStaff ?? true)
      setIncludeColdTemplates(readiness?.isDepartmentStaff ?? true)
      setIncludePolicies(true)
    }
    setWizardOpen(true)
  }

  async function runPreview() {
    const targetId = readiness?.semesterId ?? targetSemesterId
    if (!sourceSemesterId || !targetId) {
      setWizardError('Chọn học kỳ nguồn để kế thừa cấu hình.')
      return
    }
    setWizardBusy(true)
    setWizardError(null)
    try {
      const result = await previewPreSemesterRollover({
        sourceSemesterId,
        targetSemesterId: targetId,
        departmentId: readiness?.departmentId ?? null,
        includeRubrics,
        includeReviewGates,
        includeColdTemplates,
        includePolicies,
        shiftDates,
        loadVietnamHolidays,
      })
      setPreview(result)
      setWizardStep(2)
    } catch (reason) {
      setWizardError(
        reason instanceof HttpError
          ? humanizeHttpError(reason, 'Chưa thể xem trước kế hoạch kế thừa.')
          : 'Chưa thể xem trước kế hoạch kế thừa.',
      )
    } finally {
      setWizardBusy(false)
    }
  }

  async function runApply() {
    const targetId = readiness?.semesterId ?? targetSemesterId
    if (!sourceSemesterId || !targetId) return
    setWizardBusy(true)
    setWizardError(null)
    try {
      const result = await applyPreSemesterRollover({
        idempotencyKey: rolloverKeyRef.current,
        sourceSemesterId,
        targetSemesterId: targetId,
        departmentId: readiness?.departmentId ?? null,
        includeRubrics,
        includeReviewGates,
        includeColdTemplates,
        includePolicies,
        shiftDates,
        loadVietnamHolidays,
      })
      setApplyResult(result)
      setWizardStep(3)
      setNotice(`Đã kế thừa ${result.createdCount} bản nháp (DRAFT) sang học kỳ ${readiness?.semesterCode ?? ''}. Hãy kiểm tra và công bố thủ công từng hạng mục.`)
      await loadReadiness(targetId)
    } catch (reason) {
      setWizardError(
        reason instanceof HttpError
          ? humanizeHttpError(reason, 'Chưa thể thực hiện kế thừa từ học kỳ trước.')
          : 'Chưa thể thực hiện kế thừa từ học kỳ trước.',
      )
    } finally {
      setWizardBusy(false)
    }
  }

  async function runAiDiff() {
    const targetId = readiness?.semesterId ?? targetSemesterId
    if (!targetId || !diffFile) {
      setDiffError('Chọn tệp Kế hoạch học kỳ mới (PDF, DOCX, XLSX, TXT hoặc MD) để AI đối chiếu.')
      return
    }
    setDiffBusy(true)
    setDiffError(null)
    try {
      const result = await checkPreSemesterAiDiff(targetId, diffFile, readiness?.departmentId ?? null)
      setDiffResult(result)
    } catch (reason) {
      setDiffError(
        reason instanceof HttpError
          ? humanizeHttpError(reason, 'Chưa thể đối chiếu kế hoạch học kỳ mới bằng AI.')
          : 'Chưa thể đối chiếu kế hoạch học kỳ mới bằng AI.',
      )
    } finally {
      setDiffBusy(false)
    }
  }

  const percentReady = readiness && readiness.totalRelevantCount > 0
    ? Math.round((readiness.readyCount / readiness.totalRelevantCount) * 100)
    : 0

  return (
    <WorkspacePage
      size="wide"
      className="space-y-6 pb-12"
      eyebrow="Điều hành học vụ · Hybrid Setup & AI"
      title="Trung tâm Chuẩn bị Đầu kỳ"
      description="Theo dõi tiến độ sẵn sàng trước học kỳ mới, kế thừa nhanh cấu hình từ kỳ trước ở dạng bản nháp (DRAFT) và dùng AI rà soát điểm lệch theo thông báo học vụ mới."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon="difference" disabled={!readiness} onClick={() => { setDiffError(null); setDiffOpen(true) }}>
            AI rà soát theo Kế hoạch kỳ mới
          </Button>
          <Button icon="content_copy" disabled={!readiness || sourceSemesterOptions.length === 0} onClick={() => openRolloverWizard()}>
            Kế thừa nhanh từ kỳ trước
          </Button>
        </div>
      }
    >
      {/* Target semester picker & readiness progress */}
      <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4" aria-label="Chọn học kỳ đích và tiến độ sẵn sàng">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Học kỳ đích đang chuẩn bị</p>
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Chọn học kỳ đích"
                className="min-h-11 min-w-64 rounded-lg border border-hairline bg-canvas px-3 text-sm font-semibold text-ink"
                value={targetSemesterId || ''}
                onChange={e => setTargetSemesterId(Number(e.target.value))}
              >
                {semesters.length === 0 && readiness && (
                  <option value={readiness.semesterId}>{readiness.semesterName} ({readiness.semesterCode})</option>
                )}
                {semesters.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) · {s.status}
                  </option>
                ))}
              </select>
              {readiness?.departmentName && (
                <span className="rounded-full border border-hairline bg-canvas px-3 py-1 text-xs font-semibold text-ink-soft">
                  Phạm vi: {readiness.departmentName}
                </span>
              )}
              {readiness && (
                <StatusBadge
                  tone={percentReady === 100 ? 'success' : percentReady >= 50 ? 'warning' : 'neutral'}
                  label={`${readiness.readyCount}/${readiness.totalRelevantCount} hạng mục đã công bố (${percentReady}%)`}
                />
              )}
            </div>
          </div>
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={loading} onClick={() => void loadReadiness(targetSemesterId)} />
        </div>

        <div className="space-y-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas border border-hairline">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percentReady}%` }}
            />
          </div>
          <p className="text-xs text-ink-muted">
            Mọi thao tác kế thừa kỳ trước hoặc soạn bằng AI đều chỉ tạo <strong>Bản nháp (DRAFT)</strong>. Quyền công bố, phê duyệt 4 mắt và mở kỳ vẫn thuộc hoàn toàn về cán bộ có thẩm quyền.
          </p>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-4 text-sm text-ink">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
            <span>{notice}</span>
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Đóng thông báo"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
          </button>
        </div>
      )}

      {/* Checklist grid */}
      {loading && !readiness ? (
        <p role="status" className="rounded-xl border border-hairline bg-card p-6 text-sm text-ink-muted">
          Đang tổng hợp mức độ sẵn sàng của học kỳ…
        </p>
      ) : readiness && (
        <section aria-label="Checklist hạng mục chuẩn bị đầu kỳ" className="grid items-stretch gap-4 md:grid-cols-2">
          {readiness.items.map(item => {
            const meta = statusMeta[item.status] ?? statusMeta.MISSING
            return (
              <article
                key={item.key}
                className={`flex h-full flex-col justify-between gap-4 rounded-xl border bg-card p-5 shadow-2xs transition-colors ${
                  item.allowedByRole ? 'border-hairline hover:border-primary/40' : 'border-hairline/60 opacity-75'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-ink">{item.label}</h2>
                    <StatusBadge tone={meta.tone} label={meta.label} />
                  </div>
                  <p className="text-xs text-ink-soft">{item.description}</p>
                  <div className="flex flex-wrap gap-3 pt-1 text-xs text-ink-muted">
                    <span>Tổng: <strong className="text-ink">{item.totalCount}</strong></span>
                    <span>Công bố: <strong className="text-status-success-text">{item.publishedCount}</strong></span>
                    <span>Bản nháp: <strong className="text-status-warning-text">{item.draftCount}</strong></span>
                  </div>
                  {!item.allowedByRole && (
                    <p className="rounded-lg border border-hairline bg-canvas px-2.5 py-1.5 text-xs text-ink-muted">
                      Hạng mục này thuộc thẩm quyền vai trò khác ({item.key === 'PERIODS' ? 'Quản trị viên' : 'Cán bộ bộ môn'}).
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
                  {(item.allowedByRole || item.route.startsWith('/academic/')) && (
                    <Link
                      to={item.route}
                      className="inline-flex min-h-9 items-center rounded-lg border border-hairline bg-canvas px-3 text-xs font-semibold text-ink transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary"
                    >
                      Mở trang quản lý
                    </Link>
                  )}
                  {item.supportsRollover && item.allowedByRole && sourceSemesterOptions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openRolloverWizard(item.key)}
                      className="inline-flex min-h-9 items-center rounded-lg border border-primary/30 bg-primary-subtle px-3 text-xs font-semibold text-primary hover:border-primary"
                    >
                      Kế thừa kỳ trước
                    </button>
                  )}
                  {item.supportsAiDraft && item.allowedByRole && (
                    <Link
                      to={item.route}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:bg-primary-hover"
                    >
                      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">auto_awesome</span>
                      Soạn nháp bằng AI
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      )}

      {/* AcademicBlueprint (QD-01) */}
      {(readiness?.semesterId ?? targetSemesterId) > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">Khung kế hoạch học vụ (AcademicBlueprint)</h2>
            <Link
              to="/department/blueprints"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Mở trang quản lý Blueprint &amp; Lịch nghỉ lễ →
            </Link>
          </div>
          <AcademicBlueprintPanel
            semesterId={readiness?.semesterId ?? targetSemesterId}
            actorDepartmentId={readiness?.departmentId ?? workflow?.academic?.departments?.[0]?.id ?? undefined}
          />
        </div>
      )}

      {/* 3-Step Rollover Wizard Modal */}
      {wizardOpen && readiness && (
        <Modal
          open
          className="max-w-4xl"
          title={`Kế thừa cấu hình sang ${readiness.semesterName} (${readiness.semesterCode})`}
          description="Nhân bản tất định từ học kỳ trước sang học kỳ mới ở dạng BẢN NHÁP (DRAFT) kèm tịnh tiến ngày tự động."
          busy={wizardBusy}
          onClose={() => setWizardOpen(false)}
        >
          <div className="space-y-4">
            {/* Step indicator */}
            <ol className="grid grid-cols-3 gap-2 text-xs font-semibold">
              {[
                { step: 1, label: '1. Chọn kỳ nguồn & hạng mục' },
                { step: 2, label: '2. Xem trước thay đổi & ngày' },
                { step: 3, label: '3. Kết quả tạo bản nháp' },
              ].map(s => (
                <li
                  key={s.step}
                  className={`rounded-lg border px-3 py-2 text-center ${
                    wizardStep === s.step
                      ? 'border-primary bg-primary-subtle text-primary'
                      : wizardStep > s.step
                        ? 'border-hairline border-l-4 border-l-status-success-text bg-card text-ink'
                        : 'border-hairline bg-canvas text-ink-muted'
                  }`}
                >
                  {s.label}
                </li>
              ))}
            </ol>

            {wizardError && (
              <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text">
                {wizardError}
              </p>
            )}

            {wizardStep === 1 && (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-ink-soft">
                  Chọn học kỳ nguồn (để sao chép các cấu hình đã công bố)
                  <select
                    aria-label="Học kỳ nguồn kế thừa"
                    className="mt-1.5 block min-h-11 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm font-normal text-ink"
                    value={sourceSemesterId || ''}
                    onChange={e => setSourceSemesterId(Number(e.target.value))}
                  >
                    <option value="">-- Chọn học kỳ nguồn --</option>
                    {sourceSemesterOptions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) · {s.status}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid items-stretch gap-2.5 sm:grid-cols-2">
                  <label className="flex h-full items-start gap-2.5 rounded-lg border border-hairline bg-canvas p-3 text-xs text-ink">
                    <input type="checkbox" checked={includeRubrics} onChange={e => setIncludeRubrics(e.target.checked)} />
                    <span><strong>Rubrics đánh giá</strong><br /><span className="text-ink-muted">Sao chép toàn bộ cây tiêu chí & 4 mức chất lượng thành DRAFT.</span></span>
                  </label>
                  <label className={`flex h-full items-start gap-2.5 rounded-lg border border-hairline bg-canvas p-3 text-xs text-ink ${!readiness.isDepartmentStaff ? 'opacity-50' : ''}`}>
                    <input type="checkbox" disabled={!readiness.isDepartmentStaff} checked={includeReviewGates} onChange={e => setIncludeReviewGates(e.target.checked)} />
                    <span><strong>Khung cổng thẩm định (Review Gates)</strong><br /><span className="text-ink-muted">Sao chép G1..Gn thành DRAFT và tự dịch chuyển ngày theo kỳ mới.</span></span>
                  </label>
                  <label className={`flex h-full items-start gap-2.5 rounded-lg border border-hairline bg-canvas p-3 text-xs text-ink ${!readiness.isDepartmentStaff ? 'opacity-50' : ''}`}>
                    <input type="checkbox" disabled={!readiness.isDepartmentStaff} checked={includeColdTemplates} onChange={e => setIncludeColdTemplates(e.target.checked)} />
                    <span><strong>Mẫu hồ sơ chấm nguội</strong><br /><span className="text-ink-muted">Sao chép bộ báo cáo chấm nguội sang kỳ Đánh giá/Bàn giao mới.</span></span>
                  </label>
                  <label className="flex h-full items-start gap-2.5 rounded-lg border border-hairline bg-canvas p-3 text-xs text-ink">
                    <input type="checkbox" checked={includePolicies} onChange={e => setIncludePolicies(e.target.checked)} />
                    <span><strong>Chính sách kỳ đồ án</strong><br /><span className="text-ink-muted">Tạo phiên bản kế tiếp (DRAFT) giữ nguyên giới hạn nhóm & GVHD.</span></span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-5 rounded-lg border border-hairline bg-card p-3 text-xs text-ink-soft">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={shiftDates} onChange={e => setShiftDates(e.target.checked)} />
                    Tự động tịnh tiến mốc ngày Review Gates theo độ lệch ngày bắt đầu kỳ mới
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={loadVietnamHolidays} onChange={e => setLoadVietnamHolidays(e.target.checked)} />
                    Tự động nạp lịch nghỉ lễ Việt Nam cho năm học kỳ đích
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" onClick={() => setWizardOpen(false)}>Đóng</Button>
                  <Button disabled={wizardBusy || !sourceSemesterId} onClick={() => void runPreview()}>
                    {wizardBusy ? 'Đang phân tích…' : 'Xem trước thay đổi'}
                  </Button>
                </div>
              </div>
            )}

            {wizardStep === 2 && preview && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-canvas p-3 text-xs">
                  <span>
                    Kế thừa từ <strong>{preview.sourceSemesterCode}</strong> → <strong>{preview.targetSemesterCode}</strong>
                    {preview.shiftDays !== 0 ? ` · Dịch chuyển ngày: ${preview.shiftDays > 0 ? `+${preview.shiftDays}` : preview.shiftDays} ngày` : ''}
                  </span>
                  <span className="font-semibold text-primary">
                    {preview.actionableCount} / {preview.totalCandidates} hạng mục sẵn sàng sao chép
                  </span>
                </div>

                {preview.warnings.length > 0 && (
                  <ul className="space-y-1 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-xs text-status-warning-text">
                    {preview.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                )}

                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {preview.items.map((item, idx) => (
                    <div
                      key={`${item.category}-${item.sourceId}-${idx}`}
                      className={`rounded-lg border p-3 text-xs ${
                        item.willSkip ? 'border-status-warning-border bg-status-warning-bg/30' : 'border-hairline bg-card'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="mr-2 rounded bg-primary-subtle px-2 py-0.5 font-semibold text-primary">
                            {categoryLabels[item.category] ?? item.category}
                          </span>
                          <strong className="text-ink">{item.sourceName}</strong>
                          <span className="mx-1.5 text-ink-muted">→</span>
                          <code className="font-mono text-ink">{item.proposedCode}</code>
                        </div>
                        <StatusBadge tone={item.willSkip ? 'warning' : 'success'} label={item.willSkip ? 'Sẽ bỏ qua' : 'Tạo bản nháp'} />
                      </div>
                      {item.willSkip && item.skipReason && (
                        <p className="mt-1 text-status-warning-text">{item.skipReason}</p>
                      )}
                      {item.dateShifts.length > 0 && (
                        <ul className="mt-2 space-y-1 border-t border-hairline pt-2 text-ink-soft">
                          {item.dateShifts.map((d, di) => (
                            <li key={di}>
                              {d.label}: {d.oldStart ?? '—'}..{d.oldEnd ?? '—'} → <strong className="text-ink">{d.newStart ?? '—'}..{d.newEnd ?? '—'}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between gap-2 pt-2">
                  <Button variant="secondary" disabled={wizardBusy} onClick={() => setWizardStep(1)}>Quay lại</Button>
                  <Button disabled={wizardBusy || preview.actionableCount === 0} onClick={() => void runApply()}>
                    {wizardBusy ? 'Đang tạo bản nháp…' : `Tạo ${preview.actionableCount} bản nháp (DRAFT)`}
                  </Button>
                </div>
              </div>
            )}

            {wizardStep === 3 && applyResult && (
              <div className="space-y-4">
                <div role="status" className="flex items-start gap-2.5 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-4 text-sm text-ink">
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
                  <div>
                    <strong>Đã tạo {applyResult.createdCount} bản nháp (DRAFT)</strong>
                    {applyResult.holidaysLoadedCount > 0 && ` và nạp lịch nghỉ lễ VN cho ${applyResult.holidaysLoadedCount} kỳ đồ án.`}
                    {applyResult.skippedCount > 0 && ` (${applyResult.skippedCount} hạng mục được bỏ qua.)`}
                  </div>
                </div>
                {applyResult.created.length > 0 && (
                  <ul className="max-h-56 space-y-1.5 overflow-y-auto text-xs">
                    {applyResult.created.map((c, idx) => (
                      <li key={idx} className="flex items-center justify-between rounded-lg border border-hairline bg-canvas px-3 py-2">
                        <span><strong>{categoryLabels[c.category] ?? c.category}</strong> · {c.name} (<code>{c.code}</code>)</span>
                        <StatusBadge tone="warning" label={c.status} />
                      </li>
                    ))}
                  </ul>
                )}
                {applyResult.skipped.length > 0 && (
                  <ul className="space-y-1 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-xs text-status-warning-text">
                    {applyResult.skipped.map((s, idx) => <li key={idx}>• {s.name}: {s.reason}</li>)}
                  </ul>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => setWizardOpen(false)}>Hoàn tất</Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* AI Diff Check Modal */}
      {diffOpen && readiness && (
        <Modal
          open
          className="max-w-4xl"
          title="AI rà soát cấu hình theo Kế hoạch học kỳ mới"
          description={`Tải lên thông báo / kế hoạch học vụ của học kỳ ${readiness.semesterCode} (PDF, DOCX, XLSX, TXT, MD) để AI đối chiếu các điểm còn thiếu hoặc lệch ngày/trọng số.`}
          busy={diffBusy}
          onClose={() => setDiffOpen(false)}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-canvas p-3.5">
              <input
                aria-label="Tệp kế hoạch học kỳ mới"
                type="file"
                accept=".pdf,.docx,.xlsx,.txt,.md,.csv,.json"
                onChange={e => setDiffFile(e.target.files?.[0] ?? null)}
                className="flex-1 text-xs text-ink"
              />
              <Button disabled={diffBusy || !diffFile} onClick={() => void runAiDiff()}>
                {diffBusy ? 'AI đang đối chiếu…' : 'Bắt đầu đối chiếu'}
              </Button>
            </div>

            {diffError && (
              <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text">
                {diffError}
              </p>
            )}

            {diffResult && (
              <div className="space-y-3">
                <p className="rounded-lg border border-hairline bg-card p-3 text-xs font-medium text-ink">
                  {diffResult.summary}
                </p>
                {diffResult.warnings.length > 0 && (
                  <ul className="space-y-1 rounded-lg border border-status-warning-border bg-status-warning-bg p-2.5 text-xs text-status-warning-text">
                    {diffResult.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                )}
                <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                  {diffResult.findings.map((f, idx) => {
                    const sev = severityMeta[f.severity] ?? severityMeta.MEDIUM
                    return (
                      <article key={idx} className="space-y-1.5 rounded-xl border border-hairline bg-card p-3.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-bold text-ink">{f.title}</h3>
                          <StatusBadge tone={sev.tone} label={sev.label} />
                        </div>
                        <p className="text-ink-soft"><strong>Hiện tại:</strong> {f.currentState}</p>
                        <p className="text-ink-soft"><strong>Yêu cầu theo tài liệu mới:</strong> {f.documentRequirement}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2">
                          <p className="font-medium text-primary">Đề xuất: {f.recommendedAction}</p>
                          {f.route && (
                            <Link
                              to={f.route}
                              onClick={() => setDiffOpen(false)}
                              className="inline-flex min-h-8 items-center rounded-lg border border-primary/30 bg-primary-subtle px-2.5 font-semibold text-primary hover:border-primary"
                            >
                              Mở mục này →
                            </Link>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </WorkspacePage>
  )
}
