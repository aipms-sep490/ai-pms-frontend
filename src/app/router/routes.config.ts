export type UserRole = 'student' | 'supervisor' | 'department'

export type RouteStatus = 'implemented' | 'coming_soon'

export interface AppRouteMeta {
  id: string
  path: string
  title: string
  breadcrumb: string
  icon: string
  role: UserRole | 'all'
  status: RouteStatus
  badge?: string
  badgeVariant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'se' | 'uiux' | 'ai' | 'qa'
  dot?: boolean
  section: 'workspace' | 'management' | 'auth'
}

export const mvpRoutes: readonly AppRouteMeta[] = [
  // Student Workspace
  {
    id: 'screen-1',
    path: '/project/overview',
    title: 'Tổng quan lộ trình',
    breadcrumb: 'Tổng quan',
    icon: 'dashboard',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'screen-2',
    path: '/projects/lifecycle',
    title: 'Hồ sơ đồ án',
    breadcrumb: 'Hồ sơ đồ án',
    icon: 'badge',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'screen-3',
    path: '/project/milestones',
    title: 'Mốc đồ án',
    breadcrumb: 'Mốc đồ án',
    icon: 'timeline',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'screen-7',
    path: '/project/gantt',
    title: 'Lịch thực hiện',
    breadcrumb: 'Lịch thực hiện',
    icon: 'view_timeline',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'screen-5',
    path: '/project/reports',
    title: 'Báo cáo tiến độ',
    breadcrumb: 'Báo cáo tiến độ',
    icon: 'assignment_turned_in',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'screen-10',
    path: '/project/meetings',
    title: 'Lịch họp và biên bản',
    breadcrumb: 'Lịch họp và biên bản',
    icon: 'diversity_3',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'final-submission',
    path: '/project/final-submission',
    title: 'Bàn giao cuối kỳ',
    breadcrumb: 'Bàn giao cuối kỳ',
    icon: 'inventory_2',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'project-result',
    path: '/project/result',
    title: 'Kết quả đồ án',
    breadcrumb: 'Kết quả',
    icon: 'workspace_premium',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'project-contributions',
    path: '/project/contributions',
    title: 'Đóng góp thành viên',
    breadcrumb: 'Đóng góp',
    icon: 'diversity_3',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'screen-4',
    path: '/project/ai',
    title: 'Trợ lý AI và phân tích',
    breadcrumb: 'Phân tích bằng AI',
    icon: 'neurology',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },

  // Management Workspace
  {
    id: 'screen-8',
    path: '/supervisor/workspace',
    title: 'Bàn làm việc GVHD',
    breadcrumb: 'Bàn làm việc giảng viên',
    icon: 'supervisor_account',
    role: 'supervisor',
    status: 'implemented',
    badge: 'GVHD',
    section: 'management',
  },
  {
    id: 'screen-9',
    path: '/department/workspace',
    title: 'Quản lý bộ môn',
    breadcrumb: 'Quản lý bộ môn',
    icon: 'account_balance',
    role: 'department',
    status: 'implemented',
    badge: 'Khoa',
    section: 'management',
  },

  // Auth / Public
  {
    id: 'screen-6',
    path: '/login',
    title: 'Đăng nhập',
    breadcrumb: 'Đăng nhập',
    icon: 'lock',
    role: 'all',
    status: 'implemented',
    section: 'auth',
  },
  {
    id: 'profile',
    path: '/profile',
    title: 'Hồ sơ tài khoản',
    breadcrumb: 'Hồ sơ',
    icon: 'account_circle',
    role: 'all',
    status: 'implemented',
    section: 'auth',
  },
] as const

/**
 * Returns metadata for the student workspace.
 */
export function getStudentNavItems() {
  const workspaceItems = mvpRoutes.filter(
    (r) => r.section === 'workspace' && (r.role === 'student' || r.role === 'all')
  ).filter((route) => env.aiAdvisoryEnabled || route.path !== '/project/ai')
  const managementItems = mvpRoutes.filter(
    (r) => r.section === 'management'
  )

  return { workspaceItems, managementItems }
}

/**
 * Resolves a breadcrumb title from the current pathname.
 */
