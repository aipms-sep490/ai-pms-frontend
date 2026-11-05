export function ScoringGuideDrawer() {
  return <details className="rounded-xl border border-hairline bg-card p-4 text-sm">
    <summary className="min-h-11 cursor-pointer font-semibold">? Hướng dẫn chấm</summary>
    <div className="mt-2 space-y-2 leading-6 text-ink-muted">
      <p>Chấm hồ sơ đã khóa đánh giá sản phẩm đã nộp. Bảo vệ đánh giá mức làm chủ sản phẩm của người trình bày.</p>
      <p>Trọng số trong bộ tiêu chí là tỷ lệ của tiêu chí trong phiếu này. Tỷ trọng phiếu trong điểm sinh viên là tỷ lệ của cả bài chấm trong kết quả; máy chủ tính kết quả chính thức.</p>
      <p>Để trống nghĩa là chưa chấm, khác với điểm 0. Thiếu phiếu thì kết quả ở trạng thái chờ, không phải 0.</p>
    </div>
  </details>
}
