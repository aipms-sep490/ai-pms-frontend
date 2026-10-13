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
    <section aria-labelledby="project-academic-scope-heading" className="rounded-xl border border-hairline bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Thông tin đào tạo</p>
          <h2 id="project-academic-scope-heading" className="mt-1 text-base font-bold text-ink">Phạm vi đào tạo</h2>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-bold bg-primary-subtle text-primary`}>
          {interdisciplinary ? 'Liên ngành' : 'Một ngành'}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-ink-muted">Bộ môn phụ trách</dt><dd className="font-semibold text-ink">{names.department(scope.leadDepartmentId)}</dd></div>
        <div><dt className="text-xs text-ink-muted">Ngành chính</dt><dd className="font-semibold text-ink">{scope.primaryMajorId ? names.major(scope.primaryMajorId) : 'Không áp dụng'}</dd></div>
      </dl>
      {interdisciplinary ? <div className="mt-4"><h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Các ngành tham gia</h3><MajorRequirementsView requirements={scope.requirements} names={names} /></div> : <p className="mt-4 text-sm text-ink-muted">Đồ án một ngành do bộ môn phụ trách thẩm định.</p>}
      <div className="mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Thành viên đã xác minh</h3>
        {members.length ? <ul className="mt-2 space-y-1 text-sm text-ink-soft">{members.map((member) => <li key={member.userId}>{member.fullName} · {names.major(member.majorId)}{member.isLeader ? ' · Trưởng nhóm' : ''}</li>)}</ul> : <p className="mt-2 text-sm text-ink-muted">Chưa có thông tin xác minh thành viên.</p>}
      </div>
    </section>
  )
}
