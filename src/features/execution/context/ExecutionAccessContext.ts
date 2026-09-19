import { createContext, useContext } from 'react'
import type { ProjectDto, SupervisorAssignmentDto, TeamDto } from '../../../types/backend'

export interface ExecutionAccess {
  project: ProjectDto
  team?: TeamDto | null
  supervisor?: SupervisorAssignmentDto | null
  currentUserId?: number
  actor: 'student' | 'supervisor'
  /** Advisory UX only. Backend remains the authorization authority. */
  canManageStructure: boolean
  routeBase: string
}

export const ExecutionAccessContext = createContext<ExecutionAccess | null>(null)

export function useExecutionAccess(): ExecutionAccess {
  const access = useContext(ExecutionAccessContext)
  if (!access) throw new Error('Execution routes must provide Backend-authorized project access.')
  return access
}
