import { useCallback, useEffect, useState } from 'react'
import { env } from '../../../app/config/env'
import { Button } from '../../../components/ui/Button'
import { PageLoading } from '../../../components/ui/PageLoading'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { getTeam } from '../../../services/api/teams.api'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { getStudentReviewTimeline } from '../../review-gates/api/review-gates-api'
import { WeeklyAssessmentHistory } from '../../weekly-assessments/WeeklyAssessmentHistory'
import { IndividualProcessScoringPanel } from '../components/IndividualProcessScoringPanel'

interface GateInstanceRef {
  id: number
  gateNumber: number
  title: string
}

export function IndividualProcessScoringPage() {
  const access = useExecutionAccess()
  const isMentor = access.actor === 'mentor'
  const [gates, setGates] = useState<GateInstanceRef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWeeklyRef, setShowWeeklyRef] = useState(false)
  const [members, setMembers] = useState<Array<{ userId: number; fullName: string }>>(access.team?.members ?? [])
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(access.team?.members?.[0]?.userId ?? null)

  const loadGates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const timeline = await getStudentReviewTimeline(String(access.project.id))
      const mapped = timeline.gates
        .map((gate, index) => ({
          id: Number(gate.gateInstanceId),
          gateNumber: index + 1,
          title: gate.title || gate.code,
        }))
        .filter(g => Number.isSafeInteger(g.id) && g.id > 0)
      setGates(mapped)
    } catch (err) {
      setError(humanizeHttpError(err, 'Không thể tải danh sách cổng kiểm duyệt G1–G3 của đồ án.'))
    } finally {
      setLoading(false)
    }
  }, [access.project.id])

  useEffect(() => {
    void loadGates()
  }, [loadGates])

  useEffect(() => {
    if (isMentor || !env.weeklyAssessmentEnabled) return
    if (access.team?.members?.length) {
      setMembers(access.team.members)
      setSelectedStudentId(prev => prev ?? access.team!.members[0]?.userId ?? null)
      return
    }
    let active = true
    void getTeam(access.project.teamId)
      .then(team => {
        if (!active) return
        setMembers(team.members)
        setSelectedStudentId(prev => prev ?? team.members[0]?.userId ?? null)
      })
      .catch(() => { /* optional weekly reference stays empty */ })
    return () => { active = false }
  }, [isMentor, access.team, access.project.teamId])

  return (
    <WorkspacePage
      size="wide"
      eyebrow={`${isMentor ? 'Mentor chuyên ngành' : 'Giảng viên hướng dẫn'} · ${access.project.code}`}
      backTo={`${access.routeBase}/workspace`}
      backLabel="Tổng quan đồ án"
      title={isMentor ? 'Nhận xét Quá trình Tham khảo (G1–G3)' : 'Điểm Quá trình 20% (G1–G3 · POL-03)'}
      description={
        isMentor
          ? 'Nhập nhận xét tham khảo cho sinh viên thuộc chuyên ngành phụ trách qua các Gate G1–G3 để GVHD Chính đối chiếu khi chốt điểm quá trình.'
          : 'Chấm điểm tổng 0.00–10.00 và nhận xét tích lũy qua 3 Gate G1–G3 cho từng sinh viên. Điểm chốt là bất biến và chiếm 20% điểm tổng kết.'
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          {!isMentor && env.weeklyAssessmentEnabled && (
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={showWeeklyRef}
              onClick={() => setShowWeeklyRef(v => !v)}
            >
              {showWeeklyRef ? 'Ẩn nhận xét tuần tham khảo' : 'Xem nhận xét tuần tham khảo (0%)'}
            </Button>
          )}
          <Button variant="secondary" size="sm" icon="refresh" aria-label="Làm mới" onClick={() => void loadGates()} />
        </div>
      }
    >
      {loading ? (
        <PageLoading label="Đang tải cấu trúc Gate G1–G3 của đồ án..." />
      ) : error ? (
        <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text space-y-2">
          <p>{error}</p>
          <Button size="sm" variant="secondary" onClick={() => void loadGates()}>Thử lại</Button>
        </div>
      ) : gates.length === 0 ? (
        <WorkspaceEmptyState
          title="Đồ án chưa có Gate G1–G3"
          message="Cổng kiểm duyệt G1–G3 chưa được khởi tạo cho đồ án này. Vui lòng kiểm tra lại cấu hình mẫu cổng của kỳ học."
        />
      ) : (
        <div className={showWeeklyRef && !isMentor ? 'grid gap-6 xl:grid-cols-12' : 'space-y-6'}>
          <div className={showWeeklyRef && !isMentor ? 'xl:col-span-8' : undefined}>
            <IndividualProcessScoringPanel projectId={access.project.id} gateInstances={gates} />
          </div>
          {showWeeklyRef && !isMentor && env.weeklyAssessmentEnabled && (
            <aside className="space-y-3 rounded-xl border border-hairline bg-card p-4 xl:col-span-4" aria-label="Nhận xét tuần tham khảo">
              <div>
                <h3 className="text-sm font-bold text-ink">Nhận xét tuần tham khảo (Không tính điểm)</h3>
                <p className="text-xs text-ink-muted">
                  Tùy chọn — 0% điểm chính thức. Đối chiếu tiến độ 15 tuần của từng sinh viên trước khi chốt G1–G3.
                </p>
              </div>
              {members.length > 0 && (
                <label className="block text-xs">
                  <span className="font-semibold text-ink-soft">Chọn sinh viên đối chiếu</span>
                  <select
                    aria-label="Chọn sinh viên đối chiếu nhận xét tuần"
                    value={selectedStudentId ?? ''}
                    onChange={e => setSelectedStudentId(Number(e.target.value) || null)}
                    className="mt-1 min-h-9 w-full rounded-lg border border-hairline bg-card px-2.5 py-1 text-xs text-ink"
                  >
                    {members.map(m => (
                      <option key={m.userId} value={m.userId}>{m.fullName}</option>
                    ))}
                  </select>
                </label>
              )}
              {selectedStudentId != null ? (
                <WeeklyAssessmentHistory projectId={access.project.id} studentId={selectedStudentId} />
              ) : (
                <p className="text-xs text-ink-muted">Chưa tải được danh sách sinh viên của nhóm.</p>
              )}
            </aside>
          )}
        </div>
      )}
    </WorkspacePage>
  )
}
