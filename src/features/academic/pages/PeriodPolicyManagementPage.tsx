import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/period-policy-api'

type Draft = api.PeriodPolicyFields & { effectiveFrom: string; effectiveTo: string }

const modes = ['SINGLE_MAJOR', 'INTERDISCIPLINARY']
const sources = ['STUDENT_PROPOSAL', 'PUBLISHED_TOPIC']

function localDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function toIso(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function fromPolicy(value: api.PeriodPolicy): Draft {
  return { ...value.policy, effectiveFrom: localDateTime(value.effectiveFrom), effectiveTo: localDateTime(value.effectiveTo) }
}

function errorText(reason: unknown) {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Backend không cấp quyền quản lý policy của period này.'
    if (reason.status === 404) return 'Không tìm thấy period hoặc không có policy hiệu lực tại thời điểm đang xem.'
    if (reason.status === 409) return 'Policy, interval hoặc token đã thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra trước khi thao tác lại.'
    if (reason.status === 400) return reason.problem?.detail || 'Dữ liệu policy không hợp lệ theo ràng buộc Backend.'
  }
  return 'Không thể đồng bộ policy version. Hãy thử tải lại.'
}

export function PeriodPolicyManagementPage() {
  const periodId = Number(useParams().periodId)
  const errorSummary = useRef<HTMLDivElement>(null)
  const [effective, setEffective] = useState<api.PeriodPolicy | null>(null)
  const [history, setHistory] = useState<api.PeriodPolicy[]>([])
  const [editing, setEditing] = useState<api.PeriodPolicy | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => { if (error) errorSummary.current?.focus() }, [error])
  const load = useCallback(async () => {
    if (!Number.isInteger(periodId) || periodId < 1) { setError('Project Period ID không hợp lệ.'); setLoading(false); return }
    setLoading(true)
    try {
      const [nextHistory, nextEffective] = await Promise.all([
        api.getPeriodPolicyHistory(periodId),
        api.getEffectivePeriodPolicy(periodId).catch(reason => reason instanceof HttpError && reason.status === 404 ? null : Promise.reject(reason)),
      ])
      setHistory(nextHistory); setEffective(nextEffective); setError(null)
    } catch (reason) { setError(errorText(reason)) } finally { setLoading(false) }
  }, [periodId])
  useEffect(() => { void load() }, [load])

  const editDraft = (policy: api.PeriodPolicy) => { setEditing(policy); setDraft(fromPolicy(policy)); setError(null); setNotice(null) }
  const createSuccessor = () => {
    if (!effective) { setError('Chỉ có thể tạo successor khi Backend trả một policy đang hiệu lực.'); return }
    setEditing(null); setDraft({ ...fromPolicy(effective), effectiveFrom: localDateTime(new Date().toISOString()) }); setError(null); setNotice(null)
  }
  const validate = () => {
    if (!draft) return 'Không có dữ liệu policy để lưu.'
    const start = new Date(draft.effectiveFrom), end = new Date(draft.effectiveTo)
    if (!draft.allowedProjectModes || !draft.allowedProposalSources) return 'Chọn ít nhất một project mode và proposal source.'
    if (!Number.isInteger(draft.minTeamSize) || !Number.isInteger(draft.maxTeamSize) || !Number.isInteger(draft.minDistinctMajors) || !Number.isInteger(draft.maxProjectsPerSupervisor) || draft.minTeamSize < 1 || draft.maxTeamSize < draft.minTeamSize || draft.minDistinctMajors < 1 || draft.minDistinctMajors > draft.maxTeamSize || draft.maxProjectsPerSupervisor < 1) return 'Kiểm tra team size, distinct majors và supervisor capacity.'
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return 'Khoảng hiệu lực phải có thời điểm bắt đầu trước kết thúc.'
    return null
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const issue = validate(); if (issue || !draft) { setError(issue); return }
    const latest = history[0]
    if (!latest) { setError('Backend chưa trả history policy để xác định version hợp lệ.'); return }
    const input: api.SavePeriodPolicyInput = {
      expectedVersion: editing?.version ?? latest.version,
      operation: editing ? 'UPDATE_DRAFT' : 'SUCCESSOR',
      policy: { allowedProjectModes: draft.allowedProjectModes, allowedProposalSources: draft.allowedProposalSources, minTeamSize: draft.minTeamSize, maxTeamSize: draft.maxTeamSize, minDistinctMajors: draft.minDistinctMajors, maxProjectsPerSupervisor: draft.maxProjectsPerSupervisor },
      effectiveFrom: toIso(draft.effectiveFrom), effectiveTo: toIso(draft.effectiveTo),
      ...(editing ? { concurrencyToken: editing.concurrencyToken } : {}),
    }
    void run(() => api.savePeriodPolicy(periodId, input), editing ? 'Đã lưu policy draft.' : 'Đã tạo policy successor ở trạng thái draft.', true)
  }
  const publish = () => {
    if (!editing || editing.status !== 'DRAFT' || !draft) return
    if (!window.confirm('Công bố policy sẽ làm version này có hiệu lực ngay và đóng interval policy trước đó. Tiếp tục?')) return
    const now = new Date()
    const input: api.SavePeriodPolicyInput = {
      expectedVersion: editing.version, operation: 'PUBLISH', concurrencyToken: editing.concurrencyToken,
      policy: { allowedProjectModes: draft.allowedProjectModes, allowedProposalSources: draft.allowedProposalSources, minTeamSize: draft.minTeamSize, maxTeamSize: draft.maxTeamSize, minDistinctMajors: draft.minDistinctMajors, maxProjectsPerSupervisor: draft.maxProjectsPerSupervisor },
      effectiveFrom: now.toISOString(), effectiveTo: toIso(draft.effectiveTo),
    }
    void run(() => api.savePeriodPolicy(periodId, input), 'Đã công bố policy version mới.', false)
  }
  const run = async (operation: () => Promise<api.PeriodPolicy>, success: string, openResult: boolean) => {
    setBusy(true); setError(null); setNotice(null)
    try {
      const result = await operation(); await load()
      if (openResult && result.status === 'DRAFT') editDraft(result)
      else { setEditing(null); setDraft(null) }
      setNotice(success)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(errorText(reason))
    } finally { setBusy(false) }
  }

  return <main className="mx-auto max-w-6xl space-y-5 pb-12"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">Project period #{periodId}</p><h1 className="font-heading text-2xl font-bold text-slate-950">Policy versioning</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Policy đã PUBLISHED hoặc LOCKED là lịch sử bất biến. Muốn thay đổi, tạo successor draft rồi công bố version đó; Backend quyết định thời gian hiệu lực và quyền thao tác.</p></div><Link to="/academic/governance" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">← Academic Governance</Link></header>
    {error && <div ref={errorSummary} tabIndex={-1} role="alert" aria-labelledby="policy-error-title" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><p id="policy-error-title" className="font-semibold">Chưa thể hoàn tất thao tác</p><p className="mt-1">{error}</p><button type="button" onClick={() => void load()} className="mt-2 min-h-11 font-semibold underline underline-offset-4">Tải lại dữ liệu</button></div>}
    {notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text">{notice}</p>}
    <section className="rounded-xl border border-hairline bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Policy hiện hành</h2>{effective ? <p className="mt-1 text-sm text-slate-600">v{effective.version} · {effective.status} · hiệu lực {formatDateTime(effective.effectiveFrom)} đến {formatDateTime(effective.effectiveTo)}</p> : <p className="mt-1 text-sm text-status-warning-text">Backend chưa trả policy có hiệu lực tại thời điểm hiện tại.</p>}</div><button type="button" disabled={loading || busy || !effective} onClick={createSuccessor} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Tạo successor draft</button></div>{effective && <PolicyFields policy={effective.policy} />}</section>
    <div className="grid gap-5 lg:grid-cols-[19rem_1fr]"><section className="rounded-xl border border-hairline bg-card p-4"><h2 className="font-semibold text-slate-900">Lịch sử bất biến</h2>{loading ? <p role="status" className="mt-3 text-sm text-slate-600">Đang tải policy history…</p> : history.length === 0 ? <p className="mt-3 text-sm text-slate-600">Chưa có version policy.</p> : <ul className="mt-3 space-y-2">{history.map(item => <li key={item.id}><button type="button" onClick={() => item.status === 'DRAFT' ? editDraft(item) : undefined} disabled={item.status !== 'DRAFT'} className={`min-h-11 w-full rounded-lg border p-3 text-left text-sm ${item.status === 'DRAFT' ? 'border-status-warning-border bg-status-warning-bg hover:bg-status-warning-bg/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary' : 'border-hairline bg-slate-50'}`}><strong>v{item.version} · {item.status}</strong><span className="mt-1 block text-xs text-slate-600">{formatDateTime(item.effectiveFrom)} → {formatDateTime(item.effectiveTo)}</span>{item.status === 'DRAFT' && <span className="mt-1 block text-xs font-semibold text-status-warning-text">Có thể chỉnh sửa</span>}</button></li>)}</ul>}</section>
      <section className="rounded-xl border border-hairline bg-card p-5">{!draft ? <p className="text-sm text-slate-600">Chọn “Tạo successor draft” để thay đổi policy. Version đã PUBLISHED/LOCKED chỉ hiển thị lịch sử; không có chỉnh sửa tại chỗ.</p> : <form onSubmit={save} className="space-y-5"><div><h2 className="font-semibold text-slate-900">{editing ? `Chỉnh sửa draft v${editing.version}` : 'Successor draft mới'}</h2><p className="mt-1 text-sm text-slate-600">Publication sẽ dùng thời điểm hiện tại do client gửi dưới dạng UTC; Backend vẫn xác nhận interval, version và usage trước khi ghi.</p></div><PolicyEditor draft={draft} disabled={busy} onChange={setDraft} /><div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu draft'}</button>{editing?.status === 'DRAFT' && <button type="button" disabled={busy} onClick={publish} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Công bố ngay</button>}<button type="button" disabled={busy} onClick={() => { setEditing(null); setDraft(null); setError(null) }} className="min-h-11 px-3 text-sm font-semibold text-slate-700 underline underline-offset-4">Hủy</button></div></form>}</section></div>
  </main>
}

function ToggleList({ label, values, options, disabled, onChange }: { label: string; values: string; options: string[]; disabled: boolean; onChange: (value: string) => void }) {
  const selected = new Set(values.split(',').filter(Boolean))
  return <fieldset><legend className="text-sm font-medium text-slate-700">{label}</legend><div className="mt-2 flex flex-wrap gap-2">{options.map(option => <label key={option} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline bg-card px-3 text-sm"><input type="checkbox" disabled={disabled} checked={selected.has(option)} onChange={() => { const next = new Set(selected); if (next.has(option)) next.delete(option); else next.add(option); onChange([...next].join(',')) }} />{option}</label>)}</div></fieldset>
}

function PolicyEditor({ draft, disabled, onChange }: { draft: Draft; disabled: boolean; onChange: (value: Draft) => void }) {
  const number = (key: keyof api.PeriodPolicyFields) => (event: ChangeEvent<HTMLInputElement>) => onChange({ ...draft, [key]: Number(event.target.value) })
  return <><div className="grid gap-3 md:grid-cols-2"><ToggleList label="Project modes được phép" values={draft.allowedProjectModes} options={modes} disabled={disabled} onChange={allowedProjectModes => onChange({ ...draft, allowedProjectModes })} /><ToggleList label="Proposal sources được phép" values={draft.allowedProposalSources} options={sources} disabled={disabled} onChange={allowedProposalSources => onChange({ ...draft, allowedProposalSources })} /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-medium text-slate-700">Team tối thiểu<input type="number" min="1" value={draft.minTeamSize} disabled={disabled} onChange={number('minTeamSize')} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label><label className="text-sm font-medium text-slate-700">Team tối đa<input type="number" min="1" value={draft.maxTeamSize} disabled={disabled} onChange={number('maxTeamSize')} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label><label className="text-sm font-medium text-slate-700">Distinct majors tối thiểu<input type="number" min="1" value={draft.minDistinctMajors} disabled={disabled} onChange={number('minDistinctMajors')} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label><label className="text-sm font-medium text-slate-700">Supervisor capacity<input type="number" min="1" value={draft.maxProjectsPerSupervisor} disabled={disabled} onChange={number('maxProjectsPerSupervisor')} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Bắt đầu hiệu lực<input type="datetime-local" value={draft.effectiveFrom} disabled={disabled} onChange={event => onChange({ ...draft, effectiveFrom: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label><label className="text-sm font-medium text-slate-700">Kết thúc hiệu lực<input type="datetime-local" value={draft.effectiveTo} disabled={disabled} onChange={event => onChange({ ...draft, effectiveTo: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label></div></>
}

function PolicyFields({ policy }: { policy: api.PeriodPolicyFields }) { return <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-slate-500">Project mode</dt><dd className="font-semibold text-slate-900">{policy.allowedProjectModes}</dd></div><div><dt className="text-slate-500">Proposal source</dt><dd className="font-semibold text-slate-900">{policy.allowedProposalSources}</dd></div><div><dt className="text-slate-500">Team size</dt><dd className="font-semibold text-slate-900">{policy.minTeamSize}–{policy.maxTeamSize}</dd></div><div><dt className="text-slate-500">Distinct majors</dt><dd className="font-semibold text-slate-900">{policy.minDistinctMajors}</dd></div><div><dt className="text-slate-500">Supervisor capacity</dt><dd className="font-semibold text-slate-900">{policy.maxProjectsPerSupervisor}</dd></div></dl> }
