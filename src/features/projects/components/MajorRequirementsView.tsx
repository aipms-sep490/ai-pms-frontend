import type { MajorRequirementDto } from '../../../types/backend'
import type { AcademicNameResolver } from './academic-name-resolver'

interface MajorRequirementsViewProps {
  requirements: readonly MajorRequirementDto[]
  names: AcademicNameResolver
}

/** Canonical, read-focused rendering of Backend-governed major quotas. */
export function MajorRequirementsView({ requirements, names }: MajorRequirementsViewProps) {
  if (!requirements.length) return <p className="text-sm text-slate-600">Backend has not returned required majors for this scope.</p>

  return (
    <ul className="mt-2 space-y-2" aria-label="Major requirements">
      {requirements.map((requirement) => (
        <li key={requirement.majorId} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <strong className="text-slate-900">{names.major(requirement.majorId)}</strong>
          <span className="block mt-1">Quota: {requirement.minMembers}–{requirement.maxMembers} members</span>
          <span className="block mt-1">Responsibility: {requirement.responsibility}</span>
        </li>
      ))}
    </ul>
  )
}
