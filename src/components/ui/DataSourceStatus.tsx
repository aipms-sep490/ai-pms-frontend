export type DataSourceState = 'ready' | 'empty' | 'partial' | 'error' | 'unavailable' | 'unsupported'

export interface DataSourceItem {
  id: string
  label: string
  state: DataSourceState
  message?: string | null
  asOfUtc?: string | null
}

export function DataSourceStatus({
  sources,
  asOfUtc,
  title = 'Trạng thái nguồn dữ liệu',
  className = '',
}: {
  sources: readonly DataSourceItem[]
  asOfUtc?: string | null
  title?: string
  className?: string
}) {
  if (!sources || sources.length === 0) return null

  const dotToneClass: Record<DataSourceState, string> = {
    ready: 'bg-primary',
    partial: 'bg-amber-600',
    error: 'bg-danger',
    empty: 'bg-slate-400',
    unavailable: 'bg-ink-muted',
    unsupported: 'bg-ink-muted',
  }

  const defaultMessages: Record<DataSourceState, string> = {
    ready: 'Đã kết nối và đồng bộ dữ liệu.',
    empty: 'Đã kết nối, không có dữ liệu để hiển thị.',
    partial: 'Dữ liệu chỉ tải được một phần.',
    error: 'Chưa tải được dữ liệu nguồn.',
    unavailable: 'Nguồn dữ liệu hiện chưa khả dụng.',
    unsupported: 'Nguồn dữ liệu chưa được hỗ trợ trong phạm vi này.',
  }

  return (
    <section className={`rounded-xl border border-hairline bg-card p-5 shadow-sm ${className}`.trim()} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2.5">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {asOfUtc && (
          <span className="text-xs text-ink-muted">
            Dữ liệu tính đến: <time dateTime={asOfUtc}>{new Date(asOfUtc).toLocaleString('vi-VN')}</time>
          </span>
        )}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map(source => (
          <li key={source.id} className="flex items-start gap-2.5 text-xs">
            <span
              className={`mt-1 h-2 w-2 flex-none rounded-full ${dotToneClass[source.state] ?? 'bg-slate-400'}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <strong className="block truncate font-semibold text-ink">{source.label}</strong>
              <span className="block text-ink-muted">
                {source.message ?? defaultMessages[source.state]}
              </span>
              {source.asOfUtc && (
                <span className="block text-[11px] text-ink-muted/80">
                  Cập nhật: {new Date(source.asOfUtc).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
