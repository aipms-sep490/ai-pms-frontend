import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { HttpError } from '../../services/http/http-client'
import {
  generateReportingCycles,
  type GenerateReportingCyclesResult,
} from '../../services/api/progress-reports.api'
import { formatReportDate } from './report-types'

interface BulkReportingCycleGeneratorModalProps {
  open: boolean
  periodId: number
  periodName: string
  onClose: () => void
  onGenerated?: (result: GenerateReportingCyclesResult) => void
}

export function BulkReportingCycleGeneratorModal({
  open,
  periodId,
  periodName,
  onClose,
  onGenerated,
}: BulkReportingCycleGeneratorModalProps) {
  const [cadence, setCadence] = useState<'WEEKLY' | 'BIWEEKLY'>('WEEKLY')
  const [latePolicy, setLatePolicy] = useState<'FLAG' | 'BLOCK'>('FLAG')
  const [deadlineOffsetDays, setDeadlineOffsetDays] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<GenerateReportingCyclesResult | null>(null)
  const [committed, setCommitted] = useState<GenerateReportingCyclesResult | null>(null)

  if (!open) return null

  async function runGeneration(dryRun: boolean) {
    setBusy(true)
    setError('')
    try {
      const result = await generateReportingCycles(periodId, {
        cadence,
        latePolicy,
        deadlineOffsetDays,
        dryRun,
      })
      if (dryRun) {
        setPreview(result)
        setCommitted(null)
      } else {
        setCommitted(result)
        setPreview(result)
        onGenerated?.(result)
      }
    } catch (reason) {
      if (reason instanceof HttpError) {
        setError(reason.problem?.detail ?? 'Không thể sinh chu kỳ báo cáo hàng loạt. Vui lòng kiểm tra quyền và cấu hình đợt.')
      } else {
        setError('Không thể sinh chu kỳ báo cáo hàng loạt. Vui lòng thử lại.')
      }
    } finally {
      setBusy(false)
    }
  }

  function handlePreview(event: FormEvent) {
    event.preventDefault()
    void runGeneration(true)
  }

  return (
    <Modal
      open={open}
      title="Sinh chu kỳ báo cáo hàng loạt"
      description={`Áp dụng cho toàn bộ đồ án đang hoạt động (ACTIVE) thuộc Khoa trong đợt "${periodName}". Hạn nộp rơi vào cuối tuần hoặc ngày nghỉ lễ (PeriodCalendar) sẽ tự dời sang ngày làm việc kế tiếp.`}
      busy={busy}
      onClose={onClose}
      className="max-w-2xl"
    >
      <form className="space-y-4" onSubmit={handlePreview}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium text-ink">
            Tần suất báo cáo
            <select
              className="mt-1 block min-h-10 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink"
              value={cadence}
              disabled={busy}
              onChange={(event) => {
                setCadence(event.target.value as 'WEEKLY' | 'BIWEEKLY')
                setPreview(null)
                setCommitted(null)
              }}
            >
              <option value="WEEKLY">Hàng tuần (7 ngày)</option>
              <option value="BIWEEKLY">2 tuần / lần (14 ngày)</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-ink">
            Chính sách nộp trễ
            <select
              className="mt-1 block min-h-10 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink"
              value={latePolicy}
              disabled={busy}
              onChange={(event) => {
                setLatePolicy(event.target.value as 'FLAG' | 'BLOCK')
                setPreview(null)
                setCommitted(null)
              }}
            >
              <option value="FLAG">Đánh dấu nộp muộn (FLAG)</option>
              <option value="BLOCK">Chặn nộp sau hạn (BLOCK)</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-ink">
            Cộng thêm ngày hạn nộp (0–7)
            <input
              type="number"
              min={0}
              max={7}
              value={deadlineOffsetDays}
              disabled={busy}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                setDeadlineOffsetDays(Number.isFinite(parsed) ? Math.max(0, Math.min(7, parsed)) : 0)
                setPreview(null)
                setCommitted(null)
              }}
              className="mt-1 block min-h-10 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">
            {error}
          </p>
        )}

        {committed && (
          <div role="status" className="rounded-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success-text">
            <strong>Đã sinh chu kỳ báo cáo thành công:</strong> {committed.cyclesCreated} chu kỳ mới được tạo cho {committed.projectsProcessed} đồ án ({committed.cyclesSkipped} chu kỳ trùng lịch được bỏ qua an toàn).
          </div>
        )}

        {preview && (
          <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <strong className="text-ink">
                {preview.dryRun ? 'Xem trước lịch dự kiến (Chưa ghi DB)' : 'Kết quả đã lưu'}
              </strong>
              <span className="text-xs text-ink-muted">
                {preview.projectsProcessed} đồ án · {preview.slots.length} khung tuần · +{preview.cyclesCreated} mới · {preview.cyclesSkipped} bỏ qua
              </span>
            </div>
            {preview.slots.length > 0 ? (
              <ul className="max-h-56 divide-y divide-hairline overflow-y-auto rounded-lg border border-hairline bg-card text-xs">
                {preview.slots.map((slot, index) => (
                  <li key={`${slot.periodStart}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="font-medium text-ink">
                      Kỳ {index + 1}: {formatReportDate(slot.periodStart)} – {formatReportDate(slot.periodEnd)}
                    </span>
                    <span className="text-ink-muted">
                      Hạn nộp: {formatReportDate(slot.deadline)}
                      {slot.adjustedForHolidayOrWeekend && (
                        <span className="ml-2 rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning-text">
                          Đã dời tránh ngày nghỉ
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">Không tìm thấy khoảng thời gian hợp lệ trong đợt thực thi này.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            Đóng
          </Button>
          <Button type="submit" variant="secondary" disabled={busy}>
            {busy ? 'Đang tính toán…' : 'Xem trước lịch (Dry-run)'}
          </Button>
          <Button
            type="button"
            disabled={busy || !preview || !preview.dryRun || preview.slots.length === 0}
            onClick={() => void runGeneration(false)}
          >
            {busy ? 'Đang tạo…' : 'Xác nhận sinh hàng loạt'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
