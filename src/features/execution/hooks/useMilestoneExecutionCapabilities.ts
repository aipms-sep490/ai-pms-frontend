import { getMilestoneExecutionActions } from '../../../services/api/workflow.api'
import type { MilestoneExecutionActionsDto } from '../../../types/backend'
import { useExecutionActionCapabilities, type ExecutionActionCapabilities } from './useExecutionActionCapabilities'

export type MilestoneExecutionCapabilities = ExecutionActionCapabilities<MilestoneExecutionActionsDto>
export const useMilestoneExecutionCapabilities = (milestoneId: number | undefined, refreshKey = 0): MilestoneExecutionCapabilities => useExecutionActionCapabilities(milestoneId, getMilestoneExecutionActions, refreshKey)
