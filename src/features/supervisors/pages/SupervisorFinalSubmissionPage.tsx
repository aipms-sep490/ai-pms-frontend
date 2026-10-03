import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { FinalSubmissionViewerPage } from '../../final-submission/FinalSubmissionPage'

/** The viewer remains read-only; this wrapper preserves the assignment-scoped project return path. */
export function SupervisorFinalSubmissionPage() {
  const { routeBase } = useExecutionAccess()
  return <FinalSubmissionViewerPage backTo={`${routeBase}/workspace`} backLabel="Không gian giám sát đồ án" />
}
