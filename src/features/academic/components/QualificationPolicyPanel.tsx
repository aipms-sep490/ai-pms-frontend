import { useCallback, useEffect, useRef, useState } from 'react'
import { getPeriodPolicy, setPeriodPolicy } from '../../../services/api/student-qualifications.api'
import type { ProjectPeriodQualificationPolicyDto } from '../../../types/backend'
import { Button } from '../../../components/ui/Button'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'

export function QualificationPolicyPanel({ periodId }: { periodId: number }) {
  const [policy, setPolicy] = useState<ProjectPeriodQualificationPolicyDto | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const lock = useRef(false), { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const load = useCallback(async () => { setError(''); try { setPolicy(await getPeriodPolicy(periodId)) } catch { setError('Chưa tải được điều kiện chứng nhận của kỳ đồ án.') } }, [periodId])
  useEffect(() => { void load() }, [load])
  async function save() {
    if (!policy || lock.current) return
    if (await requestConfirmation({ title: 'Lưu điều kiện chứng nhận?', description: 'Điều kiện mới sẽ được kiểm tra khi sinh viên đăng ký đồ án trong kỳ này.', confirmLabel: 'Lưu điều kiện' }) === null) return
    lock.current = true; setBusy(true); setError(''); setNotice('')
    try { setPolicy(await setPeriodPolicy(periodId, { requireStudentQualification: policy.requireStudentQualification, qualificationType: policy.qualificationType.trim(), requireCertificate: policy.requireCertificate, checkExpiration: policy.checkExpiration })); setNotice('Đã lưu điều kiện chứng nhận.') }
    catch (reason) { setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền thay đổi điều kiện của kỳ này.' : 'Chưa lưu được điều kiện. Kiểm tra dữ liệu rồi thử lại.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <section className="workspace-surface p-5 sm:p-6 space-y-4" aria-labelledby="qualification-policy-title">{confirmationDialog}<h2 id="qualification-policy-title" className="font-semibold">Điều kiện chứng nhận của sinh viên</h2><p className="text-sm text-slate-600">Cấu hình yêu cầu đào tạo và chứng nhận trước khi đăng ký đồ án.</p>{error && <p role="alert" className="text-sm text-rose-700">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Thử lại</button></p>}{notice && <p role="status" className="text-sm text-primary">{notice}</p>}{policy && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void save() }}><label className="flex max-w-md flex-col gap-2 text-sm">Loại chứng nhận<input required maxLength={100} value={policy.qualificationType} disabled={busy} onChange={event => setPolicy({ ...policy, qualificationType: event.target.value })} className="min-h-10 rounded-lg border border-hairline px-3" /></label>{(['requireStudentQualification', 'requireCertificate', 'checkExpiration'] as const).map(key => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policy[key]} disabled={busy} onChange={event => setPolicy({ ...policy, [key]: event.target.checked })} />{{ requireStudentQualification: 'Yêu cầu hoàn thành đào tạo', requireCertificate: 'Yêu cầu tệp chứng nhận', checkExpiration: 'Kiểm tra thời hạn chứng nhận' }[key]}</label>)}<Button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu điều kiện'}</Button></form>}</section>
}
