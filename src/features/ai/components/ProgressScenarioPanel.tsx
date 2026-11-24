import { useRef, useState } from 'react'
import { httpPost } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'

interface Analysis { riskLevel: string; overdueTaskRatio: number; blockedTaskRatio: number; recommendations: string[] | null }
export function ProgressScenarioPanel() {
  const [result, setResult] = useState<Analysis | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), lock = useRef(false)
  return (
    <section className="workspace-surface">
      <div className="flex items-center gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">science</span>
        <div>
          <h2 className="font-heading text-sm font-bold text-ink">Thử phân tích tiến độ</h2>
          <p className="text-xs text-ink-muted">Nhập số liệu giả định để tham khảo rủi ro. Kết quả này không lưu vào đồ án.</p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <form className="api-form grid gap-3 sm:grid-cols-2" onSubmit={async event => {
          event.preventDefault(); if (lock.current) return
          const f = new FormData(event.currentTarget), totalTasks = Number(f.get('total')), overdueTasks = Number(f.get('overdue')), blockedTasks = Number(f.get('blocked')), milestoneCompletionRate = Number(f.get('completed')) / 100
          setError(''); setResult(null)
          if (overdueTasks > totalTasks || blockedTasks > totalTasks) { setError('Số việc quá hạn hoặc đang vướng mắc không thể lớn hơn tổng số công việc.'); return }
          lock.current = true; setBusy(true)
          try { setResult(await httpPost<Analysis>('/ai/insights/progress', { totalTasks, overdueTasks, blockedTasks, milestoneCompletionRate })) }
          catch { setError('Chưa phân tích được số liệu. Hãy thử lại sau.') }
          finally { lock.current = false; setBusy(false) }
        }}>
          <label>Tổng số công việc<input name="total" type="number" required min={0} step={1} /></label>
          <label>Công việc quá hạn<input name="overdue" type="number" required min={0} step={1} /></label>
          <label>Công việc đang vướng mắc<input name="blocked" type="number" required min={0} step={1} /></label>
          <label>Mốc đã hoàn thành (%)<input name="completed" type="number" required min={0} max={100} step={0.1} /></label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>{busy ? 'Đang phân tích…' : 'Phân tích số liệu'}</Button>
          </div>
        </form>
        {error && <p role="alert" className="text-sm text-status-error-text">{error}</p>}
        {result && (
          <div role="status" className="rounded-xl border border-hairline bg-canvas/60 p-4 space-y-2 text-sm">
            <p>Mức rủi ro: <strong>{{ LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng' }[result.riskLevel.toUpperCase()] ?? result.riskLevel}</strong></p>
            <p className="tabular-nums text-ink-soft">Quá hạn: {(result.overdueTaskRatio * 100).toLocaleString('vi-VN')}% · Đang vướng mắc: {(result.blockedTaskRatio * 100).toLocaleString('vi-VN')}%</p>
            {result.recommendations?.length ? <ul className="list-disc space-y-1 pl-5 text-ink-soft">{result.recommendations.map(item => <li key={item}>{item}</li>)}</ul> : null}
          </div>
        )}
      </div>
    </section>
  )
}
