import { useState } from 'react'
import {
  analyzeContributionFairness,
  formatAiSuiteError,
  getLatestContributionFairness,
  scoreFillClass,
} from './ai-suite-api'
import type { ContributionFairnessDto } from './ai-suite.types'
import { AiSuiteCardShell } from './AiSuiteCardShell'

const SIGNAL_META: Record<string, { label: string; cls: string }> = {
  BALANCED: { label: 'Cân bằng tốt', cls: 'ais-pill ais-pill--success' },
  OVERLOADED_BURNOUT: { label: 'Nguy cơ quá tải / Burnout', cls: 'ais-pill ais-pill--warning' },
  LOW_ENGAGEMENT_RISK: { label: 'Tương tác thấp / Free-rider risk', cls: 'ais-pill ais-pill--danger' },
  PEER_MISMATCH: { label: 'Lệch đánh giá chéo', cls: 'ais-pill ais-pill--warning' },
}

export function ContributionFairnessPanel({ projectId }: { projectId: number }) {
  const [data, setData] = useState<ContributionFairnessDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingLatest, setLoadingLatest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      setData(await analyzeContributionFairness(projectId))
    } catch (err) {
      setError(formatAiSuiteError(err, 'Chưa thể phân tích công bằng đóng góp lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  const handleLatest = async () => {
    setLoadingLatest(true)
    setError(null)
    setNotice(null)
    try {
      const latest = await getLatestContributionFairness(projectId)
      if (!latest) setNotice('Chưa có bản phân tích công bằng đóng góp nào được lưu. Hãy bấm "AI Phân tích ngay".')
      else setData(latest)
    } catch (err) {
      setError(formatAiSuiteError(err))
    } finally {
      setLoadingLatest(false)
    }
  }

  const markdown = data
    ? [
        `# ${data.headline} (Chỉ số cân bằng: ${data.balanceScore}/100)`,
        '',
        data.executiveSummary,
        '',
        '## Chi tiết từng thành viên',
        ...data.members.map(
          (m) =>
            `- **${m.fullName}** (${SIGNAL_META[m.signal]?.label ?? m.signal}): Task ${m.tasksCompleted}/${m.tasksAssigned} (trễ ${m.tasksOverdue}), Tiêu chí ${m.criteriaCompleted}, Phát biểu Video AI ${m.speechSegments} lượt (${m.speechSharePercent.toFixed(0)}%) — ${m.assessment}`,
        ),
      ].join('\n')
    : undefined

  return (
    <AiSuiteCardShell
      icon="balance"
      title="AI Phân tích Công bằng Đóng góp Đa chiều (Free-rider & Burnout)"
      badge="AI Phân tích đóng góp"
      subtitle="Kết hợp Task, Tiêu chí nghiệm thu, Bình luận, Điểm danh họp, Thời lượng phát biểu Video Call AI và đánh giá định kỳ. Chỉ số hỗ trợ điều phối, không thay thế điểm học phần."
      meta={data?.meta}
      markdownText={markdown}
      error={error}
      notice={notice}
      actions={
        <>
          <button type="button" className="ais-btn" disabled={loading || loadingLatest} onClick={() => void handleLatest()}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">history</span>
            {loadingLatest ? 'Đang tải…' : 'Bản gần nhất'}
          </button>
          <button type="button" className="ais-btn ais-btn--primary" disabled={loading || loadingLatest} onClick={() => void handleAnalyze()}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">analytics</span>
            {loading ? 'Đang tổng hợp đa chiều…' : data ? 'Phân tích lại' : 'AI Phân tích công bằng'}
          </button>
        </>
      }
    >
      {data && (
        <div className="space-y-4">
          <div className="ais-subcard space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-ink">{data.headline}</h4>
              <span className="text-sm font-extrabold text-primary">Chỉ số cân bằng: {data.balanceScore}/100</span>
            </div>
            <div className="ais-score-bar" role="progressbar" aria-valuenow={data.balanceScore} aria-valuemin={0} aria-valuemax={100}>
              <div className={scoreFillClass(data.balanceScore)} style={{ width: `${data.balanceScore}%` }} />
            </div>
            <p className="text-xs leading-relaxed text-ink-soft">{data.executiveSummary}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {data.members.map((m) => {
              const sig = SIGNAL_META[m.signal] ?? { label: m.signal, cls: 'ais-pill ais-pill--neutral' }
              return (
                <article key={m.userId} className="rounded-xl border border-hairline bg-card p-3.5 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-ink">{m.fullName}</p>
                      <p className="text-xs text-ink-muted">{m.role}</p>
                    </div>
                    <span className={sig.cls}>{sig.label}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-canvas p-2 text-center text-xs">
                    <div>
                      <span className="block text-xs text-ink-muted">Task xong</span>
                      <strong className="font-mono text-ink">{m.tasksCompleted}/{m.tasksAssigned}</strong>
                    </div>
                    <div>
                      <span className="block text-xs text-ink-muted">Tiêu chí</span>
                      <strong className="font-mono text-ink">{m.criteriaCompleted}</strong>
                    </div>
                    <div>
                      <span className="block text-xs text-ink-muted">Phát biểu họp</span>
                      <strong className="font-mono text-primary">{m.speechSegments} ({m.speechSharePercent.toFixed(0)}%)</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-ink-muted">
                    <span>Trễ hạn: <strong className={m.tasksOverdue > 0 ? 'text-status-error-text' : 'text-ink'}>{m.tasksOverdue}</strong></span>
                    <span>· Trao đổi: <strong>{m.commentCount}</strong></span>
                    <span>· Dự họp: <strong>{m.meetingsAttended}</strong></span>
                    {m.averageWeeklyScore != null && <span>· Điểm tuần TB: <strong>{m.averageWeeklyScore}</strong></span>}
                    {data.includesPrivateSignals && m.averagePeerRating != null && (
                      <span className="text-primary">· Peer Rating: <strong>{m.averagePeerRating.toFixed(1)}/5</strong></span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-ink-soft">{m.assessment}</p>
                </article>
              )
            })}
          </div>

          {data.rebalanceRecommendations.length > 0 && (
            <div className="ais-subcard text-xs">
              <p className="font-bold text-ink">Đề xuất cân bằng lại khối lượng công việc:</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft">
                {data.rebalanceRecommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {data.includesPrivateSignals && data.supervisorVerificationQuestions.length > 0 && (
            <div className="rounded-xl border border-status-warning-border bg-status-warning-bg p-3.5 text-xs text-status-warning-text">
              <p className="font-bold">Gợi ý câu hỏi kiểm chứng 1-1 (chỉ hiển thị cho GVHD / Khoa):</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {data.supervisorVerificationQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </AiSuiteCardShell>
  )
}
