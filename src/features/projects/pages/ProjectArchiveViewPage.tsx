import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HttpError } from '../../../services/http/http-client'
import { getArchiveView } from '../api/archive-project'
import type { ProjectDto, ProjectStatusHistoryDto } from '../../../types/backend'
import { projectStatusLabel } from '../utils/project-status'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'

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

  return (
    <WorkspacePage
      size="standard"
      className="space-y-5 pb-12"
      eyebrow="Đồ án lưu trữ"
      title="Hồ sơ đồ án lưu trữ"
      description="Trang này hiển thị hồ sơ lưu trữ ở chế độ chỉ đọc và không cung cấp thao tác chỉnh sửa."
      backTo="/department/projects/archived"
      backLabel="Kho lưu trữ"
      action={<Button variant="secondary" icon="refresh" disabled={loading} onClick={() => void load()}>Tải lại</Button>}
    >
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
        <>
          <section className="rounded-xl border border-status-success-border bg-status-success-bg p-5 space-y-2">
            <StatusBadge tone="neutral" label={projectStatusLabel(data.project.status)} />
            <h2 className="font-heading text-xl font-bold text-ink">{data.project.code} · {data.project.title}</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-ink-soft">{data.project.description || 'Hệ thống chưa có mô tả đồ án.'}</p>
          </section>
          <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
            <h2 className="font-heading text-lg font-semibold text-ink">Lịch sử trạng thái</h2>
            {data.history.length ? (
              <ol className="mt-4 divide-y divide-hairline">
                {data.history.map((item) => (
                  <li key={item.id} className="py-3 text-sm">
                    <p className="font-semibold text-ink">{item.oldStatus ? projectStatusLabel(item.oldStatus) : 'Khởi tạo'} → {projectStatusLabel(item.newStatus)}</p>
                    <p className="mt-1 text-ink-muted">{item.changedByName || 'Hệ thống'}{item.reason ? ` · ${item.reason}` : ''}</p>
                    <time className="mt-1 block font-mono text-xs text-ink-muted">{new Date(item.changedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">Chưa có lịch sử thay đổi trạng thái.</p>
            )}
          </section>
        </>
      )}
    </WorkspacePage>
  )
}
