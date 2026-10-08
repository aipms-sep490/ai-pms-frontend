import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ProjectMajorRequirementInput } from '../api/project-review-api'
import { validateMajorRequirements } from './major-requirement-validation'

export interface MajorOption { id: number; code: string; name: string }

interface MajorRequirementEditorProps {
  requirements: readonly ProjectMajorRequirementInput[]
  projectMode: string
  majors: readonly MajorOption[]
  busy: boolean
  onSave: (requirements: readonly ProjectMajorRequirementInput[]) => Promise<boolean>
}

const emptyRequirement = (): ProjectMajorRequirementInput => ({ majorId: 0, minMembers: 1, maxMembers: 1, responsibility: '' })

export function MajorRequirementEditor({ requirements, projectMode, majors, busy, onSave }: MajorRequirementEditorProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProjectMajorRequirementInput[]>(() => [...requirements])
  const [issues, setIssues] = useState<string[]>([])
  const issueSummary = useRef<HTMLDivElement>(null)
  const majorById = new Map(majors.map((major) => [major.id, major]))

  useEffect(() => {
    if (!editing) setDraft([...requirements])
  }, [editing, requirements])

  const beginEditing = () => {
    setDraft(requirements.length ? [...requirements] : [emptyRequirement()])
    setIssues([])
    setEditing(true)
  }

  const update = (index: number, patch: Partial<ProjectMajorRequirementInput>) => {
    setDraft((current) => current.map((requirement, itemIndex) => itemIndex === index ? { ...requirement, ...patch } : requirement))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validateMajorRequirements(draft, projectMode)
    const nextIssues = [...validation.issues]
    if (draft.length === 0) nextIssues.push('Cần có yêu cầu về thành viên cho ít nhất một ngành.')
    if (nextIssues.length > 0) {
      setIssues(nextIssues)
      requestAnimationFrame(() => issueSummary.current?.focus())
      return
    }

    setIssues([])
    if (await onSave(draft)) setEditing(false)
  }

  return (
    <section aria-labelledby="major-requirement-editor-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="major-requirement-editor-heading" className="font-bold text-slate-900">Yêu cầu nhân sự theo ngành</h2>
          <p className="mt-1 text-sm text-slate-600">Phân công số lượng thành viên và trách nhiệm cho từng ngành tham gia.</p>
        </div>
        {!editing && <button type="button" onClick={beginEditing} disabled={busy || majors.length === 0} className="min-h-11 rounded-lg border border-hairline px-3 py-2 text-sm font-semibold text-primary outline-none transition hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">{requirements.length ? 'Chỉnh sửa yêu cầu' : 'Chỉnh sửa yêu cầu'}</button>}
      </div>

      {!editing && <>
        {requirements.length === 0 ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Chưa có yêu cầu về số thành viên theo ngành.</p> : <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200" aria-label="Danh sách requirement theo ngành">{requirements.map((requirement) => { const major = majorById.get(requirement.majorId); return <li key={requirement.majorId} className="grid gap-1 px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"><span className="font-medium text-slate-900">{major ? `${major.code} — ${major.name}` : `Major #${requirement.majorId}`}</span><span className="text-slate-600">{requirement.minMembers}–{requirement.maxMembers} SV</span><span className="text-slate-600">{requirement.responsibility}</span></li> })}</ul>}
        {majors.length === 0 && <p className="mt-3 text-sm text-slate-600" role="status">Đang chờ dữ liệu ngành từ Academic Structure trước khi có thể chỉnh sửa.</p>}
      </>}

      {editing && <form className="mt-4 space-y-4" onSubmit={submit} noValidate>
        {issues.length > 0 && <div ref={issueSummary} tabIndex={-1} role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 outline-none"><p className="font-semibold">Kiểm tra lại requirements</p><ul className="mt-1 list-disc pl-5">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
        {draft.map((requirement, index) => <fieldset key={`${requirement.majorId}-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-3 lg:grid-cols-[minmax(12rem,1fr)_7rem_7rem_minmax(12rem,1fr)_auto] lg:items-end"><legend className="sr-only">Requirement {index + 1}</legend>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Ngành<select required value={requirement.majorId || ''} onChange={(event) => update(index, { majorId: Number(event.target.value) })} className="min-h-11 rounded-md border border-slate-300 bg-white px-2 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-primary"><option value="">Chọn ngành</option>{majors.map((major) => <option key={major.id} value={major.id} disabled={draft.some((item, itemIndex) => itemIndex !== index && item.majorId === major.id)}>{major.code} — {major.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Tối thiểu<input required type="number" min="1" value={requirement.minMembers} onChange={(event) => update(index, { minMembers: Number(event.target.value) })} className="min-h-11 rounded-md border border-slate-300 px-2 outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Tối đa<input required type="number" min="1" value={requirement.maxMembers} onChange={(event) => update(index, { maxMembers: Number(event.target.value) })} className="min-h-11 rounded-md border border-slate-300 px-2 outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Trách nhiệm<input required value={requirement.responsibility} onChange={(event) => update(index, { responsibility: event.target.value })} className="min-h-11 rounded-md border border-slate-300 px-2 outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label>
          <button type="button" onClick={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="min-h-11 rounded-md px-3 text-sm font-semibold text-rose-700 outline-none hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-600">Xóa</button>
        </fieldset>)}
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setDraft((current) => [...current, emptyRequirement()])} disabled={draft.length >= 100 || majors.length === 0} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">Thêm ngành</button><button type="submit" disabled={busy || majors.length === 0} className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu yêu cầu'}</button><button type="button" onClick={() => { setEditing(false); setIssues([]) }} disabled={busy} className="min-h-11 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary">Hủy</button></div>
      </form>}
    </section>
  )
}
