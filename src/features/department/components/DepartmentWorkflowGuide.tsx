import { Link } from 'react-router-dom'

const steps = [
  { title: 'Chuẩn bị học vụ', text: 'Xem học kỳ, thời gian mở kỳ và chính sách. Cấu trúc học kỳ/kỳ đồ án do quản trị viên cấu hình; bộ môn chỉ sửa chính sách khi được cấp quyền.', to: '/academic/governance', action: 'Xem kỳ và chính sách' },
  { title: 'Xác minh hồ sơ học vụ', text: 'Đối chiếu khoa và chuyên ngành của sinh viên, xác minh hoặc yêu cầu bổ sung. Đây là hồ sơ học vụ, tách biệt với điều kiện đào tạo và chứng chỉ tham gia đồ án.', to: '/academic/profile-verifications', action: 'Kiểm tra khoa và chuyên ngành' },
  { title: 'Xác minh sinh viên', text: 'Lọc hồ sơ chờ xác minh, đối chiếu đào tạo và thông tin chứng chỉ. Xác minh đủ điều kiện hoặc từ chối kèm lý do.', to: '/department/student-qualifications', action: 'Mở hồ sơ sinh viên' },
  { title: 'Chuẩn bị đề tài', text: 'Tạo bản nháp, chọn kỳ/ngành và hoàn thiện đề cương. Kiểm tra trước khi công bố; đóng đề tài theo trạng thái được phép.', to: '/department/topics', action: 'Quản lý đề tài' },
  { title: 'Thẩm định đề cương', text: 'Mở hồ sơ, xem snapshot và ý kiến các khoa. Khoa tham gia ghi ý kiến; khoa chủ trì ra quyết định cuối theo quyền hiện hành. Yêu cầu sửa cần lý do; nhóm sinh viên nộp lại.', to: '/department/projects/review', action: 'Mở hàng đợi thẩm định' },
  { title: 'Theo dõi và điều phối', text: 'Chọn đồ án trong danh mục để xem báo cáo, công việc sau trao đổi, minh chứng và phân công hướng dẫn. Đồ án ACTIVE dùng luồng thay giảng viên; không kết thúc assignment riêng lẻ.', to: '/department/portfolio', action: 'Chọn đồ án để theo dõi' },
  { title: 'Đánh giá và kết thúc', text: 'Trong hồ sơ đồ án: kiểm tra bàn giao → phương án đánh giá → người chấm → xem trước kết quả → xác nhận công bố. Điểm do BE tính; lưu trữ chỉ khi điều kiện và quyền cho phép.', to: '/department/portfolio', action: 'Chọn đồ án để đánh giá' },
]

export function DepartmentWorkflowGuide() {
  return (
    <details className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <span className="inline-flex items-center gap-2 font-heading">
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">menu_book</span>
          Hướng dẫn vận hành bộ môn theo vòng đời đồ án
        </span>
        <span className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted">
          <span className="rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-semibold text-primary">
            {steps.length} bước
          </span>
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">expand_more</span>
        </span>
      </summary>
      <div className="border-t border-hairline bg-canvas/50 p-4 sm:p-5">
        <p className="max-w-3xl text-xs leading-5 text-ink-muted">
          Các bước giúp tìm đúng màn hình. Quyền và điều kiện thao tác được kiểm tra trên từng hồ sơ, không được cấp thêm từ hướng dẫn này.
        </p>
        <ol className="mt-3.5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col justify-between rounded-xl border border-hairline bg-card p-3.5">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-subtle font-mono text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  {step.title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-ink-muted">{step.text}</p>
              </div>
              <Link className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={step.to}>
                {step.action}
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </details>
  )
}
