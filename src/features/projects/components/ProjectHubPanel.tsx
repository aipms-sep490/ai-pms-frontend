import { useState } from 'react'
import type {
  AnchoredComment,
  InternalContributionHeatmap,
  PinnedResource,
  ProjectHealthPulse,
} from '../api/project-hub-api'

const PULSE_BADGE: Record<ProjectHealthPulse['status'], { label: string; cls: string }> = {
  GREEN: { label: 'Ổn định (GREEN)', cls: 'border-status-success-border bg-status-success-bg text-status-success-text' },
  YELLOW: { label: 'Cần theo dõi (YELLOW)', cls: 'border-status-warning-border bg-status-warning-bg text-status-warning-text' },
  RED: { label: 'Rủi ro cao (RED)', cls: 'border-status-error-border bg-status-error-bg text-status-error-text' },
  INSUFFICIENT_DATA: { label: 'Chưa đủ dữ liệu', cls: 'border-hairline bg-subtle text-ink-muted' },
}

export function ProjectHubPanel({
  pinnedResources,
  anchoredComments,
  heatmap,
  healthPulse,
  onAddPinnedResource,
  onResolveComment,
}: {
  pinnedResources: PinnedResource[]
  anchoredComments: AnchoredComment[]
  heatmap: InternalContributionHeatmap
  healthPulse?: ProjectHealthPulse | null
  onAddPinnedResource?: (input: { resourceType: string; title: string; url: string }) => Promise<void>
  onResolveComment?: (commentId: number) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [resourceType, setResourceType] = useState<'FIGMA' | 'DRIVE' | 'DOC' | 'REPO_LINK' | 'OTHER'>('FIGMA')
  const [busy, setBusy] = useState(false)

  const openCriticalCount = anchoredComments.filter(c => c.severity === 'CRITICAL' && c.status === 'OPEN').length
  const pulseStyle = healthPulse ? PULSE_BADGE[healthPulse.status] : null

  async function handlePin() {
    if (!onAddPinnedResource || !title.trim() || !url.trim()) return
    setBusy(true)
    try {
      await onAddPinnedResource({ resourceType, title: title.trim(), url: url.trim() })
      setTitle('')
      setUrl('')
    } finally { setBusy(false) }
  }

  return (
    <section className="space-y-4 rounded-xl border border-hairline bg-card p-4" aria-label="All-in-One Project Hub">
      {healthPulse && pulseStyle && (
        <div className={`rounded-lg border p-3 ${pulseStyle.cls}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm">Health Pulse: {pulseStyle.label}</strong>
            <span className="text-xs">
              Evidence READY: {healthPulse.signals.evidenceReadyPercent ?? 'N/A'}% · Blocked &gt; 48h: {healthPulse.signals.blockedOver48hCount} · Báo cáo 14d: {healthPulse.signals.weeklyReportsLast14Days}
            </span>
          </div>
          <p className="mt-1 text-xs">{healthPulse.summary}</p>
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-hairline bg-subtle p-3">
        <h3 className="text-xs font-bold text-ink">Kho tài nguyên ghim (Spec Vault)</h3>
        <ul className="space-y-1 text-xs">
          {pinnedResources.map(res => (
            <li key={res.id} className="flex items-center justify-between gap-2 rounded bg-card px-2.5 py-1.5">
              <span className="font-semibold text-ink">[{res.resourceType}] {res.title}</span>
              <a href={res.url} target="_blank" rel="noreferrer" className="text-primary underline">Mở liên kết</a>
            </li>
          ))}
        </ul>
        {onAddPinnedResource && (
          <div className="grid gap-2 pt-1 sm:grid-cols-4">
            <select aria-label="Loại tài nguyên" className="min-h-11 rounded border border-hairline bg-card px-2 text-xs" value={resourceType} onChange={e => setResourceType(e.target.value as typeof resourceType)}>
              <option value="FIGMA">FIGMA</option><option value="DRIVE">DRIVE</option><option value="DOC">DOC</option><option value="REPO_LINK">REPO_LINK</option><option value="OTHER">OTHER</option>
            </select>
            <input aria-label="Tiêu đề tài nguyên ghim" className="min-h-11 rounded border border-hairline bg-card px-2 text-xs" placeholder="Tên tài liệu…" value={title} onChange={e => setTitle(e.target.value)} />
            <input aria-label="URL tài nguyên ghim" className="min-h-11 rounded border border-hairline bg-card px-2 text-xs" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
            <button type="button" disabled={busy || !title.trim() || !url.trim()} className="min-h-11 rounded-lg bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50" onClick={() => void handlePin()}>Ghim tài nguyên</button>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-hairline bg-subtle p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-ink">Góp ý neo minh chứng (Anchored Comments)</h3>
          {openCriticalCount > 0 && (
            <span className="rounded border border-status-error-border bg-status-error-bg px-2 py-0.5 text-xs font-semibold text-status-error-text">
              {openCriticalCount} CRITICAL chưa giải quyết (chặn nộp Gate)
            </span>
          )}
        </div>
        <ul className="space-y-1.5 text-xs">
          {anchoredComments.map(comment => (
            <li key={comment.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-card p-2">
              <div>
                <span className="font-semibold text-ink">[{comment.severity}] {comment.anchorRef}</span>
                <p className="text-ink-soft">{comment.content}</p>
              </div>
              {comment.status === 'OPEN' && onResolveComment ? (
                <button type="button" className="min-h-11 rounded border border-primary px-3 text-xs font-semibold text-primary" onClick={() => void onResolveComment(comment.id)}>
                  Đánh dấu đã xử lý
                </button>
              ) : (
                <span className="text-xs font-semibold text-status-success-text">{comment.status}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 rounded-lg border border-hairline bg-subtle p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-ink">Bản đồ hoạt động nội bộ ({heatmap.weeks} tuần · không cần Git sync)</h3>
          {heatmap.silentMemberIds.length > 0 && (
            <span className="rounded border border-status-warning-border bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning-text">
              {heatmap.silentMemberIds.length} thành viên im lặng &gt; 10 ngày
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {heatmap.members.map(member => (
            <div key={member.userId} className="flex flex-wrap items-center justify-between gap-2 rounded bg-card px-2.5 py-2 text-xs">
              <div>
                <strong className="text-ink">{member.fullName}</strong>
                {member.isSilentMember && <span className="ml-2 font-semibold text-status-warning-text">Silent Member &gt; 10d</span>}
              </div>
              <div className="flex items-center gap-1.5">
                {member.weeklyCounts.map((count, idx) => (
                  <span key={idx} className="rounded border border-hairline bg-subtle px-2 py-0.5 text-xs text-ink">
                    W{idx + 1}: {count}
                  </span>
                ))}
                <strong className="ml-1 text-ink">Tổng: {member.totalActions}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
