import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { HttpError } from '../../services/http/http-client'
import { getDeliverables, getDeliverableVersions } from '../../services/api/deliverables.api'
import type { ProjectMajorDto } from '../../types/backend'
import {
  assignIndustryExpert, getIndustryEvidence, getIndustryFeedbackHistory, getProjectIndustryAssignments,
  hasIndustryAction, revokeIndustryAssignment, shareIndustryEvidence, unshareIndustryEvidence,
  type IndustryAssignment, type IndustryAssignmentScope, type IndustryEvidenceFile, type IndustryFeedback,
} from './industry-api'

const statusText: Record<string, string> = { SCHEDULED: 'Chưa bắt đầu', ACTIVE: 'Đang hoạt động', EXPIRED: 'Đã hết hạn', REVOKED: 'Đã thu hồi' }
const statusTone: Record<string, BadgeTone> = { SCHEDULED: 'neutral', ACTIVE: 'success', EXPIRED: 'neutral', REVOKED: 'danger' }
const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
function message(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 409) return reason.problem?.detail || 'Phân công vừa thay đổi. Danh sách đã được tải lại.'
    if (reason.status === 403) return 'Chuyên gia chưa hợp lệ (chưa được mời, đã bị thu hồi) hoặc ngành nằm ngoài phạm vi đồ án.'
    return reason.problem?.detail || reason.message
  }
  return 'Có lỗi xảy ra. Hãy thử lại.'
}

/**
 * Lead department manages industry advisory for this project (AIPMS.Api/Controllers/
 * IndustryController.cs). Advisory only — an expert never gets scoring weight. There is no expert
 * directory endpoint; the lead enters the exact expert id the platform admin shared when inviting.
 */
