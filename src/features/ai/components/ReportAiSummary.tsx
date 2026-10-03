import { useCallback, useState } from 'react'
import { HttpError } from '../../../services/http/http-client'
import { getReportAiSummary, type ReportAiSummary as Summary } from '../ai-api'
import { EvidenceReferences } from './EvidenceReferences'

export function ReportAiSummary({ projectId, reportId }: { projectId: number; reportId: number }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true)
    try { setSummary(await getReportAiSummary(projectId, reportId)); setError(null) }
    catch (reason) { setError(errorMessage(reason)) }
    finally { setLoading(false) }
  }, [projectId, reportId])

  return <section className="report-panel" aria-labelledby="ai-report-summary">
    <div className="report-section-heading"><h2 id="ai-report-summary">Tóm tắt AI tham khảo</h2><span>AI</span></div>
    <p className="report-help">Chỉ tạo khi bạn yêu cầu. Nội dung do Backend tạo từ báo cáo và chứng cứ được cấp quyền; báo cáo gốc vẫn là nguồn chính thức.</p>
    {loading ? <p role="status" className="mt-3 text-sm">Đang tạo tóm tắt từ dữ liệu Backend…</p>
      : error ? <div role="alert" className="mt-3 text-sm"><p>{error}</p><button type="button" className="report-text-button" onClick={() => void load()}>Thử lại</button></div>
        : !summary ? <button type="button" className="report-text-button mt-3" onClick={() => void load()}>Tạo tóm tắt AI</button>
          : <>
            <dl className="mt-3 space-y-3 text-sm">{([['Đã hoàn thành', summary.summary.completed], ['Đang thực hiện', summary.summary.inProgress], ['Vướng mắc', summary.summary.blockers], ['Rủi ro', summary.summary.risks], ['Việc tiếp theo', summary.summary.nextActions]] as const).map(([label, value]) => <div key={label}><dt className="font-semibold text-slate-900">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-slate-700">{value || 'Backend chưa có nội dung.'}</dd></div>)}</dl>
            {summary.limitationNote && <p className="mt-3 text-sm text-slate-700"><strong>Giới hạn:</strong> {summary.limitationNote}</p>}
            <EvidenceReferences items={summary.evidence} heading="Chứng cứ dùng để tạo tóm tắt" />
            <p className="mt-3 text-xs text-slate-500">Phạm vi {summary.contextScope} · {summary.evidence.length} chứng cứ · tạo lúc {formatDate(summary.generatedAt)}</p>
          </>}
  </section>
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) }
function errorMessage(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn.'; if (reason.status === 403) return 'Backend không cấp quyền xem tóm tắt AI của báo cáo này.'; if (reason.status === 404) return 'Không tìm thấy báo cáo hoặc đồ án trong phạm vi hiện tại.'; if (reason.status === 429) return 'Yêu cầu tóm tắt đang vượt giới hạn. Hãy chờ rồi thử lại.' }; return 'Không thể tạo tóm tắt AI từ Backend. Báo cáo gốc vẫn có thể xem được.' }
