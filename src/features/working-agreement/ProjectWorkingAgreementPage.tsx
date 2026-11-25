import { useState } from 'react'
import { useStudentJourney } from '../../app/context'
import { Button } from '../../components/ui/Button'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { WorkingAgreementWorkspace } from './WorkingAgreementWorkspace'

export function ProjectWorkingAgreementPage() {
  const journey = useStudentJourney()
  const [refreshSignal, setRefreshSignal] = useState(0)
  return (
    <WorkspacePage
      title="Cam kết làm việc nhóm"
      eyebrow="Thỏa thuận nhóm"
      description="Một thỏa thuận rõ ràng để cả nhóm cùng tiến về phía trước."
      action={
        journey.project ? (
          <Button
            variant="secondary"
            size="sm"
            icon="refresh"
            aria-label="Làm mới"
            title="Làm mới"
            onClick={() => setRefreshSignal(value => value + 1)}
          />
        ) : undefined
      }
    >
      {journey.project ? (
        <WorkingAgreementWorkspace key={journey.project.id} projectId={journey.project.id} refreshSignal={refreshSignal} />
      ) : (
        <p className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">Không tìm thấy đồ án để xem cam kết nhóm.</p>
      )}
    </WorkspacePage>
  )
}
