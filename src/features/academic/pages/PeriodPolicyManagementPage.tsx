import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/period-policy-api'
import { QualificationPolicyPanel } from '../components/QualificationPolicyPanel'

type Draft = api.PeriodPolicyFields & { effectiveFrom: string; effectiveTo: string }

const modes = ['SINGLE_MAJOR', 'INTERDISCIPLINARY']
const sources = ['STUDENT_PROPOSAL', 'PUBLISHED_TOPIC']
const policyOptionLabels: Record<string, string> = { SINGLE_MAJOR: 'Một ngành', INTERDISCIPLINARY: 'Liên ngành', STUDENT_PROPOSAL: 'Sinh viên đề xuất', PUBLISHED_TOPIC: 'Đề tài đã công bố' }
const policyStatusLabels: Record<string, string> = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', LOCKED: 'Đã khóa' }

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
    if (reason.status === 403) return 'Bạn chưa có quyền quản lý chính sách của giai đoạn này.'
    if (reason.status === 404) return 'Không tìm thấy giai đoạn hoặc chưa có chính sách đang hiệu lực.'
    if (reason.status === 409) return 'Chính sách vừa được thay đổi. Dữ liệu mới đã được tải lại; hãy kiểm tra trước khi thao tác tiếp.'
    if (reason.status === 400) return reason.problem?.detail || 'Dữ liệu chính sách chưa đáp ứng các điều kiện áp dụng.'
  }
  return 'Không thể đồng bộ phiên bản chính sách. Hãy thử tải lại.'
}

