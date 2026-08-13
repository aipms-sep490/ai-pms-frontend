import { Button } from '../../../components/ui/Button'
import { ProjectLifecycle } from '../components/ProjectLifecycle'
import { useProjectLifecycle } from '../hooks/useProjectLifecycle'
import './project-lifecycle-page.css'

export function ProjectLifecyclePage() {
  const { data, error, isLoading, retry } = useProjectLifecycle()

  return (
    <section>
      <div className="page-heading split-heading">
        <div>
          <p className="eyebrow">Domain workflow</p>
          <h1>Project lifecycle</h1>
          <p>Transitions come from the backend Domain state machine, not frontend-only flags.</p>
        </div>
        <code className="endpoint-label">GET /api/projects/lifecycle</code>
      </div>

      {isLoading && <div className="state-panel">Loading lifecycle from the API…</div>}

      {!isLoading && error && (
        <div className="state-panel error-panel">
          <div>
            <strong>Backend is not available</strong>
            <p>{error}</p>
          </div>
          <Button type="button" onClick={retry}>Retry</Button>
        </div>
      )}

      {!isLoading && data && <ProjectLifecycle states={data.states} />}
    </section>
  )
}
