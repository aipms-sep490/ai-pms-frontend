import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  formatAiSuiteError,
  generateDepartmentBrief,
  getLatestDepartmentBrief,
} from './ai-suite-api'
import type { DepartmentExecutiveBriefDto } from './ai-suite.types'
import { AiSuiteCardShell } from './AiSuiteCardShell'

export function DepartmentExecutiveBriefPanel({
  departmentId,
  semesterId,
  routePrefix = '/department',
}: {
  departmentId?: number
  semesterId?: number
  routePrefix?: '/department' | '/admin'
}) {
  const [data, setData] = useState<DepartmentExecutiveBriefDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingLatest, setLoadingLatest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      setData(await generateDepartmentBrief({ departmentId: departmentId ?? null, semesterId: semesterId ?? null }))
    } catch (err) {
      setError(formatAiSuiteError(err, 'Không thể tổng hợp Bản tin điều hành Khoa lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  const handleLoadLatest = async () => {
    setLoadingLatest(true)
    setError(null)
    setNotice(null)
    try {
      const latest = await getLatestDepartmentBrief(departmentId)
      if (!latest) setNotice('Chưa có Bản tin điều hành tuần nào được lưu. Hãy bấm "AI Tổng hợp bản tin tuần".')
      else setData(latest)
    } catch (err) {
      setError(formatAiSuiteError(err))
    } finally {
      setLoadingLatest(false)
    }
  }

  const markdown = data
    ? [
        `# ${data.headline}`,
        `Phạm vi: **${data.scopeName}** · Đang thực hiện: ${data.totalActiveProjects} · Rủi ro cao: ${data.atRiskProjectCount} · Nhóm im lặng ≥14 ngày: ${data.silentTeamCount} · Phúc khảo chờ xử lý: ${data.pendingAppealsCount}`,
        '',
        data.executiveSummary,
        '',
        '## Top đồ án cần can thiệp',
        ...data.topRiskProjects.map((p) => `- **${p.projectCode} (${p.riskLevel})**: ${p.reason} → _Khuyến nghị:_ ${p.recommendedAction}`),
        '',
        '## Hành động ưu tiên tuần này',
        ...data.weeklyPriorityActions.map((a) => `- ${a}`),
      ].join('\n')
    : undefined

  return (
    <AiSuiteCardShell
      icon="summarize"
      title="AI Bản tin Điều hành Tuần cho Ban Chủ nhiệm Khoa (Executive Brief)"
      badge="Mục #8 · Điều hành Khoa"
      subtitle="Tổng hợp tự động toàn bộ đồ án đang chạy, nhóm nguy cơ trễ/im lặng ≥14 ngày, tải hướng dẫn giảng viên và đơn phúc khảo chờ xử lý."
      meta={data?.meta}
      markdownText={markdown}
      error={error}
      notice={notice}
      actions={
        <>
          <button type="button" className="ais-btn" disabled={loading || loadingLatest} onClick={() => void handleLoadLatest()}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">history</span>
            {loadingLatest ? 'Đang tải…' : 'Bản tin gần nhất'}
          </button>
          <button type="button" className="ais-btn ais-btn--primary" disabled={loading || loadingLatest} onClick={() => void handleGenerate()}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
            {loading ? 'Đang tổng hợp số liệu Khoa…' : data ? 'Cập nhật bản tin mới' : 'AI Tổng hợp bản tin tuần'}
          </button>
        </>
      }
    >
      {data && (
        <div className="space-y-4 text-xs">
          <div className="ais-kpi-grid">
            <div className="ais-kpi-tile">
              <div className="ais-kpi-label">Đồ án đang chạy</div>
              <div className="ais-kpi-value">{data.totalActiveProjects}</div>
            </div>
            <div className="ais-kpi-tile">
              <div className="ais-kpi-label">Nguy cơ cao / Nghiêm trọng</div>
              <div className="ais-kpi-value text-status-error-text">{data.atRiskProjectCount}</div>
            </div>
            <div className="ais-kpi-tile">
              <div className="ais-kpi-label">Nhóm im lặng ≥14 ngày</div>
              <div className="ais-kpi-value text-status-warning-text">{data.silentTeamCount}</div>
            </div>
            <div className="ais-kpi-tile">
              <div className="ais-kpi-label">Phúc khảo chờ xử lý</div>
              <div className="ais-kpi-value text-primary">{data.pendingAppealsCount}</div>
            </div>
          </div>

          <div className="ais-subcard space-y-1.5">
            <p className="text-sm font-bold text-ink">{data.headline}</p>
            <p className="leading-relaxed text-ink-soft">{data.executiveSummary}</p>
          </div>

          {data.topRiskProjects.length > 0 && (
            <div className="space-y-2">
              <p className="font-bold text-ink">Top đồ án cần can thiệp sớm ({data.topRiskProjects.length}):</p>
              <div className="grid gap-2.5 md:grid-cols-2">
                {data.topRiskProjects.map((p) => (
                  <article key={p.projectId} className="rounded-xl border border-hairline bg-card p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-primary">{p.projectCode}</span>{' '}
                        <strong className="text-ink">{p.projectTitle}</strong>
                      </div>
                      <span className={p.riskLevel === 'CRITICAL' ? 'ais-pill ais-pill--danger' : p.riskLevel === 'HIGH' ? 'ais-pill ais-pill--warning' : 'ais-pill ais-pill--neutral'}>
                        {p.riskLevel}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-muted">
                      Quá hạn: <strong>{p.overdueTaskCount}</strong> · Bị chặn: <strong>{p.blockedTaskCount}</strong> · Không họp: <strong>{p.daysSinceLastMeeting} ngày</strong>
                    </p>
                    <p className="text-ink-soft">{p.reason}</p>
                    <p className="font-medium text-primary">Đề xuất: {p.recommendedAction}</p>
                    <div className="pt-1">
                      <Link
                        className="font-semibold text-primary underline"
                        to={routePrefix === '/admin' ? `/admin/projects/${p.projectId}/result` : `/department/projects/${p.projectId}/governance`}
                      >
                        Mở hồ sơ đồ án →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {data.supervisorAlerts.length > 0 && (
            <div className="ais-subcard space-y-1">
              <p className="font-bold text-ink">Cảnh báo tải hướng dẫn giảng viên:</p>
              <ul className="list-disc pl-5 space-y-0.5 text-ink-soft">
                {data.supervisorAlerts.map((s) => (
                  <li key={s.userId}>
                    <strong>{s.fullName}</strong> ({s.activeProjectCount} đồ án đang hướng dẫn) — {s.note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.weeklyPriorityActions.length > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary-subtle/30 p-3 space-y-1">
              <p className="font-bold text-primary">Hành động ưu tiên trong tuần cho Ban Chủ nhiệm Khoa:</p>
              <ul className="list-disc pl-5 space-y-0.5 text-ink">
                {data.weeklyPriorityActions.map((act, i) => <li key={i}>{act}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </AiSuiteCardShell>
  )
}
