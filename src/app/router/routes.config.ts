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
    path: '/project/workspace',
    title: 'Bàn làm việc Tổng quan',
    breadcrumb: 'Bàn làm việc',
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
    path: '/project/deliverables',
    title: 'Báo cáo & Bàn giao',
    breadcrumb: 'Sản phẩm bàn giao',
    icon: 'assignment_turned_in',
    role: 'student',
    status: 'coming_soon',
    badge: '1 mới',
    section: 'workspace',
  },
  {
    id: 'screen-10',
    path: '/project/meetings',
    title: 'Lịch họp & Đánh giá',
    breadcrumb: 'Biên bản & Đánh giá',
    icon: 'diversity_3',
    role: 'student',
    status: 'coming_soon',
    dot: true,
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
    status: 'coming_soon',
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
    status: 'coming_soon',
    section: 'auth',
  },
] as const

/**
 * Returns navigation items for Student Workspace (Batch 0-2 baseline).
 * Full role-switched workspaces will be implemented in Batch 3.
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
  if (pathname === '/' || pathname === '/project/workspace') {
    return 'Bàn làm việc Tổng quan'
  }
  if (pathname.startsWith('/project/milestones')) {
    return 'Tiến trình & Cột mốc'
  }
  const match = mvpRoutes.find((r) => r.path === pathname)
  if (match) {
    return match.title
  }
  return pathname.replace(/^\//, '')
}
