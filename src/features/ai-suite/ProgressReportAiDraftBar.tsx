import { useState } from 'react'
import { formatAiSuiteError, generateProgressReportDraft } from './ai-suite-api'
import type { ProgressReportDraftDto } from './ai-suite.types'
import { AiSuiteCardShell } from './AiSuiteCardShell'

const SOURCE_LABEL: Record<string, string> = {
  TASK: 'Công việc',
  MEETING_AI: 'Biên bản AI Video Call',
  DELIVERABLE: 'Sản phẩm',
  MILESTONE: 'Mốc tiến độ',
}

export function ProgressReportAiDraftBar({
  projectId,
  reportType,
  periodStart,
  periodEnd,
  disabled = false,
  onApplyDraft,
}: {
  projectId: number
  reportType: string
  periodStart?: string
  periodEnd?: string
  disabled?: boolean
  onApplyDraft: (draft: ProgressReportDraftDto) => void
}) {
  const [note, setNote] = useState('')
  const [draft, setDraft] = useState<ProgressReportDraftDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const handleDraft = async () => {
    setLoading(true)
    setError(null)
    setApplied(false)
    try {
      const res = await generateProgressReportDraft(projectId, {
        reportType: reportType || 'WEEKLY',
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        additionalNote: note.trim() || null,
      })
      setDraft(res)
    } catch (err) {
      setError(formatAiSuiteError(err, 'Chưa thể tự soạn báo cáo tiến độ lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4">
      <AiSuiteCardShell
        compact
        icon="edit_note"
        title="AI Tự soạn Báo cáo Tiến độ từ Task, Deliverables & Cuộc họp AI"
        badge="Mục #2 · Auto Draft"
        subtitle="Tổng hợp công việc đã hoàn thành, đang làm, tồn đọng và biên bản AI Video Call trong kỳ. Bạn luôn có toàn quyền chỉnh sửa trước khi lưu."
        meta={draft?.meta}
        error={error}
        actions={
          <button
            type="button"
            className="ais-btn ais-btn--primary"
            disabled={disabled || loading}
            onClick={() => void handleDraft()}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
            {loading ? 'Đang tổng hợp dữ liệu kỳ…' : draft ? 'Soạn lại bản nháp' : 'AI Tự soạn bản nháp'}
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="ais-input flex-1"
            value={note}
            disabled={disabled || loading}
            placeholder="Ghi chú thêm cho AI (tùy chọn, vd: nhấn mạnh bản demo gửi GVHD tuần này)…"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {draft && (
          <div className="space-y-3 text-xs">
            <div className="ais-subcard space-y-2">
              <p><strong>Tóm tắt kỳ ({draft.periodStart} → {draft.periodEnd}):</strong> {draft.summary}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="font-bold text-status-success-text">Đã hoàn thành:</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-ink-soft">{draft.completedWork}</p>
                </div>
                <div>
                  <p className="font-bold text-primary">Đang triển khai:</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-ink-soft">{draft.inProgressWork}</p>
                </div>
                <div>
                  <p className="font-bold text-ink">Kế hoạch kỳ tới:</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-ink-soft">{draft.plannedWork}</p>
                </div>
                <div>
                  <p className="font-bold text-status-warning-text">Vướng mắc & Rủi ro:</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-ink-soft">{draft.issuesAndRisks}</p>
                </div>
              </div>
            </div>

            {draft.evidence.length > 0 && (
              <div className="space-y-1">
                <p className="font-bold text-ink-muted">Dữ liệu thực tế AI đã trích xuất ({draft.evidence.length}):</p>
                <div className="flex flex-wrap gap-1.5">
                  {draft.evidence.map((ev, idx) => (
                    <span key={idx} className="ais-pill ais-pill--neutral" title={ev.detail}>
                      {SOURCE_LABEL[ev.sourceType] ?? ev.sourceType}: {ev.title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="ais-btn ais-btn--success"
                disabled={disabled}
                onClick={() => {
                  onApplyDraft(draft)
                  setApplied(true)
                }}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">done_all</span>
                {applied ? 'Đã điền vào biểu mẫu báo cáo ✓' : 'Áp dụng vào biểu mẫu báo cáo'}
              </button>
              <span className="text-ink-muted">Báo cáo chỉ điền vào ô nhập nháp, chưa tự động nộp.</span>
            </div>
          </div>
        )}
      </AiSuiteCardShell>
    </div>
  )
}
