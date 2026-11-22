import { useState } from 'react'
import { checkSubmissionPreflight, formatAiSuiteError, scoreFillClass } from './ai-suite-api'
import type { SubmissionPreflightDto, SubmissionPreflightTarget } from './ai-suite.types'
import { AiSuiteCardShell } from './AiSuiteCardShell'

const TARGET_LABEL: Record<SubmissionPreflightTarget, string> = {
  FINAL_SUBMISSION: 'Gói bàn giao cuối kỳ',
  COLD: 'Gói chấm nguội (COLD)',
  REVIEW_GATE: 'Hồ sơ Cổng kiểm duyệt (Review Gate)',
}

const VERDICT_META: Record<string, { label: string; cls: string }> = {
  READY: { label: 'Sẵn sàng nộp', cls: 'ais-pill ais-pill--success' },
  WARNING: { label: 'Có điểm cần lưu ý', cls: 'ais-pill ais-pill--warning' },
  BLOCKING_ISSUES: { label: 'Còn lỗi chặn cần xử lý', cls: 'ais-pill ais-pill--danger' },
}

const CHECK_STATUS_META: Record<string, { label: string; cls: string }> = {
  PASS: { label: 'Đạt', cls: 'ais-pill ais-pill--success' },
  WARN: { label: 'Cảnh báo', cls: 'ais-pill ais-pill--warning' },
  FAIL: { label: 'Thiếu / Lỗi', cls: 'ais-pill ais-pill--danger' },
}

export function SubmissionPreflightPanel({
  projectId,
  target,
  targetId,
}: {
  projectId: number
  target: SubmissionPreflightTarget
  targetId?: number | null
}) {
  const [data, setData] = useState<SubmissionPreflightDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await checkSubmissionPreflight(projectId, { target, targetId: targetId ?? null }))
    } catch (err) {
      setError(formatAiSuiteError(err, 'Không thể chạy kiểm tra tiền nộp lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  const verdict = data ? VERDICT_META[data.verdict] ?? VERDICT_META.WARNING : null

  return (
    <AiSuiteCardShell
      icon="verified_user"
      title={`AI Kiểm tra Tiền nộp · ${TARGET_LABEL[target]}`}
      badge="Mục #6 · Pre-flight Check"
      subtitle="Quét checklist bắt buộc, tệp đính kèm và nội dung PDF báo cáo để phát hiện sớm mục còn thiếu trước khi nhấn nút khóa gói."
      meta={data?.meta}
      error={error}
      actions={
        <button type="button" className="ais-btn ais-btn--primary" disabled={loading} onClick={() => void handleCheck()}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">fact_check</span>
          {loading ? 'Đang quét hồ sơ & PDF…' : data ? 'Quét lại trước khi nộp' : 'AI Quét kiểm tra trước khi nộp'}
        </button>
      }
    >
      {data && (
        <div className="space-y-3 text-xs">
          <div className="ais-subcard space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {verdict && <span className={verdict.cls}>{verdict.label}</span>}
                <strong className="text-sm text-ink">Mức độ sẵn sàng: {data.readinessScore}/100</strong>
              </div>
            </div>
            <div className="ais-score-bar" role="progressbar" aria-valuenow={data.readinessScore} aria-valuemin={0} aria-valuemax={100}>
              <div className={scoreFillClass(data.readinessScore)} style={{ width: `${data.readinessScore}%` }} />
            </div>
            <p className="leading-relaxed text-ink-soft">{data.summary}</p>
          </div>

          <ul className="space-y-2">
            {data.checks.map((chk, idx) => {
              const st = CHECK_STATUS_META[chk.status] ?? CHECK_STATUS_META.WARN
              return (
                <li key={idx} className="rounded-lg border border-hairline bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-ink">{chk.item}</strong>
                    <span className={st.cls}>{st.label}</span>
                  </div>
                  <p className="mt-1 text-ink-soft">{chk.detail}</p>
                  {chk.fixSuggestion && (
                    <p className="mt-1 font-medium text-primary">Cách khắc phục: {chk.fixSuggestion}</p>
                  )}
                </li>
              )
            })}
          </ul>

          {data.priorityFixes.length > 0 && (
            <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-status-warning-text">
              <p className="font-bold">Việc ưu tiên hoàn tất trước khi khóa gói:</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {data.priorityFixes.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </AiSuiteCardShell>
  )
}