export function IndustryAssignmentPanel({ projectId, projectStatus, projectMajors }: {
  projectId: number
  projectStatus: string
  projectMajors: ProjectMajorDto[]
}) {
  const [assignments, setAssignments] = useState<IndustryAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ expertId: '', scope: 'COMMON' as IndustryAssignmentScope, majorId: '', startsAt: '', endsAt: '' })
  const version = useRef(0)

  const load = useCallback(async () => {
    const current = ++version.current
    setLoading(true); setError('')
    try { const result = await getProjectIndustryAssignments(projectId, 1, 100); if (current === version.current) setAssignments(result.items) }
    catch (reason) { if (current === version.current) setError(message(reason)) }
    finally { if (current === version.current) setLoading(false) }
  }, [projectId])
  useEffect(() => { const requestVersion = version; void load(); return () => { requestVersion.current++ } }, [load])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const expertId = Number(form.expertId)
    if (!Number.isInteger(expertId) || expertId <= 0) { setError('Mã chuyên gia không hợp lệ.'); return }
    if (form.scope === 'MAJOR_SPECIFIC' && !form.majorId) { setError('Chọn ngành cho phạm vi MAJOR_SPECIFIC.'); return }
    if (!form.startsAt || !form.endsAt) { setError('Chọn thời gian bắt đầu và kết thúc.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      await assignIndustryExpert(projectId, {
        expertId, scope: form.scope, majorId: form.scope === 'MAJOR_SPECIFIC' ? Number(form.majorId) : undefined,
        startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(),
      })
      setForm({ expertId: '', scope: 'COMMON', majorId: '', startsAt: '', endsAt: '' })
      setNotice('Đã gán chuyên gia cho đồ án.')
      await load()
    } catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }

  async function revoke(item: IndustryAssignment) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await revokeIndustryAssignment(item.id, item.concurrencyToken); setNotice('Đã thu hồi phân công.'); await load() }
    catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }

  return <section className="workspace-surface space-y-4 p-4 sm:p-6" aria-labelledby="industry-assignment-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="industry-assignment-title" className="font-semibold">Chuyên gia doanh nghiệp (cố vấn)</h2>
      <Button className="min-h-11" variant="secondary" disabled={busy || loading} onClick={() => void load()}>Tải lại</Button>
    </div>
    <p className="text-sm text-ink-muted">Chuyên gia chỉ đóng vai trò cố vấn — không có trọng số chấm điểm trừ khi phương án đánh giá được duyệt quy định khác. Mã chuyên gia do quản trị viên nền tảng cung cấp khi mời.</p>

    {projectStatus === 'ACTIVE' || projectStatus === 'FINAL_SUBMISSION' ? <form onSubmit={submit} className="grid gap-3 rounded-lg border border-hairline p-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="flex flex-col gap-1 text-sm">Mã chuyên gia
        <input type="number" min={1} required value={form.expertId} disabled={busy} onChange={event => setForm(prev => ({ ...prev, expertId: event.target.value }))}
          className="min-h-11 rounded-lg border border-hairline px-3" />
      </label>
      <label className="flex flex-col gap-1 text-sm">Phạm vi
        <select className="min-h-11 rounded-lg border border-hairline px-3" value={form.scope} disabled={busy}
          onChange={event => setForm(prev => ({ ...prev, scope: event.target.value as IndustryAssignmentScope, majorId: '' }))}>
          <option value="COMMON">Chung (COMMON)</option>
          <option value="MAJOR_SPECIFIC">Theo ngành (MAJOR_SPECIFIC)</option>
        </select>
      </label>
      {form.scope === 'MAJOR_SPECIFIC' && <label className="flex flex-col gap-1 text-sm">Ngành
        <select className="min-h-11 rounded-lg border border-hairline px-3" value={form.majorId} disabled={busy}
          onChange={event => setForm(prev => ({ ...prev, majorId: event.target.value }))}>
          <option value="">Chọn ngành</option>
          {projectMajors.map(major => <option key={major.majorId} value={major.majorId}>{major.majorName}</option>)}
        </select>
      </label>}
      <label className="flex flex-col gap-1 text-sm">Bắt đầu
        <input type="datetime-local" required value={form.startsAt} disabled={busy} onChange={event => setForm(prev => ({ ...prev, startsAt: event.target.value }))}
          className="min-h-11 rounded-lg border border-hairline px-3" />
      </label>
      <label className="flex flex-col gap-1 text-sm">Kết thúc
        <input type="datetime-local" required value={form.endsAt} disabled={busy} onChange={event => setForm(prev => ({ ...prev, endsAt: event.target.value }))}
          className="min-h-11 rounded-lg border border-hairline px-3" />
      </label>
      <div className="sm:col-span-2 lg:col-span-5"><Button type="submit" disabled={busy}>{busy ? 'Đang gán…' : 'Gán chuyên gia'}</Button></div>
    </form> : <p className="text-sm text-ink-muted">Đồ án không ở trạng thái cho phép gán cố vấn.</p>}

    {error && <p role="alert" className="text-sm text-status-error-text">{error}</p>}
    {notice && <p role="status" className="text-sm text-status-success-text">{notice}</p>}
    {loading && <p role="status" className="text-sm">Đang tải danh sách cố vấn…</p>}
    {!loading && assignments.length === 0 && <p className="text-sm text-ink-muted">Chưa có cố vấn doanh nghiệp nào.</p>}

    <ul className="divide-y divide-hairline">{assignments.map(item => <li key={item.id} className="space-y-3 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm">Chuyên gia #{item.expertId} · {item.scope === 'COMMON' ? 'Chung' : `Ngành #${item.majorId}`}</strong>
        <StatusBadge tone={statusTone[item.status] ?? 'neutral'} label={statusText[item.status] ?? item.status} />
      </div>
      <p className="text-xs text-ink-muted">{formatDateTime(item.startsAt)} → {formatDateTime(item.endsAt)}</p>
      {hasIndustryAction(item, 'REVOKE') && <Button size="sm" variant="danger" disabled={busy} onClick={() => void revoke(item)}>Thu hồi</Button>}
      <AssignmentEvidenceSection assignment={item} projectId={projectId} onChanged={load} />
      <AssignmentFeedbackSection assignmentId={item.id} />
    </li>)}</ul>
  </section>
}

