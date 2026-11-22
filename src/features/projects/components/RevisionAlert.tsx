import { dateTimeLabel } from '../../execution/execution-utils'
interface RevisionAlertProps {
  reason?: string | null
  reviewerName?: string | null
  date?: string | null
  timestamp?: string | null
  onEditClick?: () => void
  onEdit?: () => void
}

export function RevisionAlert({
  reason,
  reviewerName,
  date,
  timestamp,
  onEditClick,
  onEdit,
}: RevisionAlertProps) {
  const displayDate = date ?? timestamp
  const handleEdit = onEdit ?? onEditClick
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-status-warning-border border-l-4 border-l-[var(--color-accent-amber)] bg-status-warning-bg p-5 shadow-xs">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-status-warning-border bg-card text-status-warning-text">
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">feedback</span>
          </div>
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-status-warning-text">
              Hội đồng Bộ môn yêu cầu chỉnh sửa đề cương (Revision Required)
            </h4>
            <p className="mt-0.5 text-xs text-status-warning-text">
              Đề cương sơ bộ chưa đạt phê duyệt hoàn toàn. Vui lòng đọc kỹ ý kiến thẩm định bên dưới và tiến hành cập nhật.
            </p>
          </div>
        </div>

        {handleEdit && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">edit_note</span>
            Sửa đề cương ngay
          </button>
        )}
      </div>

      <div className="mt-2 border-l-2 border-status-warning-border pl-4">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-status-warning-text">
          Nội dung thẩm định từ {reviewerName || 'Hội đồng Khoa CNTT'}:
        </span>
        <p className="text-xs font-medium leading-relaxed text-ink-soft">
          "{reason || 'Chưa có nội dung nhận xét.'}"
        </p>
        {displayDate && (
          <span className="mt-2 block text-xs text-ink-muted">
            Thời gian phản hồi: {dateTimeLabel(displayDate)}
          </span>
        )}
      </div>
    </div>
  )
}
