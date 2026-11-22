import { Link } from 'react-router-dom'

const steps = [
  { title: 'Chuẩn bị học vụ', text: 'Xem học kỳ, thời gian mở kỳ và chính sách. Cấu trúc học kỳ/kỳ đồ án do quản trị viên cấu hình; bộ môn chỉ sửa chính sách khi được cấp quyền.', to: '/academic/governance', action: 'Xem kỳ và chính sách' },
  { title: 'Xác minh hồ sơ học vụ', text: 'Đối chiếu khoa và chuyên ngành của sinh viên, xác minh hoặc yêu cầu bổ sung. Đây là hồ sơ học vụ, tách biệt với điều kiện đào tạo và chứng chỉ tham gia đồ án.', to: '/academic/profile-verifications', action: 'Kiểm tra khoa và chuyên ngành' },
  { title: 'Xác minh sinh viên', text: 'Lọc hồ sơ chờ xác minh, đối chiếu đào tạo và thông tin chứng chỉ. Xác minh đủ điều kiện hoặc từ chối kèm lý do.', to: '/department/student-qualifications', action: 'Mở hồ sơ sinh viên' },
  { title: 'Chuẩn bị đề tài', text: 'Tạo bản nháp, chọn kỳ/ngành và hoàn thiện đề cương. Kiểm tra trước khi công bố; đóng đề tài theo trạng thái được phép.', to: '/department/topics', action: 'Quản lý đề tài' },
  { title: 'Thẩm định đề cương', text: 'Mở hồ sơ, xem bản chốt đề cương và ý kiến các bộ môn. Bộ môn tham gia ghi ý kiến; bộ môn chủ trì ra quyết định cuối theo quyền hiện hành. Yêu cầu sửa cần lý do; nhóm sinh viên nộp lại.', to: '/department/projects/review', action: 'Mở hàng đợi thẩm định' },
  { title: 'Theo dõi và điều phối', text: 'Chọn đồ án trong danh mục để xem báo cáo, công việc sau trao đổi, minh chứng và phân công hướng dẫn. Đồ án đang thực hiện dùng luồng thay giảng viên; không kết thúc phân công riêng lẻ.', to: '/department/portfolio', action: 'Chọn đồ án để theo dõi' },
  { title: 'Đánh giá và kết thúc', text: 'Trong hồ sơ đồ án: kiểm tra bàn giao → phương án đánh giá → người chấm → xem trước kết quả → xác nhận công bố. Điểm do hệ thống tính; lưu trữ chỉ khi điều kiện và quyền cho phép.', to: '/department/portfolio', action: 'Chọn đồ án để đánh giá' },
]

export function DepartmentWorkflowGuide() {
  return (
    <details className="group rounded-xl border border-hairline bg-card overflow-hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 font-heading text-sm font-semibold text-ink hover:bg-canvas/60 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-[19px] text-primary" aria-hidden="true">menu_book</span>
          <span>Hướng dẫn vận hành bộ môn theo vòng đời đồ án</span>
        </span>
        <span className="material-symbols-outlined text-[20px] text-ink-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true">expand_more</span>
      </summary>
      <div className="border-t border-hairline px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <p className="text-sm leading-6 text-ink-muted">Các bước giúp tìm đúng màn hình. Quyền và điều kiện thao tác được kiểm tra trên từng hồ sơ, không được cấp thêm từ hướng dẫn này.</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">{steps.map((step, index) => <li key={step.title} className="rounded-lg border border-hairline bg-canvas/40 p-4"><h3 className="font-semibold text-ink">{index + 1}. {step.title}</h3><p className="mt-1.5 text-sm leading-6 text-ink-muted">{step.text}</p><Link className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={step.to}>{step.action}</Link></li>)}</ol>
      </div>
    </details>
  )
}
