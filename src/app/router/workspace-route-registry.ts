import { env } from '../config/env'
import type { WorkspaceAccess, ProjectAssignment } from '../context/workspace-access'

export type NavigationSection = 'student' | 'lecturer' | 'governance' | 'administration' | 'account'

export interface WorkspaceRouteMeta {
  id: string
  path: string
  title: string
  breadcrumb: string
  icon: string
  section: NavigationSection
  identityRoles: readonly string[]
  /** Presentation metadata only; direct-route authorization remains separate. */
  requiredPermission?: string
  navigationVisibility: 'always' | 'contextual'
  requiredAssignment?: ProjectAssignment
  projectStates?: readonly string[]
  featureEnabled?: boolean
}

/** Canonical metadata for the app-shell routes migrated in Workspace Phase 1. */
export const workspaceRouteRegistry: readonly WorkspaceRouteMeta[] = [
  { id: 'student-overview', path: '/project/overview', title: 'Tổng quan lộ trình', breadcrumb: 'Tổng quan lộ trình', icon: 'dashboard', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'always' },
  { id: 'student-lifecycle', path: '/projects/lifecycle', title: 'Hồ sơ đồ án', breadcrumb: 'Hồ sơ đồ án', icon: 'folder_open', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'always' },
  { id: 'student-workspace', path: '/project/workspace', title: 'Phối hợp nhóm', breadcrumb: 'Phối hợp nhóm', icon: 'space_dashboard', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual', projectStates: ['ACTIVE'] },
  { id: 'student-tasks', path: '/project/tasks', title: 'Công việc', breadcrumb: 'Công việc', icon: 'checklist', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual', projectStates: ['ACTIVE'] },
  { id: 'student-milestones', path: '/project/milestones', title: 'Mốc đồ án', breadcrumb: 'Mốc đồ án', icon: 'flag', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual', projectStates: ['ACTIVE'] },
  { id: 'student-gantt', path: '/project/gantt', title: 'Lịch thực hiện', breadcrumb: 'Lịch thực hiện', icon: 'view_timeline', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual', projectStates: ['ACTIVE'] },
  { id: 'student-reports', path: '/project/reports', title: 'Báo cáo tiến độ', breadcrumb: 'Báo cáo tiến độ', icon: 'assignment', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual', projectStates: ['ACTIVE'] },
  { id: 'student-deliverables', path: '/project/deliverables', title: 'Hạng mục cần nộp', breadcrumb: 'Hạng mục cần nộp', icon: 'description', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual', projectStates: ['ACTIVE'] },
  { id: 'student-files', path: '/project/files', title: 'Kho tệp đồ án', breadcrumb: 'Kho tệp đồ án', icon: 'folder_open', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual', projectStates: ['ACTIVE'] },
  { id: 'student-meetings', path: '/project/meetings', title: 'Lịch họp và biên bản', breadcrumb: 'Lịch họp và biên bản', icon: 'calendar_month', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual', projectStates: ['ACTIVE'] },
  { id: 'student-contributions', path: '/project/contributions', title: 'Đóng góp thành viên', breadcrumb: 'Đóng góp thành viên', icon: 'diversity_3', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual', projectStates: ['ACTIVE'] },
  { id: 'student-final-submission', path: '/project/final-submission', title: 'Bàn giao cuối kỳ', breadcrumb: 'Gói bàn giao cuối', icon: 'inventory_2', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual' },
  { id: 'student-result', path: '/project/result', title: 'Kết quả đồ án', breadcrumb: 'Kết quả', icon: 'workspace_premium', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual' },
  { id: 'student-team', path: '/team', title: 'Thành viên nhóm', breadcrumb: 'Thành viên nhóm', icon: 'group', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'always' },
  { id: 'lecturer-dashboard', path: '/supervisor/dashboard', title: 'Tổng quan giảng viên', breadcrumb: 'Tổng quan GVHD', icon: 'space_dashboard', section: 'lecturer', identityRoles: ['LECTURER'], navigationVisibility: 'always' },
  { id: 'lecturer-workspace', path: '/supervisor/workspace', title: 'Bàn làm việc giảng viên', breadcrumb: 'Bàn làm việc GVHD', icon: 'supervisor_account', section: 'lecturer', identityRoles: ['LECTURER'], navigationVisibility: 'always' },
  { id: 'lecturer-profile', path: '/supervisor/profile', title: 'Hồ sơ giảng viên', breadcrumb: 'Hồ sơ GVHD', icon: 'badge', section: 'lecturer', identityRoles: ['LECTURER'], navigationVisibility: 'always' },
  { id: 'evaluator-work', path: '/evaluator/workspace', title: 'Bàn làm việc đánh giá', breadcrumb: 'Bàn làm việc đánh giá', icon: 'grading', section: 'lecturer', identityRoles: ['LECTURER'], navigationVisibility: 'contextual', requiredAssignment: 'EVALUATOR' },
  { id: 'governance-portfolio', path: '/department/portfolio', title: 'Danh mục đồ án', breadcrumb: 'Danh mục đồ án', icon: 'space_dashboard', section: 'governance', identityRoles: ['DEPARTMENT_STAFF'], navigationVisibility: 'always' },
  { id: 'governance-review', path: '/department/projects/review', title: 'Thẩm định đề cương', breadcrumb: 'Thẩm định đề cương', icon: 'fact_check', section: 'governance', identityRoles: ['DEPARTMENT_STAFF'], navigationVisibility: 'always' },
  { id: 'governance-supervisors', path: '/department/supervisors', title: 'Giám sát giảng viên', breadcrumb: 'Giám sát GVHD', icon: 'school', section: 'governance', identityRoles: ['DEPARTMENT_STAFF'], navigationVisibility: 'always' },
  { id: 'governance-topics', path: '/department/topics', title: 'Quản lý đề tài', breadcrumb: 'Quản lý đề tài', icon: 'lightbulb', section: 'governance', identityRoles: ['DEPARTMENT_STAFF'], navigationVisibility: 'always' },
  { id: 'governance-academic', path: '/academic', title: 'Cấu trúc đào tạo', breadcrumb: 'Cấu trúc đào tạo', icon: 'account_balance', section: 'governance', identityRoles: ['DEPARTMENT_STAFF'], navigationVisibility: 'always' },
  { id: 'governance-periods', path: '/academic/governance', title: 'Học kỳ và kỳ đồ án', breadcrumb: 'Quản lý học vụ', icon: 'date_range', section: 'governance', identityRoles: ['DEPARTMENT_STAFF'], navigationVisibility: 'always' },
  { id: 'governance-rubrics', path: '/academic/rubrics', title: 'Bộ tiêu chí đánh giá', breadcrumb: 'Bộ tiêu chí đánh giá', icon: 'grading', section: 'governance', identityRoles: ['DEPARTMENT_STAFF'], navigationVisibility: 'always' },
  { id: 'administration-access', path: '/admin/access', title: 'Quản trị nền tảng', breadcrumb: 'Quản trị quyền', icon: 'admin_panel_settings', section: 'administration', identityRoles: ['ADMIN'], navigationVisibility: 'always' },
  { id: 'administration-portfolio', path: '/admin/portfolio', title: 'Tổng quan đồ án', breadcrumb: 'Tổng quan đồ án', icon: 'space_dashboard', section: 'administration', identityRoles: ['ADMIN'], navigationVisibility: 'always' },
  { id: 'academic-profile-verifications', path: '/academic/profile-verifications', title: 'Xác minh hồ sơ học vụ', breadcrumb: 'Xác minh hồ sơ học vụ', icon: 'verified_user', section: 'governance', identityRoles: ['DEPARTMENT_STAFF', 'ADMIN'], navigationVisibility: 'always' },
  { id: 'admin-milestone-templates', path: '/admin/milestone-templates', title: 'Mẫu mốc đồ án', breadcrumb: 'Mẫu mốc đồ án', icon: 'flag', section: 'administration', identityRoles: ['ADMIN'], navigationVisibility: 'always' },
  { id: 'account-profile', path: '/profile', title: 'Hồ sơ tài khoản', breadcrumb: 'Hồ sơ tài khoản', icon: 'account_circle', section: 'account', identityRoles: ['ADMIN', 'DEPARTMENT_STAFF', 'LECTURER', 'STUDENT'], navigationVisibility: 'always' },
  { id: 'calendar-attention', path: '/calendar', title: 'Lịch tổng hợp', breadcrumb: 'Lịch tổng hợp', icon: 'calendar_month', section: 'account', identityRoles: ['ADMIN', 'DEPARTMENT_STAFF', 'LECTURER', 'STUDENT'], navigationVisibility: 'always' },
  { id: 'chat', path: '/messages', title: 'Tin nhắn', breadcrumb: 'Tin nhắn', icon: 'chat', section: 'account', identityRoles: ['ADMIN', 'DEPARTMENT_STAFF', 'LECTURER', 'STUDENT'], navigationVisibility: 'always', featureEnabled: env.chatEnabled },
  { id: 'ai-advisory', path: '/project/ai', title: 'Trợ lý AI và phân tích', breadcrumb: 'Trợ lý AI và phân tích', icon: 'neurology', section: 'student', identityRoles: ['STUDENT'], navigationVisibility: 'contextual', projectStates: ['ACTIVE'], featureEnabled: env.aiAdvisoryEnabled },
]

export function getWorkspaceNavigation(access: WorkspaceAccess): readonly WorkspaceRouteMeta[] {
  if (access.contextStatus !== 'ready') return []
  return workspaceRouteRegistry.filter((route) => {
    if (route.featureEnabled === false || !route.identityRoles.some((role) => access.identityRoles.includes(role))) return false
    if (route.requiredAssignment && !access.assignments.includes(route.requiredAssignment)) return false
    if (route.projectStates && !route.projectStates.includes(access.projectState?.toUpperCase() ?? '')) return false
    return route.navigationVisibility === 'always' || Boolean(access.projectId || access.assignments.length)
  })
}

export function getWorkspaceBreadcrumb(pathname: string): string | null {
  return workspaceRouteRegistry.find((route) => route.path === pathname)?.breadcrumb ?? null
}

