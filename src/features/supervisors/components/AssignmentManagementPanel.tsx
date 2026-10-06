import { useCallback, useEffect, useRef, useState } from 'react'
import { getAssignments, getCandidates } from '../../../services/api/supervisors.api'
import type { SupervisorAssignmentDto, SupervisorCandidateDto } from '../../../types/backend'
import * as api from '../api/assignment-management-api'
import { Button } from '../../../components/ui/Button'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'

export function AssignmentManagementPanel({ projectId, canManage }: { projectId: number; canManage: boolean }) {
  const [assignments, setAssignments] = useState<SupervisorAssignmentDto[]>([]), [candidates, setCandidates] = useState<SupervisorCandidateDto[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [candidateError, setCandidateError] = useState(false), [notice, setNotice] = useState('')
  const lock = useRef(false), { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const load = useCallback(async () => {
    setLoading(true); setError(''); setCandidateError(false)
    try { setAssignments((await getAssignments(projectId, { page: 1, pageSize: 100 })).items) }
    catch { setError('Chưa tải được phân công hướng dẫn của đồ án.') }
    if (canManage) { try { setCandidates((await getCandidates(projectId, { page: 1, pageSize: 100 })).items) } catch { setCandidates([]); setCandidateError(true) } }
    setLoading(false)
  }, [projectId, canManage])
  useEffect(() => { void load() }, [load])
  async function update(item: SupervisorAssignmentDto, replacement?: number) {
    if (lock.current || !canManage) return
    const reason = await requestConfirmation({ title: replacement ? `Thay giảng viên hướng dẫn ${item.supervisorName}?` : `Kết thúc phân công của ${item.supervisorName}?`, description: replacement ? 'Phân công hiện tại sẽ kết thúc và giảng viên được chọn sẽ tiếp nhận hướng dẫn.' : 'Giảng viên sẽ không còn phụ trách theo phân công này.', confirmLabel: replacement ? 'Thay giảng viên' : 'Kết thúc phân công', reasonLabel: 'Lý do thay đổi', danger: !replacement })
    if (reason === null) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try { const fresh = await api.getSupervisorAssignment(item.id); if (fresh.endedAt) { setError('Phân công đã kết thúc. Tải lại trước khi tiếp tục.'); return }; if (replacement) await api.replaceSupervisorAssignment(item.id, replacement, reason); else await api.endSupervisorAssignment(item.id, reason); await load(); setNotice('Đã cập nhật phân công hướng dẫn.') }
    catch (failure) { setError(failure instanceof HttpError && failure.status === 409 ? 'Phân công hoặc sức chứa đã thay đổi. Tải lại danh sách và chọn lại.' : 'Chưa cập nhật được phân công. Kiểm tra quyền và điều kiện của giảng viên.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <section className="workspace-surface p-5 sm:p-6 space-y-4" aria-labelledby="assignment-management-title">{confirmationDialog}<div className="flex flex-wrap items-center justify-between gap-3"><h2 id="assignment-management-title" className="font-semibold">Phân công hướng dẫn</h2><Button variant="secondary" disabled={busy || loading} onClick={() => void load()}>Tải lại</Button></div>{loading && <p role="status" className="text-sm">Đang tải phân công…</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{notice && <p role="status" className="text-sm text-primary">{notice}</p>}{candidateError && <p className="text-sm text-amber-800">Chưa tải được danh sách giảng viên có thể tiếp nhận. Thử tải lại để thay giảng viên.</p>}<ul className="divide-y divide-hairline">{assignments.map(item => <li key={item.id} className="space-y-3 py-4"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{item.supervisorName}</strong><span className="text-xs text-slate-500">{item.endedAt ? 'Đã kết thúc' : item.isPrimary ? 'Hướng dẫn chính' : 'Hướng dẫn chuyên ngành'}</span></div>{canManage && !item.endedAt && <form className="api-form flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); const id = Number(new FormData(event.currentTarget).get('profile')); if (id) void update(item, id) }}><label className="min-w-0 flex-1">Giảng viên tiếp nhận<select name="profile" required disabled={busy || candidateError}><option value="">Chọn giảng viên</option>{candidates.filter(candidate => candidate.id !== item.supervisorProfileId && candidate.remainingSlots > 0).map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.fullName} · {candidate.departmentName}</option>)}</select></label><Button type="submit" disabled={busy || candidateError || !candidates.length}>Thay giảng viên</Button><Button variant="secondary" disabled={busy} onClick={() => void update(item)}>Kết thúc phân công</Button></form>}</li>)}</ul>{!loading && !error && !assignments.length && <p className="text-sm text-slate-500">Chưa có phân công hướng dẫn.</p>}</section>
}
