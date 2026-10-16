import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useAuthSession } from '../context/useAuthSession'
import { getIndustryAssignment, getIndustryAssignments, type IndustryAssignment } from '../../industry/industry-session-api'
import { appealError, AppealPaging } from '../../results/appeal-ui'
import type { PagedResult } from '../../../types/backend'
import { Button } from '../../../components/ui/Button'
import { getHomePath } from '../utils/role-access'

/** Separate identity boundary: no academic context/onboarding, and no invented expert role. */
export function IndustryLayout() {
  const { session, logout } = useAuthSession()
  if (session?.user.roles.length) return <main className="p-6"><p role="alert">Cổng tư vấn sử dụng tài khoản chuyên gia độc lập, không dùng vai trò học thuật.</p><Link className="inline-flex min-h-11 items-center text-primary underline" to={getHomePath(session.user)}>Về không gian tài khoản</Link></main>
  return <main className="min-h-screen bg-canvas p-4 text-ink sm:p-8"><div className="mx-auto max-w-6xl space-y-6"><header className="flex flex-wrap items-center justify-between gap-3"><Link className="min-h-11 text-lg font-semibold" to="/industry/workspace">AI-PMS · Tư vấn doanh nghiệp</Link><span>{session?.user.fullName}</span><Button variant="secondary" onClick={() => void logout()}>Đăng xuất</Button></header><Outlet context={{ userId: session?.user.id }} /></div></main>
}
export function IndustryWorkspaceRoute() {
  const { userId } = useOutletContext<{ userId: number }>()
  const [data, setData] = useState<PagedResult<IndustryAssignment> | null>(null), [page, setPage] = useState(1), [revision, setRevision] = useState(0), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setData(null); setError('')
    getIndustryAssignments(page, abort.signal).then(value => { if (!abort.signal.aborted) setData(value) }).catch(cause => { if (!abort.signal.aborted) setError(appealError(cause)) }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [userId, page, revision])
  return <section className="workspace-surface space-y-4 p-5"><h1 className="text-xl font-semibold">Phân công tư vấn</h1><p>Ý kiến chuyên gia có tính chất tư vấn. Quyền đọc hồ sơ và gửi phản hồi do hệ thống cấp theo từng phân công.</p>{loading && <p role="status">Đang xác minh phân công…</p>}{error && <p role="alert">{error}</p>}<Button variant="secondary" disabled={loading} onClick={() => setRevision(value => value + 1)}>Tải lại phân công</Button>{data && <>{data.items.length === 0 && <p>Chưa có phân công tư vấn trong phạm vi của bạn.</p>}<ul className="space-y-3">{data.items.map(item => <li key={item.id}><Link className="inline-flex min-h-11 items-center text-primary underline" to={`/industry/assignments/${item.id}`}>{item.projectCode} · {item.projectTitle} · {item.scope} · {item.status}</Link></li>)}</ul><AppealPaging page={page} totalCount={data.totalCount} busy={loading} onChange={setPage} /></>}</section>
}
export function IndustryAssignmentRoute() {
  const id = Number(useParams().assignmentId)
  return Number.isSafeInteger(id) && id > 0 ? <IndustryAssignmentSummary key={id} id={id} /> : <Navigate to="/industry/workspace" replace />
}
function IndustryAssignmentSummary({ id }: { id: number }) {
  const [data, setData] = useState<IndustryAssignment | null>(null), [error, setError] = useState(''), [revision, setRevision] = useState(0), [loading, setLoading] = useState(true)
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setData(null); setError('')
    getIndustryAssignment(id, abort.signal).then(value => { if (!abort.signal.aborted) setData(value) }).catch(cause => { if (!abort.signal.aborted) setError(appealError(cause)) }).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [id, revision])
  return <section className="workspace-surface space-y-3 p-5"><Link className="text-primary underline" to="/industry/workspace">Về phân công tư vấn</Link>{loading && <p role="status">Đang xác minh quyền phân công…</p>}{error && <p role="alert">{error}</p>}<Button variant="secondary" disabled={loading} onClick={() => setRevision(value => value + 1)}>Tải lại quyền phân công</Button>{data && <><h1 className="text-xl font-semibold">{data.projectCode} · {data.projectTitle}</h1><p>{data.scope} · Ngành {data.majorId ?? '—'} · {data.status}</p><p>{new Date(data.startsAt).toLocaleString('vi-VN')} → {new Date(data.endsAt).toLocaleString('vi-VN')}</p><p>Phân công tư vấn không cấp quyền chấm điểm hoặc công bố kết quả học thuật.</p></>}</section>
}
