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
    <div className="bg-status-warning-bg border-2 border-warning-strong rounded-2xl p-5 shadow-xs flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-status-warning-bg text-status-warning-text flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[22px]">feedback</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-status-warning-text flex items-center gap-2">
              Hội đồng Bộ môn yêu cầu chỉnh sửa đề cương (Revision Required)
            </h4>
            <p className="text-xs text-status-warning-text/90 mt-0.5">
              Đề cương sơ bộ chưa đạt phê duyệt hoàn toàn. Vui lòng đọc kỹ ý kiến thẩm định bên dưới và tiến hành cập nhật.
            </p>
          </div>
        </div>

        {handleEdit && (
          <button
            type="button"
            onClick={handleEdit}
            className="px-4 py-2 bg-warning-strong hover:bg-warning-strong-hover text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            Sửa đề cương ngay
          </button>
        )}
      </div>

      <div className="mt-4 border-l-2 border-warning-strong pl-4">
        <span className="text-xs font-bold uppercase tracking-wider text-status-warning-text block mb-1">
          Nội dung thẩm định từ {reviewerName || 'Hội đồng Khoa CNTT'}:
        </span>
        <p className="text-xs text-ink-soft leading-relaxed font-medium">
          "{reason || 'Chưa có nội dung nhận xét.'}"
        </p>
        {displayDate && (
          <span className="text-xs text-slate-400 mt-2 block">
            Thời gian phản hồi: {dateTimeLabel(displayDate)}
          </span>
        )}
      </div>
    </div>
  )
}
