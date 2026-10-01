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
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Thông tin đào tạo</p>
          <h2 id="project-academic-scope-heading" className="mt-1 text-base font-bold text-slate-900">Phạm vi đào tạo</h2>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold bg-primary-subtle text-primary`}>
          {interdisciplinary ? 'Liên ngành' : 'Một ngành'}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-slate-500">Bộ môn phụ trách</dt><dd className="font-semibold text-slate-900">{names.department(scope.leadDepartmentId)}</dd></div>
        <div><dt className="text-xs text-slate-500">Ngành chính</dt><dd className="font-semibold text-slate-900">{scope.primaryMajorId ? names.major(scope.primaryMajorId) : 'Không áp dụng'}</dd></div>
      </dl>
      {interdisciplinary ? <div className="mt-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Các ngành tham gia</h3><MajorRequirementsView requirements={scope.requirements} names={names} /></div> : <p className="mt-4 text-sm text-slate-600">Đồ án một ngành do bộ môn phụ trách thẩm định.</p>}
      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Thành viên đã xác minh</h3>
        {members.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{members.map((member) => <li key={member.userId}>{member.fullName} · {names.major(member.majorId)}{member.isLeader ? ' · Trưởng nhóm' : ''}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">Chưa có thông tin xác minh thành viên.</p>}
      </div>
    </section>
  )
}
