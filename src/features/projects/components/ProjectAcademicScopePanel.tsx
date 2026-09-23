import type { MajorRequirementDto } from '../../../types/backend'

export interface ProjectAcademicScopeView {
  projectMode: string
  primaryMajorId?: number | null
  leadDepartmentId: number
  requirements: readonly MajorRequirementDto[]
}

interface ProjectAcademicScopePanelProps {
  scope: ProjectAcademicScopeView
  participatingDepartmentIds?: readonly number[]
}

/**
 * Read-only projection of backend-governed academic scope. It intentionally
 * contains no lifecycle actions: backend workflow actions remain authoritative.
 */
export function ProjectAcademicScopePanel({ scope, participatingDepartmentIds = [] }: ProjectAcademicScopePanelProps) {
  const interdisciplinary = scope.projectMode === 'INTERDISCIPLINARY'

  return (
    <section aria-labelledby="project-academic-scope-heading" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Backend-governed academic scope</p>
          <h2 id="project-academic-scope-heading" className="mt-1 text-base font-bold text-slate-900">Academic scope</h2>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${interdisciplinary ? 'bg-violet-100 text-violet-800' : 'bg-blue-100 text-blue-800'}`}>
          {interdisciplinary ? 'INTERDISCIPLINARY' : 'SINGLE_MAJOR'}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-slate-500">Lead department</dt><dd className="font-semibold text-slate-900">Department #{scope.leadDepartmentId}</dd></div>
        <div><dt className="text-xs text-slate-500">Primary major</dt><dd className="font-semibold text-slate-900">{scope.primaryMajorId ? `Major #${scope.primaryMajorId}` : 'Not applicable'}</dd></div>
        <div><dt className="text-xs text-slate-500">Mode</dt><dd className="font-semibold text-slate-900">{interdisciplinary ? 'Liên ngành' : 'Đơn ngành'}</dd></div>
      </dl>

      {interdisciplinary ? (
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Major requirements</h3>
          {scope.requirements.length ? <ul className="mt-2 space-y-2">{scope.requirements.map((requirement) => (
            <li key={requirement.majorId} className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
              <strong className="text-slate-900">Major #{requirement.majorId}</strong> · {requirement.minMembers}–{requirement.maxMembers} members · {requirement.responsibility}
            </li>
          ))}</ul> : <p className="mt-2 text-xs text-slate-600">Backend has not returned major requirements.</p>}
          {participatingDepartmentIds.length ? <p className="mt-3 text-xs text-slate-600">Participating departments: {participatingDepartmentIds.map((departmentId) => `#${departmentId}`).join(', ')}</p> : null}
        </div>
      ) : <p className="mt-4 text-xs text-slate-600">SINGLE_MAJOR uses one primary major and lead department. No participating-department action is implied.</p>}
    </section>
  )
}
