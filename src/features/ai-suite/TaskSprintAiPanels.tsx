import { useState } from 'react'
import { getTaskCriteria, replaceTaskCriteria } from '../tasks/task-criteria-api'
import { breakdownTask, formatAiSuiteError, generateSprintRetro } from './ai-suite-api'
import type { SprintRetroDto, TaskBreakdownDto } from './ai-suite.types'
import { AiSuiteCardShell } from './AiSuiteCardShell'

export function TaskBreakdownAiPanel({
  projectId,
  taskId,
  taskTitle,
  taskDescription,
  onCriteriaApplied,
}: {
  projectId: number
  taskId: number
  taskTitle: string
  taskDescription?: string | null
  onCriteriaApplied?: () => void
}) {
  const [data, setData] = useState<TaskBreakdownDto | null>(null)
  const [selected, setSelected] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const res = await breakdownTask(projectId, {
        taskId,
        title: taskTitle,
        description: taskDescription ?? null,
      })
      setData(res)
      setSelected(Object.fromEntries(res.criteria.map((_, i) => [i, true])))
    } catch (err) {
      setError(formatAiSuiteError(err, 'Không thể chia nhỏ công việc lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  const handleApplyCriteria = async () => {
    if (!data) return
    const chosen = data.criteria.filter((_, i) => selected[i]).map((c) => c.title.trim()).filter(Boolean)
    if (chosen.length === 0) {
      setError('Hãy chọn ít nhất 1 tiêu chí nghiệm thu để thêm vào công việc.')
      return
    }
    setApplying(true)
    setError(null)
    setNotice(null)
    try {
      const existing = await getTaskCriteria(taskId)
      if (!existing.canManage) {
        setError('Bạn không có quyền chỉnh sửa tiêu chí nghiệm thu của công việc này.')
        return
      }
      const existingTitles = existing.items.map((item) => item.title)
      const dedup = new Set(existingTitles.map((t) => t.toLowerCase()))
      const merged = [
        ...existingTitles,
        ...chosen.filter((t) => !dedup.has(t.toLowerCase())),
      ].slice(0, 30)
      await replaceTaskCriteria(taskId, merged.map((title) => ({ title })))
      setNotice(`Đã thêm ${chosen.length} tiêu chí AI vào công việc thành công!`)
      onCriteriaApplied?.()
    } catch (err) {
      setError(formatAiSuiteError(err, 'Chưa lưu được danh sách tiêu chí vào công việc.'))
    } finally {
      setApplying(false)
    }
  }

  return (
    <AiSuiteCardShell
      compact
      icon="checklist"
      title="AI Chia nhỏ Tiêu chí Nghiệm thu & Gợi ý Người phụ trách"
      badge="AI Chia nhỏ việc"
      subtitle="Phân tách công việc thành checklist nghiệm thu rõ ràng, ước lượng độ phức tạp và gợi ý thành viên phù hợp theo chuyên ngành & tải việc."
      meta={data?.meta}
      error={error}
      notice={notice}
      actions={
        <button type="button" className="ais-btn ais-btn--primary" disabled={loading || applying} onClick={() => void handleAnalyze()}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
          {loading ? 'Đang phân tách…' : data ? 'Phân tích lại' : 'AI Chia nhỏ công việc'}
        </button>
      }
    >
      {data && (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ais-pill ais-pill--ai">Ưu tiên gợi ý: {data.suggestedPriority}</span>
            <span className="ais-pill ais-pill--neutral">Ước lượng: {data.suggestedStoryPoints} Story Points</span>
          </div>
          <p className="leading-relaxed text-ink-soft">{data.implementationSummary}</p>

          {data.criteria.length > 0 && (
            <div className="space-y-2">
              <p className="font-bold text-ink">Tiêu chí nghiệm thu gợi ý (chọn mục muốn thêm):</p>
              <ul className="space-y-1.5">
                {data.criteria.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-2 rounded-lg border border-hairline bg-canvas p-2.5">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[idx])}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [idx]: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{c.title}</p>
                      {c.verificationHint && <p className="mt-0.5 text-ink-muted">Kiểm chứng: {c.verificationHint}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="ais-btn ais-btn--success"
                disabled={applying}
                onClick={() => void handleApplyCriteria()}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">playlist_add</span>
                {applying ? 'Đang lưu tiêu chí…' : 'Thêm tiêu chí đã chọn vào công việc'}
              </button>
            </div>
          )}

          {data.recommendedAssignees.length > 0 && (
            <div className="ais-subcard space-y-1.5">
              <p className="font-bold text-ink">Gợi ý phân công (theo chuyên ngành & số task đang mở):</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.recommendedAssignees.map((a) => (
                  <div key={a.userId} className="rounded-lg border border-hairline bg-card p-2">
                    <p className="font-semibold text-ink">
                      {a.fullName}{' '}
                      {a.majorName && <span className="text-primary">({a.majorName})</span>}
                    </p>
                    <p className="text-xs text-ink-muted">Đang mở: {a.openTaskCount} task · {a.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.potentialRisks.length > 0 && (
            <div className="ais-subcard">
              <p className="font-bold text-status-warning-text">Rủi ro kỹ thuật cần lưu ý:</p>
              <ul className="mt-1 list-disc pl-5 text-ink-soft">
                {data.potentialRisks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </AiSuiteCardShell>
  )
}

export function SprintRetroAiButton({ projectId, sprintId, sprintName }: { projectId: number; sprintId: number; sprintName: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<SprintRetroDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runRetro = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      setData(await generateSprintRetro(projectId, sprintId))
    } catch (err) {
      setError(formatAiSuiteError(err, 'Không thể tạo tổng kết Sprint lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button type="button" className="ais-btn" onClick={() => void runRetro()}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">psychology</span>
          AI Sprint Retrospective ({sprintName})
        </button>
      ) : (
        <AiSuiteCardShell
          compact
          icon="replay_circle_filled"
          title={`AI Sprint Retrospective · ${sprintName}`}
          badge="AI Tổng kết Sprint"
          subtitle="Tổng kết điểm làm tốt, nút thắt tồn đọng và hành động cụ thể cho Sprint tiếp theo."
          meta={data?.meta}
          error={error}
          actions={
            <>
              <button type="button" className="ais-btn ais-btn--primary" disabled={loading} onClick={() => void runRetro()}>
                {loading ? 'Đang tổng kết…' : 'Tạo lại Retro'}
              </button>
              <button type="button" className="ais-btn" onClick={() => setOpen(false)}>Đóng</button>
            </>
          }
        >
          {data && (
            <div className="space-y-3 text-xs">
              <div className="ais-kpi-grid">
                <div className="ais-kpi-tile">
                  <div className="ais-kpi-label">Tổng công việc</div>
                  <div className="ais-kpi-value">{data.totalTasks}</div>
                </div>
                <div className="ais-kpi-tile">
                  <div className="ais-kpi-label">Hoàn thành</div>
                  <div className="ais-kpi-value text-status-success-text">{data.completedTasks}</div>
                </div>
                <div className="ais-kpi-tile">
                  <div className="ais-kpi-label">Chưa xong / Trễ</div>
                  <div className="ais-kpi-value text-status-warning-text">{data.overdueOrIncompleteTasks}</div>
                </div>
              </div>
              <p className="font-bold text-ink">{data.headline}</p>
              <p className="leading-relaxed text-ink-soft">{data.executiveSummary}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="ais-subcard">
                  <p className="font-bold text-status-success-text">Điểm làm tốt (Went Well)</p>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5 text-ink-soft">
                    {data.wentWell.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div className="ais-subcard">
                  <p className="font-bold text-status-warning-text">Cần cải thiện</p>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5 text-ink-soft">
                    {data.needsImprovement.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div>
              {data.nextSprintActions.length > 0 && (
                <div className="ais-subcard">
                  <p className="font-bold text-primary">Hành động cho Sprint tiếp theo:</p>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5 text-ink-soft">
                    {data.nextSprintActions.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </AiSuiteCardShell>
      )}
    </div>
  )
}
