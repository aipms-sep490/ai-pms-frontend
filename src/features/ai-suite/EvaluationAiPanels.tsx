import { useState } from 'react'
import {
  assistAppealReview,
  checkScoreCalibration,
  formatAiSuiteError,
  generateRubricGradingCopilot,
} from './ai-suite-api'
import type {
  AppealAssistDto,
  RubricCriterionSuggestionDto,
  RubricGradingCopilotDto,
  ScoreCalibrationDto,
} from './ai-suite.types'
import { AiSuiteCardShell } from './AiSuiteCardShell'

const CONF_META: Record<string, { label: string; cls: string }> = {
  HIGH: { label: 'Tin cậy cao', cls: 'ais-pill ais-pill--success' },
  MEDIUM: { label: 'Tin cậy TB', cls: 'ais-pill ais-pill--warning' },
  LOW: { label: 'Cần xác minh', cls: 'ais-pill ais-pill--danger' },
}

export function RubricGradingCopilotPanel({
  assignmentId,
  disabled = false,
  onApplyCriterionComment,
  onApplyAllComments,
}: {
  assignmentId: number
  disabled?: boolean
  onApplyCriterionComment?: (rubricCriterionId: number, comment: string) => void
  onApplyAllComments?: (suggestions: RubricCriterionSuggestionDto[], overallSummary: string) => void
}) {
  const [data, setData] = useState<RubricGradingCopilotDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      setData(await generateRubricGradingCopilot(assignmentId))
    } catch (err) {
      setError(formatAiSuiteError(err, 'Không thể chạy AI Trợ lý Chấm Rubric lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AiSuiteCardShell
      icon="grading"
      title="AI Trợ lý Chấm Rubric theo Minh chứng"
      badge="AI Gợi ý chấm điểm"
      subtitle="Đối chiếu hồ sơ nộp, tiến độ và biên bản họp với từng tiêu chí Rubric. AI chỉ gợi ý khoảng điểm & nhận xét nháp — giảng viên tự nhập và chốt điểm chính thức."
      meta={data?.meta}
      error={error}
      notice={notice}
      actions={
        <button type="button" className="ais-btn ais-btn--primary" disabled={disabled || loading} onClick={() => void handleRun()}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
          {loading ? 'Đang đối chiếu minh chứng…' : data ? 'Phân tích lại' : 'AI Gợi ý theo Rubric'}
        </button>
      }
    >
      {data && (
        <div className="space-y-3 text-xs">
          <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-2.5 text-status-warning-text font-medium">
            {data.disclaimer || 'Lưu ý học thuật: AI chỉ cung cấp nhận xét tham khảo; giảng viên hoàn toàn chủ động quyết định điểm chính thức.'}
          </div>
          <p className="leading-relaxed text-ink-soft">{data.overallSummary}</p>

          {onApplyAllComments && data.criteria.length > 0 && (
            <button
              type="button"
              className="ais-btn ais-btn--success"
              disabled={disabled}
              onClick={() => {
                onApplyAllComments(data.criteria, data.overallSummary)
                setNotice('Đã điền nhận xét nháp cho các tiêu chí (không tự động điền điểm số). Hãy kiểm tra lại trước khi lưu.')
              }}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">playlist_add_check</span>
              Điền tất cả nhận xét nháp (giữ nguyên điểm để giảng viên tự nhập)
            </button>
          )}

          <div className="space-y-2.5">
            {data.criteria.map((c) => {
              const conf = CONF_META[c.confidence] ?? CONF_META.MEDIUM
              return (
                <article key={c.rubricCriterionId} className="rounded-xl border border-hairline bg-canvas p-3 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <strong className="text-ink">{c.criterionName}</strong>
                      <span className="ais-pill ais-pill--ai">Mức gợi ý: {c.suggestedLevel}</span>
                      {c.suggestedScoreMin != null && c.suggestedScoreMax != null && (
                        <span className="ais-pill ais-pill--neutral">
                          Tham khảo: {c.suggestedScoreMin}–{c.suggestedScoreMax}/{c.maxScore ?? 10}
                        </span>
                      )}
                      <span className={conf.cls}>{conf.label}</span>
                    </div>
                    {onApplyCriterionComment && (
                      <button
                        type="button"
                        className="ais-btn"
                        style={{ minHeight: '1.9rem', padding: '0.2rem 0.65rem' }}
                        disabled={disabled}
                        onClick={() => {
                          onApplyCriterionComment(c.rubricCriterionId, c.suggestedComment)
                          setNotice(`Đã điền nhận xét nháp cho tiêu chí "${c.criterionName}".`)
                        }}
                      >
                        Điền nhận xét này
                      </button>
                    )}
                  </div>
                  <p className="text-ink-soft leading-relaxed">{c.suggestedComment}</p>
                  {c.evidenceCitations.length > 0 && (
                    <p className="text-xs text-ink-muted">
                      <strong>Dẫn chứng:</strong> {c.evidenceCitations.join(' · ')}
                    </p>
                  )}
                </article>
              )
            })}
          </div>

          {data.verificationQuestions.length > 0 && (
            <div className="ais-subcard">
              <p className="font-bold text-ink">Câu hỏi kiểm chứng nhanh khi vấn đáp:</p>
              <ul className="mt-1 list-disc pl-5 text-ink-soft space-y-0.5">
                {data.verificationQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </AiSuiteCardShell>
  )
}

const CALIB_STATUS: Record<string, { label: string; cls: string }> = {
  CONSISTENT: { label: 'Điểm hội đồng nhất quán', cls: 'ais-pill ais-pill--success' },
  REVIEW_RECOMMENDED: { label: 'Khuyến nghị rà soát trước công bố', cls: 'ais-pill ais-pill--warning' },
  HIGH_VARIANCE: { label: 'Cảnh báo lệch điểm lớn giữa giám khảo', cls: 'ais-pill ais-pill--danger' },
}

export function ScoreCalibrationPanel({ projectId }: { projectId: number }) {
  const [data, setData] = useState<ScoreCalibrationDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await checkScoreCalibration(projectId))
    } catch (err) {
      setError(formatAiSuiteError(err, 'Chưa thể kiểm tra nhất quán điểm lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  const statusMeta = data ? CALIB_STATUS[data.overallStatus] ?? CALIB_STATUS.REVIEW_RECOMMENDED : null

  return (
    <AiSuiteCardShell
      compact
      icon="tune"
      title="AI Kiểm tra Nhất quán Điểm Hội đồng (Score Calibration)"
      badge="AI Soát điểm tiền công bố"
      subtitle="Phát hiện tự động các phiếu chấm lệch điểm bất thường giữa giám khảo hoặc mâu thuẫn giữa nhận xét và điểm số trước khi Khoa công bố."
      meta={data?.meta}
      error={error}
      actions={
        <button type="button" className="ais-btn ais-btn--primary" disabled={loading} onClick={() => void handleCheck()}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">fact_check</span>
          {loading ? 'Đang đối chiếu phiếu chấm…' : data ? 'Kiểm tra lại' : 'AI Kiểm tra độ lệch điểm'}
        </button>
      }
    >
      {data && (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {statusMeta && <span className={statusMeta.cls}>{statusMeta.label}</span>}
            <span className="ais-pill ais-pill--neutral">Đã quét {data.evaluatedCount} phiếu chấm</span>
          </div>
          <p className="leading-relaxed text-ink-soft">{data.summary}</p>
          {data.alerts.length > 0 && (
            <ul className="space-y-2">
              {data.alerts.map((a, idx) => (
                <li key={idx} className="rounded-lg border border-hairline bg-canvas p-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={a.severity === 'HIGH' ? 'ais-pill ais-pill--danger' : a.severity === 'MEDIUM' ? 'ais-pill ais-pill--warning' : 'ais-pill ais-pill--neutral'}>
                      {a.severity === 'HIGH' ? 'Mức độ cao' : a.severity === 'MEDIUM' ? 'Mức trung bình' : a.severity === 'LOW' ? 'Mức thấp' : a.severity}
                    </span>
                    <strong className="text-ink">{a.title}</strong>
                    {a.criterionName && <span className="text-ink-muted">· {a.criterionName}</span>}
                  </div>
                  <p className="mt-1 text-ink-soft">{a.detail}</p>
                </li>
              ))}
            </ul>
          )}
          {data.recommendations.length > 0 && (
            <div className="ais-subcard">
              <p className="font-bold text-ink">Khuyến nghị xử lý trước công bố:</p>
              <ul className="mt-1 list-disc pl-5 text-ink-soft space-y-0.5">
                {data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </AiSuiteCardShell>
  )
}

const MERIT_META: Record<string, { label: string; cls: string }> = {
  LIKELY_MERIT: { label: 'Có cơ sở cần xem xét điều chỉnh', cls: 'ais-pill ais-pill--warning' },
  NEEDS_MANUAL_CHECK: { label: 'Cần đối chiếu trực tiếp hồ sơ gốc', cls: 'ais-pill ais-pill--ai' },
  WEAK_BASIS: { label: 'Cơ sở khiếu nại yếu', cls: 'ais-pill ais-pill--neutral' },
}

export function AppealAssistPanel({
  appealId,
  onUseDraftResponse,
}: {
  appealId: number
  onUseDraftResponse?: (draftText: string) => void
}) {
  const [data, setData] = useState<AppealAssistDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const handleAssist = async () => {
    setLoading(true)
    setError(null)
    setApplied(false)
    try {
      setData(await assistAppealReview(appealId))
    } catch (err) {
      setError(formatAiSuiteError(err, 'Không thể chạy AI hỗ trợ rà soát phúc khảo lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  const merit = data ? MERIT_META[data.meritAssessment] ?? MERIT_META.NEEDS_MANUAL_CHECK : null

  return (
    <AiSuiteCardShell
      compact
      icon="gavel"
      title="AI Trợ lý Rà soát Đơn Phúc khảo & Soạn Giải trình"
      badge="AI Hỗ trợ phúc khảo"
      subtitle="Tóm tắt luận điểm sinh viên, liệt kê mục cần xác minh từ phiếu chấm gốc và soạn bản nháp phản hồi chuẩn mực hành chính."
      meta={data?.meta}
      error={error}
      actions={
        <button type="button" className="ais-btn ais-btn--primary" disabled={loading} onClick={() => void handleAssist()}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
          {loading ? 'Đang phân tích hồ sơ…' : data ? 'Phân tích lại' : 'AI Phân tích đơn phúc khảo'}
        </button>
      }
    >
      {data && (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {merit && <span className={merit.cls}>{merit.label}</span>}
          </div>
          <p className="leading-relaxed text-ink">{data.appealSummary}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="ais-subcard">
              <p className="font-bold text-ink">Luận điểm chính của sinh viên:</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 text-ink-soft">
                {data.keyClaims.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
            <div className="ais-subcard">
              <p className="font-bold text-primary">Hạng mục cần xác minh trên phiếu gốc:</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 text-ink-soft">
                {data.evidenceChecks.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>
          {data.draftResponse && (
            <div className="rounded-lg border border-hairline bg-canvas p-3 space-y-2">
              <p className="font-bold text-ink">Bản nháp giải trình / lý do quyết định:</p>
              <p className="whitespace-pre-wrap leading-relaxed text-ink-soft">{data.draftResponse}</p>
              {onUseDraftResponse && (
                <button
                  type="button"
                  className="ais-btn ais-btn--success"
                  onClick={() => {
                    onUseDraftResponse(data.draftResponse)
                    setApplied(true)
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit_note</span>
                  {applied ? 'Đã chèn vào ô Lý do quyết định ✓' : 'Chèn vào ô Lý do thẩm định / quyết định'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </AiSuiteCardShell>
  )
}
