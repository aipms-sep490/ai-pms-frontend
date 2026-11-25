import { useEffect, useState } from 'react'
import { getProjectResponsibilities, type ResponsibilityList } from '../api/discipline-governance-api'
import type { ProjectMajorDto } from '../../../types/backend'
import { Button } from '../../../components/ui/Button'

export function ProjectResponsibilitiesPanel({
  projectId,
  majors,
  className = '',
}: {
  projectId: number
  majors: ProjectMajorDto[]
  className?: string
}) {
  const [rows, setRows] = useState<Array<{ major: ProjectMajorDto; data: ResponsibilityList | null }>>([]), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true; setLoading(true)
    Promise.all(majors.map(async major => ({ major, data: await getProjectResponsibilities(projectId, major.majorId).catch(() => null) }))).then(items => { if (active) { setRows(items); setLoading(false) } })
    return () => { active = false }
  }, [projectId, majors, retry])
  return (
    <section className={`workspace-surface flex flex-col gap-4 p-5 sm:p-6 ${className}`.trim()} aria-labelledby="responsibilities-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-3">
        <div>
          <h2 id="responsibilities-title" className="text-base font-bold text-ink">Trách nhiệm theo chuyên ngành</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Phân công được lưu cùng hồ sơ đồ án để cả nhóm theo dõi.</p>
        </div>
        {majors.length > 0 && (
          <span className="rounded-full border border-hairline bg-canvas px-2.5 py-0.5 font-mono text-xs font-semibold text-ink-soft">
            {majors.length} chuyên ngành
          </span>
        )}
      </div>
      {loading ? (
        <p role="status" className="text-sm text-ink-muted">Đang tải phân công…</p>
      ) : (
        <div className={`grid flex-1 gap-3.5 ${rows.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
          {rows.map(({ major, data }) => (
            <div key={major.majorId} className="flex flex-col rounded-xl border border-hairline/90 bg-canvas/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">{major.majorName || major.majorCode}</h3>
                {data && (
                  <span className="shrink-0 rounded-full border border-hairline bg-card px-2 py-0.5 font-mono text-xs font-semibold text-ink-muted">
                    {data.items.length} mục
                  </span>
                )}
              </div>
              {data ? (
                data.items.length ? (
                  <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
                    {[...data.items].sort((a, b) => a.sortOrder - b.sortOrder).map(item => (
                      <li key={item.id}>{item.content}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">Chưa có phân công được lưu cho chuyên ngành này.</p>
                )
              ) : (
                <p role="alert" className="mt-2.5 text-xs text-status-error-text">Chưa tải được phân công.</p>
              )}
            </div>
          ))}
        </div>
      )}
      {rows.some(row => !row.data) && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setRetry(value => value + 1)}>Thử lại</Button>
        </div>
      )}
    </section>
  )
}
