import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { useAuthSession } from '../context/useAuthSession'
import { getIndustryAssignment, getIndustryAssignments, type IndustryAssignment } from '../../industry/industry-session-api'
import { appealError } from '../../results/appeal-ui'
import type { PagedResult } from '../../../types/backend'
import { Button } from '../../../components/ui/Button'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { getHomePath } from '../utils/role-access'

const PAGE_SIZE = 20

function industryScopeLabel(scope: string): string {
  switch (scope.toUpperCase()) {
    case 'COMMON':
      return 'Chung (toàn đồ án)'
    case 'MAJOR_SPECIFIC':
      return 'Theo chuyên ngành'
    default:
      return scope
  }
}

function industryStatusMeta(status: string): { label: string; tone: BadgeTone } {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return { label: 'Đang hiệu lực', tone: 'success' }
    case 'SCHEDULED':
      return { label: 'Sắp hiệu lực', tone: 'info' }
    case 'EXPIRED':
      return { label: 'Đã hết hạn', tone: 'warning' }
    case 'REVOKED':
    case 'INACTIVE':
      return { label: 'Đã thu hồi', tone: 'danger' }
    default:
      return { label: status, tone: 'neutral' }
  }
}

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
    <main className="min-h-screen bg-canvas px-4 py-4 text-ink sm:px-6 md:py-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1680px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card px-5 py-3.5 shadow-2xs">
          <Link className="inline-flex min-h-11 items-center gap-2 text-lg font-bold text-ink" to="/industry/workspace">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">business_center</span>
            <span>AIPMS · Tư vấn doanh nghiệp</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-ink-soft">{session?.user.fullName}</span>
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
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const requestKey = `${userId}:${page}:${revision}`
  const [result, setResult] = useState<{ key: string; data: PagedResult<IndustryAssignment> | null; error: string } | null>(null)

  useEffect(() => {
    const abort = new AbortController()
    getIndustryAssignments(page, abort.signal)
      .then(value => { if (!abort.signal.aborted) setResult({ key: requestKey, data: value, error: '' }) })
      .catch(cause => { if (!abort.signal.aborted) setResult({ key: requestKey, data: null, error: appealError(cause) }) })
    return () => abort.abort()
  }, [page, requestKey])

  const active = result?.key === requestKey ? result : null
  const loading = active === null
  const data = active?.data ?? null
  const error = active?.error ?? ''

  const items = data?.items ?? []
  const activeCount = items.filter(item => item.status.toUpperCase() === 'ACTIVE').length
  const commonCount = items.filter(item => item.scope.toUpperCase() === 'COMMON').length
  const majorSpecificCount = items.filter(item => item.scope.toUpperCase() === 'MAJOR_SPECIFIC').length
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1

  return (
    <WorkspacePage
      className="space-y-5"
      eyebrow="Cổng doanh nghiệp"
      title="Phân công tư vấn"
      description="Ý kiến chuyên gia có tính chất tư vấn. Quyền đọc hồ sơ và gửi phản hồi do hệ thống cấp theo từng phân công."
      action={
        <Button variant="secondary" icon="refresh" disabled={loading} onClick={() => setRevision(value => value + 1)}>
          Tải lại phân công
        </Button>
      }
    >
      <StatTileRow
        tiles={[
          { icon: 'assignment', label: 'Tổng phân công', value: data?.totalCount ?? null, hero: true, caption: 'Trong phạm vi tài khoản chuyên gia' },
          { icon: 'verified', label: 'Đang hiệu lực', value: data ? activeCount : null, tone: 'success' },
          { icon: 'public', label: 'Chung (toàn đồ án)', value: data ? commonCount : null, tone: 'info' },
          { icon: 'school', label: 'Theo chuyên ngành', value: data ? majorSpecificCount : null, tone: 'neutral' },
        ]}
      />

      {loading && (
        <p role="status" className="rounded-xl border border-hairline bg-card px-5 py-4 text-sm text-ink-muted">
          Đang xác minh phân công…
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          {error}
        </p>
      )}

      {data && (
        <section className="workspace-surface" aria-labelledby="industry-assignments-heading">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <h2 id="industry-assignments-heading" className="text-sm font-bold text-ink">
              Danh sách đồ án được phân công
            </h2>
            <span className="rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
              {data.totalCount} phân công
            </span>
          </div>

          {items.length === 0 ? (
            <p className="p-6 text-sm text-ink-muted">Chưa có phân công tư vấn trong phạm vi của bạn.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {items.map(item => {
                const statusMeta = industryStatusMeta(item.status)
                return (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-canvas/60">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{item.projectCode}</span>
                        <StatusBadge status={item.status} tone={statusMeta.tone} label={statusMeta.label} />
                        <StatusBadge status={item.scope} tone="info" label={industryScopeLabel(item.scope)} />
                      </div>
                      <p className="text-sm font-semibold text-ink break-words">{item.projectTitle}</p>
                      <p className="text-xs text-ink-muted">
                        Hiệu lực: {new Date(item.startsAt).toLocaleDateString('vi-VN')} → {new Date(item.endsAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <Link className="workspace-action-link shrink-0" to={`/industry/assignments/${item.id}`}>
                      <span>Mở phân công</span>
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="border-t border-hairline px-5 py-3">
              <Pagination
                page={page}
                pages={totalPages}
                total={data.totalCount}
                pageSize={PAGE_SIZE}
                busy={loading}
                onPage={setPage}
                ariaLabel="Phân trang danh sách phân công tư vấn"
              />
            </div>
          )}
        </section>
      )}
    </WorkspacePage>
  )
}

export function IndustryAssignmentRoute() {
  const id = Number(useParams().assignmentId)
  return Number.isSafeInteger(id) && id > 0 ? <IndustryAssignmentSummary key={id} id={id} /> : <Navigate to="/industry/workspace" replace />
}

function IndustryAssignmentSummary({ id }: { id: number }) {
  const [revision, setRevision] = useState(0)
  const requestKey = `${id}:${revision}`
  const [result, setResult] = useState<{ key: string; data: IndustryAssignment | null; error: string } | null>(null)

  useEffect(() => {
    const abort = new AbortController()
    getIndustryAssignment(id, abort.signal)
      .then(value => { if (!abort.signal.aborted) setResult({ key: requestKey, data: value, error: '' }) })
      .catch(cause => { if (!abort.signal.aborted) setResult({ key: requestKey, data: null, error: appealError(cause) }) })
    return () => abort.abort()
  }, [id, requestKey])

  const active = result?.key === requestKey ? result : null
  const loading = active === null
  const data = active?.data ?? null
  const error = active?.error ?? ''

  const statusMeta = data ? industryStatusMeta(data.status) : null

  return (
    <WorkspacePage
      className="space-y-5"
      eyebrow="Cổng doanh nghiệp · Chi tiết phân công"
      title={data ? `${data.projectCode} · ${data.projectTitle}` : 'Chi tiết phân công tư vấn'}
      description="Phân công tư vấn không cấp quyền chấm điểm hoặc công bố kết quả học thuật."
      backTo="/industry/workspace"
      action={
        <Button variant="secondary" icon="refresh" disabled={loading} onClick={() => setRevision(value => value + 1)}>
          Tải lại quyền phân công
        </Button>
      }
    >
      {loading && (
        <p role="status" className="rounded-xl border border-hairline bg-card px-5 py-4 text-sm text-ink-muted">
          Đang xác minh quyền phân công…
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          {error}
        </p>
      )}

      {data && statusMeta && (
        <section className="workspace-surface" aria-labelledby="industry-assignment-detail">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <h2 id="industry-assignment-detail" className="text-sm font-bold text-ink">
              Thông tin phạm vi và thời hạn hiệu lực
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={data.status} tone={statusMeta.tone} label={statusMeta.label} />
              <StatusBadge status={data.scope} tone="info" label={industryScopeLabel(data.scope)} />
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <div className="rounded-lg border border-hairline bg-canvas/50 p-3.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Phạm vi tư vấn</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {data.scope.toUpperCase() === 'MAJOR_SPECIFIC' ? 'Theo chuyên ngành được phân công' : industryScopeLabel(data.scope)}
              </dd>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas/50 p-3.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Thời gian hiệu lực</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {new Date(data.startsAt).toLocaleString('vi-VN')} → {new Date(data.endsAt).toLocaleString('vi-VN')}
              </dd>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas/50 p-3.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Chế độ quyền hạn</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {data.advisoryOnly ? 'Chỉ tư vấn & góp ý (không chấm điểm)' : 'Theo quyền được cấp'}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </WorkspacePage>
  )
}
