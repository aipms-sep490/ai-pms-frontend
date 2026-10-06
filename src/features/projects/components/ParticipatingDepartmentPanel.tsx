import { displayLabel } from '../../../components/ui/display-label'
import { Button } from '../../../components/ui/Button'
import type { DepartmentDecision } from '../api/project-review-api'
import type { AcademicNameResolver } from './academic-name-resolver'

interface ParticipatingDepartmentPanelProps {
  mode: string
  snapshotId?: number
  departmentIds: readonly number[]
  decisions: readonly DepartmentDecision[]
  names: AcademicNameResolver
  canApprove: boolean
  canReject: boolean
  pending: boolean
  onDecide: (decision: 'APPROVED' | 'REJECTED') => void
}

export function ParticipatingDepartmentPanel({
  mode, snapshotId, departmentIds, decisions, names, canApprove, canReject, pending, onDecide,
}: ParticipatingDepartmentPanelProps) {
  if (mode !== 'INTERDISCIPLINARY') return null
  const decisionByDepartment = new Map(decisions.map((decision) => [decision.departmentId, decision]))
  const participatingIds = departmentIds.length ? departmentIds : decisions.map((decision) => decision.departmentId)
  return (
    <section aria-labelledby="participating-department-heading">
      <h2 id="participating-department-heading">Ý kiến các bộ môn tham gia</h2>
      <p className="text-sm text-slate-600">Bản đề cương #{snapshotId ?? 'chưa xác định'} đã nộp. Bạn phản hồi với tư cách bộ môn được phân công.</p>
      {participatingIds.length ? <ul className="mt-3 space-y-2">{participatingIds.map((departmentId) => {
        const decision = decisionByDepartment.get(departmentId)
        return <li key={departmentId} className="rounded-lg border border-slate-200 p-3 text-sm">
          <strong>{names.department(departmentId)}</strong>
          <span className="ml-2 font-semibold">{displayLabel(decision?.decision ?? 'PENDING')}</span>
          {decision?.decidedBy ? <p className="mt-1 text-slate-600">Người thẩm định #{decision.decidedBy}</p> : null}
          {decision?.decidedAt ? <p className="mt-1 text-slate-600">Thẩm định lúc: {new Date(decision.decidedAt).toLocaleString('vi-VN')}</p> : null}
          {decision?.reason ? <p className="mt-1 text-slate-600">Lý do: {decision.reason}</p> : null}
        </li>
      })}</ul> : <p className="mt-2 text-sm text-slate-600">Chưa có bộ môn tham gia thẩm định bản đề cương này.</p>}
      {snapshotId && (canApprove || canReject) ? <div className="mt-3 flex flex-wrap gap-2">
        {canApprove ? <Button disabled={pending} onClick={() => onDecide('APPROVED')}>Chấp thuận đề cương</Button> : null}
        {canReject ? <Button variant="danger" disabled={pending} onClick={() => onDecide('REJECTED')}>Không chấp thuận</Button> : null}
      </div> : null}
    </section>
  )
}
