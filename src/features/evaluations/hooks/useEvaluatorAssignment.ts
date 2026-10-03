import { useOutletContext } from 'react-router-dom'
import type { EvaluationAssignment } from '../evaluation-types'

export type EvaluatorAssignmentContext = { assignment: EvaluationAssignment }

export function useEvaluatorAssignment(): EvaluatorAssignmentContext {
  return useOutletContext<EvaluatorAssignmentContext>()
}
