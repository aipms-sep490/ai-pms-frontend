import { Link } from 'react-router-dom'
import { env } from '../../../app/config/env'
import { ProjectProgressAnalysisPanel } from '../../ai/components/ProjectProgressAnalysisPanel'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { formatMeetingTime } from '../../meetings/meeting-utils'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { useSupervisorOperationalSummary, type SupervisorOperationalResource } from '../hooks/useSupervisorOperationalSummary'
import { useSupervisorProgressReview } from '../hooks/useSupervisorProgressReview'

type WorkspaceArea = { key: string; title: string; description: string; path: string }

const areas: WorkspaceArea[] = [
  { key: 'progress', title: 'Tiến độ', description: 'Báo cáo, blocker và phản hồi.', path: 'progress' },
  { key: 'tasks', title: 'Công việc & mốc', description: 'Hạn, phụ trách và trạng thái.', path: 'tasks' },
  { key: 'meetings', title: 'Cuộc họp', description: 'Lịch, biên bản, kết luận và việc sau họp.', path: 'meetings' },
  { key: 'deliverables', title: 'Deliverables', description: 'Hạng mục, phiên bản và phản hồi.', path: 'deliverables' },
  { key: 'files', title: 'Files / Evidence', description: 'Tệp trong phạm vi đồ án.', path: 'files' },
  { key: 'evidence', title: 'Evidence Ledger', description: 'Nguồn và trạng thái xác minh do Backend trả về.', path: 'evidence' },
  { key: 'contributions', title: 'Đóng góp', description: 'Chỉ số hoạt động có chứng cứ.', path: 'contributions' },
  { key: 'final', title: 'Bàn giao cuối', description: 'Checklist và gói đã khóa.', path: 'final-submission' },
]

/** Assignment-scoped, evidence-first cockpit. It does not invent a supervisor role or a write capability. */
export function SupervisorProjectWorkspacePage() {
  const access = useExecutionAccess()
  const operational = useSupervisorOperationalSummary(access.project.id)
  const progress = useSupervisorProgressReview(access.project.id)
  const evaluatorAssigned = operational.evaluator.state === 'ready' && operational.evaluator.data
  const availableAreas = [
    ...areas,
    ...(env.aiAdvisoryEnabled ? [{ key: 'ai', title: 'Rủi ro / AI', description: 'Tín hiệu tham khảo từ Backend.', path: 'ai' }] : []),
  ]

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="rounded-xl border border-hairline bg-primary-subtle p-5 shadow-xs sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Giám sát đồ án được phân công</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Không gian vận hành của GVHD</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">Ưu tiên chứng cứ cần xem và đường dẫn đúng phạm vi đồ án. Backend vẫn xác thực mọi thao tác ghi tại endpoint tương ứng.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary bg-card px-4 text-sm font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => { progress.reload(); void operational.reload() }}>Làm mới dữ liệu</button>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-primary bg-card px-4 text-sm font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to="/supervisor/workspace">Đổi đồ án</Link>
          </div>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="supervision-project-summary">
        <div className="border-b border-hairline px-5 py-4 sm:px-6">
          <p className="text-xs font-medium text-slate-600">{access.project.code} · {access.project.teamName ?? 'Chưa có thông tin nhóm'}</p>
          <h2 id="supervision-project-summary" className="mt-1 text-xl font-bold text-slate-900">{access.project.title}</h2>
        </div>
        <dl className="grid divide-y divide-hairline sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:divide-x sm:divide-y-0">
          <Metric label="Trạng thái" value={projectStatusLabel(access.project.status)} />
          <Metric label="Nhóm" value={access.project.teamName ?? 'Chưa có thông tin'} />
          <Metric label="GVHD" value={access.supervisor?.supervisorName ?? 'Chưa có thông tin'} />
          <ResourceMetric label="Mốc đang thực hiện" resource={operational.milestone} render={(data) => data.current?.title ?? (data.count ? 'Chưa có mốc IN_PROGRESS' : 'Chưa có mốc')} />
          <ResourceMetric label="Deliverables" resource={operational.deliverables} render={(data) => `${data.count} hạng mục do Backend trả về`} />
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="supervision-attention">
        <div className="border-b border-hairline px-5 py-4 sm:px-6"><h2 id="supervision-attention" className="font-bold text-slate-900">Cần chú ý</h2><p className="mt-1 text-sm text-slate-600">Số liệu chỉ phản ánh response hiện có; không phải điểm, phê duyệt hoặc trạng thái mới.</p></div>
        <div className="grid divide-y divide-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <AttentionItem title="Báo cáo chờ phản hồi" link={`${access.routeBase}/progress`} resource={operational.pendingReports} render={(data) => data.count ? `${data.count} báo cáo SUBMITTED` : 'Không có báo cáo SUBMITTED'} />
          <AttentionItem title="Việc quá hạn / vướng mắc" link={`${access.routeBase}/tasks?overdue=true`} resource={progress.attention} render={(data) => `${data.overdueTasks.length} quá hạn · ${data.blockedTasks.length} vướng mắc`} />
          <AttentionItem title="Cuộc họp sắp tới" link={operational.meeting.state === 'ready' && operational.meeting.data.next ? `${access.routeBase}/meetings/${operational.meeting.data.next.id}` : `${access.routeBase}/meetings`} resource={operational.meeting} render={(data) => data.next ? `${data.next.title} · ${formatMeetingTime(data.next.startAt)}` : 'Chưa có lịch họp sắp tới'} />
          <AttentionItem title="Checklist bàn giao cuối" link={`${access.routeBase}/final-submission`} resource={operational.finalChecklist} render={(data) => data.blockers.length ? `${data.blockers.length} blocker Backend trả về` : `${data.items.filter((item) => item.isComplete).length}/${data.items.length} hạng mục hoàn chỉnh`} />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="supervision-navigation">
        <div className="border-b border-hairline px-5 py-4 sm:px-6"><h2 id="supervision-navigation" className="font-bold text-slate-900">Phạm vi giám sát</h2><p className="mt-1 text-sm text-slate-600">Mỗi vùng mở route đã được ràng buộc với đồ án và phân công hiện tại.</p></div>
        <nav className="grid sm:grid-cols-2 lg:grid-cols-3" aria-label="Các vùng vận hành đồ án">
          {availableAreas.map((area) => <WorkspaceLink key={area.key} area={area} routeBase={access.routeBase} />)}
          {evaluatorAssigned && <WorkspaceLink area={{ key: 'evaluation', title: 'Evaluation', description: 'Mở assignment evaluator đã được Backend cấp.', path: '/evaluator/evaluations' }} routeBase="" />}
        </nav>
        {operational.evaluator.state === 'error' && <p role="alert" className="border-t border-hairline px-5 py-3 text-sm text-status-error-text">{operational.evaluator.message} Entry Evaluation được giữ ẩn cho đến khi Backend xác nhận assignment.</p>}
      </section>

      {env.aiAdvisoryEnabled && <ProjectProgressAnalysisPanel projectId={access.project.id} compact />}

      <p className="text-sm leading-6 text-slate-600">Phản hồi, người tham gia, biên bản, kết luận và action items của từng cuộc họp nằm trong chi tiết cuộc họp. Không có API tổng hợp “recent feedback/action items” đa cuộc họp nên workspace không tự suy diễn một hàng đợi mới.</p>
    </main>
  )
}

