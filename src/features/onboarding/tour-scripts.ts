import type { WorkspaceRole } from '../auth/utils/role-access'
import type { TourScript, TourStep } from './tour-types'
import { TOUR_ANCHOR } from './tour-anchors'

/** Steps shared by every role, anchored on the app shell so they work on any
 * page. Role scripts prepend a tailored welcome and primary-navigation step. */
const commonTail: readonly TourStep[] = [
  { id: 'quick-nav', target: TOUR_ANCHOR.quickNav, title: 'Tìm nhanh mọi chức năng', body: 'Nhấn nút này hoặc phím Ctrl + K để nhảy tới bất kỳ màn hình nào mà không phải tìm trong menu.', fallbackBody: 'Nút tìm nhanh không hiển thị tại đây. Dùng Ctrl + K để tìm chức năng.', placement: 'bottom' },
  { id: 'notifications', target: TOUR_ANCHOR.notifications, title: 'Thông báo học vụ', body: 'Nhắc hạn, kết quả thẩm định và cập nhật từ giảng viên sẽ hiện ở đây. Chấm đỏ là số mục chưa đọc.', fallbackBody: 'Thông báo học vụ nằm ở biểu tượng chuông trên thanh tiêu đề. Số đỏ là số mục chưa đọc.', placement: 'bottom' },
  { id: 'breadcrumb', target: TOUR_ANCHOR.breadcrumb, title: 'Bạn đang ở đâu', body: 'Dải đường dẫn luôn cho biết học kỳ, nhóm và màn hình hiện tại để bạn không bị lạc.', fallbackBody: 'Dải đường dẫn ngay dưới thanh tiêu đề cho biết học kỳ, nhóm và màn hình hiện tại.', placement: 'bottom' },
  { id: 'help', target: TOUR_ANCHOR.help, title: 'Mở lại hướng dẫn bất cứ lúc nào', body: 'Cần xem lại? Nhấn nút Hướng dẫn này để chạy lại toàn bộ các bước giới thiệu.', fallbackBody: 'Bạn có thể chạy lại hướng dẫn bằng nút Hướng dẫn trên thanh tiêu đề.', placement: 'bottom' },
]

const studentScript: TourScript = {
  role: 'student',
  label: 'Hướng dẫn sinh viên',
  steps: [
    { id: 'welcome', title: 'Chào mừng đến AI-PMS', body: 'Đây là không gian theo dõi đồ án của nhóm bạn: từ lập nhóm, đăng ký đề tài, thực hiện cho tới nghiệm thu. Hãy đi qua vài bước ngắn để làm quen.', placement: 'center' },
    { id: 'nav', target: TOUR_ANCHOR.sidebar, title: 'Thanh điều hướng đồ án', body: 'Mọi màn hình của nhóm nằm ở đây. Một số mục chỉ hiện khi đồ án đã bắt đầu, nên danh sách sẽ đầy dần theo tiến độ.', fallbackBody: 'Menu bên trái sẽ hiện các màn hình của nhóm khi thông tin đồ án đã tải xong; một số mục chỉ có khi đồ án bắt đầu.', placement: 'right' },
    { id: 'primary', target: TOUR_ANCHOR.sidebarPrimary, title: 'Bắt đầu từ Tổng quan lộ trình', body: 'Màn hình này tóm tắt bạn đang ở bước nào và cần làm gì tiếp theo. Khi chưa rõ nên vào đâu, hãy quay lại đây.', fallbackBody: 'Mục đầu tiên nằm trong thanh điều hướng. Mở rộng thanh bên hoặc chờ menu tải xong để thấy mục này.', placement: 'right' },
    ...commonTail,
    { id: 'profile', target: TOUR_ANCHOR.profile, title: 'Tài khoản của bạn', body: 'Thông tin cá nhân và nút đăng xuất nằm ở góc dưới. Nhấn vào tên để mở hồ sơ học vụ.', fallbackBody: 'Hồ sơ học vụ và đăng xuất nằm trong mục tài khoản ở cuối menu bên trái.', placement: 'right' },
  ],
}

