import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { askProjectAssistant, getProjectAiDigest, type ProjectAiDigest, type ProjectAssistantResponse } from './ai-api'
import { ProjectProgressAnalysisPanel } from './components/ProjectProgressAnalysisPanel'
import { HttpError } from '../../services/http/http-client'
import { EvidenceReferences } from './components/EvidenceReferences'
import { ProgressScenarioPanel } from './components/ProgressScenarioPanel'
import { AiAnalysisRunsPanel } from './components/AiAnalysisRunsPanel'
import { AcademicAssistantPanel } from './components/AcademicAssistantPanel'
import { env } from '../../app/config/env'
import { openAssistant } from './assistant-dock-events'
import type { AssistantDraft } from './academic-ai-api'
import './assistant-dock.css'

// AI run history is actor- and scope-hash-scoped server-side. Keying by project+user forces a
// full remount (not just a prop update) on an identity or project switch, so no stale analysis
// or history list from a previous actor can linger in local state.
export function ProjectAiPage() {
  const access = useExecutionAccess()
  return <ProjectAiView key={`${access.project.id}:${access.currentUserId}`} />
}

function ProjectAiView() {
  const [historyRevision, setHistoryRevision] = useState(0)
  const navigate = useNavigate()
  const { project, routeBase, actor, canManageStructure } = useExecutionAccess()
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

  const handleUseDraft = (draft: AssistantDraft) => {
    const target = draft.kind === 'TASK' ? 'tasks' : draft.kind === 'WEEKLY_REPORT' ? 'reports/new' : draft.kind === 'MEETING_MINUTES' ? 'meetings' : 'meetings/new'
    navigate(`${routeBase}/${target}`, { state: { assistantDraft: { ...draft, projectId: project.id } } })
  }

  const handleOpenTarget = (target: string, resourceId?: number | null) => {
    const allowed = new Set(['tasks', 'milestones', 'meetings', 'reports', 'deliverables', 'cold-reports', 'timeline', 'final-submission', 'files', 'agreement'])
    if (!allowed.has(target)) return
    const supportsDetail = ['tasks', 'milestones', 'meetings', 'reports'].includes(target) && typeof resourceId === 'number' && Number.isSafeInteger(resourceId) && resourceId > 0
    navigate(`${routeBase}/${target}${supportsDetail ? `/${resourceId}` : ''}`)
  }

  const [scenarioOpen, setScenarioOpen] = useState(false)

  return (
    <WorkspacePage
      size="wide"
      className="space-y-5"
      title="Trợ lý AI & phân tích đồ án"
      eyebrow="Trợ lý AI"
      description="Trợ lý kết hợp dữ liệu đồ án được cấp quyền và tài liệu học vụ đã công bố. Phản hồi mang tính tham khảo, không tự cập nhật dữ liệu."
      action={env.academicAiAssistantEnabled ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/academic/assistant?projectId=${project.id}`)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-hairline bg-card px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
            Mở toàn màn hình
          </button>
          <button
            type="button"
            onClick={openAssistant}
            className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Mở trò chuyện nổi
          </button>
        </div>
      ) : undefined}
    >
      <ProjectProgressAnalysisPanel projectId={project.id} onSaved={() => setHistoryRevision(revision => revision + 1)} />
      <ProjectAiDigestCard projectId={project.id} />

      {env.academicAiAssistantEnabled ? (
        <section className="assistant-embedded-card rounded-xl border border-hairline bg-card shadow-xs overflow-hidden">
          <div className="assistant-embedded-head">
            <div>
              <h2 className="font-heading text-lg font-semibold text-ink">Trò chuyện trực tiếp với Trợ lý AI-PMS</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Hỗ trợ streaming, đính kèm ảnh/PDF/DOCX, gõ <code>/</code> chọn lệnh nhanh, lưu lịch sử &amp; trích dẫn nguồn đồ án.</p>
            </div>
          </div>
          <div className="assistant-embedded-body">
            <AcademicAssistantPanel
              dock
              layout="dock"
              projectId={project.id}
              pageContext="Trợ lý AI và phân tích"
              allowReportForm={actor === 'student'}
              canApplyProjectSetup={canManageStructure}
              onUseDraft={handleUseDraft}
              onOpenTarget={handleOpenTarget}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
          <h2 className="font-heading text-lg font-semibold text-ink">Hỏi trợ lý theo đồ án</h2>
          <p className="mt-1 text-sm text-ink-muted">Hãy hỏi về tiến độ, công việc, báo cáo hoặc bước tiếp theo. Kiểm tra chứng cứ trước khi hành động; trợ lý không có quyền thực thi lệnh.</p>
          <form className="mt-4 space-y-3" onSubmit={event => void ask(event)}>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft" htmlFor="project-ai-query">
              Câu hỏi
              <textarea id="project-ai-query" value={query} onChange={event => setQuery(event.target.value)} rows={4} maxLength={1000} className="rounded-lg border border-hairline bg-card p-3 font-normal text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" placeholder="Ví dụ: Những việc nào cần ưu tiên trong tuần này?" />
            </label>
            <button type="submit" disabled={!query.trim() || busy} className="min-h-11 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Đang hỏi trợ lý…' : 'Gửi câu hỏi'}</button>
          </form>
          {error && <p role="alert" className="mt-4 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
          {answer && <AssistantAnswer answer={answer} />}
        </section>
      )}

      {env.aiRunHistoryEnabled && <AiAnalysisRunsPanel key={historyRevision} projectId={project.id} />}

      <section className="rounded-xl border border-hairline bg-card shadow-xs">
        <button
          type="button"
          aria-expanded={scenarioOpen}
          onClick={() => setScenarioOpen(v => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-canvas"
        >
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold text-ink">Giả lập kịch bản tiến độ</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Ước lượng tác động khi thay đổi số công việc quá hạn hoặc vướng mắc.</p>
          </div>
          <span className="material-symbols-outlined shrink-0 text-ink-muted" aria-hidden="true">
            {scenarioOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>
        {scenarioOpen && (
          <div className="border-t border-hairline p-4">
            <ProgressScenarioPanel />
          </div>
        )}
      </section>
    </WorkspacePage>
  )
}

function ProjectAiDigestCard({ projectId }: { projectId: number }) {
  const [digest, setDigest] = useState<ProjectAiDigest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => { const controller = new AbortController(); void getProjectAiDigest(projectId, controller.signal).then(value => { if (!controller.signal.aborted) { setDigest(value); setError(false) } }).catch(() => { if (!controller.signal.aborted) setError(true) }).finally(() => { if (!controller.signal.aborted) setLoading(false) }); return () => controller.abort() }, [projectId])
  if (loading || error || !digest || digest.nextActions.length === 0) return null
  return (
    <section className="rounded-xl border border-primary/20 bg-primary-subtle p-4 shadow-2xs" aria-label="Việc nên ưu tiên từ bản tin tự động">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">priority_high</span>
          <h2 className="text-sm font-bold text-ink">Việc nên ưu tiên ngay</h2>
        </div>
        <span className="text-xs text-ink-muted">Cập nhật {formatDate(digest.generatedAtUtc)}</span>
      </div>
      <ul className="mt-2.5 list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {digest.nextActions.slice(0, 5).map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </section>
  )
}
function AssistantAnswer({ answer }: { answer: ProjectAssistantResponse }) { return <section aria-live="polite" className="mt-5 rounded-lg border border-primary-subtle bg-primary-subtle p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Phản hồi AI · phạm vi {answer.contextScope}</p>{answer.insufficientEvidence && <p role="status" className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Chưa đủ chứng cứ cho một kết luận đáng tin cậy. Không suy diễn phản hồi này là xác nhận tiến độ hoặc rủi ro thấp.</p>}{answer.generationStatus === 'FALLBACK' && <p role="status" className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Phản hồi dự phòng: hệ thống chưa tạo được câu trả lời bằng mô hình AI. Hãy đối chiếu nội dung với chứng cứ bên dưới trước khi sử dụng.</p>}<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{answer.answer}</p>{answer.limitationNote && <p className="mt-3 text-sm text-ink-soft"><span className="font-semibold">Giới hạn:</span> {answer.limitationNote}</p>}<EvidenceReferences items={answer.evidence} /><p className="mt-3 text-xs text-ink-muted">Tạo lúc {formatDate(answer.generatedAt)}</p></section> }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) }
function errorMessage(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn.'; if (reason.status === 403) return 'Hệ thống không cấp quyền hỏi trợ lý cho đồ án này.'; if (reason.status === 404) return 'Không tìm thấy đồ án trong phạm vi hiện tại.'; if (reason.status === 429) return 'Yêu cầu đang vượt giới hạn. Hãy chờ một lúc rồi thử lại.' }; return 'Không thể nhận phản hồi từ trợ lý AI.' }
