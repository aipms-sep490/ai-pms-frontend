import { useCallback, useEffect, useRef, useState } from 'react'
import { getAssignments } from '../../../services/api/supervisors.api'
import type { SupervisorAssignmentDto } from '../../../types/backend'
import * as api from '../api/assignment-management-api'
import { Button } from '../../../components/ui/Button'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { readAllPages } from '../../../services/api/paged-read'
import { HttpError } from '../../../services/http/http-client'
import { departmentError } from '../../department/hooks/useDepartmentSection'
import { assignmentReasonLabel } from './assignment-reason-label'

const allowed = (item: SupervisorAssignmentDto, code: string) => item.allowedActions?.some(action => action.code === code && action.allowed) === true
export function AssignmentManagementPanel({ projectId, projectStatus = 'ACTIVE' }: { projectId: number; canManage?: boolean; canEnd?: boolean; projectStatus?: string }) {
  const [assignments, setAssignments] = useState<SupervisorAssignmentDto[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const version = useRef(0), lock = useRef(false), { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const load = useCallback(async () => {
    const current = ++version.current; setLoading(true); setError(''); setAssignments([])
    try { const result = await readAllPages(page => getAssignments(projectId, { page, pageSize: 100 })); if (current === version.current) setAssignments(result) }
    catch (reason) { if (current === version.current) setError(departmentError(reason).message) }
    finally { if (current === version.current) setLoading(false) }
  }, [projectId])
  useEffect(() => { const requestVersion = version; setNotice(''); void load(); return () => { requestVersion.current++ } }, [load])
  async function update(item: SupervisorAssignmentDto, replacement?: number) {
    const code = replacement ? 'REPLACE' : 'END'
    if (lock.current || projectStatus !== 'ACTIVE' || !allowed(item, code)) return
    lock.current = true; setBusy(true); setNotice('')
    const current = version.current
    try {
      const reason = await requestConfirmation({ title: replacement ? `Thay giảng viên hướng dẫn ${item.supervisorName}?` : `Kết thúc phân công của ${item.supervisorName}?`, description: replacement ? 'Hệ thống kiểm tra lại phạm vi, chuyên môn và sức chứa trước khi thay phân công.' : 'Phân công sẽ kết thúc theo quyền hiện tại. Kiểm tra ảnh hưởng đến hướng dẫn đồ án trước khi xác nhận.', confirmLabel: replacement ? 'Thay giảng viên' : 'Kết thúc phân công', reasonLabel: 'Lý do thay đổi', danger: !replacement })
      if (reason === null || current !== version.current) return
      const fresh = await api.getSupervisorAssignment(item.id)
      if (current !== version.current) return
      if (fresh.endedAt || !allowed(fresh, code)) { await load(); setError('Quyền hoặc phân công đã thay đổi. Hãy xem lại trước khi quyết định.'); return }
      if (replacement) await api.replaceSupervisorAssignment(item.id, replacement, reason)
      else await api.endSupervisorAssignment(item.id, reason)
      if (current === version.current) { await load(); setNotice('Đã cập nhật phân công hướng dẫn.') }
    } catch (reason) {
      if (current !== version.current) return
      if (reason instanceof HttpError && reason.status === 409) { await load(); setError('Phân công hoặc sức chứa đã thay đổi. Kiểm tra lại ứng viên; quyết định chưa được gửi lại.') }
      else setError(departmentError(reason).message)
    } finally { lock.current = false; setBusy(false) }
  }
  return <section className="workspace-surface space-y-4 p-4 sm:p-6" aria-labelledby="assignment-management-title">{confirmationDialog}
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="assignment-management-title" className="font-semibold">Phân công hướng dẫn</h2><Button className="min-h-11" variant="secondary" disabled={busy || loading} onClick={() => void load()}>Tải lại</Button></div>
    <p className="text-sm text-slate-600">Quyền thay và kết thúc được hệ thống xác định cho từng phân công, theo khoa chủ trì hoặc khoa phụ trách ngành. Ứng viên được kiểm tra lại khi lưu.</p>
    {loading && <p role="status">Đang tải phân công…</p>}{error && <p role="alert" className="text-sm text-status-error-text">{error}</p>}{notice && <p role="status" className="text-sm text-status-success-text">{notice}</p>}
    <ul className="divide-y divide-hairline">{assignments.map(item => <li key={item.id} className="space-y-3 py-4"><div className="flex flex-wrap justify-between gap-2"><strong className="break-words text-sm">{item.supervisorName}</strong><span className="text-xs text-slate-600">{item.endedAt ? 'Đã kết thúc' : item.isPrimary ? 'Hướng dẫn chính' : 'Hướng dẫn chuyên ngành'}</span></div>
      {item.endReason && <p className="break-words text-sm">Lý do kết thúc: {item.endReason}</p>}{item.replacesAssignmentId && <p className="text-sm">Thay thế phân công #{item.replacesAssignmentId}</p>}
      {!item.endedAt && projectStatus === 'ACTIVE' && allowed(item, 'REPLACE') && <ReplacementPicker assignmentId={item.id} busy={busy} onReplace={id => void update(item, id)} />}
      {!item.endedAt && projectStatus === 'ACTIVE' && allowed(item, 'END') && <Button className="min-h-11" variant="secondary" disabled={busy} onClick={() => void update(item)}>Kết thúc phân công</Button>}
      {!item.endedAt && (!allowed(item, 'REPLACE') || !allowed(item, 'END') || projectStatus !== 'ACTIVE') && <p className="break-words text-sm text-slate-600">{projectStatus !== 'ACTIVE' ? 'Đồ án không ở trạng thái đang thực hiện; phân công chỉ được xem.' : item.reasons?.map(assignmentReasonLabel).join(' · ') || 'Hệ thống chưa cấp quyền cho một hoặc nhiều thao tác trên phân công này.'}</p>}
    </li>)}</ul>{!loading && !error && !assignments.length && <p className="text-sm text-slate-600">Chưa có phân công hướng dẫn.</p>}
  </section>
}

function ReplacementPicker({ assignmentId, busy, onReplace }: { assignmentId: number; busy: boolean; onReplace: (id: number) => void }) {
  const [open, setOpen] = useState(false), [page, setPage] = useState(1), [search, setSearch] = useState(''), [retry, setRetry] = useState(0), [selected, setSelected] = useState('')
  const [items, setItems] = useState<api.ReplacementCandidate[]>([]), [total, setTotal] = useState(0), [loading, setLoading] = useState(false), [error, setError] = useState('')
  const version = useRef(0)
  useEffect(() => {
    if (!open) return
    const requestVersion = version; const current = ++requestVersion.current
    setLoading(true); setItems([]); setSelected(''); setError('')
    api.getReplacementCandidates(assignmentId, page, search).then(result => { if (current === version.current) { setItems(result.items); setTotal(result.totalCount) } }).catch(reason => { if (current === version.current) setError(departmentError(reason).message) }).finally(() => { if (current === version.current) setLoading(false) })
    return () => { requestVersion.current++ }
  }, [assignmentId, page, search, open, retry])
  const candidate = items.find(item => item.candidate.id === Number(selected))
  if (!open) return <Button className="min-h-11" variant="secondary" disabled={busy} onClick={() => setOpen(true)}>Chọn người thay thế</Button>
  return <div className="space-y-3 rounded-lg border border-hairline p-3">
    <label className="block text-sm">Tìm ứng viên<input className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3" value={search} disabled={busy} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
    {loading && <p role="status">Đang kiểm tra ứng viên…</p>}{error && <div role="alert"><p className="text-sm text-status-error-text">{error}</p><Button variant="secondary" disabled={busy || loading} onClick={() => setRetry(value => value + 1)}>Thử lại ứng viên</Button></div>}
    {!loading && !error && <><label className="block text-sm">Giảng viên thay thế<select aria-label="Giảng viên thay thế" className="mt-1 min-h-11 w-full max-w-full rounded-lg border border-hairline px-3" value={selected} disabled={busy} onChange={event => setSelected(event.target.value)}><option value="">Chọn ứng viên</option>{items.map(item => <option key={item.candidate.id} value={item.candidate.id} disabled={!item.eligible}>{item.candidate.fullName} · {item.candidate.departmentName}</option>)}</select></label>
      {candidate && <div className="break-words text-sm"><p>Còn {candidate.candidate.remainingSlots} suất · Đang hướng dẫn {candidate.candidate.activeProjects} đồ án · Trong kỳ {candidate.candidate.semesterActiveProjects}/{candidate.candidate.semesterLimit}</p><p>{candidate.expertiseMatch === 'MATCHED' ? 'Chuyên môn phù hợp ngành phụ trách' : candidate.expertiseMatch === 'NOT_REQUIRED' ? 'Phân công chính không yêu cầu đối chiếu chuyên môn ngành theo chính sách hiện hành' : 'Chưa có kết luận chuyên môn'} · Khoa phụ trách #{candidate.responsibleDepartmentId ?? '—'}</p>{candidate.reasons.length > 0 && <p>{candidate.reasons.join(' · ')}</p>}</div>}
      {!items.length && <p className="text-sm">Không có ứng viên đủ điều kiện với bộ lọc hiện tại.</p>}
      <div className="flex flex-wrap items-center gap-3"><Button className="min-h-11" disabled={busy || !candidate?.eligible} onClick={() => candidate && onReplace(candidate.candidate.id)}>Thay giảng viên</Button><Button className="min-h-11" variant="secondary" disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)}>Ứng viên trang trước</Button><span className="text-sm">Trang {page}/{Math.max(1, Math.ceil(total / 20))} · {total} ứng viên</span><Button className="min-h-11" variant="secondary" disabled={busy || page * 20 >= total} onClick={() => setPage(value => value + 1)}>Ứng viên trang sau</Button></div>
    </>}
  </div>
}
