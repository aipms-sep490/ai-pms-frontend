import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getArchiveView } from '../api/archive-project'
import type { ProjectDto, ProjectStatusHistoryDto } from '../../../types/backend'
import { projectStatusLabel } from '../utils/project-status'
import { Pagination, StatusBadge, useClientPagination } from '../../../components/ui'

export function ProjectArchiveViewPage() {
  const id = Number(useParams().projectId)
  const [data, setData] = useState<{ project: ProjectDto; history: ProjectStatusHistoryDto[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setError('Đường dẫn đồ án không hợp lệ.')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [project, history] = await getArchiveView(id)
      if (project.status.replaceAll('_', '').toUpperCase() !== 'ARCHIVED') {
        setError('Đồ án này chưa được lưu trữ.')
        setData(null)
      } else {
        setData({ project, history: [...history].sort((a, b) => Date.parse(b.changedAt) - Date.parse(a.changedAt)) })
        setError(null)
      }
    } catch (reason) {
      setError(
        reason instanceof HttpError && reason.status === 403
          ? 'Hệ thống không cấp quyền xem đồ án lưu trữ này.'
          : reason instanceof HttpError && reason.status === 404
            ? 'Không tìm thấy đồ án lưu trữ.'
            : 'Không thể tải dữ liệu lưu trữ từ hệ thống.',
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  const historyPagination = useClientPagination(data?.history ?? [], 8)

  return (
    <div className="workspace-page flex flex-col gap-5 pb-10">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <span className="workspace-kicker">Đồ án lưu trữ</span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">Hồ sơ đồ án lưu trữ</h1>
          <p className="max-w-3xl text-sm text-ink-muted">Trang này không cung cấp bất kỳ thao tác thay đổi nào.</p>
        </div>
        <Link
          to="/department/projects/archived"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-card px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
          Kho lưu trữ
        </Link>
      </header>

      {loading && (
        <p role="status" className="rounded-xl border border-hairline bg-card p-5 text-sm text-ink-muted">
          Đang tải hồ sơ lưu trữ…
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

      {data && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs xl:col-span-8">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <div className="min-w-0">
                <p className="font-mono text-xs font-bold text-primary">{data.project.code}</p>
                <h2 className="mt-0.5 font-heading text-xl font-bold text-ink">{data.project.title}</h2>
              </div>
              <StatusBadge status={data.project.status} tone="neutral" label={projectStatusLabel(data.project.status)} />
            </div>

            <dl className="grid gap-px bg-hairline sm:grid-cols-3">
              <div className="bg-card px-5 py-3.5">
                <dt className="text-xs font-medium text-ink-muted">Nhóm thực hiện</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{data.project.teamName || 'Chưa có thông tin'}</dd>
              </div>
              <div className="bg-card px-5 py-3.5">
                <dt className="text-xs font-medium text-ink-muted">Chuyên ngành</dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {(data.project.majors ?? []).map((major) => major.majorCode || major.majorName).join(', ') || 'Chưa có thông tin'}
                </dd>
              </div>
              <div className="bg-card px-5 py-3.5">
                <dt className="text-xs font-medium text-ink-muted">Cập nhật gần nhất</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-ink">
                  {data.project.updatedAt ? new Date(data.project.updatedAt).toLocaleString('vi-VN') : 'Chưa có thông tin'}
                </dd>
              </div>
            </dl>

            <div className="grid gap-5 border-t border-hairline p-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Mô tả đồ án</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">
                  {data.project.description || 'Hệ thống chưa có mô tả đồ án.'}
                </p>
              </div>
              {data.project.objectives && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Mục tiêu</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{data.project.objectives}</p>
                </div>
              )}
              {data.project.expectedOutput && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Sản phẩm dự kiến</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{data.project.expectedOutput}</p>
                </div>
              )}
            </div>
          </section>

          <aside className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs xl:col-span-4">
            <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <h2 className="font-heading text-base font-bold text-ink">Lịch sử trạng thái</h2>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                {data.history.length}
              </span>
            </div>
            <div className="p-5">
              {data.history.length ? (
                <>
                  <ol className="divide-y divide-hairline">
                    {historyPagination.paginatedItems.map((item) => (
                      <li key={item.id} className="py-3 text-sm first:pt-0 last:pb-0">
                        <p className="font-semibold text-ink">
                          {item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {item.changedByName || 'Hệ thống'}{item.reason ? ` · ${item.reason}` : ''}
                        </p>
                        <time className="mt-1 block font-mono text-xs text-ink-muted">
                          {new Date(item.changedAt).toLocaleString('vi-VN')}
                        </time>
                      </li>
                    ))}
                  </ol>
                  {historyPagination.showPagination && (
                    <div className="mt-4 border-t border-hairline pt-3">
                      <Pagination
                        page={historyPagination.page}
                        pages={historyPagination.totalPages}
                        total={historyPagination.total}
                        pageSize={historyPagination.pageSize}
                        pageSizeOptions={[8, 16, 30]}
                        onPage={historyPagination.setPage}
                        onPageSizeChange={historyPagination.setPageSize}
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-muted">Chưa có lịch sử thay đổi trạng thái.</p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
