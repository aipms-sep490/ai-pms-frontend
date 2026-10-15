import { useEffect, useState } from 'react'
import { useStudentJourney } from '../../app/context'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/PageLoading'
import type { PagedResult } from '../../types/backend'
import { getWeeklyAssessmentHistory, type WeeklyAssessment } from '../../services/api/weekly.api'
import { formatScore } from '../../components/ui/format'
import { WeeklyBadge } from './weekly-ui'
import { formatCalendarDate } from './weekly-types'
import { CollaborationIntro, CollaborationPager, collaborationDate, collaborationError } from '../student-collaboration/collaboration-ui'

export function StudentWeeklyAssessmentsPage() {
  const journey = useStudentJourney()
  return <WorkspacePage title="Phản hồi hằng tuần" eyebrow="Hành trình của bạn" description="Nhìn lại đóng góp, nhận xét và những điều có thể làm tốt hơn trong tuần tới.">
    {journey.project && journey.profile ? <div className="collab"><CollaborationIntro icon="insights" title="Theo dõi sự tiến bộ của bạn">Chỉ hiển thị bản đã được giảng viên gửi. Điểm theo dõi là tham khảo, không cộng vào kết quả chính thức.</CollaborationIntro>
      <WeeklyAssessmentHistory key={`${journey.project.id}:${journey.profile.id}`} projectId={journey.project.id} studentId={journey.profile.id} studentOnly />
    </div> : <p>Chưa có đồ án để xem phản hồi hằng tuần.</p>}
  </WorkspacePage>
}

export function WeeklyAssessmentHistory({ projectId, studentId, weekNumber, studentOnly = false }: {
  projectId: number; studentId: number; weekNumber?: number; studentOnly?: boolean
}) {
  const [page, setPage] = useState(1), [data, setData] = useState<PagedResult<WeeklyAssessment> | null>(null)
  const [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError('')
    void getWeeklyAssessmentHistory(projectId, { studentId, weekNumber }, page, 10, abort.signal).then(result => {
      if (abort.signal.aborted) return
      if (result.items.some(row => row.projectId !== projectId || row.studentId !== studentId || (studentOnly && row.status !== 'SUBMITTED'))) throw new Error('Weekly history scope mismatch')
      setData(result)
    }).catch(reason => { if (!abort.signal.aborted) setError(collaborationError(reason)) })
    return () => abort.abort()
  }, [projectId, studentId, weekNumber, page, retry, studentOnly])
  return <section className="collab collab-card"><div className="collab-row"><h2>Lịch sử phản hồi</h2>{data && <span className="collab-muted">{data.totalCount} phiên bản</span>}</div>
    {error ? <p className="collab-error" role="alert">{error} <Button variant="ghost" onClick={() => setRetry(value => value + 1)}>Tải lại</Button></p> : !data ? <PageLoading /> : <>
      {!data.items.length && <p className="collab-empty">Chưa có phản hồi được gửi cho khoảng thời gian này.</p>}
      <div className="collab-history">{data.items.map(row => <details key={row.id} open={data.items.length === 1 || undefined}>
        <summary>Tuần {row.weekNumber} · Phiên bản {row.version} · {formatCalendarDate(row.startDate)} – {formatCalendarDate(row.endDate)}</summary>
        <div className="collab-stack"><div className="collab-row"><WeeklyBadge status={row.status} /><span className="collab-muted">{row.rubricName} · rubric v{row.rubricVersion}</span></div>
          <div className="collab-note">Điểm tham khảo: <strong>{row.totalScore == null ? 'Chưa đủ điểm' : formatScore(row.totalScore)}</strong> · Gửi lúc {collaborationDate(row.submittedAt)}</div>
          <div className="collab-score-grid">{row.scores.map(score => <section className="collab-score" key={score.rubricCriterionId}><h3>{score.name}</h3><strong>{score.score == null ? 'Chưa chấm' : formatScore(score.score)}</strong><span className="collab-muted"> / {score.maxScore}</span>{score.comments && <p className="whitespace-pre-wrap">{score.comments}</p>}</section>)}</div>
          {row.comments && <p className="whitespace-pre-wrap">{row.comments}</p>}
          {row.revisionReason && <p className="collab-muted">Lý do tạo phiên bản: {row.revisionReason}</p>}
        </div>
      </details>)}</div><CollaborationPager page={page} total={data.totalCount} onChange={setPage} />
    </>}
  </section>
}
