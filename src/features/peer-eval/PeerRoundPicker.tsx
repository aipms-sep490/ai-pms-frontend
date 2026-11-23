import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { FilterToolbar } from '../../components/ui/FilterToolbar'
import { PageLoading } from '../../components/ui/PageLoading'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { PagedResult } from '../../types/backend'
import { getPeerRounds } from './peer-eval-api'
import type { PeerRound } from './peer-eval-types'
import { CollaborationPager, collaborationDate, collaborationError } from '../student-collaboration/collaboration-ui'

const statusLabel: Record<string, string> = { OPEN: 'Đang mở', CLOSED: 'Đã đóng', DRAFT: 'Bản nháp' }

export function PeerRoundPicker({ projectId, userId, onPick }: { projectId: number; userId?: number; onPick: (round: PeerRound) => void }) {
  const [page, setPage] = useState(1), [data, setData] = useState<PagedResult<PeerRound> | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError('')
    void getPeerRounds(projectId, page, 10, abort.signal).then(result => { if (!abort.signal.aborted) setData(result) }).catch(reason => { if (!abort.signal.aborted) setError(collaborationError(reason)) })
    return () => abort.abort()
  }, [projectId, page, retry])

  const filtered = useMemo(() => {
    const items = data?.items ?? []
    const q = search.trim().toLowerCase()
    return items.filter(round => {
      if (statusFilter && round.status !== statusFilter) return false
      if (q && !round.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, statusFilter, search])

  return <div className="space-y-4">
    <FilterToolbar
      embedded
      tabs={[
        { value: '', label: 'Tất cả' },
        { value: 'OPEN', label: 'Đang mở' },
        { value: 'CLOSED', label: 'Đã đóng' },
      ]}
      activeTab={statusFilter}
      onTabChange={setStatusFilter}
      search={search}
      onSearchChange={setSearch}
      searchLabel="Tìm đợt đánh giá"
      searchPlaceholder="Tìm theo tên đợt…"
      hasActiveFilters={Boolean(statusFilter || search.trim())}
      onClearAll={() => { setStatusFilter(''); setSearch('') }}
      resultSummary={data ? `${filtered.length} / ${data.items.length} đợt` : undefined}
    />
    {error ? <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error} <Button variant="ghost" onClick={() => setRetry(value => value + 1)}>Thử lại</Button></p> : !data ? <PageLoading /> : <>
      {!filtered.length && <p className="rounded-lg border border-hairline bg-canvas p-4 text-sm text-ink-muted">Chưa có đợt đánh giá phù hợp.</p>}
      <ul className="space-y-2.5">
        {filtered.map(round => (
          <li key={round.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card p-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">{round.title}</h3>
                <StatusBadge tone={round.status === 'OPEN' ? 'success' : 'neutral'} label={statusLabel[round.status] ?? round.status} />
              </div>
              <p className="mt-1 text-xs text-ink-muted">{collaborationDate(round.opensAt)} — {collaborationDate(round.closesAt)}</p>
            </div>
            <Button variant="outline" size="sm" disabled={!round.roster.some(member => member.userId === userId)} onClick={() => onPick(round)}>Xem bài của tôi · {round.title}</Button>
          </li>
        ))}
      </ul>
      <CollaborationPager page={page} total={data.totalCount} onChange={setPage} />
    </>}
  </div>
}
