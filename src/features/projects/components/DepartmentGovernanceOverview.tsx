import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { displayLabel } from '../../../components/ui/display-label'
import type { ProjectGovernance } from '../api/project-governance-api'

// Display the service's conclusions; readiness never grants a mutation permission.
const blockerLabels: Record<string, string> = {
  ACADEMIC_SCOPE_UNKNOWN: 'Chưa xác minh được phạm vi khoa và ngành của hồ sơ đăng ký.',
  PRIMARY_SUPERVISOR_REQUIRED: 'Cần có giảng viên hướng dẫn chính.',
  PROJECT_READ_ONLY: 'Đồ án đã kết thúc; dữ liệu chỉ được xem.',
  RESULT_NOT_READY: 'Kết quả chưa đủ điều kiện để xem xét công bố.',
  RESULT_PUBLICATION_FORBIDDEN: 'Tài khoản hiện tại chưa có quyền công bố kết quả này.',
  ADMIN_REQUIRED_FOR_CROSS_DEPARTMENT_PUBLICATION: 'Kết quả xuyên khoa cần quản trị viên công bố.',
}
const publicationLabel = (value?: string | null) => value === 'NOT_PUBLISHED' ? 'Chưa công bố' : value ? displayLabel(value) : 'Chưa có'
const linkClass = 'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:bg-primary-subtle'

export function DepartmentGovernanceOverview({ governance: data }: { governance: ProjectGovernance }) {
  const base = `/department/projects/${data.projectId}`
  const knownScope = ['FROZEN_REGISTRATION_SNAPSHOT', 'CURRENT_CONFIGURATION'].includes(data.academicScopeProvenance ?? '')
  const scopeLabel = data.academicScopeProvenance === 'FROZEN_REGISTRATION_SNAPSHOT' ? 'Đã khóa theo hồ sơ đăng ký' : data.academicScopeProvenance === 'CURRENT_CONFIGURATION' ? 'Cấu hình hiện tại của bản nháp' : 'Chưa xác minh'
  const steps = [
    { title: 'Bàn giao cuối kỳ', ready: data.readiness?.canSubmitFinal, status: publicationLabel(data.finalSubmissionStatus), to: `${base}/final-submission`, link: 'Xem hồ sơ bàn giao' },
    { title: 'Đánh giá đồ án', ready: data.readiness?.canEvaluate, status: data.evaluators ? `${data.evaluators.length} phân công người chấm` : 'Chưa có dữ liệu phân công', to: `${base}/evaluation-schemes`, link: 'Kiểm tra phương án đánh giá' },
    { title: 'Công bố kết quả', ready: data.readiness?.canPublishResult, status: publicationLabel(data.resultPublicationStatus), to: `${base}/result`, link: 'Xem preview và kết quả' },
  ]
  return <section className="workspace-surface space-y-5 p-4 sm:p-6" aria-labelledby="governance-overview-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hồ sơ điều hành</p><h2 id="governance-overview-title" className="mt-1 font-heading text-lg font-semibold text-slate-900">Phạm vi học thuật và điều kiện đánh giá</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Đối chiếu phạm vi khoa, hồ sơ bàn giao và kết quả trước khi xử lý. Điều kiện sẵn sàng không thay thế quyền thao tác trên từng màn hình.</p></div><Badge variant={knownScope ? 'info' : 'warning'} className="text-xs">{scopeLabel}</Badge></div>
    <dl className="grid gap-4 rounded-lg border border-hairline bg-canvas p-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
      <div><dt className="text-slate-500">Khoa chủ trì</dt><dd className="mt-1 break-words font-semibold">{data.leadDepartment?.name ?? 'Chưa xác định'}</dd></div>
      <div><dt className="text-slate-500">Khoa tham gia</dt><dd className="mt-1 break-words">{data.participatingDepartments?.map(item => item.name).join(', ') || 'Chưa có dữ liệu'}</dd></div>
      <div><dt className="text-slate-500">Phạm vi tài khoản</dt><dd className="mt-1">{data.actorScope.isAdmin ? 'Quản trị viên' : data.actorScope.departmentId ? `Khoa #${data.actorScope.departmentId}` : 'Chưa xác định'}{data.actorScope.majorIds?.length ? ` · ${data.actorScope.majorIds.length} ngành` : ''}</dd></div>
      <div><dt className="text-slate-500">Hướng dẫn chính</dt><dd className="mt-1">{data.readiness ? data.readiness.hasPrimarySupervisor ? 'Đã có phân công' : 'Chưa có phân công' : 'Chưa có kết luận'}</dd></div>
    </dl>
    {data.blockers?.length ? <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text"><h3 className="font-semibold">Điều kiện cần xử lý</h3><ul className="mt-2 list-disc space-y-2 pl-5">{[...new Set(data.blockers)].map(reason => <li className="break-words" key={reason}>{blockerLabels[reason] ?? reason}</li>)}</ul>{!knownScope && <p className="mt-3">Cần người phụ trách kiểm tra hồ sơ đăng ký và phạm vi khoa/ngành. Các thao tác học thuật vẫn bị khóa theo quyền hiện tại.</p>}</div> : null}
    <div className="grid gap-3 lg:grid-cols-3">{steps.map(step => <article key={step.title} className="flex flex-col items-start gap-3 rounded-lg border border-hairline p-4"><h3 className="font-semibold">{step.title}</h3><p className="break-words text-sm text-slate-600">{step.status}</p><Badge variant={step.ready === true ? 'success' : 'neutral'} className="text-xs">{step.ready === undefined ? 'Chưa có kết luận' : step.ready ? 'Đủ điều kiện theo kiểm tra hiện tại' : 'Chưa sẵn sàng'}</Badge><Link className={`${linkClass} mt-auto`} to={step.to}>{step.link}</Link></article>)}</div>
    <div className="flex flex-wrap gap-2 border-t border-hairline pt-3"><Link to={`/department/projects/review/${data.projectId}`} className={linkClass}>Đối chiếu hồ sơ thẩm định</Link><Link to={`${base}/evaluators`} className={linkClass}>Xem phân công người chấm</Link></div>
  </section>
}
