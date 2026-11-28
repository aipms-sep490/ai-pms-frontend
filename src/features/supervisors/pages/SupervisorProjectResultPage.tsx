import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { InlineAlert } from '../../../components/ui/InlineAlert'
import { ListLoading } from '../../../components/ui/ListLoading'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { getProjectResult, getProjectStudentResults } from '../../../services/api/project-results.api'
import { HttpError } from '../../../services/http/http-client'
import { useExecutionAccess } from '../../execution/context/ExecutionAccessContext'
import { ProjectResultBreakdown } from '../../results/ProjectResultBreakdown'
import type { ProjectResult, StudentResult } from '../../results/result-types'

const outcomeLabel = (value: string | null | undefined) =>
  ({ PASSED: 'Đạt', PASS: 'Đạt', FAILED: 'Chưa đạt', FAIL: 'Chưa đạt' }[value ?? ''] ?? value ?? 'Chưa công bố')

const outcomeDetailLabel = (value: string | null | undefined) => {
  switch (value) {
    case 'PASSED': return 'Đạt toàn bộ điều kiện POL-01'
    case 'FAILED_TOTAL': return 'Chưa đạt tổng điểm tối thiểu'
    case 'FAILED_COMPONENT_FLOOR': return 'Có thành phần dưới ngưỡng điểm liệt (< 4.00)'
    case 'DEFENSE_ABSENT': return 'Vắng bảo vệ (DEFENSE_ABSENT)'
    default: return value ?? ''
  }
}

/** Read-only published result overview for the active Primary Supervisor (TK-W3-11, N6 compliant). */
export function SupervisorProjectResultPage() {
  const { project, team, routeBase } = useExecutionAccess()
  const [projectResult, setProjectResult] = useState<ProjectResult | null>(null)
  const [studentResults, setStudentResults] = useState<StudentResult[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [projRes, studRes] = await Promise.all([
        getProjectResult(project.id),
        getProjectStudentResults(project.id),
      ])
      setProjectResult(projRes)
      setStudentResults(studRes)
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 403) {
        setError('Bạn chỉ có quyền xem kết quả đã công bố cho đồ án mà mình là GVHD Chính.')
      } else {
        setError('Không thể tải kết quả công bố của đồ án. Vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }, [project.id])

  useEffect(() => { void load() }, [load])

  const studentNameMap = Object.fromEntries((team?.members ?? []).map(m => [m.userId, m.fullName]))
  const majorNameMap = Object.fromEntries((project.majors ?? []).map(m => [m.majorId, m.majorName]))
  const isPublished = Boolean(projectResult || (studentResults && studentResults.length > 0))

  return (
    <WorkspacePage
      size="wide"
      className="space-y-5 pb-12"
      title="Kết quả công bố của nhóm"
      eyebrow={`Giảng viên hướng dẫn chính · ${project.code}`}
      backTo={`${routeBase}/workspace`}
      backLabel="Tổng quan đồ án"
      description={`${project.title} · Theo dõi điểm tổng kết và kết quả cá nhân sau khi Khoa đã công bố chính thức.`}
      action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Làm mới" disabled={loading} onClick={() => void load()} />}
    >
      {error && <InlineAlert tone="error">{error}</InlineAlert>}
      {loading && <ListLoading label="Đang tải kết quả công bố…" />}

      {!loading && !error && !isPublished && (
        <section className="rounded-xl border border-hairline bg-card p-6 text-center shadow-xs space-y-2">
          <span className="material-symbols-outlined text-4xl text-ink-muted" aria-hidden="true">lock_clock</span>
          <h2 className="text-base font-semibold text-ink">Kết quả chưa được công bố chính thức</h2>
          <p className="text-sm text-ink-muted">
            Theo quy định bảo mật điểm N6, điểm chấm nguội và điểm hội đồng chỉ hiển thị sau khi Khoa chủ trì hoàn tất công bố (PUBLISHED).
          </p>
        </section>
      )}

      {!loading && !error && projectResult && (
        <>
          <StatTileRow
            tiles={[
              { icon: 'score', label: 'Điểm tổng kết đồ án', value: projectResult.totalScore, hero: true, caption: `Phiên bản công bố v${projectResult.version}` },
              { icon: 'rule', label: 'Ngưỡng đạt', value: projectResult.passThreshold, tone: 'info' },
              { icon: 'verified', label: 'Kết luận đồ án', value: outcomeLabel(projectResult.outcome), tone: projectResult.outcome.toUpperCase().startsWith('PASS') ? 'success' : 'warning', caption: outcomeDetailLabel(projectResult.outcomeDetail) || undefined },
              { icon: 'group', label: 'Sinh viên có kết quả', value: studentResults?.length ?? 0, tone: 'neutral' },
            ]}
          />
          <ProjectResultBreakdown majorNames={majorNameMap} breakdown={projectResult.breakdown} contributions={projectResult.contributions} />
        </>
      )}

      {!loading && !error && studentResults && studentResults.length > 0 && (
        <section className="space-y-4" aria-label="Bảng điểm cá nhân đã công bố">
          <h2 className="font-heading text-base font-bold text-ink">Kết quả cá nhân từng sinh viên</h2>
          <div className="space-y-4">
            {studentResults.map(item => (
              <article key={item.id} className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      {studentNameMap[item.studentId] ?? `Sinh viên #${item.studentId}`}
                      {majorNameMap[item.majorId] ? ` · ${majorNameMap[item.majorId]}` : ''}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Phiên bản v{item.version} · Ngưỡng đạt {item.passThreshold}
                      {item.outcomeDetail ? ` · ${outcomeDetailLabel(item.outcomeDetail)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-ink">{item.totalScore}</span>
                    <StatusBadge
                      tone={item.outcome.toUpperCase().startsWith('PASS') ? 'success' : 'danger'}
                      label={outcomeLabel(item.outcome)}
                    />
                  </div>
                </div>
                {item.breakdown && (
                  <ProjectResultBreakdown target="student" majorNames={majorNameMap} breakdown={item.breakdown} />
                )}
                {item.breakdown?.publishedFeedback && item.breakdown.publishedFeedback.length > 0 && (
                  <div className="rounded-lg border border-hairline bg-canvas p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-ink">Nhận xét đã công bố</p>
                    <ul className="space-y-1 text-xs text-ink-soft">
                      {item.breakdown.publishedFeedback.map((fb, idx) => (
                        <li key={idx}>
                          <strong>{fb.source}:</strong> {fb.comments}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </WorkspacePage>
  )
}
