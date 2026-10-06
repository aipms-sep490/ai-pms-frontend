import { useRef, useState } from 'react'
import { httpPost } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'

interface Analysis { riskLevel: string; overdueTaskRatio: number; blockedTaskRatio: number; recommendations: string[] | null }
export function ProgressScenarioPanel() {
  const [result, setResult] = useState<Analysis | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), lock = useRef(false)
  return <section className="workspace-surface p-5 sm:p-6 space-y-4"><h2 className="font-semibold">Thử phân tích tiến độ</h2><p className="text-sm text-slate-600">Nhập số liệu để tham khảo rủi ro. Kết quả này không cập nhật tiến độ đồ án.</p><form className="api-form grid gap-3 sm:grid-cols-2" onSubmit={async event => {
    event.preventDefault(); if (lock.current) return
    const f = new FormData(event.currentTarget), totalTasks = Number(f.get('total')), overdueTasks = Number(f.get('overdue')), blockedTasks = Number(f.get('blocked')), milestoneCompletionRate = Number(f.get('completed')) / 100
    setError(''); setResult(null)
    if (overdueTasks > totalTasks || blockedTasks > totalTasks) { setError('Số việc quá hạn hoặc đang vướng mắc không thể lớn hơn tổng số công việc.'); return }
    lock.current = true; setBusy(true)
    try { setResult(await httpPost<Analysis>('/ai/insights/progress', { totalTasks, overdueTasks, blockedTasks, milestoneCompletionRate })) }
    catch { setError('Chưa phân tích được số liệu. Hãy thử lại sau.') }
    finally { lock.current = false; setBusy(false) }
  }}><label>Tổng số công việc<input name="total" type="number" required min={0} step={1} /></label><label>Công việc quá hạn<input name="overdue" type="number" required min={0} step={1} /></label><label>Công việc đang vướng mắc<input name="blocked" type="number" required min={0} step={1} /></label><label>Mốc đã hoàn thành (%)<input name="completed" type="number" required min={0} max={100} step={0.1} /></label><Button type="submit" disabled={busy}>{busy ? 'Đang phân tích…' : 'Phân tích số liệu'}</Button></form>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{result && <div role="status" className="space-y-2 text-sm"><p>Mức rủi ro: <strong>{{ LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' }[result.riskLevel.toUpperCase()] ?? result.riskLevel}</strong></p><p>Quá hạn: {(result.overdueTaskRatio * 100).toLocaleString('vi-VN')}% · Đang vướng mắc: {(result.blockedTaskRatio * 100).toLocaleString('vi-VN')}%</p><ul className="list-disc space-y-1 pl-5">{result.recommendations?.map(item => <li key={item}>{item}</li>)}</ul></div>}</section>
}
