import { useEffect, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { ListLoading } from '../../components/ui/ListLoading'
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
    {journey.isLoading ? <ListLoading label="Đang tải hồ sơ đồ án…" />
      : journey.error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>Chưa tải được hồ sơ đồ án.</span><button type="button" className="min-h-11 font-semibold underline" onClick={() => void journey.refreshAll()}>Tải lại hồ sơ</button></div>
      : journey.project && journey.profile ? <PublishedStudentResult key={`${journey.project.id}:${journey.profile.id}`} project={journey.project} studentId={journey.profile.id} />
      : <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Không tìm thấy đồ án hoặc hồ sơ sinh viên hiện tại.</p>}
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
  if (loading) return <ListLoading label="Đang tải kết quả…" />
  if (error) return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><span>{error}</span><button type="button" className="min-h-11 font-semibold underline" onClick={() => { setLoading(true); setResult(null); setError(null); setRevision(value => value + 1) }}>Tải lại</button></div>
  if (!result) return <section className="grid min-h-64 place-items-center rounded-2xl border border-hairline bg-card p-8 text-center shadow-xs"><div><span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">hourglass_top</span><h2 className="mt-2 text-lg font-bold text-ink">Kết quả chưa được công bố</h2><p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">Bạn sẽ xem được điểm và kết luận tại đây sau khi bộ môn hoàn tất quy trình công bố.</p></div></section>
  const major = project.majors.find(item => item.majorId === result.majorId)?.majorName || 'Chuyên ngành chính'
  const schemeLabel = result.breakdown?.schemeName ? `${result.breakdown.schemeName}${result.breakdown.schemeVersion ? ` · v${result.breakdown.schemeVersion}` : ''}` : 'Phương án đánh giá đã công bố'
  const components = result.breakdown?.components ?? []
  const gradedCount = result.breakdown ? components.filter(component => component.score !== null).length : null
  const pendingCount = result.breakdown ? components.filter(component => component.score === null).length : null
  const outcomeKey = result.outcome.toUpperCase()
  const outcome = ({ PASS: 'Đạt', PASSED: 'Đạt', FAIL: 'Không đạt', FAILED: 'Không đạt' } as Record<string, string>)[outcomeKey] ?? result.outcome
  const outcomeTone = outcomeKey === 'PASS' || outcomeKey === 'PASSED' ? 'success' : outcomeKey === 'FAIL' || outcomeKey === 'FAILED' ? 'error' : 'neutral'
  const outcomeDetailKey = result.outcomeDetail ?? result.breakdown?.outcomeDetail ?? null
  const outcomeDetailNote = outcomeDetailKey ? ({
    PASSED: 'Đạt tổng điểm và không có thành phần điểm liệt (< 4.00).',
    FAILED_TOTAL: 'Không đạt — Tổng điểm thấp hơn ngưỡng đạt quy định.',
    FAILED_COMPONENT_FLOOR: 'Không đạt — Có ít nhất 1 thành phần điểm liệt (< 4.00) theo quy chế POL-01.',
    DEFENSE_ABSENT: 'Không đạt — Ghi nhận vắng mặt bảo vệ (DEFENSE_ABSENT).',
  } as Record<string, string>)[outcomeDetailKey] ?? outcomeDetailKey : null
  const publishedFeedback = result.breakdown?.publishedFeedback ?? []
  return <><StatTileRow tiles={[
    { icon: 'score', label: 'Điểm cá nhân', value: formatScore(result.totalScore), hero: true, caption: 'Kết quả chính thức đã công bố' },
    { icon: 'rule', label: 'Ngưỡng đạt', value: formatScore(result.passThreshold) },
    { icon: 'task_alt', label: 'Thành phần đã chấm', value: gradedCount, caption: result.breakdown ? undefined : 'Chưa có chi tiết từ hệ thống.' },
    { icon: 'pending', label: 'Thành phần chờ điểm', value: pendingCount, caption: result.breakdown ? undefined : 'Chưa có chi tiết từ hệ thống.' },
  ]} />
  <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs" aria-label="Kết quả cá nhân đã công bố">
    <dl className="p-5 sm:p-6">
      <ResultFact label="Kết luận" value={outcome} prominent tone={outcomeTone} />
      {outcomeDetailNote && <p className={`mt-2 text-sm font-medium ${outcomeDetailKey === 'PASSED' ? 'text-status-success-text' : 'text-status-error-text'}`}>{outcomeDetailNote}</p>}
    </dl>
    <dl className="grid gap-4 border-t border-hairline p-5 sm:grid-cols-3"><ResultFact label="Quy định đánh giá" value={schemeLabel} /><ResultFact label="Ngành" value={major} /><ResultFact label="Công bố lúc" value={new Date(result.publishedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })} /></dl>
    {result.version > 1 && <p className="border-t border-hairline bg-status-warning-bg p-3 text-sm text-status-warning-text">Đây là kết quả đã đính chính — phiên bản {result.version}{result.supersedesVersion != null ? `, thay thế phiên bản ${result.supersedesVersion}` : ''}.</p>}
    {result.breakdown && (result.breakdown.isDemo || result.breakdown.approvalStatus !== 'APPROVED') && <p className="border-t border-hairline bg-status-warning-bg p-3 text-sm text-status-warning-text">{result.breakdown.isLegacy ? 'Quy định đánh giá cũ, chỉ để tra cứu.' : 'Phương án đánh giá đang ở dạng thử nghiệm hoặc chưa được duyệt chính thức.'}</p>}
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
            <TableCell label="Thành phần" className="font-medium text-ink"><span className="block">{component.name}</span><span className="block text-xs font-normal text-ink-muted">{scopeLabel(component.scope)}{component.majorId != null && ` · ${project.majors.find(major => major.majorId === component.majorId)?.majorName || 'Chuyên ngành khác'}`}</span></TableCell>
            <TableCell label="Trọng số" numeric>{formatPercent(component.weightPercent)}</TableCell>
            <TableCell label="Điểm" numeric className="font-semibold">{formatScore(component.score)}</TableCell>
            <TableCell label="Trạng thái"><StatusBadge tone={pending ? 'warning' : 'success'} label={pending ? `Chưa có điểm (${component.finalizedEvaluators}/${component.requiredEvaluators} người chấm)` : 'Đã chấm'} /></TableCell>
          </TableRow>
        })}</TableBody>
      </Table>
      <p className="mt-3 text-sm text-ink-muted">{components.length} thành phần</p>
    </div>}
    {publishedFeedback.length > 0 && <div className="border-t border-hairline p-5 sm:p-6" aria-label="Nhận xét chính thức đã công bố">
      <h3 className="text-sm font-bold text-ink">Nhận xét từ Hội đồng & GVHD</h3>
      <ul className="mt-3 space-y-2">
        {publishedFeedback.map((fb, idx) => <li key={`${fb.source}-${idx}`} className="rounded-lg border border-hairline bg-canvas p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-soft">
            <span>{fb.source}</span>
            {fb.stage && <span>{fb.stage}</span>}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-ink">{fb.comments}</p>
        </li>)}
      </ul>
    </div>}
    <p className="border-t border-hairline bg-canvas p-5 text-sm leading-6 text-ink-muted">Điểm và kết luận lấy từ kết quả cá nhân đã công bố. {components.length === 0 && 'Chi tiết thành phần chỉ hiển thị khi hệ thống cung cấp dữ liệu được phép xem.'}</p>
  </section>
  {env.resultCorrectionEnabled && <ResultCorrectionPanel projectId={project.id} />}
  </>
}
function ResultFact({ label, value, prominent = false, tone = 'neutral' }: { label: string; value: string; prominent?: boolean; tone?: 'neutral' | 'success' | 'error' }) {
  const toneClass = tone === 'success' ? 'text-status-success-text' : tone === 'error' ? 'text-danger-text' : 'text-ink'
  return <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt><dd className={`mt-2 break-words ${toneClass} ${prominent ? 'text-4xl font-bold' : 'text-sm font-medium'}`}>{value}</dd></div>
}
function scopeLabel(scope: string) {
  return ({ COMMON: 'Điểm chung', MAJOR: 'Theo ngành', MAJOR_SPECIFIC: 'Theo ngành', INDIVIDUAL: 'Cá nhân' } as Record<string, string>)[scope.toUpperCase()] ?? scope
}
