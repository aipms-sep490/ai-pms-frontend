import type { ReactNode } from 'react'
import { PageLoading } from './PageLoading'

type StateProps = { title: string; message: string; action?: ReactNode }

function StatePanel({ title, message, action }: StateProps) {
  return <section className="rounded-md border border-hairline bg-card p-4 text-sm text-slate-700" aria-label={title}>
    <h2 className="font-heading text-base font-semibold text-slate-900">{title}</h2>
    <p className="mt-1 leading-6 text-slate-600">{message}</p>
    {action ? <div className="mt-3">{action}</div> : null}
  </section>
}

export const WorkspaceLoadingState = ({ label = 'Đang tải không gian làm việc…' }: { label?: string }) => <PageLoading label={label} />
export const WorkspaceEmptyState = (props: StateProps) => <StatePanel {...props} />
export const WorkspaceForbiddenState = (props: StateProps) => <StatePanel {...props} />
export const WorkspaceUnavailableState = (props: StateProps) => <StatePanel {...props} />
export const WorkspaceErrorState = (props: StateProps) => <div role="alert"><StatePanel {...props} /></div>
export const WorkspaceReadOnlyState = (props: StateProps) => <StatePanel {...props} />
export const WorkspaceArchivedState = (props: StateProps) => <StatePanel {...props} />
export const WorkspaceAttentionState = (props: StateProps) => <StatePanel {...props} />
