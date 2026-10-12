import { displayLabel } from '../../../components/ui/display-label'
import { useCallback, useEffect, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { env } from '../../../app/config/env'
import { getProjectProgressAnalysis, recordProjectProgressAnalysis, type ProjectProgressAnalysis } from '../ai-api'

const knownRiskLevels = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
const knownDataStatuses = new Set(['SUFFICIENT', 'INSUFFICIENT_DATA'])
const unavailableMetricLabels: Record<string, string> = {
  PROJECT_RISK: 'Rủi ro toàn đồ án', MILESTONES: 'Mốc tiến độ', REPORTS: 'Báo cáo tiến độ', MEETINGS: 'Cuộc họp', CONTRIBUTIONS: 'Đóng góp cá nhân',
}

export function ProjectProgressAnalysisPanel({ projectId, compact = false }: { projectId: number; compact?: boolean }) {
  const [analysis, setAnalysis] = useState<ProjectProgressAnalysis | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false); const [saveNotice, setSaveNotice] = useState<string | null>(null)
  // Transient read by default — this must never persist a run on its own. Saving into
  // history is only ever the explicit "Lưu vào lịch sử phân tích" action below.
  const load = useCallback(async () => { setLoading(true); setSaveNotice(null); try { setAnalysis(await getProjectProgressAnalysis(projectId)); setError(null) } catch (reason) { setError(errorMessage(reason)) } finally { setLoading(false) } }, [projectId])
  useEffect(() => { void load() }, [load])
  const save = async () => {
    setSaving(true); setSaveNotice(null)
    try { const recorded = await recordProjectProgressAnalysis(projectId); setAnalysis(recorded); setSaveNotice(`Đã lưu vào lịch sử phân tích${recorded.runId ? ` · mã #${recorded.runId}` : ''}.`) }
    catch (reason) { setSaveNotice(errorMessage(reason)) }
    finally { setSaving(false) }
  }
  if (loading) return <section aria-label="Phân tích tiến độ" className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><p role="status" className="text-sm text-slate-600">Đang tải phân tích tiến độ từ hệ thống…</p></section>
  if (error) return <section aria-label="Phân tích tiến độ" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text"><p role="alert">{error}</p><button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại phân tích</button></section>
  if (!analysis) return null
  const insufficient = analysis.dataStatus === 'INSUFFICIENT_DATA'
  const isKnownStatus = knownDataStatuses.has(analysis.dataStatus)
  const isKnownRisk = knownRiskLevels.has(analysis.riskLevel)
  const majorScoped = analysis.contextScope === 'MAJOR'
  const riskClass = insufficient || !isKnownStatus || !isKnownRisk ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text' : analysis.riskLevel === 'CRITICAL' || analysis.riskLevel === 'HIGH' ? 'border-status-error-border bg-status-error-bg text-status-error-text' : analysis.riskLevel === 'MEDIUM' ? 'border-status-warning-border bg-status-warning-bg text-status-warning-text' : 'border-status-success-border bg-status-success-bg text-status-success-text'
  const riskLabel = insufficient ? 'Chưa đủ dữ liệu' : !isKnownStatus || !isKnownRisk ? 'Trạng thái chưa hỗ trợ' : `Rủi ro: ${analysis.riskLevel}`
  return <section aria-labelledby={`progress-analysis-${projectId}`} className="rounded-xl border border-hairline bg-card p-5 shadow-xs"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Phân tích tư vấn</p><h2 id={`progress-analysis-${projectId}`} className="mt-1 font-heading text-lg font-semibold text-slate-950">Rủi ro và tiến độ đồ án</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Phân tích giúp nhận biết điểm cần chú ý trong tiến độ. Kết quả mang tính tham khảo và không thay thế đánh giá của giảng viên.</p></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass}`}>{riskLabel}</span></div>
    {majorScoped && <p role="status" className="mt-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Bạn chỉ xem được phạm vi ngành được phân công ({analysis.majorIds.join(', ') || 'chưa rõ ngành'}). Không khả dụng: {analysis.unavailableMetrics.map(code => unavailableMetricLabels[code] ?? code).join(', ') || 'không có'}. Các số liệu dưới đây chỉ tính trên công việc bạn thấy được, không phải toàn đồ án.</p>}
    {!isKnownStatus || !isKnownRisk ? <p role="status" className="mt-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Chưa thể xác định mức rủi ro từ kết quả hiện tại. Hãy kiểm tra dữ liệu tiến độ và thử lại.</p>
      : majorScoped ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tiến độ (phạm vi ngành)" value={`${analysis.progressSummary.progressPercentage}%`} /><Metric label="công việc quá hạn" value={analysis.progressSummary.overdueTasks} /><Metric label="công việc vướng mắc" value={analysis.progressSummary.blockedTasks} /><Metric label="Mốc tiến độ" value="Không khả dụng" /></div>
      : insufficient ? <p role="status" className="mt-4 rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">Chưa đủ dữ liệu để đánh giá rủi ro. Hãy bổ sung công việc, minh chứng và báo cáo tiến độ.</p>
      : <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tiến độ" value={`${analysis.progressSummary.progressPercentage}%`} /><Metric label="công việc quá hạn" value={analysis.progressSummary.overdueTasks} /><Metric label="công việc vướng mắc" value={analysis.progressSummary.blockedTasks} /><Metric label="Độ tin cậy" value={analysis.confidence === null ? 'Chưa có' : `${Math.round(analysis.confidence * 100)}%`} /></div>}
    {!compact && <><InfoList title="Cơ sở phân tích" items={analysis.factors.map(factor => `${factor.severity}: ${factor.explanation}`)} empty="Hệ thống chưa trả tín hiệu rủi ro cụ thể." /><InfoList title="Gợi ý tư vấn" items={analysis.recommendations} empty="Hệ thống chưa trả gợi ý tư vấn." /><p className="mt-4 text-sm text-slate-600">Gợi ý là văn bản tham khảo; không có nút thực thi hay quyền được suy ra từ gợi ý.</p></>}
    {analysis.limitations && <p className="mt-4 rounded-lg border border-hairline bg-canvas p-3 text-sm text-slate-700"><span className="font-semibold">Giới hạn:</span> {analysis.limitations}</p>}
    {env.aiRunHistoryEnabled && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={saving} className="min-h-11 rounded-lg border border-hairline px-4 text-sm font-semibold text-primary hover:bg-primary-subtle disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void save()}>{saving ? 'Đang lưu…' : 'Lưu vào lịch sử phân tích'}</button>{saveNotice && <p role="status" className="text-sm text-slate-600">{saveNotice}</p>}</div>}
    <p className="mt-4 text-xs text-slate-500">dataStatus: {displayLabel(analysis.dataStatus)} · trend: {analysis.trendStatus} · rule {analysis.ruleVersion} · feature {analysis.featureVersion} · model {analysis.modelVersion} · phân tích lúc {formatDate(analysis.analysisTimeUtc)}{analysis.runId ? ` · mã lần phân tích #${analysis.runId}` : ''}</p>
  </section>
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg border border-hairline bg-canvas p-3"><p className="text-xs text-slate-600">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-slate-950">{value}</p></div> }
function InfoList({ title, items, empty }: { title: string; items: string[]; empty: string }) { return <section className="mt-5"><h3 className="font-semibold text-slate-950">{title}</h3>{items.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">{empty}</p>}</section> }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) }
function errorMessage(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 403) return 'Hệ thống không cấp quyền xem phân tích của đồ án này.'; if (reason.status === 404) return 'Không tìm thấy đồ án hoặc dữ liệu phân tích.'; if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn.' }; return 'Không thể tải phân tích từ hệ thống.' }
