import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { FilterToolbar, type ActiveFilterChip } from '../../components/ui/FilterToolbar'
import { ListLoading } from '../../components/ui/ListLoading'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { StatusBadge } from '../../components/ui/StatusBadge'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { HttpError } from '../../services/http/http-client'
import { humanizeHttpError } from '../../services/http/humanize-http-error'
import {
  getIndustryInvitations,
  inviteIndustryExpert,
  revokeIndustryInvitation,
  type ExpertInvitation,
  type ExpertInvitationStatus,
} from './industry-api'

const statusText: Record<ExpertInvitationStatus, string> = {
  PENDING: 'Chờ nhận lời mời',
  CONSUMED: 'Đã kích hoạt',
  EXPIRED: 'Hết hạn',
  REVOKED: 'Đã thu hồi',
}

const statusTone: Record<ExpertInvitationStatus, BadgeTone> = {
  PENDING: 'warning',
  CONSUMED: 'success',
  EXPIRED: 'neutral',
  REVOKED: 'danger',
}

const PAGE_SIZE = 10

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

function message(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 409) return reason.problem?.detail || 'Email này đã gắn với một tài khoản khác.'
    if (reason.status === 503) return 'Chưa cấu hình Google/đường dẫn kích hoạt cho chuyên gia — liên hệ đội kỹ thuật trước khi mời.'
    return reason.problem?.detail || humanizeHttpError(reason)
  }
  return 'Có lỗi xảy ra. Hãy thử lại.'
}

/**
 * Admin invites an industry expert with no academic role (AIPMS.Api/Controllers/
 * IndustryController.cs). The enrollment secret is delivered only by email — this screen never
 * displays or re-sends it. Advisory only: inviting/assigning an expert never grants scoring weight.
 */
