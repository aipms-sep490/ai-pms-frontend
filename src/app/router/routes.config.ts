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
    title: 'Đăng ký & Hồ sơ đề tài',
    breadcrumb: 'Hồ sơ đề tài',
    icon: 'badge',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'screen-3',
    path: '/project/milestones/M3',
    title: 'Tiến trình & Cột mốc',
    breadcrumb: 'Cột mốc M3',
    icon: 'timeline',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'screen-7',
    path: '/project/gantt',
    title: 'Gantt & Đường găng',
    breadcrumb: 'Biểu đồ Gantt',
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
    title: 'Lịch họp & biên bản',
    breadcrumb: 'Lịch họp & biên bản',
    icon: 'diversity_3',
    role: 'student',
    status: 'implemented',
    section: 'workspace',
  },
  {
    id: 'screen-4',
    path: '/project/ai',
    title: 'Trợ lý AI & Phân tích',
    breadcrumb: 'AI Analytics',
    icon: 'neurology',
    role: 'student',
    status: 'coming_soon',
    section: 'workspace',
  },

  // Management Workspace
  {
    id: 'screen-8',
    path: '/supervisor/workspace',
    title: 'Bàn làm việc GVHD',
    breadcrumb: 'GVHD Workspace',
    icon: 'supervisor_account',
    role: 'supervisor',
    status: 'implemented',
    badge: 'GVHD',
    section: 'management',
  },
  {
    id: 'screen-9',
    path: '/department/workspace',
    title: 'Quản lý Bộ môn',
    breadcrumb: 'Bộ môn Workspace',
    icon: 'account_balance',
    role: 'department',
    status: 'coming_soon',
    badge: 'Khoa',
    section: 'management',
  },

  // Auth / Public
  {
    id: 'screen-6',
    path: '/login',
    title: 'Cổng Đăng nhập & Phân quyền',
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
  )
  const managementItems = mvpRoutes.filter(
    (r) => r.section === 'management'
  )

  return { workspaceItems, managementItems }
}

/**
 * Resolves a breadcrumb title from the current pathname.
 */
export function getBreadcrumbForPath(pathname: string): string {
  if (/^\/project\/meetings\/new(?:\/|$)/.test(pathname) || /^\/supervisor\/projects\/\d+\/meetings\/new(?:\/|$)/.test(pathname)) {
    return 'Lên lịch họp'
  }
  if (pathname === '/project/deliverables' || /^\/supervisor\/projects\/\d+\/deliverables(?:\/|$)/.test(pathname)) return 'Deliverables & phiên bản'
  if (pathname === '/evaluator/evaluations') return 'Evaluations được phân công'
  if (/^\/evaluator\/evaluations\/\d+(?:\/|$)/.test(pathname)) return 'Evaluation Workspace'
  if (/^\/project\/meetings\/\d+(?:\/|$)/.test(pathname) || /^\/supervisor\/projects\/\d+\/meetings\/\d+(?:\/|$)/.test(pathname)) {
    return 'Chi tiết cuộc họp'
  }
  if (/^\/project\/meetings(?:\/|$)/.test(pathname) || /^\/supervisor\/projects\/\d+\/meetings(?:\/|$)/.test(pathname)) {
    return 'Lịch họp & biên bản'
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
  if (pathname === '/project/workspace' || /^\/supervisor\/projects\/\d+\/workspace(?:\/|$)/.test(pathname)) {
    return 'Không gian đồ án ACTIVE'
  }
  if (pathname.startsWith('/project/milestones') || /^\/supervisor\/projects\/\d+\/milestones(?:\/|$)/.test(pathname)) {
    return 'Tiến trình & Cột mốc'
  }
  if (/^\/project\/tasks\/\d+(?:\/|$)/.test(pathname) || /^\/supervisor\/projects\/\d+\/tasks\/\d+(?:\/|$)/.test(pathname)) {
    return 'Chi tiết công việc'
  }
  if (pathname.startsWith('/project/tasks') || /^\/supervisor\/projects\/\d+\/tasks(?:\/|$)/.test(pathname)) {
    return 'Quản lý Công việc & Bảng Kanban'
  }
  if (pathname === '/project/gantt' || /^\/supervisor\/projects\/\d+\/gantt(?:\/|$)/.test(pathname)) {
    return 'Gantt & Đường găng'
  }
  if (pathname === '/team' || pathname === '/team/create') {
    return 'Quản lý Nhóm & Tuyển quân'
  }
  if (pathname === '/topics') {
    return 'Danh mục Đề tài Tham khảo'
  }
  if (pathname === '/project/register') {
    return 'Đăng ký Đề tài Đồ án'
  }
  if (pathname === '/project/edit') {
    return 'Chỉnh sửa Đề cương Đồ án'
  }
  if (pathname === '/project/status') {
    return 'Trạng thái Thẩm định Đề tài'
  }
  if (pathname === '/project/supervisor') {
    return 'Ghép cặp Giảng viên Hướng dẫn'
  }
  if (pathname.startsWith('/department/projects/review')) return 'Thẩm định đề cương'
  if (/^\/department\/projects\/\d+\/result(?:\/|$)/.test(pathname)) return 'Công bố kết quả Project'
  if (pathname.startsWith('/department/supervisors')) return 'Giám sát GVHD'
  if (pathname.startsWith('/department/topics')) return 'Quản lý đề tài'
  if (pathname === '/admin/access') return 'Quản trị quyền'
  if (pathname === '/supervisor/workspace') return 'Bàn làm việc GVHD'
  if (pathname === '/profile') return 'Hồ sơ tài khoản'
  const match = mvpRoutes.find((r) => r.path === pathname)
  if (match) {
    return match.title
  }
  return pathname.replace(/^\//, '')
}
