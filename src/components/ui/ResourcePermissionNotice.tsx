import { Button } from './Button'
import './resource-permission.css'

/** Shared read-only/error/loading explanation for server-authorized resources. */
export function ResourcePermissionNotice({ loading, error, allowed, reason, onRetry }: {
  loading: boolean; error: string | null; allowed: boolean; reason: string | null; onRetry: () => void
}) {
  if (allowed && !loading && !error) return null
  return <section role={error ? 'alert' : 'status'} className="workspace-surface space-y-3 p-4 text-sm text-ink-muted">
    <p>{loading ? 'Đang xác minh quyền thao tác…' : error || reason || 'Bạn đang xem dữ liệu ở chế độ chỉ đọc.'}</p>
    {!loading && <Button className="min-h-11 resource-permission-action" variant="secondary" onClick={onRetry}>Tải lại quyền thao tác</Button>}
  </section>
}
