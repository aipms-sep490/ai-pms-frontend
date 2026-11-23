import { useContext, useMemo, useRef, useState } from 'react'
import { AcademicWorkflowContext } from '../../../app/context/academic-workflow-context'
import { HttpError } from '../../../services/http/http-client'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import {
  applyReviewGateAiSetup,
  type ApplyReviewGateSetupResult,
  type AssistantReviewGateDraft,
  type AssistantReviewGateRequirementDraft,
  type AssistantReviewGateSetupPlan,
} from '../academic-ai-api'

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = Math.floor(Math.random() * 16)
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export interface ReviewGatePeriodOption {
  id: number
  code: string
  name: string
}

export interface ReviewGateMajorOption {
  id: number
  code: string
  name: string
}

export function AssistantReviewGateSetupCard({
  runId,
  plan,
  canApply = true,
  defaultPeriodId,
  periods: periodsProp,
  majors: majorsProp,
  onApplied,
}: {
  runId?: number | null
  plan: AssistantReviewGateSetupPlan
  canApply?: boolean
  defaultPeriodId?: number | null
  periods?: ReviewGatePeriodOption[]
  majors?: ReviewGateMajorOption[]
  onApplied?: (result: ApplyReviewGateSetupResult) => void
}) {
  const workflow = useContext(AcademicWorkflowContext)
  const periods = useMemo<ReviewGatePeriodOption[]>(
    () => periodsProp ?? (workflow?.academic?.periods ?? []).map(p => ({ id: p.id, code: p.code, name: p.name })),
    [periodsProp, workflow?.academic?.periods],
  )
  const majors = useMemo<ReviewGateMajorOption[]>(
    () => majorsProp ?? (workflow?.academic?.majors ?? []).map(m => ({ id: m.id, code: m.code, name: m.name })),
    [majorsProp, workflow?.academic?.majors],
  )

  const [code, setCode] = useState(plan.code)
  const [name, setName] = useState(plan.name)
  const [mode, setMode] = useState<string>(plan.mode || 'SINGLE_MAJOR')
  const [major, setMajor] = useState<string>(plan.majorCode ?? majors[0]?.code ?? '')
  const [projectPeriodId, setProjectPeriodId] = useState<string>(
    defaultPeriodId ? String(defaultPeriodId) : periods[0]?.id ? String(periods[0].id) : '',
  )
  const [gates, setGates] = useState<AssistantReviewGateDraft[]>(() =>
    plan.gates.map(g => ({ ...g, requirements: g.requirements.map(r => ({ ...r })) })),
  )
  const [expandedIndex, setExpandedIndex] = useState<number>(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState<ApplyReviewGateSetupResult | null>(null)
  const idempotencyKeyRef = useRef<string>(createIdempotencyKey())

  const hasAnyWeight = gates.some(g => g.weight !== null && g.weight !== undefined)
  const weightSum = Math.round(gates.reduce((sum, g) => sum + (Number(g.weight) || 0), 0) * 100) / 100
  const weightValid = !hasAnyWeight || Math.abs(weightSum - 100) < 0.01

  function updateGate(index: number, patch: Partial<AssistantReviewGateDraft>) {
    setGates(prev => prev.map((g, idx) => (idx === index ? { ...g, ...patch } : g)))
  }

  function removeGate(index: number) {
    if (gates.length <= 1) return
    setGates(prev => prev.filter((_, idx) => idx !== index).map((g, idx) => ({ ...g, sequence: idx + 1 })))
  }

  function addGate() {
    if (gates.length >= 10) return
    const nextIdx = gates.length + 1
    setGates(prev => [
      ...prev,
      {
        code: `G${nextIdx}`,
        sequence: nextIdx,
        title: `Cổng ${nextIdx}`,
        objective: 'Thẩm định tiến độ và minh chứng đồ án.',
        weight: hasAnyWeight ? 0 : null,
        startDate: null,
        endDate: null,
        required: true,
        blockNextGate: false,
        blocksDefense: false,
        reviewerPolicy: 'COUNCIL',
        reviewScope: mode === 'INTERDISCIPLINARY' ? 'HYBRID' : 'COMMON',
        requirements: [
          {
            code: `G${nextIdx}_DOC_1`,
            title: `Tài liệu minh chứng cổng G${nextIdx}`,
            description: '',
            type: 'FILE',
            scope: 'COMMON',
            majorName: null,
            verification: 'HUMAN',
            required: true,
          },
        ],
      },
    ])
    setExpandedIndex(gates.length)
  }

  function updateRequirement(gateIndex: number, reqIndex: number, patch: Partial<AssistantReviewGateRequirementDraft>) {
    setGates(prev =>
      prev.map((g, gi) =>
        gi !== gateIndex
          ? g
          : {
              ...g,
              requirements: g.requirements.map((r, ri) => (ri === reqIndex ? { ...r, ...patch } : r)),
            },
      ),
    )
  }

  function addRequirement(gateIndex: number) {
    setGates(prev =>
      prev.map((g, gi) =>
        gi !== gateIndex
          ? g
          : {
              ...g,
              requirements: [
                ...g.requirements,
                {
                  code: `${g.code}_REQ_${g.requirements.length + 1}`,
                  title: 'Tài liệu minh chứng mới',
                  description: '',
                  type: 'FILE',
                  scope: 'COMMON',
                  majorName: null,
                  verification: 'HUMAN',
                  required: true,
                },
              ],
            },
      ),
    )
  }

  function removeRequirement(gateIndex: number, reqIndex: number) {
    setGates(prev =>
      prev.map((g, gi) =>
        gi !== gateIndex || g.requirements.length <= 1
          ? g
          : { ...g, requirements: g.requirements.filter((_, ri) => ri !== reqIndex) },
      ),
    )
  }

  async function apply() {
    if (busy || !weightValid || !code.trim() || !name.trim() || gates.length === 0) return
    setBusy(true)
    setError('')
    try {
      const result = await applyReviewGateAiSetup({
        idempotencyKey: idempotencyKeyRef.current,
        runId: runId ?? null,
        projectPeriodId: projectPeriodId ? Number(projectPeriodId) : null,
        code: code.trim(),
        name: name.trim(),
        mode,
        major: major.trim() || null,
        gates: gates.map((g, idx) => ({ ...g, sequence: idx + 1 })),
      })
      setApplied(result)
      onApplied?.(result)
    } catch (reason) {
      if (reason instanceof HttpError) {
        setError(humanizeHttpError(reason, 'Chưa lưu được bản nháp khung cổng thẩm định. Kiểm tra quyền Cán bộ bộ môn và cấu trúc cổng.'))
      } else {
        setError(reason instanceof Error ? reason.message : 'Chưa lưu được bản nháp khung cổng thẩm định.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-hairline bg-card p-4" aria-label="Bản nháp Khung cổng thẩm định AI">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-3">
        <div>
          <h3 className="text-base font-bold text-ink">Bản nháp Khung cổng thẩm định (DRAFT)</h3>
          <p className="mt-0.5 text-xs text-ink-muted">{plan.summary}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
            weightValid
              ? 'border-status-success-border bg-status-success-bg text-status-success-text'
              : 'border-status-error-border bg-status-error-bg text-status-error-text'
          }`}
        >
          {hasAnyWeight ? `Tổng trọng số: ${weightSum}% / 100%` : 'Chưa gán trọng số (tùy chọn)'}
        </span>
      </div>

      {plan.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-xs text-status-warning-text">
          {plan.warnings.map((w, idx) => (
            <li key={idx}>• {w}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-ink-soft">
          Mã mẫu cổng
          <input
            aria-label="Mã mẫu cổng thẩm định"
            className="mt-1 min-h-10 w-full rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-sm font-normal text-ink"
            value={code}
            disabled={busy || Boolean(applied)}
            onChange={e => setCode(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-ink-soft">
          Tên mẫu cổng
          <input
            aria-label="Tên mẫu cổng thẩm định"
            className="mt-1 min-h-10 w-full rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-sm font-normal text-ink"
            value={name}
            disabled={busy || Boolean(applied)}
            onChange={e => setName(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-ink-soft">
          Chế độ đồ án
          <select
            aria-label="Chế độ đồ án mẫu cổng"
            className="mt-1 min-h-10 w-full rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-sm font-normal text-ink"
            value={mode}
            disabled={busy || Boolean(applied)}
            onChange={e => setMode(e.target.value)}
          >
            <option value="SINGLE_MAJOR">Đơn ngành</option>
            <option value="INTERDISCIPLINARY">Liên ngành</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-ink-soft">
          Kỳ đồ án áp dụng
          <select
            aria-label="Kỳ đồ án áp dụng mẫu cổng"
            className="mt-1 min-h-10 w-full rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-sm font-normal text-ink"
            value={projectPeriodId}
            disabled={busy || Boolean(applied)}
            onChange={e => setProjectPeriodId(e.target.value)}
          >
            <option value="">— Dùng chung / chọn sau —</option>
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
      </div>

      {majors.length > 0 && (
        <label className="block max-w-xs text-xs font-semibold text-ink-soft">
          Chuyên ngành áp dụng
          <select
            aria-label="Chuyên ngành áp dụng mẫu cổng"
            className="mt-1 min-h-10 w-full rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-sm font-normal text-ink"
            value={major}
            disabled={busy || Boolean(applied)}
            onChange={e => setMajor(e.target.value)}
          >
            <option value="">Toàn bộ môn / Liên ngành</option>
            {majors.map(m => (
              <option key={m.id} value={m.code}>
                {m.name} ({m.code})
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Danh sách cổng ({gates.length})</h4>
          {!applied && (
            <button
              type="button"
              className="inline-flex min-h-9 items-center rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-primary hover:border-primary hover:bg-primary-subtle"
              onClick={addGate}
              disabled={busy || gates.length >= 10}
            >
              + Thêm cổng
            </button>
          )}
        </div>

        {gates.map((gate, gIdx) => {
          const isOpen = expandedIndex === gIdx
          return (
            <div key={`${gate.code}-${gIdx}`} className="rounded-xl border border-hairline bg-canvas">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-ink"
                  onClick={() => setExpandedIndex(isOpen ? -1 : gIdx)}
                  aria-expanded={isOpen}
                >
                  <span className="rounded-md bg-primary-subtle px-2 py-0.5 font-mono text-xs font-bold text-primary">
                    {gate.code}
                  </span>
                  <span className="truncate">{gate.title}</span>
                  <span className="text-xs font-normal text-ink-muted">
                    ({gate.weight != null ? `${gate.weight}%` : '—'} · {gate.requirements.length} yêu cầu)
                  </span>
                </button>
                {!applied && gates.length > 1 && (
                  <button
                    type="button"
                    className="rounded-md border border-hairline px-2 py-1 text-xs font-semibold text-status-error-text hover:bg-status-error-bg"
                    onClick={() => removeGate(gIdx)}
                    disabled={busy}
                  >
                    Xóa
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="space-y-3 border-t border-hairline bg-card p-3.5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-xs font-semibold text-ink-soft">
                      Mã cổng
                      <input
                        className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-sm font-normal text-ink"
                        value={gate.code}
                        disabled={busy || Boolean(applied)}
                        onChange={e => updateGate(gIdx, { code: e.target.value })}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink-soft sm:col-span-2">
                      Tên cổng
                      <input
                        className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-sm font-normal text-ink"
                        value={gate.title}
                        disabled={busy || Boolean(applied)}
                        onChange={e => updateGate(gIdx, { title: e.target.value })}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink-soft">
                      Trọng số (%)
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-sm font-normal text-ink"
                        value={gate.weight ?? ''}
                        disabled={busy || Boolean(applied)}
                        onChange={e => updateGate(gIdx, { weight: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink-soft">
                      Từ ngày
                      <input
                        type="date"
                        className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-sm font-normal text-ink"
                        value={gate.startDate ?? ''}
                        disabled={busy || Boolean(applied)}
                        onChange={e => updateGate(gIdx, { startDate: e.target.value || null })}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink-soft">
                      Đến ngày
                      <input
                        type="date"
                        className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-sm font-normal text-ink"
                        value={gate.endDate ?? ''}
                        disabled={busy || Boolean(applied)}
                        onChange={e => updateGate(gIdx, { endDate: e.target.value || null })}
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink-soft sm:col-span-2">
                      Mục tiêu cổng
                      <input
                        className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-sm font-normal text-ink"
                        value={gate.objective}
                        disabled={busy || Boolean(applied)}
                        onChange={e => updateGate(gIdx, { objective: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-ink-soft">
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={gate.blockNextGate}
                        disabled={busy || Boolean(applied)}
                        onChange={e => updateGate(gIdx, { blockNextGate: e.target.checked })}
                      />
                      Chặn mở cổng tiếp theo nếu chưa đạt
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={gate.blocksDefense}
                        disabled={busy || Boolean(applied)}
                        onChange={e => updateGate(gIdx, { blocksDefense: e.target.checked })}
                      />
                      Bắt buộc đạt để đủ điều kiện bảo vệ
                    </label>
                  </div>

                  <div className="space-y-2 border-t border-hairline pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-soft">Yêu cầu minh chứng ({gate.requirements.length})</span>
                      {!applied && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-primary hover:underline"
                          onClick={() => addRequirement(gIdx)}
                          disabled={busy}
                        >
                          + Thêm yêu cầu
                        </button>
                      )}
                    </div>
                    {gate.requirements.map((req, rIdx) => (
                      <div key={`${req.code}-${rIdx}`} className="grid gap-2 rounded-lg border border-hairline bg-canvas p-2.5 sm:grid-cols-[1fr_130px_130px_auto]">
                        <input
                          aria-label={`Tên yêu cầu ${rIdx + 1} cổng ${gate.code}`}
                          className="min-h-9 rounded-lg border border-hairline bg-card px-2.5 text-xs text-ink"
                          value={req.title}
                          disabled={busy || Boolean(applied)}
                          onChange={e => updateRequirement(gIdx, rIdx, { title: e.target.value })}
                        />
                        <select
                          aria-label={`Loại minh chứng ${req.code}`}
                          className="min-h-9 rounded-lg border border-hairline bg-card px-2 text-xs text-ink"
                          value={req.type}
                          disabled={busy || Boolean(applied)}
                          onChange={e => updateRequirement(gIdx, rIdx, { type: e.target.value })}
                        >
                          <option value="FILE">Tệp đính kèm</option>
                          <option value="EXTERNAL_LINK">Liên kết ngoài</option>
                          <option value="TEXT">Văn bản</option>
                          <option value="ARTIFACT">Sản phẩm</option>
                        </select>
                        <select
                          aria-label={`Phạm vi yêu cầu ${req.code}`}
                          className="min-h-9 rounded-lg border border-hairline bg-card px-2 text-xs text-ink"
                          value={req.scope}
                          disabled={busy || Boolean(applied)}
                          onChange={e => updateRequirement(gIdx, rIdx, { scope: e.target.value, majorName: e.target.value === 'COMMON' ? null : req.majorName })}
                        >
                          <option value="COMMON">Dùng chung</option>
                          <option value="MAJOR_SPECIFIC">Theo ngành</option>
                        </select>
                        {!applied && gate.requirements.length > 1 && (
                          <button
                            type="button"
                            className="min-h-9 rounded-lg border border-hairline px-2 text-xs font-semibold text-status-error-text hover:bg-status-error-bg"
                            onClick={() => removeRequirement(gIdx, rIdx)}
                            disabled={busy}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs font-medium text-status-error-text">
          {error}
        </p>
      )}

      {applied ? (
        <div role="status" className="space-y-1.5 rounded-lg border border-status-success-border bg-status-success-bg p-3 text-xs text-status-success-text">
          <p className="font-semibold">
            ✓ Đã tạo bản nháp khung cổng "{applied.name}" ({applied.code}) gồm {applied.gatesCount} cổng ở trạng thái {applied.status}.
          </p>
          {applied.warnings?.map((w, i) => (
            <p key={i}>• {w}</p>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
          <p className="text-xs text-ink-muted">
            {canApply
              ? 'Hệ thống chỉ lưu ở trạng thái DRAFT; bạn vẫn kiểm tra & công bố thủ công tại trình cấu hình.'
              : 'Chỉ Cán bộ bộ môn (DEPARTMENT_STAFF) mới có quyền lưu bản nháp khung cổng thẩm định.'}
          </p>
          <button
            type="button"
            disabled={!canApply || busy || !weightValid || !code.trim() || !name.trim()}
            onClick={() => void apply()}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Đang lưu bản nháp…' : 'Lưu bản nháp Cổng thẩm định'}
          </button>
        </div>
      )}
    </section>
  )
}
