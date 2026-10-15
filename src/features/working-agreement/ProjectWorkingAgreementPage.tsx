import { useStudentJourney } from '../../app/context'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { WorkingAgreementWorkspace } from './WorkingAgreementWorkspace'

export function ProjectWorkingAgreementPage() {
  const journey = useStudentJourney()
  return <WorkspacePage title="Cam kết làm việc nhóm" eyebrow="Working Agreement" description="Một thỏa thuận rõ ràng để cả nhóm cùng tiến về phía trước.">
    {journey.project ? <WorkingAgreementWorkspace key={journey.project.id} projectId={journey.project.id} /> : <p>Không tìm thấy đồ án để xem cam kết nhóm.</p>}
  </WorkspacePage>
}
