import { httpGet, httpGetBlob } from '../../../services/http/http-client'

export interface DashboardProject {
  id: number
  code: string
  title: string
  status: string
  teamId: number
  semesterId: number
  pendingProgressReviews: number
  analysis: {
    dataStatus: string
    riskLevel: string
    trendStatus: string
    progressSummary: { progressPercentage: number; overdueTasks: number; blockedTasks: number }
  } | null
  departmentId: number | null
  departmentName: string | null
  majors: Array<{ id: number; code: string; name: string }> | null
  supervisor: { userId: number; name: string } | null
}

interface Page<T> { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number }
interface Count { status: string; count: number }

export interface PortfolioDashboard {
  asOfUtc: string
  departmentId: number | null
  summary: {
    totalProjects: number
    projectStates: Count[]
    majors: Array<{ majorId: number; code: string; name: string; projectCount: number }>
    supervisors: Array<{ userId: number | null; name: string | null; projectCount: number; overdueTasks: number; pendingProgressReviews: number }>
    riskLevels: Count[]
  }
  projects: Page<DashboardProject>
}

export interface SupervisorDashboard {
  asOfUtc: string
  workload: { hasProfile: boolean; isAvailable: boolean; assignedProjects: number; profileMaxActiveProjects: number | null }
  projectStates: Count[]
  pendingProgressReviews: number
  overdueTasks: number
  projects: Page<DashboardProject>
}

export interface StudentDashboard {
  asOfUtc: string
  actions: Array<{ code: string; allowed: boolean; reasons: string[] }>
  project: DashboardProject | null
  unreadNotifications: number
  assignedOpenTasks: number
  assignedOverdueTasks: number
  taskDeadlines: Array<{ id: number; title: string; status: string; dueAtUtc: string; isOverdue: boolean }>
  milestoneDeadlines: Array<{ id: number; title: string; status: string; dueDate: string; isOverdue: boolean }>
  contributionDataStatus: string
}

export interface DashboardFilter {
  semesterId?: number
  departmentId?: number
  majorId?: number
  status?: string
  search?: string
  page?: number
  pageSize?: number
}

function query(filter: DashboardFilter): string {
  const params = new URLSearchParams()
  Object.entries(filter).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)) })
  return params.size ? `?${params}` : ''
}

export const getStudentDashboard = (semesterId?: number) => httpGet<StudentDashboard>(`/v1/dashboards/student${query({ semesterId })}`)
export const getSupervisorDashboard = (filter: DashboardFilter) => httpGet<SupervisorDashboard>(`/v1/dashboards/supervisor${query(filter)}`)
export const getPortfolioDashboard = (role: 'department' | 'admin', filter: DashboardFilter) => httpGet<PortfolioDashboard>(`/v1/dashboards/${role}${query(filter)}`)
export type PortfolioExportFormat = 'csv' | 'xlsx' | 'pdf'
export function exportPortfolio(filter: DashboardFilter, format: PortfolioExportFormat) {
  const suffix = query({ ...filter, page: undefined, pageSize: undefined })
  return httpGetBlob(`/v1/dashboards/portfolio/export${suffix}${suffix ? '&' : '?'}format=${format}`)
}
export const exportPortfolioCsv = (filter: DashboardFilter) => exportPortfolio(filter, 'csv')
