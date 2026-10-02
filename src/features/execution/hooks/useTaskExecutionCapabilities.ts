import { getTaskExecutionActions } from '../../../services/api/workflow.api'
import type { TaskExecutionActionsDto } from '../../../types/backend'
import { useExecutionActionCapabilities, type ExecutionActionCapabilities } from './useExecutionActionCapabilities'

export type TaskExecutionCapabilities = ExecutionActionCapabilities<TaskExecutionActionsDto>
export const useTaskExecutionCapabilities = (taskId: number | undefined, refreshKey = 0): TaskExecutionCapabilities => useExecutionActionCapabilities(taskId, getTaskExecutionActions, refreshKey)
