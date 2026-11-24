import { useEffect, useState, type FormEvent } from 'react'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { askProjectAssistant, getProjectAiDigest, type ProjectAiDigest, type ProjectAssistantResponse } from './ai-api'
import { ProjectProgressAnalysisPanel } from './components/ProjectProgressAnalysisPanel'
import { HttpError } from '../../services/http/http-client'
import { EvidenceReferences } from './components/EvidenceReferences'
import { ProgressScenarioPanel } from './components/ProgressScenarioPanel'
import { AiAnalysisRunsPanel } from './components/AiAnalysisRunsPanel'
import { env } from '../../app/config/env'
import { openAssistant } from './assistant-dock-events'
import { Pagination } from '../../components/ui/Pagination'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useClientPagination } from '../../components/ui/useClientPagination'

// AI run history is actor- and scope-hash-scoped server-side. Keying by project+user forces a
// full remount (not just a prop update) on an identity or project switch, so no stale analysis
// or history list from a previous actor can linger in local state.
export function ProjectAiPage() {
  const access = useExecutionAccess()
  return <ProjectAiView key={`${access.project.id}:${access.currentUserId}`} />
}

function ProjectAiView() {
  const [historyRevision, setHistoryRevision] = useState(0)
  const { project } = useExecutionAccess()
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<ProjectAssistantResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ask = async (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value || busy) return
    setBusy(true); setError(null); setAnswer(null)
    try {
      setAnswer(await askProjectAssistant(project.id, value))
      setHistoryRevision(revision => revision + 1)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="workspace-page space-y-5 pb-12">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <div className="workspace-context">
            <span className="workspace-kicker">Trợ lý AI</span>
          </div>
          <h1>Trợ lý AI &amp; phân tích đồ án</h1>
          <p>Trợ lý kết hợp dữ liệu đồ án được cấp quyền và tài liệu học vụ đã công bố. Phản hồi không là quyết định học vụ, không cập nhật dữ liệu.</p>
        </div>
        {env.academicAiAssistantEnabled && (
          <div className="workspace-heading-actions">
            <button
              type="button"
              onClick={openAssistant}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">auto_awesome</span>
              Mở trò chuyện với trợ lý AI
            </button>
          </div>
        )}
      </header>

      <ProjectAiDigestCard projectId={project.id} />

      {/* Bento 2-Column Layout: Left 7 cols (Analysis + Scenario) | Right 5 cols (Q&A + History) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        <div className="xl:col-span-7 space-y-5">
          <ProjectProgressAnalysisPanel projectId={project.id} onSaved={() => setHistoryRevision(revision => revision + 1)} />
          <ProgressScenarioPanel />
        </div>

        <div className="xl:col-span-5 space-y-5">
          <section className="workspace-surface">
            <div className="flex items-center gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">forum</span>
              <div>
                <h2 className="font-heading text-sm font-bold text-ink">Hỏi trợ lý theo đồ án</h2>
                <p className="text-xs text-ink-muted">Kiểm tra chứng cứ trước khi hành động; trợ lý không có quyền thực thi lệnh.</p>
              </div>
            </div>
            <div className="p-5">
              <form className="space-y-3" onSubmit={event => void ask(event)}>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-soft" htmlFor="project-ai-query">
                  Câu hỏi
                  <textarea
                    id="project-ai-query"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    rows={4}
                    maxLength={1000}
                    className="rounded-lg border border-line-strong bg-card p-3 text-sm font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    placeholder="Ví dụ: Những việc nào cần ưu tiên trong tuần này?"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!query.trim() || busy}
                  className="min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Đang hỏi trợ lý…' : 'Gửi câu hỏi'}
                </button>
              </form>
              {error && <p role="alert" className="mt-4 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
              {answer && <AssistantAnswer answer={answer} />}
            </div>
          </section>

          {env.aiRunHistoryEnabled && <AiAnalysisRunsPanel key={historyRevision} projectId={project.id} />}
        </div>
      </div>
    </div>
  )
}

const digestRiskLabels: Record<string, string> = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng', INSUFFICIENT_DATA: 'Chưa đủ dữ liệu' }

function ProjectAiDigestCard({ projectId }: { projectId: number }) {
  const [digest, setDigest] = useState<ProjectAiDigest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void getProjectAiDigest(projectId, controller.signal)
      .then(value => { if (!controller.signal.aborted) { setDigest(value); setError(false) } })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [projectId])

  const actionsPagination = useClientPagination(digest?.nextActions ?? [], 8)
  const riskTone = digest?.riskLevel === 'HIGH' || digest?.riskLevel === 'CRITICAL'
    ? 'danger'
    : digest?.riskLevel === 'MEDIUM'
      ? 'warning'
      : digest?.riskLevel === 'LOW'
        ? 'success'
        : 'neutral'

  return (
    <div className="space-y-4">
      <StatTileRow tiles={[
        {
          icon: 'trending_up',
          label: 'Tiến độ hoàn thành (%)',
          value: digest ? Math.round(digest.progressSummary.progressPercentage) : null,
          hero: true,
          caption: digest
            ? `Hoàn tất ${digest.progressSummary.doneTasks}/${digest.progressSummary.totalTasks} công việc.`
            : loading ? 'Đang đọc dữ liệu tiến độ…' : 'Chưa tải được bản tin tiến độ.',
        },
        {
          icon: 'event_busy',
          label: 'Công việc quá hạn',
          value: digest ? digest.progressSummary.overdueTasks : null,
          tone: digest && digest.progressSummary.overdueTasks > 0 ? 'danger' : 'success',
          caption: digest && digest.progressSummary.overdueTasks > 0 ? 'Cần ưu tiên xử lý sớm.' : 'Không có công việc quá hạn.',
        },
        {
          icon: 'block',
          label: 'Công việc bị chặn',
          value: digest ? digest.progressSummary.blockedTasks : null,
          tone: digest && digest.progressSummary.blockedTasks > 0 ? 'warning' : 'neutral',
          caption: digest && digest.progressSummary.blockedTasks > 0 ? 'Đang có vướng mắc cần gỡ.' : 'Không có đầu việc bị chặn.',
        },
        {
          icon: 'warning',
          label: 'Tín hiệu cảnh báo',
          value: digest ? digest.signals.length : null,
          tone: riskTone,
          caption: digest
            ? `Mức rủi ro: ${digestRiskLabels[digest.riskLevel] ?? digest.riskLevel}`
            : 'Chỉ đọc theo quyền hiện tại.',
        },
      ]} />

      <section className="workspace-surface" aria-label="Bản tin tiến độ và rủi ro">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">insights</span>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-primary">Bản tin tự động</p>
              <h2 className="font-heading text-sm font-bold text-ink">Gợi ý ưu tiên và đánh giá rủi ro</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {digest && <StatusBadge tone={riskTone} label={`Rủi ro: ${digestRiskLabels[digest.riskLevel] ?? digest.riskLevel}`} />}
            {digest && <span className="font-mono text-xs text-ink-muted tabular-nums">Cập nhật {formatDate(digest.generatedAtUtc)}</span>}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <p role="status" className="text-sm text-ink-muted">Đang đọc dữ liệu tiến độ…</p>
          ) : error ? (
            <p role="status" className="text-sm text-ink-muted">Chưa tải được bản tin. Bạn vẫn có thể dùng phần phân tích bên dưới.</p>
          ) : digest && (
            <>
              {digest.nextActions.length > 0 ? (
                <div className="rounded-xl border border-hairline bg-canvas/50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-ink-soft">Việc nên ưu tiên</h3>
                    <span className="text-xs font-semibold tabular-nums text-ink-muted">{digest.nextActions.length} gợi ý</span>
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                    {actionsPagination.paginatedItems.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                  {actionsPagination.showPagination && (
                    <Pagination
                      page={actionsPagination.page}
                      pages={actionsPagination.totalPages}
                      total={actionsPagination.total}
                      pageSize={actionsPagination.pageSize}
                      onPage={actionsPagination.setPage}
                      className="mt-3"
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">Chưa có đề xuất ưu tiên mới cho đồ án.</p>
              )}
              <p className="mt-3 text-xs text-ink-muted">Bản tin chỉ đọc dữ liệu theo quyền hiện tại và không tự thay đổi đồ án.</p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function AssistantAnswer({ answer }: { answer: ProjectAssistantResponse }) {
  return (
    <section aria-live="polite" className="mt-5 rounded-xl border border-primary/25 bg-primary-subtle p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Phản hồi AI · phạm vi {answer.contextScope}</p>
      {answer.insufficientEvidence && <p role="status" className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Chưa đủ chứng cứ cho một kết luận đáng tin cậy. Không suy diễn phản hồi này là xác nhận tiến độ hoặc rủi ro thấp.</p>}
      {answer.generationStatus === 'FALLBACK' && <p role="status" className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Phản hồi dự phòng: hệ thống chưa tạo được câu trả lời bằng mô hình AI. Hãy đối chiếu nội dung với chứng cứ bên dưới trước khi sử dụng.</p>}
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{answer.answer}</p>
      {answer.limitationNote && <p className="mt-3 text-sm text-ink-soft"><span className="font-semibold">Giới hạn:</span> {answer.limitationNote}</p>}
      <EvidenceReferences items={answer.evidence} />
      <p className="mt-3 text-xs text-ink-muted">Tạo lúc {formatDate(answer.generatedAt)}</p>
    </section>
  )
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) }
function errorMessage(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn.'; if (reason.status === 403) return 'Hệ thống không cấp quyền hỏi trợ lý cho đồ án này.'; if (reason.status === 404) return 'Không tìm thấy đồ án trong phạm vi hiện tại.'; if (reason.status === 429) return 'Yêu cầu đang vượt giới hạn. Hãy chờ một lúc rồi thử lại.' }; return 'Không thể nhận phản hồi từ trợ lý AI.' }