export function PeriodPolicyManagementPage() {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
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
    if (!Number.isInteger(periodId) || periodId < 1) { setError('Mã giai đoạn đồ án không hợp lệ.'); setLoading(false); return }
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
    if (!effective) { setError('Cần có một chính sách đang hiệu lực trước khi tạo bản kế tiếp.'); return }
    setEditing(null); setDraft({ ...fromPolicy(effective), effectiveFrom: localDateTime(new Date().toISOString()) }); setError(null); setNotice(null)
  }
  const validate = () => {
    if (!draft) return 'Không có dữ liệu chính sách để lưu.'
    const start = new Date(draft.effectiveFrom), end = new Date(draft.effectiveTo)
    if (!draft.allowedProjectModes || !draft.allowedProposalSources) return 'Chọn ít nhất một phương thức đồ án và một nguồn đề tài.'
    if (!Number.isInteger(draft.minTeamSize) || !Number.isInteger(draft.maxTeamSize) || !Number.isInteger(draft.minDistinctMajors) || !Number.isInteger(draft.maxProjectsPerSupervisor) || draft.minTeamSize < 1 || draft.maxTeamSize < draft.minTeamSize || draft.minDistinctMajors < 1 || draft.minDistinctMajors > draft.maxTeamSize || draft.maxProjectsPerSupervisor < 1) return 'Kiểm tra số thành viên, số ngành tham gia và số đồ án tối đa của mỗi giảng viên.'
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return 'Khoảng hiệu lực phải có thời điểm bắt đầu trước kết thúc.'
    return null
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const issue = validate(); if (issue || !draft) { setError(issue); return }
    const latest = history[0]
    if (!latest) { setError('Chưa có lịch sử chính sách để xác định phiên bản kế tiếp.'); return }
    const input: api.SavePeriodPolicyInput = {
      expectedVersion: editing?.version ?? latest.version,
      operation: editing ? 'UPDATE_DRAFT' : 'SUCCESSOR',
      policy: { allowedProjectModes: draft.allowedProjectModes, allowedProposalSources: draft.allowedProposalSources, minTeamSize: draft.minTeamSize, maxTeamSize: draft.maxTeamSize, minDistinctMajors: draft.minDistinctMajors, maxProjectsPerSupervisor: draft.maxProjectsPerSupervisor },
      effectiveFrom: toIso(draft.effectiveFrom), effectiveTo: toIso(draft.effectiveTo),
      ...(editing ? { concurrencyToken: editing.concurrencyToken } : {}),
    }
    void run(() => api.savePeriodPolicy(periodId, input), editing ? 'Đã lưu bản nháp chính sách.' : 'Đã tạo bản kế tiếp ở trạng thái nháp.', true)
  }
  const publish = async () => {
    if (!editing || editing.status !== 'DRAFT' || !draft) return
    if (await requestConfirmation({ title: 'Công bố chính sách?', description: 'Phiên bản này sẽ được áp dụng ngay và kết thúc hiệu lực của phiên bản trước.', confirmLabel: 'Công bố chính sách' }) === null) return
    const now = new Date()
    const input: api.SavePeriodPolicyInput = {
      expectedVersion: editing.version, operation: 'PUBLISH', concurrencyToken: editing.concurrencyToken,
      policy: { allowedProjectModes: draft.allowedProjectModes, allowedProposalSources: draft.allowedProposalSources, minTeamSize: draft.minTeamSize, maxTeamSize: draft.maxTeamSize, minDistinctMajors: draft.minDistinctMajors, maxProjectsPerSupervisor: draft.maxProjectsPerSupervisor },
      effectiveFrom: now.toISOString(), effectiveTo: toIso(draft.effectiveTo),
    }
    void run(() => api.savePeriodPolicy(periodId, input), 'Đã công bố phiên bản chính sách mới.', false)
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

  return <WorkspacePage className="space-y-6" title="Phiên bản chính sách" eyebrow={`Giai đoạn đồ án #${periodId}`} description="Xem lịch sử và điều chỉnh các điều kiện áp dụng cho giai đoạn này." backTo="/academic/governance">
    {confirmationDialog}
    {error && <div ref={errorSummary} tabIndex={-1} role="alert" aria-labelledby="policy-error-title" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><p id="policy-error-title" className="font-semibold">Chưa thể hoàn tất thao tác</p><p className="mt-1">{error}</p><button type="button" onClick={() => void load()} className="mt-2 min-h-11 font-semibold underline underline-offset-4">Tải lại dữ liệu</button></div>}
    {notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text">{notice}</p>}
    <section className="workspace-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Chính sách hiện hành</h2>{effective ? <p className="mt-1 text-sm text-slate-600">Phiên bản {effective.version} · {policyStatusLabels[effective.status] ?? effective.status} · hiệu lực {formatDateTime(effective.effectiveFrom)} đến {formatDateTime(effective.effectiveTo)}</p> : <p className="mt-1 text-sm text-status-warning-text">Chưa có chính sách hiệu lực tại thời điểm hiện tại.</p>}</div><button type="button" disabled={loading || busy || !effective} onClick={createSuccessor} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Tạo bản kế tiếp</button></div>{effective && <PolicyFields policy={effective.policy} />}</section>
    <div className="workspace-master-detail"><section className="workspace-surface p-5"><h2 className="font-semibold text-slate-900">Lịch sử phiên bản</h2>{loading ? <p role="status" className="mt-3 text-sm text-slate-600">Đang tải lịch sử chính sách…</p> : history.length === 0 ? <p className="mt-3 text-sm text-slate-600">Chưa có phiên bản chính sách.</p> : <ul className="mt-3 space-y-2">{history.map(item => <li key={item.id}><button type="button" onClick={() => item.status === 'DRAFT' ? editDraft(item) : undefined} disabled={item.status !== 'DRAFT'} className={`policy-history-row min-h-11 w-full p-3 text-left text-sm ${item.status === 'DRAFT' ? 'border-status-warning-border bg-status-warning-bg hover:bg-status-warning-bg/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary' : 'border-hairline bg-slate-50'}`}><strong>Phiên bản {item.version} · {policyStatusLabels[item.status] ?? item.status}</strong><span className="mt-1 block text-xs text-slate-600">{formatDateTime(item.effectiveFrom)} → {formatDateTime(item.effectiveTo)}</span>{item.status === 'DRAFT' && <span className="mt-1 block text-xs font-semibold text-status-warning-text">Có thể chỉnh sửa</span>}</button></li>)}</ul>}</section>
      <section className="workspace-surface p-5">{!draft ? <p className="text-sm text-slate-600">Chọn “Tạo bản kế tiếp” để thay đổi chính sách. Các phiên bản đã công bố hoặc đã khóa chỉ xuất hiện trong lịch sử.</p> : <form onSubmit={save} className="space-y-5"><div><h2 className="font-semibold text-slate-900">{editing ? `Chỉnh sửa bản nháp ${editing.version}` : 'Bản nháp kế tiếp'}</h2><p className="mt-1 text-sm text-slate-600">Khi công bố, phiên bản mới sẽ áp dụng từ thời điểm hiện tại. Hệ thống kiểm tra lại thời gian hiệu lực và điều kiện sử dụng trước khi lưu.</p></div><PolicyEditor draft={draft} disabled={busy} onChange={setDraft} /><div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</button>{editing?.status === 'DRAFT' && <button type="button" disabled={busy} onClick={publish} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Công bố ngay</button>}<button type="button" disabled={busy} onClick={() => { setEditing(null); setDraft(null); setError(null) }} className="min-h-11 px-3 text-sm font-semibold text-slate-700 underline underline-offset-4">Hủy</button></div></form>}</section></div>
    <QualificationPolicyPanel periodId={periodId} />
  </WorkspacePage>
}

function ToggleList({ label, values, options, disabled, onChange }: { label: string; values: string; options: string[]; disabled: boolean; onChange: (value: string) => void }) {
  const selected = new Set(values.split(',').filter(Boolean))
  return <fieldset><legend className="text-sm font-medium text-slate-700">{label}</legend><div className="mt-2 flex flex-wrap gap-2">{options.map(option => <label key={option} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline bg-card px-3 text-sm"><input type="checkbox" disabled={disabled} checked={selected.has(option)} onChange={() => { const next = new Set(selected); if (next.has(option)) next.delete(option); else next.add(option); onChange([...next].join(',')) }} />{policyOptionLabels[option] ?? option}</label>)}</div></fieldset>
}

function PolicyEditor({ draft, disabled, onChange }: { draft: Draft; disabled: boolean; onChange: (value: Draft) => void }) {
  const number = (key: keyof api.PeriodPolicyFields) => (event: ChangeEvent<HTMLInputElement>) => onChange({ ...draft, [key]: Number(event.target.value) })
  return <><div className="grid gap-3 md:grid-cols-2"><ToggleList label="Phương thức đồ án" values={draft.allowedProjectModes} options={modes} disabled={disabled} onChange={allowedProjectModes => onChange({ ...draft, allowedProjectModes })} /><ToggleList label="Nguồn đề tài" values={draft.allowedProposalSources} options={sources} disabled={disabled} onChange={allowedProposalSources => onChange({ ...draft, allowedProposalSources })} /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-medium text-slate-700">Thành viên tối thiểu<input type="number" min="1" value={draft.minTeamSize} disabled={disabled} onChange={number('minTeamSize')} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label><label className="text-sm font-medium text-slate-700">Thành viên tối đa<input type="number" min="1" value={draft.maxTeamSize} disabled={disabled} onChange={number('maxTeamSize')} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label><label className="text-sm font-medium text-slate-700">Số ngành tối thiểu<input type="number" min="1" value={draft.minDistinctMajors} disabled={disabled} onChange={number('minDistinctMajors')} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label><label className="text-sm font-medium text-slate-700">Đồ án tối đa mỗi giảng viên<input type="number" min="1" value={draft.maxProjectsPerSupervisor} disabled={disabled} onChange={number('maxProjectsPerSupervisor')} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Bắt đầu hiệu lực<input type="datetime-local" value={draft.effectiveFrom} disabled={disabled} onChange={event => onChange({ ...draft, effectiveFrom: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label><label className="text-sm font-medium text-slate-700">Kết thúc hiệu lực<input type="datetime-local" value={draft.effectiveTo} disabled={disabled} onChange={event => onChange({ ...draft, effectiveTo: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3 disabled:bg-slate-100" /></label></div></>
}

function PolicyFields({ policy }: { policy: api.PeriodPolicyFields }) { const labels = (value: string) => value.split(',').filter(Boolean).map(item => policyOptionLabels[item] ?? item).join(', '); return <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-slate-500">Phương thức đồ án</dt><dd className="font-semibold text-slate-900">{labels(policy.allowedProjectModes)}</dd></div><div><dt className="text-slate-500">Nguồn đề tài</dt><dd className="font-semibold text-slate-900">{labels(policy.allowedProposalSources)}</dd></div><div><dt className="text-slate-500">Số thành viên</dt><dd className="font-semibold text-slate-900">{policy.minTeamSize}–{policy.maxTeamSize}</dd></div><div><dt className="text-slate-500">Số ngành tối thiểu</dt><dd className="font-semibold text-slate-900">{policy.minDistinctMajors}</dd></div><div><dt className="text-slate-500">Đồ án tối đa mỗi giảng viên</dt><dd className="font-semibold text-slate-900">{policy.maxProjectsPerSupervisor}</dd></div></dl> }
