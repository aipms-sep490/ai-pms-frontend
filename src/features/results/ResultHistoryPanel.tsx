import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
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
  return <section className="workspace-surface space-y-3 p-5" aria-label="Lịch sử phiên bản kết quả"><h2 className="font-semibold">Lịch sử phiên bản kết quả</h2>{error && <p role="alert">{error}</p>}{busy && <p role="status">Đang tải phiên bản…</p>}<Button variant="secondary" disabled={busy} onClick={() => setRevision(value => value + 1)}>Tải lại lịch sử</Button>{history && <>{history.items.length === 0 && <p>Chưa có phiên bản kết quả đã công bố.</p>}<ul>{history.items.map(item => <li key={item.version}><button type="button" disabled={busy} className="min-h-11 text-left text-primary underline" onClick={() => void select(item.version)}>v{item.version} · {item.totalScore} · {item.outcome}{item.supersedesVersion != null && ` · thay v${item.supersedesVersion}`} · {new Date(item.publishedAt).toLocaleString('vi-VN')}</button></li>)}</ul><AppealPaging page={page} totalCount={history.totalCount} busy={busy} onChange={setPage} /></>}{result && <div><p>Phiên bản đã chọn: v{result.version} · {result.totalScore} · {result.outcome}</p><ProjectResultBreakdown breakdown={result.breakdown} contributions={'contributions' in result ? result.contributions : undefined} /></div>}</section>
}
