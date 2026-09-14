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
    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[22px]">feedback</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              Hội đồng Bộ môn yêu cầu chỉnh sửa đề cương (Revision Required)
            </h4>
            <p className="text-xs text-amber-800/90 mt-0.5">
              Đề cương sơ bộ chưa đạt phê duyệt hoàn toàn. Vui lòng đọc kỹ ý kiến thẩm định bên dưới và tiến hành cập nhật.
            </p>
          </div>
        </div>

        {handleEdit && (
          <button
            type="button"
            onClick={handleEdit}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            Sửa đề cương ngay
          </button>
        )}
      </div>

      <div className="bg-white/90 border border-amber-200 rounded-xl p-4 ml-13">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block mb-1">
          Nội dung thẩm định từ {reviewerName || 'Hội đồng Khoa CNTT'}:
        </span>
        <p className="text-xs text-slate-800 leading-relaxed font-medium">
          "{reason || 'Cần bổ sung chi tiết kiến trúc phân hệ AI, ma trận RTM và phương pháp đánh giá thực nghiệm.'}"
        </p>
        {displayDate && (
          <span className="text-[10px] text-slate-400 mt-2 block">
            Thời gian phản hồi: {new Date(displayDate).toLocaleString('vi-VN')}
          </span>
        )}
      </div>
    </div>
  )
}
