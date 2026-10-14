import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatPercent, formatScore } from '../../components/ui/format'
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
      : <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Không tìm thấy đồ án hoặc hồ sơ sinh viên hiện tại.</p>}
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
  if (loading) return <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Đang tải kết quả…</p>
  if (error) return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={() => { setLoading(true); setResult(null); setError(null); setRevision(value => value + 1) }}>Tải lại</button></div>
  if (!result) return <section className="grid min-h-64 place-items-center rounded-2xl border border-hairline bg-card p-8 text-center shadow-xs"><div><span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">hourglass_top</span><h2 className="mt-2 text-lg font-bold text-ink">Kết quả chưa được công bố</h2><p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">Bạn sẽ xem được điểm và kết luận tại đây sau khi bộ môn hoàn tất quy trình công bố.</p></div></section>
  const major = project.majors.find(item => item.majorId === result.majorId)?.majorName || `Ngành #${result.majorId}`
  const schemeLabel = result.breakdown?.schemeName ? `${result.breakdown.schemeName}${result.breakdown.schemeVersion ? ` · v${result.breakdown.schemeVersion}` : ''}` : `Quy định #${result.schemeId}`
  const components = result.breakdown?.components ?? []
  return <><section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs" aria-label="Kết quả cá nhân đã công bố">
    <dl className="grid gap-5 p-5 sm:p-6 md:grid-cols-3"><ResultFact label="Kết luận" value={{ PASS: 'Đạt', PASSED: 'Đạt', FAIL: 'Không đạt', FAILED: 'Không đạt' }[result.outcome.toUpperCase()] ?? result.outcome} /><ResultFact label="Điểm cá nhân" value={String(result.totalScore)} prominent /><ResultFact label="Ngưỡng đạt" value={String(result.passThreshold)} prominent /></dl>
    <dl className="grid gap-4 border-t border-hairline p-5 sm:grid-cols-3"><ResultFact label="Quy định đánh giá" value={schemeLabel} /><ResultFact label="Ngành" value={major} /><ResultFact label="Công bố lúc" value={new Date(result.publishedAt).toLocaleString('vi-VN')} /></dl>
    {result.version > 1 && <p className="border-t border-hairline bg-status-warning-bg p-3 text-sm text-status-warning-text">Đây là kết quả đã đính chính — phiên bản {result.version}{result.supersedesVersion != null ? `, thay thế phiên bản ${result.supersedesVersion}` : ''}.</p>}
    {result.breakdown && (result.breakdown.isDemo || result.breakdown.approvalStatus !== 'APPROVED') && <p className="border-t border-hairline bg-status-warning-bg p-3 text-sm text-status-warning-text">{result.breakdown.isLegacy ? 'Quy định đánh giá cũ, chỉ để tra cứu.' : 'Phương án đánh giá còn ở dạng demo / chưa được duyệt chính thức.'}</p>}
    {components.length > 0 && <div className="border-t border-hairline p-5 sm:p-6">
      <h3 className="text-sm font-bold text-ink">Chi tiết thành phần điểm</h3>
      <p className="mt-1 text-xs text-ink-muted">Thành phần chưa có điểm được đánh dấu "Chưa có điểm", không tính là 0.</p>
      <Table stack className="mt-4" aria-label="Chi tiết thành phần điểm">
        <TableHead>
          <TableRow head>
            <TableHeaderCell>Thành phần</TableHeaderCell>
            <TableHeaderCell numeric>Trọng số</TableHeaderCell>
            <TableHeaderCell numeric>Điểm</TableHeaderCell>
            <TableHeaderCell>Trạng thái</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>{components.map((component, index) => {
          const pending = component.score === null
          return <TableRow key={`${component.componentId}-${index}`}>
            <TableCell label="Thành phần" className="font-medium text-ink">{scopeLabel(component.scope)}{component.majorId != null && ` · Ngành #${component.majorId}`}</TableCell>
            <TableCell label="Trọng số" numeric>{formatPercent(component.weightPercent)}</TableCell>
            <TableCell label="Điểm" numeric className="font-semibold">{formatScore(component.score)}</TableCell>
            <TableCell label="Trạng thái"><StatusBadge tone={pending ? 'warning' : 'success'} label={pending ? `Chưa có điểm (${component.finalizedEvaluators}/${component.requiredEvaluators} người chấm)` : 'Đã chấm'} /></TableCell>
          </TableRow>
        })}</TableBody>
      </Table>
    </div>}
    <p className="border-t border-hairline bg-canvas p-5 text-sm leading-6 text-ink-muted">Điểm và kết luận lấy từ kết quả cá nhân đã công bố. {components.length === 0 && 'Chi tiết thành phần chỉ hiển thị khi hệ thống cung cấp dữ liệu được phép xem.'}</p>
  </section>
  {env.resultCorrectionEnabled && <ResultCorrectionPanel projectId={project.id} />}
  </>
}
function ResultFact({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt><dd className={`mt-2 break-words text-ink ${prominent ? 'text-4xl font-bold' : 'text-sm font-medium'}`}>{value}</dd></div>
}
function scopeLabel(scope: string) {
  return ({ COMMON: 'Điểm chung', MAJOR: 'Theo ngành', INDIVIDUAL: 'Cá nhân' } as Record<string, string>)[scope.toUpperCase()] ?? scope
}