export function getBreadcrumbForPath(pathname: string): string {
  const registryBreadcrumb = getWorkspaceBreadcrumb(pathname)
  if (registryBreadcrumb && (pathname !== '/project/ai' || env.aiAdvisoryEnabled)) return registryBreadcrumb
  if (/^\/project\/meetings\/new(?:\/|$)/.test(pathname) || /^\/supervisor\/projects\/\d+\/meetings\/new(?:\/|$)/.test(pathname)) {
    return 'Lên lịch họp'
  }
  if (pathname === '/project/deliverables' || /^\/supervisor\/projects\/\d+\/deliverables(?:\/|$)/.test(pathname)) return 'Hạng mục cần nộp'
  if (pathname === '/project/files' || /^\/supervisor\/projects\/\d+\/files(?:\/|$)/.test(pathname) || /^\/department\/projects\/\d+\/files(?:\/|$)/.test(pathname)) return 'Kho tệp đồ án'
  if (pathname === '/project/evidence' || /^\/(?:supervisor|department)\/projects\/\d+\/evidence(?:\/|$)/.test(pathname)) return 'Sổ minh chứng'
  if (pathname === '/evaluator/evaluations') return 'Đánh giá được phân công'
  if (/^\/evaluator\/evaluations\/\d+(?:\/|$)/.test(pathname)) return 'Chi tiết đánh giá'
  if (pathname === '/evaluator/workspace') return 'Bàn làm việc đánh giá'
  if (/^\/evaluator\/assignments\/\d+(?:\/|$)/.test(pathname)) return 'Phân công đánh giá'
  if (/^\/project\/meetings\/\d+(?:\/|$)/.test(pathname) || /^\/supervisor\/projects\/\d+\/meetings\/\d+(?:\/|$)/.test(pathname)) {
    return 'Chi tiết cuộc họp'
  }
  if (/^\/project\/meetings(?:\/|$)/.test(pathname) || /^\/supervisor\/projects\/\d+\/meetings(?:\/|$)/.test(pathname)) {
    return 'Lịch họp và biên bản'
  }
  if (/^\/project\/reports\/new(?:\/|$)/.test(pathname) || /^\/supervisor\/projects\/\d+\/reports\/new(?:\/|$)/.test(pathname)) {
    return 'Soạn báo cáo tiến độ'
  }
  if (/^\/project\/reports\/\d+(?:\/|$)/.test(pathname) || /^\/supervisor\/projects\/\d+\/reports\/\d+(?:\/|$)/.test(pathname)) {
    return 'Chi tiết báo cáo'
  }
  if (pathname.startsWith('/project/reports') || /^\/supervisor\/projects\/\d+\/reports(?:\/|$)/.test(pathname)) {
    return 'Báo cáo tiến độ'
  }
  if (pathname === '/' || pathname === '/project/overview') {
    return 'Tổng quan lộ trình'
  }
  if (pathname === '/project/workspace') return 'Phối hợp nhóm'
  if (pathname === '/project/ai' || /^\/supervisor\/projects\/\d+\/ai(?:\/|$)/.test(pathname)) return env.aiAdvisoryEnabled ? 'Trợ lý AI và phân tích' : 'Trang không tồn tại'
  if (/^\/department\/projects\/\d+\/risk(?:\/|$)/.test(pathname)) return env.aiAdvisoryEnabled ? 'Phân tích rủi ro đồ án' : 'Trang không tồn tại'
  if (pathname === '/department/projects/archived') return 'Kho lưu trữ đồ án'
  if (/^\/department\/projects\/\d+\/archive-view(?:\/|$)/.test(pathname)) return 'Hồ sơ đồ án lưu trữ'
  if (/^\/supervisor\/projects\/\d+\/workspace(?:\/|$)/.test(pathname)) {
    return 'Không gian đồ án'
  }
  if (pathname.startsWith('/project/milestones') || /^\/supervisor\/projects\/\d+\/milestones(?:\/|$)/.test(pathname)) {
    return 'Mốc đồ án'
  }
  if (/^\/project\/tasks\/\d+(?:\/|$)/.test(pathname) || /^\/supervisor\/projects\/\d+\/tasks\/\d+(?:\/|$)/.test(pathname)) {
    return 'Chi tiết công việc'
  }
  if (pathname.startsWith('/project/tasks') || /^\/supervisor\/projects\/\d+\/tasks(?:\/|$)/.test(pathname)) {
    return 'Công việc'
  }
  if (pathname === '/project/gantt' || /^\/supervisor\/projects\/\d+\/gantt(?:\/|$)/.test(pathname)) {
    return 'Lịch thực hiện'
  }
  if (pathname === '/team' || pathname === '/team/create') {
    return pathname === '/team/create' ? 'Tạo nhóm đồ án' : 'Thành viên nhóm'
  }
  if (pathname === '/topics') {
    return 'Danh mục đề tài'
  }
  if (pathname === '/project/register') {
    return 'Đăng ký đồ án'
  }
  if (pathname === '/project/source') return 'Chọn cách đăng ký đồ án'
  if (pathname === '/project/edit') {
    return 'Chỉnh sửa đề cương'
  }
  if (pathname === '/project/status') {
    return 'Theo dõi thẩm định'
  }
  if (pathname === '/project/supervisor') {
    return 'Chọn giảng viên hướng dẫn'
  }
  if (pathname.startsWith('/department/projects/review')) return 'Thẩm định đề cương'
  if (/^\/department\/projects\/\d+\/result(?:\/|$)/.test(pathname)) return 'Công bố kết quả đồ án'
  if (/^\/department\/projects\/\d+\/evaluation-schemes(?:\/|$)/.test(pathname)) return 'phương án đánh giá đánh giá'
  if (/^\/department\/projects\/\d+\/governance(?:\/|$)/.test(pathname)) return 'Điều phối đồ án'
  if (/^\/department\/projects\/\d+\/(?:evaluations|evaluators)(?:\/|$)/.test(pathname)) return 'Phân công người chấm'
  if (/^\/department\/projects\/\d+\/final-requirements(?:\/|$)/.test(pathname)) return 'Yêu cầu bàn giao'
  if (pathname === '/project/final-submission' || /^\/(?:department|supervisor|evaluator)\/projects\/\d+\/final-submission(?:\/|$)/.test(pathname)) return 'Gói bàn giao cuối'
  if (/^\/department\/projects\/\d+\/contributions(?:\/|$)/.test(pathname)) return 'Đóng góp thành viên'
  if (/^\/supervisor\/projects\/\d+\/contributions(?:\/|$)/.test(pathname)) return 'Đóng góp thành viên'
  if (pathname === '/department/portfolio') return 'Danh mục đồ án'
  if (pathname === '/academic/rubrics') return 'Bộ tiêu chí đánh giá'
  if (pathname === '/notifications') return 'Thông báo'
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return 'Tin nhắn'
  if (pathname === '/supervisor/dashboard') return 'Tổng quan GVHD'
  if (pathname === '/department/student-qualifications') return 'Xác minh điều kiện tham gia'
  if (pathname === '/academic') return 'Cấu trúc đào tạo'
  if (/^\/academic\/project-periods\/\d+\/policy(?:\/|$)/.test(pathname)) return 'Phiên bản chính sách'
  if (pathname === '/academic/governance') return 'Quản lý học vụ'
  if (pathname === '/project/ai') return 'Trang không tồn tại'
  if (pathname.startsWith('/department/supervisors')) return 'Giám sát GVHD'
  if (pathname.startsWith('/department/topics')) return 'Quản lý đề tài'
  if (pathname === '/admin/access') return 'Quản trị nền tảng'
  if (pathname === '/admin/access/rbac') return 'Vai trò và quyền truy cập'
  if (/^\/admin\/access\/users\/\d+(?:\/|$)/.test(pathname)) return 'Chi tiết tài khoản'
  if (pathname === '/supervisor/workspace') return 'Bàn làm việc GVHD'
  if (pathname === '/profile') return 'Hồ sơ tài khoản'
  if (pathname === '/profile/security') return 'Đổi mật khẩu'
  if (pathname === '/forgot-password') return 'Quên mật khẩu'
  if (pathname === '/reset-password') return 'Đặt lại mật khẩu'
  const match = mvpRoutes.find((r) => r.path === pathname)
  if (match) {
    return match.title
  }
  return 'Trang không tồn tại'
}
import { env } from '../config/env'
import { getWorkspaceBreadcrumb } from './workspace-route-registry'
