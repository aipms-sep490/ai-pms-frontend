import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/PageLoading'
import type { PagedResult } from '../../types/backend'
import { getPeerRounds } from './peer-eval-api'
import type { PeerRound } from './peer-eval-types'
import { CollaborationPager, collaborationDate, collaborationError } from '../student-collaboration/collaboration-ui'

export function PeerRoundPicker({ projectId, userId, onPick }: { projectId: number; userId?: number; onPick: (round: PeerRound) => void }) {
  const [page, setPage] = useState(1), [data, setData] = useState<PagedResult<PeerRound> | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError('')
    void getPeerRounds(projectId, page, 10, abort.signal).then(result => { if (!abort.signal.aborted) setData(result) }).catch(reason => { if (!abort.signal.aborted) setError(collaborationError(reason)) })
    return () => abort.abort()
  }, [projectId, page, retry])
  return <section className="collab-card collab-stack"><h2>Các đợt của nhóm</h2>{error ? <p role="alert">{error} <Button variant="ghost" onClick={() => setRetry(value => value + 1)}>Thử lại</Button></p> : !data ? <PageLoading /> : <>
    {!data.items.length && <p>Chưa có đợt đánh giá nào.</p>}
    {data.items.map(round => <div className="collab-row" key={round.id}><div><h3>{round.title}</h3><p className="collab-muted">{collaborationDate(round.opensAt)} — {collaborationDate(round.closesAt)}</p></div><Button variant="outline" disabled={!round.roster.some(member => member.userId === userId)} onClick={() => onPick(round)}>Xem bài của tôi · {round.title}</Button></div>)}
    <CollaborationPager page={page} total={data.totalCount} onChange={setPage} />
  </>}</section>
}
