import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { useAuthSession } from '../auth/context/useAuthSession'
import { useProjectCapabilities } from '../capabilities/useProjectCapabilities'
import type { PagedResult } from '../../types/backend'
import * as api from './result-correction-api'
import { AppealManagementPanel } from './AppealManagementPanel'
import { AppealRequestDetail } from './AppealRequestDetail'
import { appealError, AppealPaging } from './appeal-ui'
import { ResultHistoryPanel } from './ResultHistoryPanel'

export function ResultCorrectionsPage() {
  const projectId = Number(useParams().projectId)
  const { session } = useAuthSession()
  return Number.isSafeInteger(projectId) && projectId > 0 ? <CorrectionsWorkspace key={`${projectId}:${session?.user.id}`} projectId={projectId} /> : <p role="alert">Mã đồ án không hợp lệ.</p>
}
function CorrectionsWorkspace({ projectId }: { projectId: number }) {
  const { session } = useAuthSession(), capabilities = useProjectCapabilities(projectId)
  const [params, setParams] = useSearchParams(), selected = Number(params.get('request'))
  const [requests, setRequests] = useState<PagedResult<api.ResultCorrectionRequest> | null>(null)
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const lead = capabilities.data?.leadDepartmentId
  const canManage = session?.user.roles.includes('DEPARTMENT_STAFF') && lead != null && capabilities.data?.managedDepartmentIds.includes(lead) && capabilities.data.academicScopeProvenance === 'FROZEN_REGISTRATION_SNAPSHOT'
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setRequests(null); setError('')
    api.getResultCorrectionRequests(projectId, page, abort.signal).then(value => { if (!abort.signal.aborted) setRequests(value) }).catch(cause => { if (!abort.signal.aborted) setError(appealError(cause)) }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [projectId, page, revision])
  const select = (id: number) => setParams({ request: String(id) })
  return <WorkspacePage title="Phúc khảo và đính chính" eyebrow={`Đồ án #${projectId}`} description="Xử lý yêu cầu theo phạm vi, phiên bản kết quả và thao tác được hệ thống cấp.">
    <div className="space-y-5">{canManage && <AppealManagementPanel projectId={projectId} onCreated={id => { select(id); setRevision(value => value + 1) }} />}
      <section className="workspace-surface space-y-3 p-5"><h2 className="font-semibold">Yêu cầu trong phạm vi của bạn</h2>{error && <p role="alert">{error}</p>}{loading && <p role="status">Đang tải danh sách yêu cầu…</p>}<Button variant="secondary" disabled={loading} onClick={() => { capabilities.retry(); setRevision(value => value + 1) }}>Tải lại danh sách</Button>{requests && <>{requests.items.length === 0 && <p>Chưa có yêu cầu trong phạm vi hiện tại.</p>}<ul>{requests.items.map(item => <li key={item.id}><button type="button" className="min-h-11 text-left text-primary underline" onClick={() => select(item.id)}>#{item.id} · {item.status} · {item.source} · {item.targetType} {item.studentId ?? ''} · v{item.resultVersion} · {item.scope}</button></li>)}</ul><AppealPaging page={page} totalCount={requests.totalCount} busy={loading} onChange={setPage} /></>}</section>
      {Number.isSafeInteger(selected) && selected > 0 && <AppealRequestDetail key={`${projectId}:${selected}`} projectId={projectId} requestId={selected} onChanged={() => setRevision(value => value + 1)} />}
      {canManage && <ResultHistoryPanel key={revision} projectId={projectId} />}
    </div>
  </WorkspacePage>
}
