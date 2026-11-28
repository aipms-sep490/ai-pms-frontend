import { useEffect, useRef, useState } from 'react'
import { getEvaluationSchemes } from '../../services/api/evaluations.api'
import * as api from '../../services/api/project-results.api'
import { Button } from '../../components/ui/Button'
import { ActionVerdict } from '../../components/ui/ActionVerdict'
import { InlineAlert } from '../../components/ui/InlineAlert'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { HttpError } from '../../services/http/http-client'
import { evaluationError } from '../evaluations/evaluation-errors'
import type { ResultPreview, StudentResult } from './result-types'
import { useAuthSession } from '../auth/context/useAuthSession'
import { studentChoiceLabel, useProjectStudentNames } from '../evaluations/useProjectStudentNames'

export function StudentResultPublicationPanel({ projectId, departmentId, studentNames = {} }: { projectId: number; departmentId?: number; studentNames?: Record<number, string> }) {
  const { session } = useAuthSession()
  const identities = useProjectStudentNames(projectId, session?.accessToken)
  const studentLabel = (id: number) => studentChoiceLabel(id, identities.names[id] ?? studentNames[id])
  const [students, setStudents] = useState<number[]>([]), [studentId, setStudentId] = useState('')
  const [preview, setPreview] = useState<ResultPreview | null>(null), [result, setResult] = useState<StudentResult | null>(null)
  const [rosterLoading, setRosterLoading] = useState(true), [reload, setReload] = useState(0)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [absenceOpen, setAbsenceOpen] = useState(false), [absenceReason, setAbsenceReason] = useState(''), [absenceMinutes, setAbsenceMinutes] = useState(''), [absenceNotice, setAbsenceNotice] = useState('')
  const version = useRef(0), locked = useRef(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  useEffect(() => {
    let active = true
    setRosterLoading(true)
    version.current++; setStudents([]); setStudentId(''); setPreview(null); setResult(null); setError('')
    const requestVersion = version
    getEvaluationSchemes(projectId).then(items => { if (active) setStudents([...new Set(items.filter(item => item.status === 'PUBLISHED').flatMap(item => item.students.filter(student => departmentId === undefined || student.departmentId === departmentId).map(student => student.studentId)))]) }).catch(reason => { if (active) setError(evaluationError(reason)) }).finally(() => { if (active) setRosterLoading(false) })
    return () => { active = false; requestVersion.current++ }
  }, [projectId, departmentId, reload])
  async function loadPreview() {
    if (!studentId || !students.includes(Number(studentId)) || locked.current || rosterLoading || identities.loading) return
    locked.current = true; setBusy(true); setError(''); setPreview(null); setResult(null)
    const current = ++version.current
    try {
      const published = await api.getStudentResult(projectId, Number(studentId))
      const next = published ? null : await api.getStudentResultPreview(projectId, Number(studentId))
      if (version.current === current) { setResult(published); setPreview(next) }
    } catch (reason) { if (version.current === current) setError(evaluationError(reason)) }
    finally { locked.current = false; setBusy(false) }
  }
  async function publish() {
    if (!preview?.canPublish || locked.current) return
    const current = version.current, id = Number(studentId), token = preview.confirmationToken
    locked.current = true; setBusy(true)
    if (await requestConfirmation({ title: 'Công bố kết quả sinh viên?', description: `Kết quả của 1 sinh viên (${studentLabel(id)}) sẽ được lưu theo bản xem trước hiện tại. Công bố không thể hoàn tác trực tiếp; chỉ có thể đính chính bằng quy trình riêng.`, confirmLabel: 'Công bố kết quả', danger: true }) === null || current !== version.current) { locked.current = false; setBusy(false); return }
    locked.current = true; setBusy(true); setError('')
    try { const saved = await api.publishStudentResult(projectId, id, token); if (current === version.current) { setResult(saved); setPreview(null) } }
    catch (reason) { if (current === version.current) { setPreview(null); if (reason instanceof HttpError && reason.status === 409) { try { const existing = await api.getStudentResult(projectId, id); const fresh = existing ? null : await api.getStudentResultPreview(projectId, id); if (current === version.current) { setResult(existing); setPreview(fresh) } } catch { /* Keep the decision error; the user can request a new preview. */ } }; setError(evaluationError(reason) + ' Hãy kiểm tra bản xem trước mới trước khi công bố.') } }
    finally { locked.current = false; setBusy(false) }
  }
  async function submitDefenseAbsence(event: React.FormEvent) {
    event.preventDefault()
    if (!studentId || locked.current || result || absenceReason.trim().length < 5) return
    const current = version.current, id = Number(studentId)
    locked.current = true; setBusy(true); setError(''); setAbsenceNotice('')
    try {
      await api.recordStudentDefenseAbsence(projectId, id, {
        reason: absenceReason.trim(),
        minutesReference: absenceMinutes.trim() || null,
      })
      if (current !== version.current) return
      setAbsenceOpen(false); setAbsenceReason(''); setAbsenceMinutes('')
      setAbsenceNotice('Đã ghi nhận vắng bảo vệ (DEFENSE_ABSENT -> 0.00 điểm Defense). Đang làm mới bản xem trước…')
      const next = await api.getStudentResultPreview(projectId, id)
      if (current === version.current) setPreview(next)
    } catch (reason) {
      if (current === version.current) setError(evaluationError(reason))
    } finally {
      locked.current = false; setBusy(false)
    }
  }
  return <section className="workspace-surface p-5 sm:p-6 space-y-4" aria-labelledby="student-publication-title">{confirmationDialog}<div className="flex flex-wrap items-center justify-between gap-3"><h2 id="student-publication-title" className="font-semibold">Kết quả từng sinh viên</h2><Button className="min-h-11" variant="secondary" disabled={busy || rosterLoading} onClick={() => setReload(reload + 1)}>Tải lại danh sách sinh viên</Button></div>{rosterLoading && <p role="status" className="text-sm">Đang tải danh sách sinh viên…</p>}<>{identities.loading && <p role="status" className="text-sm">Đang tải tên sinh viên từ hồ sơ đã chốt…</p>}{identities.error && <p role="alert" className="text-sm text-status-warning-text">{identities.error}<Button type="button" variant="secondary" onClick={identities.retry}>Thử tải lại tên sinh viên</Button></p>}</><p className="text-sm text-ink-muted">Chọn sinh viên trong phương án đánh giá đã công bố để xem điểm và điều kiện công bố.</p><div className="flex flex-wrap items-end gap-3"><label className="flex min-w-0 max-w-full flex-col gap-2 text-sm">Sinh viên<select aria-label="Sinh viên" value={studentId} disabled={busy || rosterLoading || identities.loading} onChange={event => { version.current++; setStudentId(event.target.value); setPreview(null); setResult(null); setError(''); setAbsenceOpen(false); setAbsenceNotice('') }} className="min-h-11 w-full min-w-0 max-w-full rounded-lg border border-hairline bg-card px-3 font-normal text-ink"><option value="">Chọn sinh viên</option>{students.map(id => <option key={id} value={id}>{studentLabel(id)}</option>)}</select></label><Button disabled={!studentId || busy || rosterLoading || identities.loading} onClick={() => void loadPreview()}>{busy ? 'Đang xử lý…' : 'Xem trước kết quả'}</Button>{studentId && !result && !rosterLoading && <Button variant="secondary" disabled={busy} onClick={() => setAbsenceOpen(v => !v)}>Ghi nhận vắng bảo vệ</Button>}</div>{!rosterLoading && !students.length && !error && <p className="text-sm text-ink-muted">Chưa có sinh viên thuộc phạm vi hiện tại trong phương án đánh giá đã công bố.</p>}{absenceNotice && <p role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">{absenceNotice}</p>}{absenceOpen && !result && studentId && <form onSubmit={e => void submitDefenseAbsence(e)} className="rounded-lg border border-status-warning-border bg-status-warning-bg/50 p-4 space-y-3"><h3 className="text-sm font-semibold text-ink">Ghi nhận vắng mặt bảo vệ (DEFENSE_ABSENT)</h3><label className="block text-sm">Lý do vắng mặt (tối thiểu 5 ký tự)<input required minLength={5} maxLength={500} value={absenceReason} disabled={busy} onChange={e => setAbsenceReason(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm" placeholder="Ví dụ: Vắng mặt buổi bảo vệ theo biên bản hội đồng…" /></label><label className="block text-sm">Số biên bản / quyết định (tùy chọn)<input maxLength={120} value={absenceMinutes} disabled={busy} onChange={e => setAbsenceMinutes(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 text-sm" placeholder="BB-HD-2026-01" /></label><div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || absenceReason.trim().length < 5}>Xác nhận vắng bảo vệ</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => setAbsenceOpen(false)}>Hủy</Button></div></form>}{error && <p role="alert" className="text-sm text-status-error-text">{error}</p>}{result && <p role="status">Đã công bố{result.version > 1 ? ` (Bản đính chính v${result.version})` : ''} · Điểm: {result.totalScore} · {outcome(result.outcomeDetail ?? result.outcome)}</p>}{preview && <div className="space-y-3"><p>Điểm: {preview.totalScore ?? '—'} · Ngưỡng đạt: {preview.passThreshold ?? '—'} · {outcome(preview.outcome)}</p>{preview.warnings && preview.warnings.length > 0 && <InlineAlert tone="warning"><ul className="list-disc pl-4 space-y-1">{preview.warnings.map((w, idx) => <li key={`${w.code}-${idx}`}><strong>Cảnh báo (không chặn công bố):</strong> {w.message}</li>)}</ul></InlineAlert>}<ActionVerdict actions={[{ code: 'PUBLISH_STUDENT_RESULT', allowed: preview.canPublish, reasons: preview.blockers.map(item => item === 'DEMO_SCHEME_NOT_OFFICIAL' ? 'Phương án minh họa chưa được phê duyệt để công bố điểm chính thức.' : item) }]} actionCode="PUBLISH_STUDENT_RESULT" status="ready" okLabel="Đủ điều kiện công bố theo bản xem trước" blockedLabel="Chưa đủ điều kiện công bố" /><Button disabled={!preview.canPublish || busy} onClick={() => void publish()}>Công bố kết quả sinh viên</Button></div>}</section>
}
const outcome = (value: string | null) => ({
  PASS: 'Đạt',
  FAIL: 'Chưa đạt',
  PASSED: 'Đạt',
  FAILED: 'Chưa đạt',
  FAILED_TOTAL: 'Chưa đạt (Điểm tổng < ngưỡng)',
  FAILED_COMPONENT_FLOOR: 'Chưa đạt (Điểm thành phần < sàn)',
  DEFENSE_ABSENT: 'Vắng bảo vệ (0.00 Defense)',
}[value ?? ''] ?? value ?? 'Chưa có kết luận')
