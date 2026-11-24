import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { HistoryTimeline } from '../../components/ui/HistoryTimeline'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import * as results from '../../services/api/project-results.api'
import type { PagedResult } from '../../types/backend'
import type { ProjectResult, ResultRevisionSummary, StudentResult } from './result-types'
import { ProjectResultBreakdown } from './ProjectResultBreakdown'
import { appealError, AppealPaging } from './appeal-ui'

export function ResultHistoryPanel({ projectId, studentId }: { projectId: number; studentId?: number }) {
  const [history, setHistory] = useState<PagedResult<ResultRevisionSummary> | null>(null), [page, setPage] = useState(1)
  const [result, setResult] = useState<ProjectResult | StudentResult | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [revision, setRevision] = useState(0)
  const generation = useRef(0)
  useEffect(() => {
    const abort = new AbortController(), current = ++generation.current
    setBusy(true); setHistory(null); setResult(null); setError('')
    const read = studentId == null ? results.getProjectResultHistory(projectId, page, 20, abort.signal) : results.getStudentResultHistory(projectId, studentId, page, 20, abort.signal)
    read.then(value => { if (current === generation.current) setHistory(value) }).catch(cause => { if (current === generation.current) setError(appealError(cause)) }).finally(() => { if (current === generation.current) setBusy(false) })
    return () => { abort.abort(); generation.current++ }
  }, [projectId, studentId, page, revision])
  async function select(version: number) {
    const current = ++generation.current
    setBusy(true); setError(''); setResult(null)
    try {
      const next = studentId == null ? await results.getProjectResultVersion(projectId, version) : await results.getStudentResultVersion(projectId, studentId, version)
      if (current === generation.current) {
        if (next.projectId !== projectId || next.version !== version || (studentId != null && (!('studentId' in next) || next.studentId !== studentId))) throw new Error('Result context mismatch')
        setResult(next)
      }
    } catch (cause) { if (current === generation.current) setError(appealError(cause)) }
    finally { if (current === generation.current) setBusy(false) }
  }
  const historyItems = useMemo(() => history?.items ?? [], [history])
  const clientPagination = useClientPagination(historyItems, 8)
  const displayedItems = (history?.totalCount ?? 0) > 20 ? historyItems : clientPagination.paginatedItems

  return <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs" aria-label="Lịch sử phiên bản kết quả">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-ink">Lịch sử phiên bản kết quả</h2>
        {history && <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">{history.totalCount}</span>}
      </div>
      <Button variant="secondary" disabled={busy} onClick={() => setRevision(value => value + 1)}>Tải lại lịch sử</Button>
    </div>
    <div className="space-y-4 p-5">
      {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</p>}
      {busy && <p role="status" className="text-sm text-ink-muted">Đang tải phiên bản…</p>}
      {history && <>
        <HistoryTimeline emptyLabel="Chưa có phiên bản kết quả đã công bố." items={displayedItems.map(item => ({ at: item.publishedAt, actor: `#${item.publishedBy}`, action: <button type="button" disabled={busy} className="min-h-11 text-left font-medium text-primary underline" onClick={() => void select(item.version)}>v{item.version} · {item.totalScore} · {item.outcome}{item.supersedesVersion != null && ` · thay v${item.supersedesVersion}`}</button>, note: item.reason }))} />
        {history.totalCount > 20 ? (
          <AppealPaging page={page} totalCount={history.totalCount} busy={busy} onChange={setPage} />
        ) : clientPagination.showPagination ? (
          <Pagination page={clientPagination.page} pages={clientPagination.totalPages} total={clientPagination.total} pageSize={clientPagination.pageSize} busy={busy} onPage={clientPagination.setPage} />
        ) : null}
      </>}
      {result && <div className="space-y-3 border-t border-hairline pt-4">
        <p className="text-sm font-semibold tabular-nums text-ink">Phiên bản đã chọn: v{result.version} · {result.totalScore} · {result.outcome}</p>
        <ProjectResultBreakdown target={studentId == null ? 'project' : 'student'} breakdown={result.breakdown} contributions={'contributions' in result ? result.contributions : undefined} />
      </div>}
    </div>
  </section>
}
