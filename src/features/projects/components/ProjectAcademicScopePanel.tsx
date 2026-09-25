import type { MajorRequirementDto } from '../../../types/backend'
import type { AcademicNameResolver } from './academic-name-resolver'
import { MajorRequirementsView } from './MajorRequirementsView'

export interface ProjectAcademicScopeView {
  projectMode: string
  primaryMajorId?: number | null
  leadDepartmentId: number
  requirements: readonly MajorRequirementDto[]
}

export interface VerifiedRosterMember {
  userId: number
  fullName: string
  majorId: number
  isLeader: boolean
}

interface ProjectAcademicScopePanelProps {
  scope: ProjectAcademicScopeView
  names: AcademicNameResolver
  members?: readonly VerifiedRosterMember[]
}

/** Read-only view of the backend-governed academic scope and its snapshot roster. */
export function ProjectAcademicScopePanel({ scope, names, members = [] }: ProjectAcademicScopePanelProps) {
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
        <div><dt className="text-xs text-slate-500">Lead department</dt><dd className="font-semibold text-slate-900">{names.department(scope.leadDepartmentId)}</dd></div>
        <div><dt className="text-xs text-slate-500">Primary major</dt><dd className="font-semibold text-slate-900">{scope.primaryMajorId ? names.major(scope.primaryMajorId) : 'Not applicable'}</dd></div>
        <div><dt className="text-xs text-slate-500">Mode</dt><dd className="font-semibold text-slate-900">{interdisciplinary ? 'Interdisciplinary' : 'Single major'}</dd></div>
      </dl>
      {interdisciplinary ? <div className="mt-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Required majors</h3><MajorRequirementsView requirements={scope.requirements} names={names} /></div> : <p className="mt-4 text-sm text-slate-600">SINGLE_MAJOR has no participating-department review action.</p>}
      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Verified roster snapshot</h3>
        {members.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{members.map((member) => <li key={member.userId}>{member.fullName} · {names.major(member.majorId)}{member.isLeader ? ' · Leader' : ''}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">Backend has not returned roster evidence.</p>}
      </div>
    </section>
  )
}
