export interface Organization {
  id: number
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Department {
  id: number
  organizationId: number
  organizationCode: string
  organizationName: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Major {
  id: number
  departmentId: number
  departmentCode: string
  departmentName: string
  organizationId: number
  organizationCode: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AcademicHierarchyOrganization {
  organization: Organization
  departments: AcademicHierarchyDepartment[]
}

export interface AcademicHierarchyDepartment {
  department: Department
  majors: Major[]
}

export interface AcademicFilters {
  search: string
  organizationId?: number
  includeInactive: boolean
}

export interface WorkflowAction {
  code: string
  allowed: boolean
  reasons: string[]
}

export interface AcademicWorkflowContext {
  user: {
    roles: string[]
    grantedPermissions: string[]
    effectiveRoles: string[]
  }
  actions: WorkflowAction[]
}

export type AcademicEntityKind = 'organization' | 'department' | 'major'

export interface AcademicRecordDraft {
  kind: AcademicEntityKind
  id?: number
  code: string
  name: string
  description: string
  organizationId?: number
  departmentId?: number
}
