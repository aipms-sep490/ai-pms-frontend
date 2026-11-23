import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { PagedResult } from '../../../types/backend'
import { getIndustryAssignment, getIndustryAssignments, type IndustryAssignment } from '../../industry/industry-session-api'
import { appealError, AppealPaging } from '../../results/appeal-ui'
import { useAuthSession } from '../context/useAuthSession'
import { getHomePath } from '../utils/role-access'

/** Separate identity boundary: no academic context/onboarding, and no invented expert role. */
export function IndustryLayout() {
  const { session, logout } = useAuthSession()
  if (session?.user.roles.length) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
        <section className="workspace-surface w-full max-w-lg space-y-4 p-6">
          <p role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
            Cổng tư vấn sử dụng tài khoản chuyên gia độc lập, không dùng vai trò học thuật.
          </p>
          <Link className="inline-flex min-h-11 items-center font-semibold text-primary underline" to={getHomePath(session.user)}>
            Về không gian tài khoản
          </Link>
        </section>
      </main>
    )
  }
  return (
    <main className="min-h-screen bg-canvas p-4 text-ink sm:p-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-card px-5 py-3.5 shadow-xs">
          <Link className="inline-flex min-h-11 items-center gap-2.5 text-lg font-bold text-brand-navy" to="/industry/workspace">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-on-navy">AI</span>
            <span>AIPMS · Tư vấn doanh nghiệp</span>
          </Link>
          <div className="flex items-center gap-3">
            {session?.user.fullName && (
              <div className="flex items-center gap-2">
                <Avatar name={session.user.fullName} size="sm" />
                <span className="text-sm font-semibold text-ink">{session.user.fullName}</span>
              </div>
            )}
            <Button variant="secondary" onClick={() => void logout()}>Đăng xuất</Button>
          </div>
        </header>
        <Outlet context={{ userId: session?.user.id }} />
      </div>
    </main>
  )
}

export function IndustryWorkspaceRoute() {
  const { userId } = useOutletContext<{ userId: number }>()
  const [data, setData] = useState<PagedResult<IndustryAssignment> | null>(null)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setData(null)
    setError('')
    getIndustryAssignments(page, abort.signal)
      .then(value => { if (!abort.signal.aborted) setData(value) })
      .catch(cause => { if (!abort.signal.aborted) setError(appealError(cause)) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [userId, page, revision])

  return (
    <section className="workspace-surface space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Phân công tư vấn</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Ý kiến chuyên gia có tính chất tư vấn. Quyền đọc hồ sơ và gửi phản hồi do hệ thống cấp theo từng phân công.
          </p>
        </div>
        <Button variant="secondary" icon="refresh" disabled={loading} onClick={() => setRevision(value => value + 1)}>
          Tải lại phân công
        </Button>
      </div>
      {loading && <p role="status" className="text-sm text-ink-muted">Đang xác minh phân công…</p>}
      {error && (
        <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">
          {error}
        </p>
      )}
      {data && (
        <>
          {data.items.length === 0 && (
            <p className="rounded-lg border border-hairline bg-canvas p-5 text-sm text-ink-muted">
              Chưa có phân công tư vấn trong phạm vi của bạn.
            </p>
          )}
          <ul className="grid gap-3 md:grid-cols-2">
            {data.items.map(item => (
              <li key={item.id} className="rounded-xl border border-hairline bg-card p-4 transition-colors hover:border-primary/40">
                <Link className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline" to={`/industry/assignments/${item.id}`}>
                  {item.projectCode} · {item.projectTitle} · {item.scope} · {item.status}
                </Link>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge tone="neutral" label={displayLabel(item.scope)} />
                  <StatusBadge tone={item.status === 'ACTIVE' ? 'success' : 'neutral'} label={displayLabel(item.status)} />
                </div>
              </li>
            ))}
          </ul>
          <AppealPaging page={page} totalCount={data.totalCount} busy={loading} onChange={setPage} />
        </>
      )}
    </section>
  )
}

export function IndustryAssignmentRoute() {
  const id = Number(useParams().assignmentId)
  return Number.isSafeInteger(id) && id > 0 ? <IndustryAssignmentSummary key={id} id={id} /> : <Navigate to="/industry/workspace" replace />
}

function IndustryAssignmentSummary({ id }: { id: number }) {
  const [data, setData] = useState<IndustryAssignment | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setData(null)
    setError('')
    getIndustryAssignment(id, abort.signal)
      .then(value => { if (!abort.signal.aborted) setData(value) })
      .catch(cause => { if (!abort.signal.aborted) setError(appealError(cause)) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [id, revision])

  return (
    <section className="workspace-surface space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline" to="/industry/workspace">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          Về phân công tư vấn
        </Link>
        <Button variant="secondary" icon="refresh" disabled={loading} onClick={() => setRevision(value => value + 1)}>
          Tải lại quyền phân công
        </Button>
      </div>
      {loading && <p role="status" className="text-sm text-ink-muted">Đang xác minh quyền phân công…</p>}
      {error && (
        <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">
          {error}
        </p>
      )}
      {data && (
        <div className="space-y-3 rounded-xl border border-hairline bg-canvas p-5">
          <h1 className="text-xl font-bold text-brand-navy">{data.projectCode} · {data.projectTitle}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="neutral" label={displayLabel(data.scope)} />
            <StatusBadge tone={data.status === 'ACTIVE' ? 'success' : 'neutral'} label={displayLabel(data.status)} />
          </div>
          <p className="text-sm text-ink-soft">{data.scope} · Ngành {data.majorId ?? '—'} · {data.status}</p>
          <p className="text-sm text-ink-muted">
            {new Date(data.startsAt).toLocaleString('vi-VN')} → {new Date(data.endsAt).toLocaleString('vi-VN')}
          </p>
          <p className="text-xs text-ink-muted">Phân công tư vấn không cấp quyền chấm điểm hoặc công bố kết quả học thuật.</p>
        </div>
      )}
    </section>
  )
}
