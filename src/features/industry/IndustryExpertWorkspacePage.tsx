import { useCallback, useEffect, useRef, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { HttpError } from '../../services/http/http-client'
import {
  downloadIndustryEvidenceFile, getIndustryEvidence, getIndustryFeedbackHistory, getMyIndustryAssignments,
  hasIndustryAction, submitIndustryFeedback,
  type IndustryAssignment, type IndustryEvidenceFile, type IndustryFeedback,
} from './industry-api'

const statusText: Record<string, string> = { SCHEDULED: 'Chưa bắt đầu', ACTIVE: 'Đang hoạt động', EXPIRED: 'Đã hết hạn', REVOKED: 'Đã thu hồi' }
const statusTone: Record<string, BadgeTone> = { SCHEDULED: 'neutral', ACTIVE: 'success', EXPIRED: 'neutral', REVOKED: 'danger' }
const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
function message(reason: unknown): string {
  if (reason instanceof HttpError) return reason.problem?.detail || reason.message
  return 'Có lỗi xảy ra. Hãy thử lại.'
}

/**
 * Industry expert's own workspace (AIPMS.Api/Controllers/IndustryController.cs `industry/assignments`
 * — "mine"). No academic role, no scoring weight: advisory evidence review + feedback only.
 */
export function IndustryExpertWorkspacePage() {
  const [assignments, setAssignments] = useState<IndustryAssignment[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const version = useRef(0)

  const load = useCallback(async () => {
    const current = ++version.current
    setLoading(true); setError('')
    try {
      const result = await getMyIndustryAssignments(1, 100)
      if (current !== version.current) return
      setAssignments(result.items)
      setSelectedId(prev => prev && result.items.some(item => item.id === prev) ? prev : (result.items[0]?.id ?? null))
    } catch (reason) { if (current === version.current) setError(message(reason)) }
    finally { if (current === version.current) setLoading(false) }
  }, [])
  useEffect(() => { const requestVersion = version; void load(); return () => { requestVersion.current++ } }, [load])

  const selected = assignments.find(item => item.id === selectedId) ?? null

  return <WorkspacePage className="space-y-5" title="Không gian cố vấn doanh nghiệp" eyebrow="Industry Advisory"
    description="Bạn tham gia với vai trò cố vấn — không có vai trò học thuật và không có trọng số chấm điểm trừ khi phương án đánh giá được duyệt quy định khác.">
    {loading && <p role="status" className="text-sm text-slate-600">Đang tải phân công cố vấn…</p>}
    {!loading && error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={() => void load()}>Tải lại</button></div>}
    {!loading && !error && assignments.length === 0 && <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Bạn chưa có phân công cố vấn nào đang hoạt động.</p>}

    {!loading && !error && assignments.length > 0 && <>
      {assignments.length > 1 && <label className="block text-sm font-medium text-slate-800">Đồ án
        <select className="mt-1 min-h-11 w-full max-w-md rounded-lg border border-hairline bg-card px-3" value={selectedId ?? ''} onChange={event => setSelectedId(Number(event.target.value))}>
          {assignments.map(item => <option key={item.id} value={item.id}>{item.projectCode} — {item.projectTitle}</option>)}
        </select>
      </label>}
      {selected && <section className="space-y-4 rounded-xl border border-hairline bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-base font-bold text-slate-950">{selected.projectCode} — {selected.projectTitle}</h2>
            <p className="text-xs text-slate-500">Phạm vi: {selected.scope === 'COMMON' ? 'Chung' : `Ngành #${selected.majorId}`} · {formatDateTime(selected.startsAt)} → {formatDateTime(selected.endsAt)}</p></div>
          <StatusBadge tone={statusTone[selected.status] ?? 'neutral'} label={statusText[selected.status] ?? selected.status} />
        </div>
        <EvidenceList assignment={selected} />
        <FeedbackThread assignment={selected} />
      </section>}
    </>}
  </WorkspacePage>
}

function EvidenceList({ assignment }: { assignment: IndustryAssignment }) {
  const [files, setFiles] = useState<IndustryEvidenceFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    void getIndustryEvidence(assignment.id, 1, 100).then(result => { if (active) setFiles(result.items) })
      .catch(reason => { if (active) setError(message(reason)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [assignment.id])
  async function download(file: IndustryEvidenceFile) {
    try {
      const blob = await downloadIndustryEvidenceFile(assignment.id, file.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = file.fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch { /* surfaced via list reload if the share was revoked meanwhile */ }
  }
  return <div>
    <h3 className="text-sm font-bold text-slate-900">Minh chứng được chia sẻ</h3>
    {loading && <p role="status" className="text-xs text-slate-500">Đang tải…</p>}
    {error && <p role="alert" className="text-xs text-status-error-text">{error}</p>}
    {!loading && files.length === 0 && <p className="text-xs text-slate-500">Chưa có minh chứng nào được chia sẻ.</p>}
    <ul className="mt-2 space-y-1 text-sm">{files.map(file => <li key={file.id}>
      <button type="button" className="text-primary underline" onClick={() => void download(file)}>{file.fileName}</button>
    </li>)}</ul>
  </div>
}

function FeedbackThread({ assignment }: { assignment: IndustryAssignment }) {
  const [items, setItems] = useState<IndustryFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const revision = useRef(0)

  const load = useCallback(async () => {
    const current = ++revision.current
    setLoading(true); setError('')
    try { const result = await getIndustryFeedbackHistory(assignment.id, 1, 50); if (current === revision.current) setItems(result.items) }
    catch (reason) { if (current === revision.current) setError(message(reason)) }
    finally { if (current === revision.current) setLoading(false) }
  }, [assignment.id])
  useEffect(() => { void load() }, [load])

  async function submit() {
    const value = content.trim()
    if (!value) { setFormError('Nhập nội dung góp ý.'); return }
    setSubmitting(true); setFormError(null)
    try {
      const expectedVersion = items[0]?.version ?? 0
      await submitIndustryFeedback(assignment.id, { concurrencyToken: assignment.concurrencyToken, expectedVersion, content: value })
      setContent(''); await load()
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) { setFormError('Góp ý vừa thay đổi. Đã tải lại bản mới nhất.'); await load(); return }
      setFormError(message(reason))
    } finally { setSubmitting(false) }
  }

  return <div className="space-y-2">
    <h3 className="text-sm font-bold text-slate-900">Góp ý cố vấn</h3>
    {loading && <p role="status" className="text-xs text-slate-500">Đang tải…</p>}
    {error && <p role="alert" className="text-xs text-status-error-text">{error}</p>}
    {!loading && items.length === 0 && <p className="text-xs text-slate-500">Bạn chưa gửi góp ý nào.</p>}
    <ul className="space-y-2 text-sm">{items.map(item => <li key={item.id} className="rounded-lg border border-hairline bg-canvas p-2">
      <p className="text-xs text-slate-500">Phiên bản {item.version} · {formatDateTime(item.submittedAt)}</p>
      <p>{item.content}</p>
    </li>)}</ul>
    {hasIndustryAction(assignment, 'SUBMIT_FEEDBACK') && <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800">Góp ý mới
        <textarea rows={3} value={content} onChange={event => setContent(event.target.value)} maxLength={10000}
          className="mt-1 w-full rounded-lg border border-hairline bg-card p-2 text-slate-950" placeholder="Nhận xét cố vấn thực tiễn cho nhóm…" />
      </label>
      {formError && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-2 text-sm text-status-error-text">{formError}</div>}
      <Button disabled={submitting} onClick={() => void submit()}>{submitting ? 'Đang gửi…' : 'Gửi góp ý'}</Button>
    </div>}
  </div>
}
