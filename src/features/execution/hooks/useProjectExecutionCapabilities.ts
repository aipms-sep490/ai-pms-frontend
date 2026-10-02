import { getProjectExecutionActions } from '../../../services/api/workflow.api'
import type { ProjectExecutionActionsDto } from '../../../types/backend'
import { useExecutionActionCapabilities, type ExecutionActionCapability, type ExecutionActionCapabilities } from './useExecutionActionCapabilities'

/** Project-level mutations currently published by the backend execution contract. */
export type ProjectExecutionActionCode =
  | 'create_task'
  | 'create_milestone'
  | 'reorder_milestones'
  | 'create_progress_report'
  | 'schedule_meeting'

export type ProjectExecutionCapability = ExecutionActionCapability
export type ProjectExecutionCapabilities = Pick<ExecutionActionCapabilities<ProjectExecutionActionsDto>, 'status'> & { get: (code: ProjectExecutionActionCode) => ProjectExecutionCapability }

/**
 * Reads the dedicated execution contract. A missing, failed, or not-yet-delivered
 * response is deliberately fail-closed; identity or route state is never a fallback.
 */
export function useProjectExecutionCapabilities(
  projectId: number | undefined,
): ProjectExecutionCapabilities {
  return useExecutionActionCapabilities(projectId, getProjectExecutionActions)
}
