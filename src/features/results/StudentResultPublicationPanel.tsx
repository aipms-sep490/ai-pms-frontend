import { useEffect, useRef, useState } from 'react'
import { getEvaluationSchemes } from '../../services/api/evaluations.api'
import * as api from '../../services/api/project-results.api'
import { Button } from '../../components/ui/Button'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { evaluationError } from '../evaluations/evaluation-errors'
import type { ResultPreview, StudentResult } from './result-types'

export function StudentResultPublicationPanel({ projectId }: { projectId: number }) {
  const [students, setStudents] = useState<number[]>([]), [studentId, setStudentId] = useState('')
  const [preview, setPreview] = useState<ResultPreview | null>(null), [result, setResult] = useState<StudentResult | null>(null)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const version = useRef(0), locked = useRef(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  useEffect(() => {
    let active = true
    const requestVersion = version
    getEvaluationSchemes(projectId).then(items => { if (active) setStudents([...new Set(items.filter(item => item.status === 'PUBLISHED').flatMap(item => item.students.map(student => student.studentId)))]) }).catch(reason => { if (active) setError(evaluationError(reason)) })
    return () => { active = false; requestVersion.current++ }
  }, [projectId])
  async function loadPreview() {
    if (!studentId || locked.current) return
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
    if (await requestConfirmation({ title: 'Công bố kết quả sinh viên?', description: `Kết quả sinh viên #${id} sẽ được lưu theo bản xem trước hiện tại.`, confirmLabel: 'Công bố kết quả' }) === null || current !== version.current) return
    locked.current = true; setBusy(true); setError('')
    try { setResult(await api.publishStudentResult(projectId, id, token)); setPreview(null) }
    catch (reason) { setPreview(null); setError(evaluationError(reason) + ' Hãy xem trước lại trước khi công bố.') }
    finally { locked.current = false; setBusy(false) }
  }
  return <section className="workspace-surface p-5 sm:p-6 space-y-4" aria-labelledby="student-publication-title">{confirmationDialog}<h2 id="student-publication-title" className="font-semibold">Kết quả từng sinh viên</h2><p className="text-sm text-slate-600">Chọn sinh viên trong phương án đánh giá đã công bố để xem điểm và điều kiện công bố.</p><div className="flex flex-wrap items-end gap-3"><label className="flex flex-col gap-2 text-sm">Sinh viên<select value={studentId} disabled={busy} onChange={event => { version.current++; setStudentId(event.target.value); setPreview(null); setResult(null); setError('') }} className="min-h-10 rounded-lg border border-hairline px-3"><option value="">Chọn sinh viên</option>{students.map(id => <option key={id} value={id}>Sinh viên #{id}</option>)}</select></label><Button disabled={!studentId || busy} onClick={() => void loadPreview()}>{busy ? 'Đang xử lý…' : 'Xem trước kết quả'}</Button></div>{!students.length && !error && <p className="text-sm text-slate-500">Chưa có danh sách sinh viên trong phương án đánh giá đã công bố.</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{result && <p role="status">Đã công bố · Điểm: {result.totalScore} · {outcome(result.outcome)}</p>}{preview && <div className="space-y-3"><p>Điểm: {preview.totalScore ?? '—'} · Ngưỡng đạt: {preview.passThreshold ?? '—'} · {outcome(preview.outcome)}</p><ul className="list-disc pl-5 text-sm text-amber-800">{preview.blockers.map(item => <li key={item}>{item}</li>)}</ul><Button disabled={!preview.canPublish || busy} onClick={() => void publish()}>Công bố kết quả sinh viên</Button></div>}</section>
}
const outcome = (value: string | null) => ({ PASS: 'Đạt', FAIL: 'Chưa đạt', PASSED: 'Đạt', FAILED: 'Chưa đạt' }[value ?? ''] ?? value ?? 'Chưa có kết luận')
