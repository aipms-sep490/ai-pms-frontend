import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { useStudentJourney } from '../../app/context'
import { getStudentResult } from '../../services/api/project-results.api'
import { HttpError } from '../../services/http/http-client'
import type { ProjectDto } from '../../types/backend'
import type { StudentResult } from './result-types'
import { ResultCorrectionPanel } from './ResultCorrectionPanel'
import { env } from '../../app/config/env'

export function StudentProjectResultPage() {
  const journey = useStudentJourney()
  return <WorkspacePage className="space-y-5" title="Kết quả đồ án" eyebrow="Kết quả chính thức" description="Xem điểm cá nhân và kết luận sau khi bộ môn công bố kết quả.">
    {journey.isLoading ? <p role="status">Đang tải hồ sơ đồ án…</p>
      : journey.error ? <div role="alert">Chưa tải được hồ sơ đồ án. <button type="button" className="min-h-11 underline" onClick={() => void journey.refreshAll()}>Tải lại hồ sơ</button></div>
      : journey.project && journey.profile ? <PublishedStudentResult key={`${journey.project.id}:${journey.profile.id}`} project={journey.project} studentId={journey.profile.id} />
      : <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Không tìm thấy đồ án hoặc hồ sơ sinh viên hiện tại.</p>}
    <Link to="/projects/lifecycle" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline bg-card px-4 text-sm font-semibold text-primary"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Về hồ sơ đồ án</Link>
  </WorkspacePage>
}

function PublishedStudentResult({ project, studentId }: { project: ProjectDto; studentId: number }) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<StudentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void getStudentResult(project.id, studentId, controller.signal).then(value => {
      if (controller.signal.aborted) return
      if (value && (value.projectId !== project.id || value.studentId !== studentId)) throw new Error('Result context mismatch')
      setResult(value)
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason instanceof HttpError && reason.status === 403 ? 'Bạn chưa có quyền xem kết quả đồ án này.' : 'Chưa tải được kết quả. Hãy thử lại.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [project.id, studentId, revision])
  if (loading) return <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-slate-600">Đang tải kết quả…</p>
  if (error) return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={() => { setLoading(true); setResult(null); setError(null); setRevision(value => value + 1) }}>Tải lại</button></div>
  if (!result) return <section className="grid min-h-64 place-items-center rounded-2xl border border-hairline bg-card p-8 text-center shadow-xs"><div><span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">hourglass_top</span><h2 className="mt-2 text-lg font-bold text-slate-950">Kết quả chưa được công bố</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Bạn sẽ xem được điểm và kết luận tại đây sau khi bộ môn hoàn tất quy trình công bố.</p></div></section>
  const major = project.majors.find(item => item.majorId === result.majorId)?.majorName || `Ngành #${result.majorId}`
  const schemeLabel = result.schemeName ? `${result.schemeName}${result.schemeVersion ? ` · v${result.schemeVersion}` : ''}` : `Quy định #${result.schemeId}`
  const components = result.components ?? []
  return <><section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs" aria-label="Kết quả cá nhân đã công bố">
    <dl className="grid gap-5 p-5 sm:p-6 md:grid-cols-3"><ResultFact label="Kết luận" value={{ PASS: 'Đạt', PASSED: 'Đạt', FAIL: 'Không đạt', FAILED: 'Không đạt' }[result.outcome.toUpperCase()] ?? result.outcome} /><ResultFact label="Điểm cá nhân" value={String(result.totalScore)} prominent /><ResultFact label="Ngưỡng đạt" value={String(result.passThreshold)} prominent /></dl>
    <dl className="grid gap-4 border-t border-hairline p-5 sm:grid-cols-3"><ResultFact label="Quy định đánh giá" value={schemeLabel} /><ResultFact label="Ngành" value={major} /><ResultFact label="Công bố lúc" value={new Date(result.publishedAt).toLocaleString('vi-VN')} /></dl>
    {components.length > 0 && <div className="border-t border-hairline p-5 sm:p-6">
      <h3 className="text-sm font-bold text-slate-950">Chi tiết thành phần điểm</h3>
      <p className="mt-1 text-xs text-slate-500">Thành phần chưa có điểm được đánh dấu "Chưa có điểm", không tính là 0.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full border-collapse text-sm">
        <thead><tr className="border-b border-hairline text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <th scope="col" className="py-2 pr-4">Thành phần</th><th scope="col" className="py-2 pr-4">Ngành</th><th scope="col" className="py-2 pr-4 text-right">Trọng số</th><th scope="col" className="py-2 pr-4 text-right">Điểm</th><th scope="col" className="py-2">Trạng thái</th>
        </tr></thead>
        <tbody>{components.map((component, index) => {
          const pending = component.score === null
          return <tr key={`${component.scope}-${component.majorName ?? ''}-${index}`} className="border-b border-hairline/70">
            <td className="py-2.5 pr-4 font-medium text-slate-900">{scopeLabel(component.scope)}</td>
            <td className="py-2.5 pr-4 text-slate-600">{component.majorName ?? '—'}</td>
            <td className="py-2.5 pr-4 text-right font-mono text-slate-700">{component.weightPercent}%</td>
            <td className="py-2.5 pr-4 text-right font-mono font-semibold text-slate-900">{pending ? '—' : component.score}</td>
            <td className="py-2.5"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${pending ? 'bg-status-warning-bg text-status-warning-text border border-status-warning-border' : 'bg-status-success-bg text-status-success-text border border-status-success-border'}`}>{pending ? 'Chưa có điểm' : 'Đã chấm'}</span></td>
          </tr>
        })}</tbody>
      </table></div>
    </div>}
    <p className="border-t border-hairline bg-slate-50 p-5 text-sm leading-6 text-slate-600">Điểm và kết luận lấy từ kết quả cá nhân đã công bố. {components.length === 0 && 'Chi tiết thành phần chỉ hiển thị khi hệ thống cung cấp dữ liệu được phép xem.'}</p>
  </section>
  {env.resultCorrectionEnabled && <ResultCorrectionPanel projectId={project.id} />}
  </>
}
function ResultFact({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className={`mt-2 break-words text-slate-900 ${prominent ? 'text-4xl font-bold' : 'text-sm font-medium'}`}>{value}</dd></div>
}
function scopeLabel(scope: string) {
  return ({ COMMON: 'Điểm chung', MAJOR: 'Theo ngành', INDIVIDUAL: 'Cá nhân' } as Record<string, string>)[scope.toUpperCase()] ?? scope
}
