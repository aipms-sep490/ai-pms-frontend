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
  return <details className="rounded-lg border border-hairline bg-card p-4 sm:p-5"><summary className="min-h-11 cursor-pointer font-heading font-semibold text-slate-900">Hướng dẫn vận hành DEPART theo vòng đời đồ án</summary><p className="mt-2 text-sm leading-6 text-slate-600">Các bước giúp tìm đúng màn hình. Quyền và điều kiện thao tác được kiểm tra trên từng hồ sơ, không được cấp thêm từ hướng dẫn này.</p><ol className="mt-4 grid gap-4 md:grid-cols-2">{steps.map((step, index) => <li key={step.title} className="rounded-lg border border-hairline p-4"><h3 className="font-semibold text-slate-900">{index + 1}. {step.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p><Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline" to={step.to}>{step.action}</Link></li>)}</ol></details>
}
