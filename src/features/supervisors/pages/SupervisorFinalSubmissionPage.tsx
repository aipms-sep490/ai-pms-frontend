import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { FinalSubmissionViewerPage } from '../../final-submission/FinalSubmissionPage'
import { PreDefenseLockPanel } from '../../final-submission/PreDefenseLockPanel'

/** Supervisor final-submission space: Step 2 Pre-Defense Lock approval (Primary) + locked package viewer. */
export function SupervisorFinalSubmissionPage() {
  const { project, routeBase } = useExecutionAccess()
  return (
    <div className="space-y-5">
      <FinalSubmissionViewerPage
        backTo={`${routeBase}/workspace`}
        backLabel="Tổng quan đồ án"
        topPanel={<PreDefenseLockPanel projectId={project.id} mode="supervisor" />}
      />
    </div>
  )
}
