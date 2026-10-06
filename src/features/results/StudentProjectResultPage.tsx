import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { getStudentResult } from '../../services/api/project-results.api'
import type { StudentResult } from './result-types'
import { HttpError } from '../../services/http/http-client'

export function StudentProjectResultPage() {
  const journey = useStudentJourney()
  const projectId = journey.project?.id
  const studentId = journey.profile?.id
  const [result, setResult] = useState<StudentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!projectId || !studentId) { setLoading(false); return }
    setLoading(true); setResult(null)
    try { setResult(await getStudentResult(projectId, studentId)); setError(null) }
    catch (reason) { setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền xem kết quả đồ án này.' : 'Chưa tải được kết quả. Hãy thử lại.') }
    finally { setLoading(false) }
  }, [projectId, studentId])
  useEffect(() => { if (!journey.isLoading) void load() }, [journey.isLoading, load])

  const passed = result ? ['PASS', 'PASSED', 'ĐẠT'].includes(result.outcome.toUpperCase()) : false
  return <WorkspacePage className="space-y-5" title="Kết quả đồ án" eyebrow="Kết quả chính thức" description="Xem điểm số và kết luận sau khi bộ môn công bố kết quả.">
    {journey.isLoading || loading ? <div role="status" className="rounded-lg border border-hairline bg-white p-5 text-sm text-slate-600">Đang tải kết quả…</div> : null}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button type="button" className="min-h-10 font-semibold underline underline-offset-4" onClick={() => void load()}>Tải lại</button></div>}
    {!journey.isLoading && (!projectId || !studentId) && <div className="rounded-lg border border-hairline bg-white p-5 text-sm text-slate-600">Không tìm thấy đồ án hoặc hồ sơ sinh viên hiện tại.</div>}
    {!loading && !error && projectId && !result && <section className="grid min-h-64 place-items-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs"><div><div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-[#edf3f0] text-[#0f5b4e]"><span className="material-symbols-outlined text-3xl" aria-hidden="true">hourglass_top</span></div><h2 className="mt-2 text-lg font-bold text-slate-950">Kết quả chưa được công bố</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Bạn sẽ xem được điểm và kết luận tại đây sau khi bộ môn hoàn tất quy trình công bố.</p></div></section>}
    {!loading && result && <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs"><div className="grid gap-px bg-slate-100 md:grid-cols-[1.1fr_1fr_1fr]"><div className="bg-white p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Kết luận</p><div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${passed ? 'border-[#a7f3d0] bg-[#edf3f0] text-[#0f5b4e]' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><span className="material-symbols-outlined text-[18px]" aria-hidden="true">{passed ? 'verified' : 'info'}</span>{result.outcome}</div></div><div className="bg-white p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Điểm cá nhân</p><p className="mt-3 font-mono text-4xl font-bold tracking-tight text-slate-950">{result.totalScore}</p><p className="mt-1 text-xs text-slate-500">Theo thang điểm đã công bố</p></div><div className="bg-white p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Ngưỡng đạt</p><p className="mt-3 font-mono text-4xl font-bold tracking-tight text-slate-950">{result.passThreshold}</p><p className="mt-1 text-xs text-slate-500">Theo quy định kỳ học</p></div></div><div className="grid gap-4 border-t border-slate-100 p-5 text-sm sm:grid-cols-3"><ResultFact label="Quy định đánh giá" value={`#${result.schemeId}`} /><ResultFact label="Ngành" value={`#${result.majorId}`} /><ResultFact label="Công bố lúc" value={new Date(result.publishedAt).toLocaleString('vi-VN')} /></div><div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">Quy tắc tính:</span> {result.calculationRule}</div></section>}
    <div>
      <Link to="/projects/lifecycle" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0f5b4e] hover:border-[#0f5b4e]/30 transition-all">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
        <span>Về hồ sơ đồ án</span>
      </Link>
    </div>
  </WorkspacePage>
}

function ResultFact({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-mono text-xs text-slate-800">{value}</p></div>
}

