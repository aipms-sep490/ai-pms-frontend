import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { env } from '../../../app/config/env'
import { getProjectProgressAnalysis, recordProjectProgressAnalysis, type ProjectProgressAnalysis } from '../ai-api'

const knownRiskLevels = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
const knownDataStatuses = new Set(['SUFFICIENT', 'INSUFFICIENT_DATA'])
const unavailableMetricLabels: Record<string, string> = {
  PROJECT_RISK: 'Rủi ro toàn đồ án', MILESTONES: 'Mốc tiến độ', REPORTS: 'Báo cáo tiến độ', MEETINGS: 'Cuộc họp', CONTRIBUTIONS: 'Đóng góp cá nhân',
}

export function ProjectProgressAnalysisPanel(props: { projectId: number; compact?: boolean; dock?: boolean; onSaved?: () => void }) {
  return <ProgressContent key={props.projectId} {...props} />
}

function ProgressContent({ projectId, compact = false, dock = false, onSaved }: { projectId: number; compact?: boolean; dock?: boolean; onSaved?: () => void }) {
  const headingId = useId()
  const request = useRef(0)
  const saveLock = useRef(false)
  const alive = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current++ } }, [])
  const [analysis, setAnalysis] = useState<ProjectProgressAnalysis | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false); const [saveNotice, setSaveNotice] = useState<{ message: string; error: boolean } | null>(null)
  // Opening the panel only reads data; an explicit analysis/save action records a run.
  const load = useCallback(async () => {
    const id = ++request.current
    setLoading(true); setSaveNotice(null)
    try { const value = await getProjectProgressAnalysis(projectId); if (alive.current && id === request.current) { setAnalysis(value); setError(null) } }
    catch (reason) { if (alive.current && id === request.current) setError(errorMessage(reason)) }
    finally { if (alive.current && id === request.current) setLoading(false) }
  }, [projectId])
  useEffect(() => { void load() }, [load])
  const save = async () => {
    if (saveLock.current) return
    saveLock.current = true; setSaving(true); setSaveNotice(null)
    try { const recorded = await recordProjectProgressAnalysis(projectId); if (alive.current) { setAnalysis(recorded); setSaveNotice({ message: 'Đã lưu vào lịch sử phân tích.', error: false }); onSaved?.() } }
    catch (reason) { if (alive.current) setSaveNotice({ message: errorMessage(reason), error: true }) }
    finally { saveLock.current = false; if (alive.current) setSaving(false) }
  }
  if (loading) return <section aria-label="Phân tích tiến độ" className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><p role="status" className="text-sm text-ink-muted">Đang tải phân tích tiến độ từ hệ thống…</p></section>
  if (error) return <section aria-label="Phân tích tiến độ" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text"><p role="alert">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại phân tích</button></section>
  if (!analysis) return null
  const insufficient = analysis.dataStatus === 'INSUFFICIENT_DATA'
  const isKnownStatus = knownDataStatuses.has(analysis.dataStatus)
  const isKnownRisk = knownRiskLevels.has(analysis.riskLevel)
  const majorScoped = analysis.contextScope === 'MAJOR'
  const riskClass = insufficient || !isKnownStatus || !isKnownRisk ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text' : analysis.riskLevel === 'CRITICAL' || analysis.riskLevel === 'HIGH' ? 'border-status-error-border bg-status-error-bg text-status-error-text' : analysis.riskLevel === 'MEDIUM' ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text' : 'border-status-success-border bg-status-success-bg text-status-success-text'
  const riskLabel = insufficient ? 'Chưa đủ dữ liệu' : !isKnownStatus || !isKnownRisk ? 'Trạng thái chưa hỗ trợ' : `Rủi ro: ${analysis.riskLevel}`
  return <section aria-labelledby={headingId} className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Phân tích tư vấn</p><h2 id={headingId} className="mt-1 font-heading text-lg font-semibold text-ink">Rủi ro và tiến độ đồ án</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-ink-muted">Phân tích giúp nhận biết điểm cần chú ý trong tiến độ. Kết quả mang tính tham khảo và không thay thế đánh giá của giảng viên.</p></div><div className="flex items-center gap-2"><button type="button" className="min-h-10 rounded-lg border border-hairline px-3 text-xs font-semibold text-primary hover:bg-primary-subtle" disabled={loading || saving} onClick={() => void (env.aiProgressRiskEnabled ? save() : load())}>{saving ? 'Đang phân tích…' : 'Phân tích lại'}</button><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass}`}>{riskLabel}</span></div></div>
    {majorScoped && <p role="status" className="mt-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Bạn chỉ xem được phạm vi ngành được phân công. Không khả dụng: {analysis.unavailableMetrics.map(code => unavailableMetricLabels[code] ?? code).join(', ') || 'không có'}. Các số liệu dưới đây chỉ tính trên công việc bạn thấy được, không phải toàn đồ án.</p>}
    {insufficient ? <p role="status" className="mt-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Chưa đủ dữ liệu để đánh giá rủi ro. Hãy bổ sung công việc, minh chứng và báo cáo tiến độ.</p>
      : !isKnownStatus || !isKnownRisk ? <p role="status" className="mt-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Chưa thể xác định mức rủi ro từ kết quả hiện tại. Hãy kiểm tra dữ liệu tiến độ và thử lại.</p>
      : majorScoped ? <div className={dock ? "mt-4 grid grid-cols-2 gap-3" : "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}><Metric label="Tiến độ (phạm vi ngành)" value={`${analysis.progressSummary.progressPercentage}%`} /><Metric label="công việc quá hạn" value={analysis.progressSummary.overdueTasks} /><Metric label="công việc vướng mắc" value={analysis.progressSummary.blockedTasks} /><Metric label="Mốc tiến độ" value="Không khả dụng" /></div>
      : <div className={dock ? "mt-4 grid grid-cols-2 gap-3" : "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}><Metric label="Tiến độ" value={`${analysis.progressSummary.progressPercentage}%`} /><Metric label="công việc quá hạn" value={analysis.progressSummary.overdueTasks} /><Metric label="công việc vướng mắc" value={analysis.progressSummary.blockedTasks} /><Metric label="Độ tin cậy" value={analysis.confidence === null ? 'Chưa có' : `${Math.round(analysis.confidence * 100)}%`} /></div>}
    {!compact && <><InfoList title="Tóm tắt" items={analysis.summary ? [analysis.summary] : []} empty="Chưa có tóm tắt." /><InfoList title="Tín hiệu rủi ro" items={analysis.signals?.length ? analysis.signals.map(signal => `${signal.severity}: ${signal.description}`) : analysis.factors.map(factor => `${factor.severity}: ${factor.explanation}`)} empty="Hệ thống chưa trả tín hiệu rủi ro cụ thể." /><InfoList title="Gợi ý tư vấn" items={analysis.recommendations} empty="Hệ thống chưa trả gợi ý tư vấn." /><p className="mt-4 text-sm text-ink-muted">Gợi ý là văn bản tham khảo; không có nút thực thi hay quyền được suy ra từ gợi ý.</p></>}
    {analysis.riskScore !== null && <p className="mt-4 font-semibold">Chỉ số nguy cơ: {analysis.riskScore}/100</p>}
    {analysis.projectEvidence?.length ? <InfoList title="Công việc và hạng mục liên quan" items={analysis.projectEvidence.map(e => e.title + (e.excerpt ? ' · ' + e.excerpt : ''))} empty="" /> : null}
    {analysis.generationStatus === 'FALLBACK' && <p role="status" className="mt-3 text-sm text-ink-muted">Đang dùng diễn giải từ quy tắc vì model AI chưa khả dụng.</p>}
    {analysis.limitations && <p className="mt-4 rounded-lg border border-hairline bg-canvas p-3 text-sm text-ink-soft"><span className="font-semibold">Giới hạn:</span> {analysis.limitations}</p>}
    {!env.aiRunHistoryEnabled && saveNotice && <p role={saveNotice.error ? "alert" : "status"} className="mt-3 text-sm">{saveNotice.message}</p>}
    {env.aiRunHistoryEnabled && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={saving} className="min-h-11 rounded-lg border border-hairline px-4 text-sm font-semibold text-primary hover:bg-primary-subtle disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void save()}>{saving ? 'Đang lưu…' : 'Lưu vào lịch sử phân tích'}</button>{saveNotice && <p role={saveNotice.error ? "alert" : "status"} className="text-sm text-ink-muted">{saveNotice.message}</p>}</div>}
    <p className="mt-4 text-xs text-ink-muted">Phân tích lúc {formatDate(analysis.analysisTimeUtc)}</p>
  </section>
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg border border-hairline bg-canvas p-3"><p className="text-xs text-ink-muted">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-ink">{value}</p></div> }
function InfoList({ title, items, empty }: { title: string; items: string[]; empty: string }) { return <section className="mt-5"><h3 className="font-semibold text-ink">{title}</h3>{items.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-soft">{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-ink-muted">{empty}</p>}</section> }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) }
function errorMessage(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 403) return 'Hệ thống không cấp quyền xem phân tích của đồ án này.'; if (reason.status === 404) return 'Không tìm thấy đồ án hoặc dữ liệu phân tích.'; if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn.' }; return 'Không thể tải phân tích từ hệ thống.' }
