import { reportError } from './report-errors'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { useExecutionAccess, type ExecutionAccess } from '../execution/context/ExecutionAccessContext'
import * as api from '../../services/api/progress-reports.api'
import { ReportEditor } from './ReportEditor'
import { contentFields, formatReportDate, missingSubmissionFields, reportTypeLabels, type CreateReport, type ReportDetail } from './report-types'
import { ReportBadge, ReportError, ReportLoading, ReportShell } from './report-ui'

export function ProgressReportDetailPage({ create = false }: { create?: boolean }) {
  const access = useExecutionAccess()
  const { reportId } = useParams()
  return <ReportDetailView key={`${access.project.id}:${access.currentUserId}:${create ? 'new' : reportId}`} access={access} create={create} id={Number(reportId)} />
}

function ReportDetailView({ access, create, id }: { access: ExecutionAccess; create: boolean; id: number }) {
  const { project, actor, canManageStructure, routeBase } = access
  const navigate = useNavigate()
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(!create)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const mounted = useRef(true)
  const [revision, setRevision] = useState(0)
  const [editorVersion, setEditorVersion] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [feedback, setFeedback] = useState('')
  const hasUnsavedChanges = dirty || Boolean(feedback.trim())
  const blocker = useBlocker(hasUnsavedChanges && !busy)
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasUnsavedChanges])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  useEffect(() => {
    if (create) return
    if (!Number.isSafeInteger(id) || id <= 0) { setLoadError('Đường dẫn báo cáo không hợp lệ.'); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true); setLoadError('')
    api.getProgressReport(id, controller.signal).then((data) => {
      if (controller.signal.aborted) return
      if (data.projectId !== project.id) { setLoadError('Báo cáo không thuộc đồ án đang mở.'); return }
      setReport(data); setDirty(false); setConfirmSubmit(false); setEditorVersion((value) => value + 1)
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setLoadError(reportError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [create, id, project.id, revision])

  async function mutate(action: () => Promise<void>) {
    if (locked.current) return
    locked.current = true; setBusy(true); setError(''); setSuccess('')
    try { await action() }
    catch (reason) { if (mounted.current) setError(reportError(reason)) }
    finally { locked.current = false; if (mounted.current) setBusy(false) }
  }

  async function save(value: CreateReport) {
    if (actor !== 'student' || (!create && report?.status !== 'DRAFT')) return
    await mutate(async () => {
      if (create) {
        const created = await api.createProgressReport(project.id, value)
        if (mounted.current) navigate(`${routeBase}/reports/${created.id}`, { replace: true })
      } else {
        const { summary, completedWork, plannedWork, issuesAndRisks } = value
        const updated = await api.updateProgressReport(id, { summary, completedWork, plannedWork, issuesAndRisks })
        if (!mounted.current) return
        setReport((current) => current && { ...current, ...updated }); setDirty(false); setConfirmSubmit(false)
        setEditorVersion((version) => version + 1); setSuccess('Đã lưu thay đổi. Trưởng nhóm có thể nộp khi nội dung đã đầy đủ.')
      }
    })
  }

  async function submit() {
    if (!report || actor !== 'student' || !canManageStructure || report.status !== 'DRAFT' || dirty || missingSubmissionFields(report).length) return
    await mutate(async () => {
      const updated = await api.submitProgressReport(id)
      if (!mounted.current) return
      setReport((current) => current && { ...current, ...updated }); setConfirmSubmit(false)
      setSuccess('Đã nộp báo cáo. Nội dung đã được khóa và sẵn sàng để GVHD nhận xét.')
    })
  }

  async function sendFeedback(event: FormEvent) {
    event.preventDefault()
    if (actor !== 'supervisor' || !report || !['SUBMITTED', 'REVIEWED'].includes(report.status) || !feedback.trim()) return
    await mutate(async () => {
      await api.addProgressReportFeedback(id, feedback.trim())
      if (!mounted.current) return
      // Clear only after POST succeeds; a failed follow-up GET must never invite a duplicate POST.
      setFeedback(''); setSuccess('Đã gửi nhận xét cho nhóm.'); setRevision((value) => value + 1)
    })
  }

  const editable = actor === 'student' && (create || report?.status === 'DRAFT')
  const missing = report ? missingSubmissionFields(report) : []
  return <ReportShell title={create ? 'Tạo báo cáo tiến độ' : 'Chi tiết báo cáo'} projectTitle={project.title} backTo={`${routeBase}/workspace`}
    description={create ? 'Lưu bản nháp để cả nhóm cùng hoàn thiện trước khi nộp cho GVHD.' : 'Nội dung báo cáo và lịch sử nhận xét của giảng viên hướng dẫn.'}
    action={<Link className="report-button report-button--secondary" to={`${routeBase}/reports`}>Danh sách báo cáo</Link>}>
    {blocker.state === 'blocked' && <div className="report-notice report-notice--error" role="alert"><p>Bạn có nội dung chưa lưu. Rời trang sẽ bỏ những thay đổi này.</p><div className="flex flex-wrap gap-3"><button className="report-button report-button--secondary" onClick={() => blocker.reset()}>Ở lại soạn tiếp</button><button className="report-button" onClick={() => blocker.proceed()}>Bỏ thay đổi và rời trang</button></div></div>}
    {success && <p role="status" className="report-notice report-notice--success">{success}</p>}
    {error && <ReportError message={error} />}
    {loading ? <ReportLoading /> : loadError ? <ReportError message={loadError} retry={() => setRevision((value) => value + 1)} /> : create && actor !== 'student' ? <ReportError message="Chỉ thành viên nhóm mới có thể tạo báo cáo." /> : <>
      {report && <div className="report-detail-banner"><div><p className="report-eyebrow">{reportTypeLabels[report.reportType]} • #{report.id}</p><h2>{formatReportDate(report.periodStart)} – {formatReportDate(report.periodEnd)}</h2><p>{report.status === 'DRAFT' ? 'Người tạo' : 'Người nộp'}: {report.submittedByName}{report.submittedAt ? ` • Nộp ngày ${formatReportDate(report.submittedAt)}` : ''}</p></div><div><ReportBadge status={report.status} />{report.isLate === true && <p className="report-late">Nộp trễ hạn</p>}</div></div>}
      <div className="report-detail-grid">
        <div>{editable ? <ReportEditor key={editorVersion} report={report ?? undefined} busy={busy} onSave={save} onDirtyChange={(value) => { setDirty(value); setConfirmSubmit(false) }} /> : report && <article className="report-panel report-reading"><h2>Nội dung báo cáo</h2>{contentFields.map(({ key, label }, index) => <section key={key}><h3><span>{String(index + 1).padStart(2, '0')}</span>{label}</h3><p>{report[key] || 'Chưa có nội dung.'}</p></section>)}</article>}</div>
        <aside className="report-aside">
          <section className="report-panel report-action-panel"><h2>{report?.status === 'DRAFT' || create ? 'Trước khi nộp' : 'Trạng thái báo cáo'}</h2>
            {create ? <p>Chọn kỳ báo cáo và điền tóm tắt để lưu nháp. Trưởng nhóm nộp sau khi cả bốn mục đã hoàn thiện.</p> : report?.status === 'DRAFT' ? <>
              <p>{actor === 'supervisor' ? 'Nhóm đang soạn nội dung. Bạn có thể nhận xét sau khi trưởng nhóm nộp báo cáo.' : 'Thành viên nhóm có thể sửa bản nháp. Chỉ trưởng nhóm được nộp báo cáo.'}</p>
              <ul className="report-checklist">{contentFields.map(({ key, label }) => <li key={key}><span aria-hidden="true">{report[key]?.trim() ? '✓' : '○'}</span>{label}</li>)}</ul>
              {actor === 'student' && canManageStructure && <>
                {dirty && <p className="report-validation">Lưu thay đổi trước khi nộp.</p>}
                {!dirty && missing.length > 0 && <p className="report-help">Còn thiếu: {missing.join(', ')}.</p>}
                {confirmSubmit ? <div className="report-confirm" role="group" aria-label="Xác nhận nộp báo cáo"><p>Sau khi nộp, cả nhóm không thể sửa nội dung. Bạn đã kiểm tra đầy đủ?</p><button className="report-button" disabled={busy} onClick={() => void submit()}>{busy ? 'Đang nộp…' : 'Xác nhận nộp'}</button><button className="report-button report-button--secondary" disabled={busy} onClick={() => setConfirmSubmit(false)}>Quay lại kiểm tra</button></div> : <button className="report-button" disabled={busy || dirty || missing.length > 0} onClick={() => setConfirmSubmit(true)}>Nộp cho GVHD</button>}
              </>}
            </> : <p>Nội dung đã được khóa sau khi nộp. {report?.status === 'REVIEWED' ? 'GVHD đã gửi nhận xét; xem chi tiết bên dưới.' : 'Báo cáo đang chờ nhận xét từ GVHD.'}</p>}
            {!create && <button className="report-text-button" disabled={busy || hasUnsavedChanges} onClick={() => { setError(''); setRevision((value) => value + 1) }}>Tải lại trạng thái</button>}
          </section>
          {report && <section className="report-panel report-feedback" aria-labelledby="feedback-title"><div className="report-section-heading"><h2 id="feedback-title">Nhận xét của GVHD</h2><span>{report.feedbacks.length}</span></div>
            {report.feedbacks.length === 0 ? <p className="report-help">Chưa có nhận xét. Phản hồi của GVHD sẽ xuất hiện tại đây.</p> : <ol>{report.feedbacks.map((item) => <li key={item.id}><strong>{item.supervisorName}</strong><time dateTime={item.createdAt}>{formatReportDate(item.createdAt)}</time><p>{item.feedbackText}</p></li>)}</ol>}
            {actor === 'supervisor' && ['SUBMITTED', 'REVIEWED'].includes(report.status) && <form onSubmit={(event) => void sendFeedback(event)}><label htmlFor="report-feedback">Nhận xét mới</label><textarea id="report-feedback" required rows={5} value={feedback} disabled={busy} onChange={(event) => setFeedback(event.target.value)} placeholder="Nhận xét kết quả và hướng dẫn bước tiếp theo…" /><button className="report-button" disabled={busy || !feedback.trim()} type="submit">{busy ? 'Đang gửi…' : 'Gửi nhận xét'}</button></form>}
          </section>}
        </aside>
      </div>
    </>}
  </ReportShell>
}
