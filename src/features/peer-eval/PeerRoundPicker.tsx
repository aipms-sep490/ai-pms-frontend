import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/PageLoading'
import { Pagination } from '../../components/ui'
import type { PagedResult } from '../../types/backend'
import { getPeerRounds } from './peer-eval-api'
import type { PeerRound } from './peer-eval-types'
import { collaborationDate, collaborationError } from '../student-collaboration/collaboration-ui'

export function PeerRoundPicker({ projectId, userId, onPick }: { projectId: number; userId?: number; onPick: (round: PeerRound) => void }) {
  const [page, setPage] = useState(1), [data, setData] = useState<PagedResult<PeerRound> | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError('')
    void getPeerRounds(projectId, page, 10, abort.signal).then(result => { if (!abort.signal.aborted) setData(result) }).catch(reason => { if (!abort.signal.aborted) setError(collaborationError(reason)) })
    return () => abort.abort()
  }, [projectId, page, retry])
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / 10)) : 1

  return (
    <section className="collab-card collab-card-flush">
      <div className="collab-card-header">
        <h2>Các đợt của nhóm</h2>
        {data && (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
            {data.totalCount}
          </span>
        )}
      </div>
      <div className="collab-card-body collab-stack">
        {error ? (
          <p role="alert">{error} <Button variant="ghost" onClick={() => setRetry(value => value + 1)}>Thử lại</Button></p>
        ) : !data ? (
          <PageLoading />
        ) : (
          <>
            {!data.items.length && <p className="collab-empty">Chưa có đợt đánh giá nào.</p>}
            {data.items.map(round => (
              <div className="collab-row collab-section" key={round.id}>
                <div>
                  <h3>{round.title}</h3>
                  <p className="collab-muted font-mono text-xs">{collaborationDate(round.opensAt)} — {collaborationDate(round.closesAt)}</p>
                </div>
                <Button variant="outline" disabled={!round.roster.some(member => member.userId === userId)} onClick={() => onPick(round)}>
                  Xem bài của tôi · {round.title}
                </Button>
              </div>
            ))}
            {data.totalCount > 10 && (
              <div className="border-t border-hairline pt-3">
                <Pagination page={page} pages={totalPages} total={data.totalCount} pageSize={10} onPage={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
