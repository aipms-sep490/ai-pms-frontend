import { useRef, useState } from 'react'
import * as api from '../team-eligibility-api'
import { HttpError } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'

export function EligibilityHistoryPanel({ teamId, canCheck, canLock, onChanged }: { teamId: number; canCheck: boolean; canLock: boolean; onChanged: () => void }) {
  const [latest, setLatest] = useState<api.EligibilityCheck | null>(null), [history, setHistory] = useState<api.EligibilityCheck[]>([]), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false), [error, setError] = useState('')
  const lock = useRef(false), { requestConfirmation, confirmationDialog } = useActionConfirmation()
  async function load() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { const [current, checks] = await Promise.all([api.getEligibilityCheck(teamId).catch(reason => { if (reason instanceof HttpError && reason.status === 404) return null; throw reason }), api.getEligibilityHistory(teamId)]); setLatest(current); setHistory(checks); setLoaded(true) }
    catch { setError('Chưa tải được lịch sử kiểm tra điều kiện. Hãy thử lại.') }
    finally { lock.current = false; setBusy(false) }
  }
  async function run(shouldLock: boolean) {
    if (lock.current) return
    if (shouldLock && await requestConfirmation({ title: 'Chốt danh sách nhóm?', description: 'Danh sách thành viên và phạm vi chuyên ngành sẽ được khóa. Hệ thống kiểm tra lại điều kiện trước khi chốt.', confirmLabel: 'Chốt nhóm' }) === null) return
    lock.current = true; setBusy(true); setError('')
    try { if (shouldLock) await api.lockEligibility(teamId); else setLatest(await api.checkEligibility(teamId)); onChanged(); setHistory(await api.getEligibilityHistory(teamId)); setLoaded(true) }
    catch (reason) { setError(reason instanceof HttpError && reason.status === 409 ? 'Điều kiện nhóm vừa thay đổi. Kiểm tra lại trước khi chốt nhóm.' : 'Chưa thực hiện được thao tác. Kiểm tra quyền và điều kiện nhóm rồi thử lại.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <details className="rounded-xl border border-hairline bg-white p-5" onToggle={event => { if (event.currentTarget.open && !loaded && !busy) void load() }}><summary className="cursor-pointer text-sm font-semibold">Lịch sử kiểm tra điều kiện nhóm</summary>{confirmationDialog}<div className="mt-4 space-y-4">{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{busy && <p role="status" className="text-sm">Đang xử lý…</p>}<div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={busy} onClick={() => void load()}>Tải lại</Button>{canCheck && <Button disabled={busy} onClick={() => void run(false)}>Kiểm tra điều kiện</Button>}{canLock && <Button disabled={busy || latest?.result !== 'PASS'} onClick={() => void run(true)}>Chốt nhóm</Button>}</div>{latest && <p className="text-sm">Lần gần nhất: <strong>{latest.result === 'PASS' ? 'Đủ điều kiện' : 'Chưa đủ điều kiện'}</strong> · {new Date(latest.checkedAt).toLocaleString('vi-VN')} {latest.freshness === 'STALE' && '· Cần kiểm tra lại'}</p>}<ul className="divide-y divide-hairline text-sm">{history.map(item => <li key={item.checkId} className="space-y-2 py-3"><strong>{item.result === 'PASS' ? 'Đủ điều kiện' : 'Chưa đủ điều kiện'}</strong><p className="text-slate-500">{new Date(item.checkedAt).toLocaleString('vi-VN')} · Chính sách {item.policyVersion}</p><ul className="list-disc space-y-1 pl-5">{item.issues.map(issue => <li key={issue.id}>{issue.message}</li>)}</ul></li>)}</ul>{loaded && !history.length && <p className="text-sm text-slate-500">Chưa có lần kiểm tra nào được lưu.</p>}</div></details>
}
