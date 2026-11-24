import { useStudentJourney } from '../../app/context'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { WorkingAgreementWorkspace } from './WorkingAgreementWorkspace'

export function ProjectWorkingAgreementPage() {
  const journey = useStudentJourney()
  return (
    <WorkspacePage title="Cam kết làm việc nhóm" eyebrow="Thỏa thuận nhóm" description="Một thỏa thuận rõ ràng để cả nhóm cùng tiến về phía trước." className="space-y-5">
      {journey.project ? (
        <WorkingAgreementWorkspace key={journey.project.id} projectId={journey.project.id} />
      ) : (
        <p className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted shadow-xs">
          Không tìm thấy đồ án để xem cam kết nhóm.
        </p>
      )}
    </WorkspacePage>
  )
}
