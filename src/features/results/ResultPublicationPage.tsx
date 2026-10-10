import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { projectEvaluationPaths } from '../evaluations/project-evaluation-paths'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { useAcademicWorkflow } from '../../app/context/useAcademicWorkflow'
import * as results from '../../services/api/project-results.api'
import { HttpError } from '../../services/http/http-client'
import { departmentError } from '../department/hooks/useDepartmentSection'
import type { ProjectResult, ResultPreview } from './result-types'
import { StudentResultPublicationPanel } from './StudentResultPublicationPanel'
import { ProjectResultBreakdown } from './ProjectResultBreakdown'
import { env } from '../../app/config/env'

const outcome = (value: string | null) => ({ PASS: 'Đạt', FAIL: 'Chưa đạt', PASSED: 'Đạt', FAILED: 'Chưa đạt' }[value ?? ''] ?? value ?? 'Chưa có kết luận')
const crossDeptBlockerText = (leadPublish: boolean) => leadPublish
  ? 'Kết quả đồ án liên khoa do nhân viên Khoa chủ trì (Lead Department) công bố. Bạn vẫn có thể xử lý kết quả sinh viên trong khoa theo quyền được cấp.'
  : 'Kết quả đồ án liên khoa cần ADMIN công bố. Bạn vẫn có thể xử lý kết quả sinh viên trong khoa theo quyền được cấp.'

