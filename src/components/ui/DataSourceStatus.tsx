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
    partial: 'bg-warning-strong',
    error: 'bg-danger',
    empty: 'bg-line-strong',
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

  const gridCols = sources.length === 4
    ? 'sm:grid-cols-2 xl:grid-cols-4'
    : sources.length === 2
      ? 'sm:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <section className={`rounded-xl border border-hairline bg-card p-5 shadow-xs ${className}`.trim()} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {asOfUtc && (
          <span className="font-mono text-xs text-ink-muted">
            Dữ liệu tính đến: <time dateTime={asOfUtc}>{new Date(asOfUtc).toLocaleString('vi-VN')}</time>
          </span>
        )}
      </div>
      <ul className={`mt-3.5 grid grid-cols-1 gap-3 ${gridCols}`}>
        {sources.map(source => (
          <li key={source.id} className="flex items-start gap-2.5 rounded-lg border border-hairline/80 bg-canvas/65 px-3.5 py-2.5 text-xs">
            <span
              className={`mt-1.5 h-2 w-2 flex-none rounded-full ${dotToneClass[source.state] ?? 'bg-line-strong'}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <strong className="block truncate font-semibold text-ink">{source.label}</strong>
              <span className="mt-0.5 block leading-relaxed text-ink-muted">
                {source.message ?? defaultMessages[source.state]}
              </span>
              {source.asOfUtc && (
                <span className="mt-0.5 block font-mono text-xs text-ink-muted">
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