function AssignmentEvidenceSection({ assignment, projectId, onChanged }: { assignment: IndustryAssignment; projectId: number; onChanged: () => void }) {
  const [files, setFiles] = useState<IndustryEvidenceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)
  const [deliverables, setDeliverables] = useState<Array<{ id: number; title: string }>>([])
  const [deliverableId, setDeliverableId] = useState('')
  const [versionId, setVersionId] = useState<number | null>(null)
  const [versionFiles, setVersionFiles] = useState<Array<{ id: number; fileName: string }>>([])
  const revision = useRef(0)

  const load = useCallback(async () => {
    const current = ++revision.current
    setLoading(true); setError('')
    try { const result = await getIndustryEvidence(assignment.id, 1, 100); if (current === revision.current) setFiles(result.items) }
    catch (reason) { if (current === revision.current) setError(message(reason)) }
    finally { if (current === revision.current) setLoading(false) }
  }, [assignment.id])
  useEffect(() => { void load() }, [load])

  async function openPicker() {
    setPicking(true); setDeliverableId(''); setVersionId(null); setVersionFiles([])
    try { setDeliverables((await getDeliverables(projectId, { pageSize: 100 })).items.map(item => ({ id: item.id, title: item.title }))) }
    catch (reason) { setError(message(reason)) }
  }
  async function pickDeliverable(id: string) {
    setDeliverableId(id); setVersionId(null); setVersionFiles([])
    if (!id) return
    try {
      // Share picks from the deliverable's latest version; the version id (not the deliverable
      // id) is what shareIndustryEvidence's deliverableVersionId expects.
      const versions = await getDeliverableVersions(Number(id), 1, 1)
      const latest = versions.items[0]
      setVersionId(latest?.id ?? null)
      setVersionFiles(latest?.files.map(file => ({ id: file.id, fileName: file.fileName })) ?? [])
    } catch (reason) { setError(message(reason)) }
  }
  async function share(fileId: number) {
    if (busy || versionId === null) return
    setBusy(true); setError('')
    try {
      await shareIndustryEvidence(assignment.id, { concurrencyToken: assignment.concurrencyToken, deliverableVersionId: versionId, fileId })
      setPicking(false); onChanged(); await load()
    } catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }
  async function unshare(shareId: number) {
    if (busy) return
    setBusy(true); setError('')
    try { await unshareIndustryEvidence(assignment.id, shareId, assignment.concurrencyToken); onChanged(); await load() }
    catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }

  return <div className="space-y-2 rounded-lg border border-hairline p-3">
    <h3 className="text-sm font-semibold">Minh chứng đã chia sẻ</h3>
    {loading && <p role="status" className="text-xs">Đang tải…</p>}
    {error && <p role="alert" className="text-xs text-status-error-text">{error}</p>}
    {!loading && files.length === 0 && <p className="text-xs text-ink-muted">Chưa chia sẻ tệp nào.</p>}
    <ul className="space-y-1 text-sm">{files.map(file => <li key={file.id} className="flex flex-wrap items-center justify-between gap-2">
      <span>{file.fileName}</span>
      {hasIndustryAction(assignment, 'UNSHARE') && <Button size="sm" variant="danger" disabled={busy} onClick={() => void unshare(file.id)}>Thu hồi chia sẻ</Button>}
    </li>)}</ul>
    {hasIndustryAction(assignment, 'SHARE') && !picking && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void openPicker()}>Chia sẻ minh chứng</Button>}
    {picking && <div className="space-y-2">
      <label className="block text-xs">Bàn giao<select className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-2" value={deliverableId} disabled={busy}
        onChange={event => void pickDeliverable(event.target.value)}>
        <option value="">Chọn bàn giao</option>
        {deliverables.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      {versionFiles.length > 0 && <ul className="space-y-1 text-sm">{versionFiles.map(file => <li key={file.id} className="flex items-center justify-between gap-2">
        <span>{file.fileName}</span><Button size="sm" disabled={busy} onClick={() => void share(file.id)}>Chia sẻ</Button>
      </li>)}</ul>}
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPicking(false)}>Hủy</Button>
    </div>}
  </div>
}

function AssignmentFeedbackSection({ assignmentId }: { assignmentId: number }) {
  const [items, setItems] = useState<IndustryFeedback[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    void getIndustryFeedbackHistory(assignmentId, 1, 20).then(result => { if (active) setItems(result.items) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [assignmentId])
  if (loading) return <p role="status" className="text-xs">Đang tải góp ý…</p>
  if (items.length === 0) return <p className="text-xs text-ink-muted">Chưa có góp ý cố vấn.</p>
  return <div className="space-y-2 rounded-lg border border-hairline p-3">
    <h3 className="text-sm font-semibold">Góp ý cố vấn (chỉ tham khảo)</h3>
    <ul className="space-y-2 text-sm">{items.map(item => <li key={item.id}>
      <p className="text-xs text-ink-muted">Phiên bản {item.version} · {formatDateTime(item.submittedAt)}</p>
      <p>{item.content}</p>
    </li>)}</ul>
  </div>
}
