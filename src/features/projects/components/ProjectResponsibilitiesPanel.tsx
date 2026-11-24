import { useEffect, useState } from 'react'
import { getProjectResponsibilities, type ResponsibilityList } from '../api/discipline-governance-api'
import type { ProjectMajorDto } from '../../../types/backend'
import { Button } from '../../../components/ui/Button'

export function ProjectResponsibilitiesPanel({ projectId, majors }: { projectId: number; majors: ProjectMajorDto[] }) {
  const [rows, setRows] = useState<Array<{ major: ProjectMajorDto; data: ResponsibilityList | null }>>([]), [loading, setLoading] = useState(true), [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true; setLoading(true)
    Promise.all(majors.map(async major => ({ major, data: await getProjectResponsibilities(projectId, major.majorId).catch(() => null) }))).then(items => { if (active) { setRows(items); setLoading(false) } })
    return () => { active = false }
  }, [projectId, majors, retry])
  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="responsibilities-title">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
        <div>
          <h2 id="responsibilities-title" className="text-base font-bold text-ink">Trách nhiệm theo chuyên ngành</h2>
          <p className="mt-0.5 text-xs text-ink-muted">Phân công được lưu cùng hồ sơ đồ án để cả nhóm theo dõi.</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
          {majors.length} ngành
        </span>
      </div>
      <div className="space-y-4 p-5">
        {loading ? (
          <p role="status" className="text-sm text-ink-muted">Đang tải phân công…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-muted">Chưa có chuyên ngành được gán cho hồ sơ này.</p>
        ) : (
          rows.map(({ major, data }) => (
            <div key={major.majorId} className="border-t border-hairline pt-3 first:border-t-0 first:pt-0">
              <h3 className="text-sm font-semibold text-ink">{major.majorName || major.majorCode}</h3>
              {data ? (
                data.items.length ? (
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
                    {[...data.items].sort((a, b) => a.sortOrder - b.sortOrder).map(item => <li key={item.id}>{item.content}</li>)}
                  </ol>
                ) : (
                  <p className="mt-2 text-sm text-ink-muted">Chưa có phân công được lưu cho chuyên ngành này.</p>
                )
              ) : (
                <p role="alert" className="mt-2 text-sm text-status-error-text">Chưa tải được phân công.</p>
              )}
            </div>
          ))
        )}
        {rows.some(row => !row.data) && <Button variant="secondary" className="min-h-11" onClick={() => setRetry(value => value + 1)}>Thử lại</Button>}
      </div>
    </section>
  )
}
