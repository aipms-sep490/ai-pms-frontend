import { displayLabel } from '../../../components/ui/display-label'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkspaceRole } from '../../auth/utils/role-access'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getPortfolioDashboard, type PortfolioDashboard } from '../../dashboard/api/dashboard-api'
import { HttpError } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'

export function ArchivedProjectsPage() {
  const { session } = useAuthSession()
  const scope = getWorkspaceRole(session?.user) === 'admin' ? 'admin' : 'department'
  const [data, setData] = useState<PortfolioDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getPortfolioDashboard(scope, { status: 'ARCHIVED', page: 1, pageSize: 100 }))
      setError(null)
    } catch (reason) {
      setError(
        reason instanceof HttpError && reason.status === 403
          ? 'Bạn chưa có quyền xem kho lưu trữ này.'
          : 'Không thể tải danh sách lưu trữ. Vui lòng thử lại.'
      )
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="workspace-page mx-auto max-w-6xl space-y-5 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">
            {scope === 'admin' ? 'Phạm vi quản trị' : 'Phạm vi bộ môn'}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold text-slate-950">Kho lưu trữ đồ án</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Tra cứu các đồ án đã đưa vào kho. Nội dung chỉ được xem và hiển thị theo quyền của tài khoản hiện tại.
          </p>
        </div>
        <Link to="/department/portfolio">
          <Button variant="secondary" icon="arrow_back">Quay lại danh mục</Button>
        </Link>
      </header>

      {loading && (
        <p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-slate-600">
          Đang tải kho lưu trữ…
        </p>
      )}

      {error && (
        <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-5 text-sm text-status-error-text">
          <p>{error}</p>
          <button type="button" className="mt-2 min-h-11 font-semibold underline underline-offset-4" onClick={() => void load()}>
            Tải lại
          </button>
        </section>
      )}

      {!loading && data && (
        <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
          <p className="text-sm font-medium text-slate-700">{data.projects.totalCount} đồ án đã lưu trữ trong phạm vi hiện tại.</p>
          {data.projects.items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Chưa có đồ án nào được chuyển vào kho lưu trữ trong phạm vi của bạn.</p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline">
              {data.projects.items.map((project) => (
                <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-semibold text-slate-950">{project.code} · {project.title}</p>
                    <p className="mt-1 text-sm text-slate-500">Trạng thái: {displayLabel(project.status)}</p>
                  </div>
                  <Link to={`/department/projects/${project.id}/archive-view`}>
                    <Button variant="secondary" size="sm" icon="visibility">Xem chi tiết</Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}