const lecturerScript: TourScript = {
  role: 'lecturer',
  label: 'Hướng dẫn giảng viên',
  steps: [
    { id: 'welcome', title: 'Chào mừng giảng viên', body: 'Không gian này giúp bạn hướng dẫn và theo dõi các nhóm phụ trách, chấm minh chứng và tham gia đánh giá. Vài bước ngắn sau sẽ chỉ chỗ các công cụ chính.', placement: 'center' },
    { id: 'nav', target: TOUR_ANCHOR.sidebar, title: 'Không gian giảng viên', body: 'Tổng quan hướng dẫn, danh sách nhóm và các màn đánh giá nằm ở đây. Mục Đánh giá đồ án chỉ hiện khi bạn được phân công chấm.', fallbackBody: 'Menu bên trái sẽ hiện nhóm được hướng dẫn và bài chấm sau khi dữ liệu phân công tải xong.', placement: 'right' },
    { id: 'primary', target: TOUR_ANCHOR.sidebarPrimary, title: 'Bắt đầu từ Tổng quan hướng dẫn', body: 'Màn hình này gom các nhóm bạn phụ trách cùng việc cần xử lý, giúp bạn nắm nhanh nhóm nào cần chú ý.', fallbackBody: 'Mục đầu tiên nằm trong thanh điều hướng. Mở rộng thanh bên hoặc chờ menu tải xong để thấy mục này.', placement: 'right' },
    ...commonTail,
    { id: 'profile', target: TOUR_ANCHOR.profile, title: 'Hồ sơ giảng viên', body: 'Thông tin tài khoản và đăng xuất ở góc dưới. Hồ sơ chuyên môn dùng cho gợi ý ghép nhóm mở từ đây.', fallbackBody: 'Hồ sơ chuyên môn và đăng xuất nằm trong mục tài khoản ở cuối menu bên trái.', placement: 'right' },
  ],
}

const departmentScript: TourScript = {
  role: 'department',
  label: 'Hướng dẫn bộ môn',
  steps: [
    { id: 'welcome', title: 'Chào mừng đến quản trị học vụ', body: 'Không gian bộ môn quản lý học kỳ, thẩm định đề cương, xác minh điều kiện sinh viên và theo dõi đồ án trong phạm vi khoa.', placement: 'center' },
    { id: 'nav', target: TOUR_ANCHOR.sidebar, title: 'Điều hướng quản trị học vụ', body: 'Các màn thẩm định, điều kiện sinh viên, giảng viên và cấu trúc đào tạo nằm ở đây.', fallbackBody: 'Menu bên trái sẽ hiện các công cụ học vụ thuộc quyền bộ môn sau khi dữ liệu tải xong.', placement: 'right' },
    { id: 'primary', target: TOUR_ANCHOR.sidebarPrimary, title: 'Tổng quan bộ môn', body: 'Màn hình này tóm tắt công việc học vụ đang chờ xử lý trong phạm vi khoa của bạn.', fallbackBody: 'Mục đầu tiên nằm trong thanh điều hướng. Mở rộng thanh bên để thấy mục này.', placement: 'right' },
    { id: 'notifications', target: TOUR_ANCHOR.notifications, title: 'Thông báo học vụ', body: 'Yêu cầu thẩm định và cập nhật quy trình sẽ hiện ở đây.', fallbackBody: 'Yêu cầu thẩm định và cập nhật học vụ nằm ở biểu tượng chuông trên thanh tiêu đề.', placement: 'bottom' },
    { id: 'help', target: TOUR_ANCHOR.help, title: 'Mở lại hướng dẫn', body: 'Nhấn nút Hướng dẫn bất cứ lúc nào để xem lại các bước này.', fallbackBody: 'Bạn có thể chạy lại hướng dẫn bằng nút Hướng dẫn trên thanh tiêu đề.', placement: 'bottom' },
  ],
}

const adminScript: TourScript = {
  role: 'admin',
  label: 'Hướng dẫn quản trị',
  steps: [
    { id: 'welcome', title: 'Chào mừng đến quản trị nền tảng', body: 'Không gian quản trị tập trung vào tài khoản, phân quyền và cấu hình hệ thống. Quyền học thuật thuộc về bộ môn, không thuộc Admin.', placement: 'center' },
    { id: 'nav', target: TOUR_ANCHOR.sidebar, title: 'Điều hướng quản trị', body: 'Quản trị quyền, tổng quan đồ án và mẫu mốc đồ án nằm ở đây.', fallbackBody: 'Menu bên trái sẽ hiện quản trị quyền, tổng quan đồ án và mẫu mốc sau khi dữ liệu tải xong.', placement: 'right' },
    { id: 'primary', target: TOUR_ANCHOR.sidebarPrimary, title: 'Quản trị nền tảng', body: 'Bắt đầu từ màn quản trị quyền để quản lý tài khoản và vai trò hệ thống.', fallbackBody: 'Mục đầu tiên nằm trong thanh điều hướng. Mở rộng thanh bên để thấy mục này.', placement: 'right' },
    { id: 'help', target: TOUR_ANCHOR.help, title: 'Mở lại hướng dẫn', body: 'Nhấn nút Hướng dẫn bất cứ lúc nào để xem lại các bước này.', fallbackBody: 'Bạn có thể chạy lại hướng dẫn bằng nút Hướng dẫn trên thanh tiêu đề.', placement: 'bottom' },
  ],
}

const scripts: Partial<Record<WorkspaceRole, TourScript>> = {
  student: studentScript,
  lecturer: lecturerScript,
  department: departmentScript,
  admin: adminScript,
}

/** Returns the tour script for a role, or null for roles without one (unknown). */
export function getTourScript(role: WorkspaceRole): TourScript | null {
  return scripts[role] ?? null
}
