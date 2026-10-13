import type { MajorRequirementDto } from '../../../types/backend'
import type { AcademicNameResolver } from './academic-name-resolver'

interface MajorRequirementsViewProps {
  requirements: readonly MajorRequirementDto[]
  names: AcademicNameResolver
}

/** Canonical, read-focused rendering of Backend-governed major quotas. */
export function MajorRequirementsView({ requirements, names }: MajorRequirementsViewProps) {
  if (!requirements.length) return <p className="text-sm text-ink-muted">Chưa có thông tin các ngành tham gia.</p>

  return (
    <ul className="mt-2 space-y-2" aria-label="Yêu cầu theo ngành">
      {requirements.map((requirement) => (
        <li key={requirement.majorId} className="border-b border-hairline py-3 text-sm text-ink-soft last:border-b-0">
          <strong className="text-ink">{names.major(requirement.majorId)}</strong>
          <span className="block mt-1">Số thành viên: {requirement.minMembers}–{requirement.maxMembers} thành viên</span>
          <span className="block mt-1">Trách nhiệm: {requirement.responsibility}</span>
        </li>
      ))}
    </ul>
  )
}
