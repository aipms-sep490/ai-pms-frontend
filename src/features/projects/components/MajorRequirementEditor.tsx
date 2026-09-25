import type { MajorRequirementDto } from '../../../types/backend'
import { validateMajorRequirements } from './major-requirement-validation'

interface MajorRequirementEditorProps {
  requirements: readonly MajorRequirementDto[]
  projectMode: string
}

export function MajorRequirementEditor({ requirements, projectMode }: MajorRequirementEditorProps) {
  const validation = validateMajorRequirements(requirements, projectMode)
  return (
    <section aria-labelledby="major-requirement-editor-heading" className="rounded-xl border border-dashed border-slate-300 p-4 text-sm">
      <h2 id="major-requirement-editor-heading" className="font-bold text-slate-900">Major requirement editor foundation</h2>
      <p className="mt-1 text-slate-600">Validation is ready for a future Department mutation contract. No local changes are persisted.</p>
      {validation.valid ? <p className="mt-2 text-emerald-700">Client-side quota shape is valid; Backend policy remains authoritative.</p> : <ul className="mt-2 list-disc pl-5 text-rose-700">{validation.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}
    </section>
  )
}