export function ResultPublicationPage() {
  const projectId = Number(useParams().projectId)
  const paths = projectEvaluationPaths(projectId, useLocation().pathname)
  const { academic } = useAcademicWorkflow()
  const [preview, setPreview] = useState<ResultPreview | null>(null), [published, setPublished] = useState<ProjectResult | null>(null)
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null)
  const version = useRef(0), lock = useRef(false), errorSummary = useRef<HTMLDivElement>(null)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const validId = Number.isSafeInteger(projectId) && projectId > 0
  // BE-03: once Lead Department owns publication, Admin no longer publishes project results.
  const hidePublishForAdmin = env.leadDepartmentPublishEnabled && paths.admin
  useEffect(() => { if (error) errorSummary.current?.focus() }, [error])

  const load = useCallback(async () => {
    const current = ++version.current
    setLoading(true); setError(null); setNotice(null); setConfirmed(false); setPreview(null); setPublished(null)
    if (!Number.isSafeInteger(projectId) || projectId < 1) { setError('Mã đồ án không hợp lệ.'); setLoading(false); return }
    try {
      const result = await results.getProjectResult(projectId)
      if (current !== version.current) return
      setPublished(result)
      if (!result) {
        try {
          const next = await results.getResultPreview(projectId)
          if (current === version.current) setPreview(next)
        } catch (reason) {
          if (current !== version.current) return
          if (reason instanceof HttpError && reason.status === 409) setNotice(reason.problem?.detail || 'Cần phương án đánh giá đã công bố và hồ sơ bàn giao đã khóa để xem trước kết quả.')
          else setError(departmentError(reason).message)
        }
      }
    } catch (reason) { if (current === version.current) setError(departmentError(reason).message) }
    finally { if (current === version.current) setLoading(false) }
  }, [projectId])
  useEffect(() => { const requestVersion = version; void load(); return () => { requestVersion.current++ } }, [load])

  async function publish() {
    if (lock.current || !preview?.canPublish || !confirmed) return
    lock.current = true; setBusy(true)
    const current = version.current, token = preview.confirmationToken
    try {
      if (await requestConfirmation({ title: 'Công bố kết quả đồ án?', description: 'Điểm và kết luận sẽ được lưu theo bản xem trước vừa kiểm tra. Hãy xác nhận quyết định công bố.', confirmLabel: 'Xác nhận công bố' }) === null || current !== version.current) return
      await results.publishProjectResult(projectId, token)
      if (current === version.current) await load()
    } catch (reason) {
      if (current !== version.current) return
      if (reason instanceof HttpError && reason.status === 409) await load()
      setConfirmed(false); setPreview(null); setError(departmentError(reason).message + ' Hãy tải lại và kiểm tra bản xem trước mới.')
    } finally { lock.current = false; setBusy(false) }
  }

  return <WorkspacePage title="Công bố kết quả đồ án" eyebrow={`Đồ án #${validId ? projectId : '—'}`} description="Kiểm tra phương án đánh giá, hồ sơ bàn giao và kết quả trước khi công bố.">
    {confirmationDialog}
    <section className="workspace-surface space-y-3 p-4 sm:p-5"><h2 className="font-heading font-semibold">Phương án đánh giá theo phạm vi</h2><p className="text-sm text-slate-600">Trình tự kiểm tra: hồ sơ bàn giao → phương án đánh giá đã công bố → phân công và điểm của người chấm → bản xem trước → xác nhận công bố. Điểm đồ án và từng sinh viên do hệ thống tính; chính sách cũ chỉ để tra cứu lịch sử.</p>{validId && <div className="flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline" to={paths.submission}>Kiểm tra hồ sơ bàn giao</Link><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline" to={paths.scheme}>Quản lý phương án đánh giá</Link><Link className="inline-flex min-h-11 items-center font-semibold text-primary underline" to={paths.evaluators}>Phân công người chấm</Link></div>}</section>
    {error && <div ref={errorSummary} tabIndex={-1} role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error}</div>}
    <Button className="min-h-11" variant="secondary" disabled={busy || loading || !validId} onClick={() => void load()}>Tải lại kết quả</Button>
    {loading && <p role="status">Đang tải kết quả và bản xem trước…</p>}
    {!loading && notice && <p role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">{notice}</p>}
    {!loading && published && <><section className="workspace-surface space-y-2 p-5" aria-label="Kết quả đồ án đã công bố"><h2 className="font-semibold text-status-success-text">Kết quả đã công bố: {outcome(published.outcome)}</h2><p>Tổng điểm {published.totalScore} · Ngưỡng đạt {published.passThreshold}</p><p className="break-words text-sm text-slate-600">{published.calculationRule}</p><p className="text-sm text-slate-600">{new Date(published.publishedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p></section><ProjectResultBreakdown commonScore={published.commonScore} majorAggregate={published.majorAggregate} majorBreakdown={published.majorBreakdown} contributions={published.contributions} /></>}
    {!loading && preview && <section className="workspace-surface space-y-4 p-4 sm:p-5" aria-label="Bản xem trước kết quả"><h2 className="font-heading font-semibold">Xem trước kết quả</h2><p>Điểm: {preview.totalScore ?? '—'} · Ngưỡng: {preview.passThreshold ?? '—'} · {outcome(preview.outcome)}</p>{preview.blockers.length > 0 && <ul className="list-disc space-y-2 break-words pl-5 text-sm text-status-warning-text">{preview.blockers.map(blocker => <li key={blocker}>{blocker === 'ADMIN_REQUIRED_FOR_CROSS_DEPARTMENT_PUBLICATION' ? crossDeptBlockerText(env.leadDepartmentPublishEnabled) : blocker}</li>)}</ul>}{hidePublishForAdmin ? <p className="rounded-lg border border-hairline bg-slate-50 p-3 text-sm text-slate-600">Kết quả đồ án do nhân viên Khoa chủ trì (Lead Department) công bố. Tài khoản quản trị chỉ xem bản xem trước, không công bố kết quả.</p> : <><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={!preview.canPublish || busy} onChange={event => setConfirmed(event.target.checked)} />Tôi đã kiểm tra bản xem trước này và xác nhận công bố.</label><Button className="min-h-11" disabled={!preview.canPublish || !confirmed || busy} onClick={() => void publish()}>Công bố kết quả đồ án</Button>{!preview.canPublish && <p className="text-sm text-slate-600">Cần xử lý các điều kiện còn thiếu trước khi công bố.</p>}</>}</section>}
    {!loading && preview && <ProjectResultBreakdown commonScore={preview.commonScore} majorAggregate={preview.majorAggregate} majorBreakdown={preview.majorBreakdown} contributions={preview.contributions} />}
    {validId && <StudentResultPublicationPanel key={projectId} projectId={projectId} departmentId={!paths.admin && academic?.departments.length === 1 ? academic.departments[0].id : undefined} />}
  </WorkspacePage>
}
