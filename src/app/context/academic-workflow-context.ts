import { createContext } from 'react'
import type { AuthUser } from '../../features/auth/types/auth.types'
import type { AuthorizationContext } from '../../features/auth/policies/access-policy'
import type {
  AcademicReferenceDto,
  UserWorkflowContextDto,
  WorkflowPeriodDto,
  WorkflowSemesterDto,
} from '../../types/backend'

export type AcademicWorkflowStatus = 'idle' | 'loading' | 'ready' | 'unavailable' | 'forbidden'
export type AcademicWorkflowErrorKind = 'authentication' | 'system' | null

/**
 * Server-derived academic scope. Arrays intentionally keep the client model ready
 * for future multi-major and multi-department contracts; the current endpoint may
 * return zero or one reference for each field.
 */
export interface AcademicContextSnapshot {
  organization: AcademicReferenceDto | null
  departments: readonly AcademicReferenceDto[]
  majors: readonly AcademicReferenceDto[]
  currentSemesters: readonly WorkflowSemesterDto[]
  selectedSemester: WorkflowSemesterDto | null
  periods: readonly WorkflowPeriodDto[]
  hasActiveDepartmentScope: boolean
  hasEligibleStudentProfile: boolean
  issues: readonly string[]
}

export interface AcademicWorkflowContextValue {
  /** Canonical authenticated identity from the validated auth session. */
  currentUser: AuthUser | null
  /** Raw server workflow context for feature adapters that need backend actions. */
  workflowContext: UserWorkflowContextDto | null
  academic: AcademicContextSnapshot | null
  authorization: AuthorizationContext
  status: AcademicWorkflowStatus
  error: Error | null
  errorKind: AcademicWorkflowErrorKind
  refresh: () => Promise<void>
}

export const AcademicWorkflowContext = createContext<AcademicWorkflowContextValue | null>(null)