function WorkspaceLink({ area, routeBase }: { area: WorkspaceArea; routeBase: string }) {
  const to = area.path.startsWith('/') ? area.path : `${routeBase}/${area.path}`
  return <Link className="group min-w-0 border-b border-hairline px-5 py-4 last:border-b-0 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:odd:border-r lg:[&:nth-child(3n)]:border-r-0" to={to}><span className="block break-words font-semibold text-slate-900 group-hover:text-primary">{area.title}</span><span className="mt-1 block break-words text-sm leading-6 text-slate-600">{area.description}</span><span className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">Mở vùng này</span></Link>
}

function AttentionItem<T>({ title, link, resource, render }: { title: string; link: string; resource: SupervisorOperationalResource<T>; render: (data: T) => string }) {
  const content = resource.state === 'loading' ? 'Đang tải…' : resource.state === 'error' ? resource.message : render(resource.data)
  return <div className="min-w-0 px-5 py-4 sm:px-6"><p className="text-xs font-medium text-slate-600">{title}</p>{resource.state === 'error' ? <p role="alert" className="mt-1 break-words text-sm leading-6 text-status-error-text">{content}</p> : <Link className="mt-1 inline-flex min-h-11 items-center break-words text-sm font-semibold leading-6 text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" to={link}>{content}</Link>}</div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="px-5 py-4 sm:px-6"><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</dd></div>
}

function ResourceMetric<T>({ label, resource, render }: { label: string; resource: SupervisorOperationalResource<T>; render: (data: T) => string }) {
  return <div className="px-5 py-4 sm:px-6"><dt className="text-xs text-slate-600">{label}</dt><dd className={resource.state === 'error' ? 'mt-1 break-words text-sm text-status-error-text' : 'mt-1 break-words text-sm font-semibold text-slate-900'}>{resource.state === 'loading' ? 'Đang tải…' : resource.state === 'error' ? resource.message : render(resource.data)}</dd></div>
}
