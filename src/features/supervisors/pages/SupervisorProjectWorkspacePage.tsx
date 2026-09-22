import { ProjectWorkspaceSummary, ExecutionEntry } from '../../projects/pages/ActiveProjectWorkspacePage'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'

export function SupervisorProjectWorkspacePage() {
  const access = useExecutionAccess()
  return (
    <ProjectWorkspaceSummary project={access.project} supervisor={access.supervisor} audience="supervisor">
      <ExecutionEntry projectId={access.project.id} routeBase={access.routeBase} />
    </ProjectWorkspaceSummary>
  )
}
