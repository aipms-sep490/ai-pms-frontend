import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useClientPagination } from '../../components/ui/useClientPagination'
import type { BadgeTone } from '../../components/ui/status-badge-tone'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
import { HttpError } from '../../services/http/http-client'
import { getIndustryInvitations, inviteIndustryExpert, revokeIndustryInvitation, type ExpertInvitation, type ExpertInvitationStatus } from './industry-api'

const statusText: Record<ExpertInvitationStatus, string> = { PENDING: 'Chờ nhận lời mời', CONSUMED: 'Đã kích hoạt', EXPIRED: 'Hết hạn', REVOKED: 'Đã thu hồi' }
const statusTone: Record<ExpertInvitationStatus, BadgeTone> = { PENDING: 'warning', CONSUMED: 'success', EXPIRED: 'neutral', REVOKED: 'danger' }
const formatDateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

function message(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 409) return reason.problem?.detail || 'Email này đã gắn với một tài khoản khác.'
    if (reason.status === 503) return 'Chưa cấu hình Google/đường dẫn kích hoạt cho chuyên gia — liên hệ đội kỹ thuật trước khi mời.'
    return reason.problem?.detail || reason.message
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ email: '', fullName: '', organization: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try { setInvitations((await getIndustryInvitations(1, 100)).items); setError('') }
    catch (reason) { setError(message(reason)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const pagination = useClientPagination(invitations, 8)
  const pendingCount = invitations.filter(row => row.status === 'PENDING').length
  const consumedCount = invitations.filter(row => row.status === 'CONSUMED').length
  const closedCount = invitations.filter(row => row.status === 'EXPIRED' || row.status === 'REVOKED').length

  async function invite(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const email = form.email.trim(), fullName = form.fullName.trim(), organization = form.organization.trim()
    if (!email || !fullName || !organization) { setError('Vui lòng nhập đủ email, họ tên và tổ chức.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      await inviteIndustryExpert({ email, fullName, organization })
      setForm({ email: '', fullName: '', organization: '' })
      setNotice(`Đã gửi lời mời tới ${email}.`)
      await load()
    } catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }

  async function revoke(row: ExpertInvitation) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await revokeIndustryInvitation(row.id); setNotice(`Đã thu hồi lời mời của ${row.email}.`); await load() }
    catch (reason) { setError(message(reason)) }
    finally { setBusy(false) }
  }

  return (
    <WorkspacePage
      className="space-y-5"
      title="Mời chuyên gia doanh nghiệp"
      eyebrow="Cố vấn doanh nghiệp"
      description="Chuyên gia doanh nghiệp chỉ đóng vai trò cố vấn — không có vai trò học thuật, không có trọng số chấm điểm trừ khi phương án đánh giá được duyệt quy định khác."
    >
      <StatTileRow
        tiles={[
          {
            icon: 'mail',
            label: 'Tổng lời mời',
            value: invitations.length,
            caption: 'Thư mời cố vấn doanh nghiệp đã phát hành',
            hero: true,
          },
          {
            icon: 'hourglass_top',
            label: 'Đang chờ kích hoạt',
            value: pendingCount,
            tone: pendingCount > 0 ? 'warning' : 'neutral',
            caption: 'Chờ chuyên gia xác thực qua Google',
          },
          {
            icon: 'verified_user',
            label: 'Đã tham gia',
            value: consumedCount,
            tone: consumedCount > 0 ? 'success' : 'neutral',
            caption: 'Tài khoản chuyên gia đã hoạt động',
          },
          {
            icon: 'block',
            label: 'Hết hạn / Đã thu hồi',
            value: closedCount,
            tone: 'neutral',
            caption: 'Lời mời không còn hiệu lực',
          },
        ]}
      />

      {error && <div role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-3.5 text-sm text-status-error-text">{error}</div>}
      {notice && <p role="status" className="rounded-xl border border-status-success-border bg-status-success-bg p-3.5 text-sm text-status-success-text">{notice}</p>}

      {/* Bento 2-column layout: Left 8 cols (Invitations table + Pagination) | Right 4 cols (Invite form) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
        <section className="xl:col-span-8 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <div>
              <h2 className="text-base font-bold text-ink">Danh sách lời mời chuyên gia</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Theo dõi trạng thái kích hoạt và thu hồi lời mời còn chờ.</p>
            </div>
            <StatusBadge tone="info" label={`${invitations.length} lời mời`} />
          </div>

          {loading ? (
            <p role="status" className="p-5 text-sm text-ink-muted">Đang tải danh sách lời mời…</p>
          ) : invitations.length === 0 ? (
            <p className="p-5 text-sm text-ink-muted">Chưa có lời mời nào.</p>
          ) : (
            <div>
              <Table stack aria-label="Danh sách lời mời chuyên gia">
                <TableHead>
                  <TableRow head>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Trạng thái</TableHeaderCell>
                    <TableHeaderCell>Hết hạn lúc</TableHeaderCell>
                    <TableHeaderCell>Thao tác</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagination.paginatedItems.map(row => (
                    <TableRow key={row.id}>
                      <TableCell label="Email" className="font-medium text-ink">{row.email}</TableCell>
                      <TableCell label="Trạng thái"><StatusBadge tone={statusTone[row.status]} label={statusText[row.status]} /></TableCell>
                      <TableCell label="Hết hạn lúc">{formatDateTime(row.expiresAt)}</TableCell>
                      <TableCell label="Thao tác">
                        {row.status === 'PENDING' && <Button size="sm" variant="danger" disabled={busy} onClick={() => void revoke(row)}>Thu hồi</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination.showPagination && (
                <div className="border-t border-hairline px-5 py-3">
                  <Pagination
                    page={pagination.page}
                    pages={pagination.totalPages}
                    total={pagination.total}
                    pageSize={pagination.pageSize}
                    pageSizeOptions={[8, 16, 30]}
                    onPage={pagination.setPage}
                    onPageSizeChange={pagination.setPageSize}
                  />
                </div>
              )}
            </div>
          )}
        </section>

        <form onSubmit={invite} className="xl:col-span-4 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
          <div className="bg-canvas/70 border-b border-hairline px-5 py-3.5">
            <h2 className="text-base font-bold text-ink">Mời chuyên gia mới</h2>
            <p className="mt-0.5 text-xs text-ink-muted">Liên kết kích hoạt bảo mật được gửi trực tiếp qua email.</p>
          </div>
          <div className="p-5 space-y-3.5">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Email
              <input
                type="email"
                required
                value={form.email}
                disabled={busy}
                onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
                className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-ink focus:border-primary focus:outline-none"
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
                className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-ink focus:border-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
              Tổ chức
              <input
                required
                value={form.organization}
                disabled={busy}
                onChange={event => setForm(prev => ({ ...prev, organization: event.target.value }))}
                className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-ink focus:border-primary focus:outline-none"
              />
            </label>
            <div className="pt-1">
              <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi lời mời'}</Button>
            </div>
          </div>
        </form>
      </div>
    </WorkspacePage>
  )
}
