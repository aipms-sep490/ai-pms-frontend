import { useMemo, useRef, useState } from 'react'
import { DepartmentAiDraftBar } from '../../ai-suite/DepartmentAiDraftBar'
import { HttpError } from '../../../services/http/http-client'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import {
  applyTopicBatchAiSetup,
  type ApplyTopicBatchSetupResult,
  type AssistantTopicBatchPlan,
  type AssistantTopicDraft,
} from '../../ai/academic-ai-api'

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = Math.floor(Math.random() * 16)
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export interface TopicBatchPeriodOption {
  id: number
  code?: string
  name: string
  periodType?: string
}

export interface TopicBatchMajorOption {
  id: number
  code?: string
  name: string
}

export function TopicAiBatchPreview({
  runId,
  plan,
  periods,
  majors,
  leadDepartmentId,
  onApplied,
}: {
  runId?: number | null
  plan: AssistantTopicBatchPlan
  periods: TopicBatchPeriodOption[]
  majors: TopicBatchMajorOption[]
  leadDepartmentId?: number | null
  onApplied?: (result: ApplyTopicBatchSetupResult) => void
}) {
  const regPeriods = useMemo(
    () => periods.filter(p => !p.periodType || p.periodType === 'REGISTRATION'),
    [periods],
  )
  const [projectPeriodId, setProjectPeriodId] = useState<string>(regPeriods[0]?.id ? String(regPeriods[0].id) : '')
  const [topics, setTopics] = useState<AssistantTopicDraft[]>(() =>
    plan.topics.map(t => ({
      ...t,
      technologies: [...t.technologies],
      keywords: [...t.keywords],
      requirements: t.requirements.map(r => ({ ...r })),
    })),
  )
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const t of plan.topics) {
      if (!t.duplicateTitleConflict) initial.add(t.tempKey)
    }
    return initial
  })
  const [expandedKey, setExpandedKey] = useState<string | null>(plan.topics[0]?.tempKey ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState<ApplyTopicBatchSetupResult | null>(null)
  const idempotencyKeyRef = useRef<string>(createIdempotencyKey())

  function toggleSelect(key: string) {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function updateTopic(tempKey: string, patch: Partial<AssistantTopicDraft>) {
    setTopics(prev => prev.map(t => (t.tempKey === tempKey ? { ...t, ...patch } : t)))
  }

  async function applySelected() {
    const chosen = topics.filter(t => selectedKeys.has(t.tempKey))
    if (busy || chosen.length === 0 || !projectPeriodId) return
    setBusy(true)
    setError('')
    try {
      const result = await applyTopicBatchAiSetup({
        idempotencyKey: idempotencyKeyRef.current,
        runId: runId ?? null,
        projectPeriodId: Number(projectPeriodId),
        leadDepartmentId: leadDepartmentId ?? null,
        topics: chosen,
      })
      setApplied(result)
      onApplied?.(result)
    } catch (reason) {
      if (reason instanceof HttpError) {
        setError(humanizeHttpError(reason, 'Chưa thể tạo hàng loạt bản nháp đề tài. Kiểm tra kỳ đăng ký và quyền bộ môn.'))
      } else {
        setError(reason instanceof Error ? reason.message : 'Chưa thể tạo hàng loạt bản nháp đề tài.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-hairline bg-card p-4" aria-label="Danh sách đề tài nháp trích xuất bằng AI">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-3">
        <div>
          <h3 className="text-base font-bold text-ink">Xem trước {topics.length} đề tài nháp (đã kiểm tra trùng 3 kỳ)</h3>
          <p className="mt-0.5 text-xs text-ink-muted">{plan.summary}</p>
        </div>
        <label className="text-xs font-semibold text-ink-soft">
          Kỳ đăng ký áp dụng
          <select
            aria-label="Kỳ đăng ký tạo hàng loạt đề tài"
            className="mt-1 block min-h-10 min-w-56 rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-sm font-normal text-ink"
            value={projectPeriodId}
            disabled={busy || Boolean(applied)}
            onChange={e => setProjectPeriodId(e.target.value)}
          >
            <option value="">-- Chọn kỳ đăng ký --</option>
            {regPeriods.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.code ? ` (${p.code})` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {plan.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-xs text-status-warning-text">
          {plan.warnings.map((w, idx) => (
            <li key={idx}>• {w}</li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        {topics.map(topic => {
          const checked = selectedKeys.has(topic.tempKey)
          const expanded = expandedKey === topic.tempKey
          return (
            <div
              key={topic.tempKey}
              className={`rounded-xl border ${
                topic.duplicateTitleConflict
                  ? 'border-status-error-border bg-status-error-bg/30'
                  : topic.similarityWarning
                    ? 'border-status-warning-border bg-status-warning-bg/20'
                    : 'border-hairline bg-canvas'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                <input
                  type="checkbox"
                  aria-label={`Chọn đề tài ${topic.title}`}
                  checked={checked}
                  disabled={busy || Boolean(applied)}
                  onChange={() => toggleSelect(topic.tempKey)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-card px-1.5 py-0.5 text-xs font-bold text-primary">{topic.code}</code>
                    <span className="font-semibold text-sm text-ink">{topic.title}</span>
                    <span className="rounded-full border border-hairline bg-card px-2 py-0.5 text-xs text-ink-soft">
                      {topic.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Một ngành'}
                    </span>
                    {topic.duplicateTitleConflict && (
                      <span className="rounded-full border border-status-error-border bg-status-error-bg px-2 py-0.5 text-xs font-semibold text-status-error-text">
                        Trùng tiêu đề 3 kỳ
                      </span>
                    )}
                    {!topic.duplicateTitleConflict && topic.similarityWarning && (
                      <span className="rounded-full border border-status-warning-border bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning-text">
                        Cảnh báo tương đồng
                      </span>
                    )}
                  </div>
                  {(topic.duplicateTitleDetail || topic.similarityWarning) && (
                    <p className="mt-1 text-xs text-ink-soft">
                      {topic.duplicateTitleDetail ?? topic.similarityWarning}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="min-h-9 rounded-lg border border-hairline bg-card px-3 text-xs font-semibold text-ink-soft hover:border-primary hover:text-primary"
                  onClick={() => setExpandedKey(expanded ? null : topic.tempKey)}
                >
                  {expanded ? 'Thu gọn' : 'Chi tiết / Sửa'}
                </button>
              </div>

              {expanded && (
                <div className="grid gap-3 border-t border-hairline bg-card p-3.5 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-ink-soft">
                    Mã đề tài
                    <input
                      className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-sm font-normal text-ink"
                      value={topic.code}
                      disabled={busy || Boolean(applied)}
                      onChange={e => updateTopic(topic.tempKey, { code: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-soft">
                    Chế độ & Chuyên ngành chính
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <select
                        className="min-h-9 rounded-lg border border-hairline bg-canvas px-2 text-xs font-normal text-ink"
                        value={topic.projectMode}
                        disabled={busy || Boolean(applied)}
                        onChange={e => updateTopic(topic.tempKey, { projectMode: e.target.value })}
                      >
                        <option value="SINGLE_MAJOR">Một ngành</option>
                        <option value="INTERDISCIPLINARY">Liên ngành</option>
                      </select>
                      <select
                        className="min-h-9 rounded-lg border border-hairline bg-canvas px-2 text-xs font-normal text-ink"
                        value={topic.primaryMajorId ?? ''}
                        disabled={busy || Boolean(applied) || topic.projectMode === 'INTERDISCIPLINARY'}
                        onChange={e => updateTopic(topic.tempKey, { primaryMajorId: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">Tự động theo bộ môn</option>
                        {majors.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}{m.code ? ` (${m.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                  <label className="text-xs font-semibold text-ink-soft sm:col-span-2">
                    Tên đề tài
                    <input
                      className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-sm font-normal text-ink"
                      value={topic.title}
                      disabled={busy || Boolean(applied)}
                      onChange={e => updateTopic(topic.tempKey, { title: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-soft sm:col-span-2">
                    Mô tả tóm tắt
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-hairline bg-canvas p-2.5 text-xs font-normal text-ink"
                      value={topic.description ?? ''}
                      disabled={busy || Boolean(applied)}
                      onChange={e => updateTopic(topic.tempKey, { description: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-soft">
                    Bối cảnh & Vấn đề (Problem Statement)
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-hairline bg-canvas p-2.5 text-xs font-normal text-ink"
                      value={topic.problemStatement ?? ''}
                      disabled={busy || Boolean(applied)}
                      onChange={e => updateTopic(topic.tempKey, { problemStatement: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-soft">
                    Mục tiêu (Objectives)
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-hairline bg-canvas p-2.5 text-xs font-normal text-ink"
                      value={topic.objectives ?? ''}
                      disabled={busy || Boolean(applied)}
                      onChange={e => updateTopic(topic.tempKey, { objectives: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-soft">
                    Sản phẩm kỳ vọng (Expected Output)
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-hairline bg-canvas p-2.5 text-xs font-normal text-ink"
                      value={topic.expectedOutput ?? ''}
                      disabled={busy || Boolean(applied)}
                      onChange={e => updateTopic(topic.tempKey, { expectedOutput: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-soft">
                    Lĩnh vực (Domain)
                    <input
                      className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-xs font-normal text-ink"
                      value={topic.domain ?? ''}
                      disabled={busy || Boolean(applied)}
                      onChange={e => updateTopic(topic.tempKey, { domain: e.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-soft">
                    Công nghệ (phân cách bằng dấu phẩy)
                    <input
                      className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-xs font-normal text-ink"
                      value={topic.technologies.join(', ')}
                      disabled={busy || Boolean(applied)}
                      onChange={e => updateTopic(topic.tempKey, { technologies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-soft">
                    Từ khóa (phân cách bằng dấu phẩy)
                    <input
                      className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-xs font-normal text-ink"
                      value={topic.keywords.join(', ')}
                      disabled={busy || Boolean(applied)}
                      onChange={e => updateTopic(topic.tempKey, { keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    />
                  </label>
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
        <div role="status" className="space-y-2 rounded-lg border border-status-success-border bg-status-success-bg p-3 text-xs text-status-success-text">
          <p className="font-semibold">
            ✓ Đã tạo {applied.createdCount} bản nháp đề tài (DRAFT){applied.skippedCount > 0 ? `, bỏ qua ${applied.skippedCount} dòng không hợp lệ` : ''}.
          </p>
          {applied.skipped.length > 0 && (
            <ul className="space-y-1 text-status-warning-text">
              {applied.skipped.map((s, idx) => (
                <li key={idx}>• {s.code} ({s.title || 'Không tiêu đề'}): {s.reason}</li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
          <span className="text-xs text-ink-muted">
            Đã chọn <strong>{selectedKeys.size}</strong> / {topics.length} đề tài · Tất cả tạo ở trạng thái DRAFT, không tự công bố.
          </span>
          <button
            type="button"
            disabled={busy || selectedKeys.size === 0 || !projectPeriodId}
            onClick={() => void applySelected()}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Đang lưu bản nháp…' : `Tạo ${selectedKeys.size} bản nháp đề tài`}
          </button>
        </div>
      )}
    </section>
  )
}

export function TopicAiBatchModal({
  open,
  onClose,
  periods,
  majors,
  leadDepartmentId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  periods: TopicBatchPeriodOption[]
  majors: TopicBatchMajorOption[]
  leadDepartmentId?: number | null
  onCreated: () => void
}) {
  return (
    <DepartmentAiDraftBar
      open={open}
      onClose={onClose}
      title="Nhập / Soạn hàng loạt đề tài bằng AI"
      description="Tải tệp Excel (.xlsx), Word (.docx) hoặc PDF danh sách đề tài từ giảng viên — hoặc mô tả chủ đề để AI tách tối đa 25 bản nháp đủ 15 trường và tự đối chiếu trùng 3 kỳ."
      toolMode="TOPIC_BATCH_SETUP"
      pageContext="/department/topics"
      placeholder="VD: Trích xuất danh sách đề tài từ tệp đính kèm, hoặc gợi ý 5 đề tài đồ án tốt nghiệp chuyên ngành Kỹ thuật phần mềm và Marketing liên ngành..."
      starters={[
        {
          label: 'Trích xuất từ tệp Excel/Word',
          prompt: 'Trích xuất toàn bộ danh sách đề tài trong tệp đính kèm, chuẩn hóa đủ bối cảnh, mục tiêu, sản phẩm đầu ra, công nghệ và từ khóa.',
        },
        {
          label: 'Gợi ý 5 đề tài đơn ngành CNTT',
          prompt: 'Đề xuất 5 đề tài đồ án tốt nghiệp đơn ngành Công nghệ thông tin có tính thực tiễn cao, mỗi đề tài đầy đủ bối cảnh, mục tiêu, sản phẩm đầu ra và từ khóa.',
        },
        {
          label: 'Gợi ý 3 đề tài liên ngành',
          prompt: 'Đề xuất 3 đề tài đồ án liên ngành kết hợp kỹ thuật phần mềm và kinh doanh/marketing, phân rõ vai trò từng chuyên ngành.',
        },
      ]}
      renderResult={response =>
        response.draft?.topicBatchSetup ? (
          <TopicAiBatchPreview
            runId={response.runId}
            plan={response.draft.topicBatchSetup}
            periods={periods}
            majors={majors}
            leadDepartmentId={leadDepartmentId}
            onApplied={() => onCreated()}
          />
        ) : (
          <div className="rounded-xl border border-hairline bg-canvas p-4 text-sm text-ink-soft whitespace-pre-wrap">
            {response.answer}
          </div>
        )
      }
    />
  )
}