export function AdminIndustryInvitationsPage() {
  const [invitations, setInvitations] = useState<ExpertInvitation[]>([])
  const [invitedMeta, setInvitedMeta] = useState<Record<string, { fullName: string; organization: string }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState({ email: '', fullName: '', organization: '' })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ExpertInvitationStatus>('ALL')
  const [page, setPage] = useState(1)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setInvitations((await getIndustryInvitations(1, 100)).items)
      setError('')
    } catch (reason) {
      setError(message(reason))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const counts = useMemo(() => {
    const map = { ALL: invitations.length, PENDING: 0, CONSUMED: 0, EXPIRED: 0, REVOKED: 0 }
    for (const row of invitations) map[row.status]++
    return map
  }, [invitations])

  const filteredInvitations = useMemo(() => {
    const query = search.trim().toLowerCase()
    return invitations.filter(row => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false
      if (!query) return true
      const meta = invitedMeta[row.email.toLowerCase()]
      const fullName = row.fullName ?? row.expertName ?? meta?.fullName ?? ''
      const org = row.organization ?? row.expertOrganization ?? meta?.organization ?? ''
      return `${row.email} ${fullName} ${org}`.toLowerCase().includes(query)
    })
  }, [invitations, invitedMeta, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredInvitations.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedInvitations = useMemo(
    () => filteredInvitations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredInvitations, safePage],
  )

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []
    if (search.trim()) chips.push({ id: 'search', label: 'Từ khóa', value: search.trim() })
    if (statusFilter !== 'ALL') chips.push({ id: 'status', label: 'Trạng thái', value: statusText[statusFilter] })
    return chips
  }, [search, statusFilter])

  async function invite(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const email = form.email.trim()
    const fullName = form.fullName.trim()
    const organization = form.organization.trim()
    if (!email || !fullName || !organization) {
      setError('Vui lòng nhập đủ email, họ tên và tổ chức.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await inviteIndustryExpert({ email, fullName, organization })
      setInvitedMeta(prev => ({ ...prev, [email.toLowerCase()]: { fullName, organization } }))
      setForm({ email: '', fullName: '', organization: '' })
      setInviteOpen(false)
      setNotice(`Đã gửi lời mời tới ${email}.`)
      await load()
    } catch (reason) {
      setError(message(reason))
    } finally {
      setBusy(false)
    }
  }

  async function revoke(row: ExpertInvitation) {
    if (busy) return
    const confirmed = await requestConfirmation({
      title: `Thu hồi lời mời của ${row.email}?`,
      description: 'Liên kết kích hoạt đã gửi qua email sẽ không còn hiệu lực. Bạn có thể gửi lời mời mới sau nếu cần.',
      confirmLabel: 'Thu hồi lời mời',
      danger: true,
    })
    if (confirmed === null) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await revokeIndustryInvitation(row.id)
      setNotice(`Đã thu hồi lời mời của ${row.email}.`)
      await load()
    } catch (reason) {
      setError(message(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <WorkspacePage
      size="wide"
      className="space-y-5"
      title="Mời chuyên gia doanh nghiệp"
      eyebrow="Cố vấn doanh nghiệp"
      description="Chuyên gia doanh nghiệp chỉ đóng vai trò cố vấn — không có vai trò học thuật, không có trọng số chấm điểm trừ khi phương án đánh giá được duyệt quy định khác."
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon="refresh" disabled={busy || loading} onClick={() => void load()}>Tải lại</Button>
          <Button icon="person_add" disabled={busy} onClick={() => { setError(''); setInviteOpen(true) }}>Mời chuyên gia</Button>
        </div>
      }
    >
      {confirmationDialog}

      {error && !inviteOpen && (
        <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">
          {error}
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-sm text-status-success-text">
          {notice}
        </p>
      )}

      <FilterToolbar
        debounceMs={0}
        ariaLabel="Lọc danh sách lời mời chuyên gia"
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(1) }}
        searchPlaceholder="Tìm theo email, họ tên hoặc doanh nghiệp…"
        searchLabel="Tìm kiếm lời mời chuyên gia"
        activeTab={statusFilter}
        onTabChange={(value) => { setStatusFilter(value as 'ALL' | ExpertInvitationStatus); setPage(1) }}
        tabsLabel="Lọc lời mời theo trạng thái"
        tabs={[
          { value: 'ALL', label: 'Tất cả', count: counts.ALL },
          { value: 'PENDING', label: 'Chờ nhận', count: counts.PENDING },
          { value: 'CONSUMED', label: 'Đã kích hoạt', count: counts.CONSUMED },
          { value: 'EXPIRED', label: 'Hết hạn', count: counts.EXPIRED },
          { value: 'REVOKED', label: 'Đã thu hồi', count: counts.REVOKED },
        ]}
        activeChips={activeChips}
        onRemoveChip={(id) => {
          if (id === 'search') setSearch('')
          if (id === 'status') setStatusFilter('ALL')
          setPage(1)
        }}
        onClearAll={() => { setSearch(''); setStatusFilter('ALL'); setPage(1) }}
        hasActiveFilters={activeChips.length > 0}
        resultSummary={activeChips.length > 0 ? `Hiển thị ${filteredInvitations.length} / ${invitations.length} lời mời` : undefined}
      />

      {loading && <ListLoading label="Đang tải danh sách lời mời…" />}

      {!loading && invitations.length === 0 && (
        <WorkspaceEmptyState
          title="Chưa có lời mời nào."
          message="Gửi lời mời qua email để chuyên gia doanh nghiệp kích hoạt tài khoản cố vấn độc lập."
          action={<Button icon="person_add" onClick={() => setInviteOpen(true)}>Mời chuyên gia</Button>}
        />
      )}

      {!loading && invitations.length > 0 && filteredInvitations.length === 0 && (
        <WorkspaceEmptyState
          title="Không tìm thấy lời mời phù hợp"
          message="Thử xóa từ khóa tìm kiếm hoặc chọn lại trạng thái."
          action={<Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('ALL'); setPage(1) }}>Đặt lại bộ lọc</Button>}
        />
      )}

      {!loading && pagedInvitations.length > 0 && (
        <section className="workspace-surface overflow-hidden">
          <Table stack aria-label="Danh sách lời mời chuyên gia">
            <TableHead>
              <TableRow head>
                <TableHeaderCell>Họ tên</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Doanh nghiệp / Tổ chức</TableHeaderCell>
                <TableHeaderCell>Trạng thái</TableHeaderCell>
                <TableHeaderCell>Hết hạn lúc</TableHeaderCell>
                <TableHeaderCell>Thao tác</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedInvitations.map(row => {
                const meta = invitedMeta[row.email.toLowerCase()]
                const fullName = row.fullName ?? row.expertName ?? meta?.fullName ?? null
                const organization = row.organization ?? row.expertOrganization ?? meta?.organization ?? null
                return (
                  <TableRow key={row.id}>
                    <TableCell label="Họ tên">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName ?? row.email} size="sm" />
                        <span className="font-semibold text-ink">{fullName ?? 'Chưa cập nhật'}</span>
                      </div>
                    </TableCell>
                    <TableCell label="Email" className="font-medium text-ink">{row.email}</TableCell>
                    <TableCell label="Doanh nghiệp / Tổ chức" className="text-ink-soft">{organization ?? '—'}</TableCell>
                    <TableCell label="Trạng thái">
                      <StatusBadge tone={statusTone[row.status]} label={statusText[row.status]} />
                    </TableCell>
                    <TableCell label="Hết hạn lúc">{formatDateTime(row.expiresAt)}</TableCell>
                    <TableCell label="Thao tác">
                      {row.status === 'PENDING' && (
                        <Button size="sm" variant="danger" disabled={busy} onClick={() => void revoke(row)}>Thu hồi</Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="border-t border-hairline px-4 py-3">
              <Pagination
                page={safePage}
                pages={totalPages}
                pageSize={PAGE_SIZE}
                total={filteredInvitations.length}
                onPage={setPage}
              />
            </div>
          )}
        </section>
      )}

      {inviteOpen && (
        <Modal
          open
          onClose={() => { if (!busy) setInviteOpen(false) }}
          title="Mời chuyên gia doanh nghiệp"
          description="Liên kết kích hoạt được gửi riêng tới email chuyên gia và không hiển thị lại trên hệ thống."
          className="max-w-xl"
        >
          {error && (
            <div role="alert" className="mb-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">
              {error}
            </div>
          )}
          <form onSubmit={invite} className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Email
              <input
                type="email"
                required
                value={form.email}
                disabled={busy}
                onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
                className="min-h-11 rounded-lg border border-hairline bg-card px-3 font-normal text-ink"
                placeholder="expert@company.com"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Họ tên
              <input
                required
                value={form.fullName}
                disabled={busy}
                onChange={event => setForm(prev => ({ ...prev, fullName: event.target.value }))}
                className="min-h-11 rounded-lg border border-hairline bg-card px-3 font-normal text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Tổ chức
              <input
                required
                value={form.organization}
                disabled={busy}
                onChange={event => setForm(prev => ({ ...prev, organization: event.target.value }))}
                className="min-h-11 rounded-lg border border-hairline bg-card px-3 font-normal text-ink"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi lời mời'}</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setInviteOpen(false)}>Đóng</Button>
            </div>
          </form>
        </Modal>
      )}
    </WorkspacePage>
  )
}
