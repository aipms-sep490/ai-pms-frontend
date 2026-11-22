import { displayLabel } from '../../../components/ui/display-label'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getWorkspaceRole } from '../../auth/utils/role-access'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getPortfolioDashboard, type PortfolioDashboard } from '../../dashboard/api/dashboard-api'
import { HttpError } from '../../../services/http/http-client'
import { BackLink } from '../../../components/ui/BackLink'
import { buttonClassName } from '../../../components/ui/button-styles'

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
    <div className="workspace-page mx-auto max-w-6xl space-y-5 pb-12">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <span className="workspace-kicker">
            {scope === 'admin' ? 'Phạm vi quản trị' : 'Phạm vi bộ môn'}
          </span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">Kho lưu trữ đồ án</h1>
          <p className="max-w-3xl text-sm leading-6 text-ink-muted">
            Tra cứu các đồ án đã đưa vào kho. Nội dung chỉ được xem và hiển thị theo quyền của tài khoản hiện tại.
          </p>
        </div>
        <BackLink fallback={scope === 'admin' ? '/admin/portfolio' : '/department/portfolio'} className={buttonClassName({ variant: 'secondary', className: 'min-h-11' })}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>Quay lại danh mục
        </BackLink>
      </header>

      {loading && (
        <p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">
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
          <p className="text-sm font-medium text-ink-soft">{data.projects.totalCount} đồ án đã lưu trữ trong phạm vi hiện tại.</p>
          {data.projects.items.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-hairline bg-canvas p-6 text-center text-sm text-ink-muted">
              Chưa có đồ án nào được chuyển vào kho lưu trữ trong phạm vi của bạn.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline">
              {data.projects.items.map((project) => (
                <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{project.code} · {project.title}</p>
                    <p className="mt-1 text-sm text-ink-muted">Trạng thái: {displayLabel(project.status)}</p>
                  </div>
                  <Link to={`/department/projects/${project.id}/archive-view`} className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'min-h-11' })}>
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">visibility</span>Xem chi tiết
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
