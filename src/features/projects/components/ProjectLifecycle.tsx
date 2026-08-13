import { formatLabel } from '../../../utils/format-label'
import { isTerminalProjectState } from '../utils/project-status'
import type { ProjectLifecycleState } from '../types/project.types'

interface ProjectLifecycleProps {
  states: ProjectLifecycleState[]
}

export function ProjectLifecycle({ states }: ProjectLifecycleProps) {
  return (
    <div className="lifecycle-grid">
      {states.map((state, index) => (
        <article
          className={`lifecycle-card${isTerminalProjectState(state.name) ? ' terminal' : ''}`}
          key={state.name}
        >
          <div className="lifecycle-card-header">
            <span>{String(index + 1).padStart(2, '0')}</span>
            {isTerminalProjectState(state.name) && <small>Terminal</small>}
          </div>
          <h2>{formatLabel(state.name)}</h2>
          <p>Allowed next state{state.allowedNextStates.length === 1 ? '' : 's'}</p>
          <div className="next-states">
            {state.allowedNextStates.length > 0 ? (
              state.allowedNextStates.map((nextState) => (
                <span key={nextState}>{formatLabel(nextState)}</span>
              ))
            ) : (
              <span className="none">No transition</span>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
