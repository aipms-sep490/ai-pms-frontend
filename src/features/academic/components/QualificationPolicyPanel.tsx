import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_QUALIFICATION_TYPES,
  getPeriodPolicy,
  getQualificationTypes,
  setPeriodPolicy,
  type QualificationTypeOption,
} from '../../../services/api/student-qualifications.api'
import type { ProjectPeriodQualificationPolicyDto } from '../../../types/backend'
import { Button } from '../../../components/ui/Button'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { HttpError } from '../../../services/http/http-client'

export function QualificationPolicyPanel({ periodId }: { periodId: number }) {
  const { session } = useAuthSession()
  const canManage = session?.user.roles.some(role => role.toUpperCase() === 'DEPARTMENT_STAFF') === true
  const [policy, setPolicy] = useState<ProjectPeriodQualificationPolicyDto | null>(null)
  const [types, setTypes] = useState<readonly QualificationTypeOption[]>(DEFAULT_QUALIFICATION_TYPES)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const lock = useRef(false), { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const load = useCallback(async () => {
    setError('')
    try {
      setPolicy(await getPeriodPolicy(periodId))
    } catch {
      setError('Chưa tải được điều kiện chứng nhận của kỳ đồ án.')
    }
  }, [periodId])
  useEffect(() => {
    let active = true
    void getQualificationTypes().then(next => { if (active && next.length > 0) setTypes(next) })
    void getPeriodPolicy(periodId)
      .then(next => { if (active) { setPolicy(next); setError('') } })
      .catch(() => { if (active) setError('Chưa tải được điều kiện chứng nhận của kỳ đồ án.') })
    return () => { active = false }
  }, [periodId])
  async function save() {
    if (!canManage || !policy || lock.current) return
    if (await requestConfirmation({ title: 'Lưu điều kiện chứng nhận?', description: 'Điều kiện mới sẽ được kiểm tra khi sinh viên đăng ký đồ án trong kỳ này.', confirmLabel: 'Lưu điều kiện' }) === null) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try { setPolicy(await setPeriodPolicy(periodId, { requireStudentQualification: policy.requireStudentQualification, qualificationType: policy.qualificationType.trim(), requireCertificate: policy.requireCertificate, checkExpiration: policy.checkExpiration })); setNotice('Đã lưu điều kiện chứng nhận.') }
    catch (reason) { setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền thay đổi điều kiện của kỳ này.' : 'Chưa lưu được điều kiện. Kiểm tra dữ liệu rồi thử lại.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <section className="workspace-surface p-5 sm:p-6 space-y-4" aria-labelledby="qualification-policy-title">{confirmationDialog}<h2 id="qualification-policy-title" className="font-semibold text-ink">Điều kiện chứng nhận của sinh viên</h2><p className="text-sm text-ink-muted">Cấu hình yêu cầu đào tạo và chứng nhận theo danh mục chuẩn trước khi đăng ký đồ án.</p>{error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error} <button type="button" className="min-h-9 rounded-md px-2 font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => void load()}>Thử lại</button></p>}{notice && <div className="flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3 text-sm text-ink"><span className="material-symbols-outlined shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span><p role="status">{notice}</p></div>}{policy && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void save() }}><label className="flex max-w-md flex-col gap-2 text-sm font-medium text-ink-soft">Loại chứng nhận<select required value={policy.qualificationType} disabled={busy || !canManage} onChange={event => setPolicy({ ...policy, qualificationType: event.target.value })} className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted">{types.map(option => <option key={option.code} value={option.code}>{option.code} — {option.name}</option>)}</select></label>{(['requireStudentQualification', 'requireCertificate', 'checkExpiration'] as const).map(key => <label key={key} className="flex min-h-9 items-center gap-2 text-sm text-ink"><input type="checkbox" checked={policy[key]} disabled={busy || !canManage} onChange={event => setPolicy({ ...policy, [key]: event.target.checked })} />{{ requireStudentQualification: 'Yêu cầu hoàn thành đào tạo', requireCertificate: 'Yêu cầu tệp chứng nhận', checkExpiration: 'Kiểm tra thời hạn chứng nhận' }[key]}</label>)}{!canManage && <p className="text-sm text-ink-muted">Chỉ Cán bộ bộ môn (DEPARTMENT_STAFF) được sửa điều kiện chứng nhận của kỳ.</p>}<Button type="submit" disabled={busy || !canManage}>{busy ? 'Đang lưu…' : 'Lưu điều kiện'}</Button></form>}</section>
}
