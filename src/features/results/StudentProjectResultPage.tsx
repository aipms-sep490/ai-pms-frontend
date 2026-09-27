import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudentJourney } from '../../app/context'
import { getProjectResult } from '../../services/api/project-results.api'
import type { ProjectResult } from './result-types'
import { HttpError } from '../../services/http/http-client'

export function StudentProjectResultPage() {
  const journey = useStudentJourney()
  const projectId = journey.project?.id
  const [result, setResult] = useState<ProjectResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true); setResult(null)
    try { setResult(await getProjectResult(projectId)); setError(null) }
    catch (reason) { setError(reason instanceof HttpError && reason.status === 403 ? 'Backend không cấp quyền xem kết quả đồ án này.' : 'Không thể tải kết quả từ Backend.') }
    finally { setLoading(false) }
  }, [projectId])
  useEffect(() => { if (!journey.isLoading) void load() }, [journey.isLoading, load])

  return <main className="mx-auto max-w-4xl space-y-5 pb-12"><header><h1 className="text-2xl font-bold">Kết quả đồ án</h1><p className="mt-1 text-sm text-slate-600">Chỉ hiển thị kết quả đã được Backend công bố; điểm và kết luận không được tính tại trình duyệt.</p></header>
    {journey.isLoading || loading ? <p role="status" className="rounded-lg border bg-white p-4 text-sm">Đang tải kết quả…</p> : null}
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tải lại</button></p>}
    {!journey.isLoading && !projectId && <p className="rounded-lg border bg-white p-4 text-sm">Không tìm thấy đồ án của nhóm hiện tại.</p>}
    {!loading && !error && projectId && !result && <p className="rounded-lg border bg-white p-4 text-sm">Kết quả của đồ án này chưa được công bố.</p>}
    {!loading && result && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-semibold text-emerald-950">{result.outcome}</h2><p className="mt-2 text-sm text-emerald-900">Điểm đồ án: <strong>{result.totalScore}</strong> · Ngưỡng đạt: {result.passThreshold}</p><p className="mt-1 text-xs text-emerald-800">Công bố lúc {new Date(result.publishedAt).toLocaleString('vi-VN')} · {result.calculationRule}</p><h3 className="mt-4 font-semibold">Các đánh giá đã dùng</h3><ul className="mt-2 space-y-2 text-sm">{result.contributions.map(item => <li key={item.assignmentId} className="rounded-lg bg-white p-3">Evaluator #{item.evaluatorId} · rubric #{item.rubricId} · điểm {item.score} · trọng số {item.weightPercent}%</li>)}</ul><p className="mt-3 text-xs text-emerald-800">Đây là kết quả cấp đồ án. Backend chưa cung cấp kết quả riêng từng sinh viên.</p></section>}
    <Link to="/projects/lifecycle" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 underline">← Hồ sơ đồ án</Link>
  </main>
}
