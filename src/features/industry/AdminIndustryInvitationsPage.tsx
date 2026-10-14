import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/StatusBadge'
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

  return <WorkspacePage className="space-y-5" title="Mời chuyên gia doanh nghiệp" eyebrow="Industry Advisory"
    description="Chuyên gia doanh nghiệp chỉ đóng vai trò cố vấn — không có vai trò học thuật, không có trọng số chấm điểm trừ khi phương án đánh giá được duyệt quy định khác.">
    <form onSubmit={invite} className="workspace-surface grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">Email
        <input type="email" required value={form.email} disabled={busy} onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
          className="min-h-11 rounded-lg border border-hairline bg-card px-3" placeholder="expert@company.com" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">Họ tên
        <input required value={form.fullName} disabled={busy} onChange={event => setForm(prev => ({ ...prev, fullName: event.target.value }))}
          className="min-h-11 rounded-lg border border-hairline bg-card px-3" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">Tổ chức
        <input required value={form.organization} disabled={busy} onChange={event => setForm(prev => ({ ...prev, organization: event.target.value }))}
          className="min-h-11 rounded-lg border border-hairline bg-card px-3" />
      </label>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi lời mời'}</Button>
      </div>
    </form>

    {error && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">{error}</div>}
    {notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-3 text-sm text-status-success-text">{notice}</p>}

    {loading && <p role="status" className="text-sm text-slate-600">Đang tải danh sách lời mời…</p>}
    {!loading && invitations.length === 0 && <p className="text-sm text-slate-600">Chưa có lời mời nào.</p>}
    {!loading && invitations.length > 0 && <Table stack aria-label="Danh sách lời mời chuyên gia">
      <TableHead><TableRow head>
        <TableHeaderCell>Email</TableHeaderCell>
        <TableHeaderCell>Trạng thái</TableHeaderCell>
        <TableHeaderCell>Hết hạn lúc</TableHeaderCell>
        <TableHeaderCell>Thao tác</TableHeaderCell>
      </TableRow></TableHead>
      <TableBody>{invitations.map(row => <TableRow key={row.id}>
        <TableCell label="Email" className="font-medium text-slate-900">{row.email}</TableCell>
        <TableCell label="Trạng thái"><StatusBadge tone={statusTone[row.status]} label={statusText[row.status]} /></TableCell>
        <TableCell label="Hết hạn lúc">{formatDateTime(row.expiresAt)}</TableCell>
        <TableCell label="Thao tác">
          {row.status === 'PENDING' && <Button size="sm" variant="danger" disabled={busy} onClick={() => void revoke(row)}>Thu hồi</Button>}
        </TableCell>
      </TableRow>)}</TableBody>
    </Table>}
  </WorkspacePage>
}
