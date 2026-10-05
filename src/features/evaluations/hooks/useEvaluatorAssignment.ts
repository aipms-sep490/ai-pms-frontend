import { useOutletContext } from 'react-router-dom'
import type { EvaluationAssignment } from '../evaluation-types'
import type { EvaluationAssignmentDetail } from '../../../services/api/evaluations.api'

export type EvaluatorAssignmentContext = { assignment: EvaluationAssignment; detail: EvaluationAssignmentDetail }

export function useEvaluatorAssignment(): EvaluatorAssignmentContext {
  return useOutletContext<EvaluatorAssignmentContext>()
}
