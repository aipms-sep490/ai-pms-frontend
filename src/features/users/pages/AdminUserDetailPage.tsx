import { AcademicScopeFields } from '../../academic/components/AcademicScopeFields'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import { createAcademicNameResolver } from '../../projects/components/academic-name-resolver'
import { utcTimestamp } from '../../projects/utils/collaboration-workspace'
import { displayLabel } from '../../../components/ui/display-label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getUser, updateAcademicProfile, type AcademicProfile, type UserAccount } from '../api/admin-api'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import { AccountRoleAssignments } from '../components/AccountRoleAssignments'
import './admin-workspace.css'

type DetailState = 'loading' | 'ready' | 'missing' | 'forbidden' | 'error'

const accountStatusTone: Record<UserAccount['status'], BadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  SUSPENDED: 'danger',
}

function academicUpdateError(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 400 || reason.status === 422) return 'Bộ môn hoặc ngành chưa hợp lệ. Chọn ngành thuộc bộ môn đang hoạt động rồi thử lại.'
    if (reason.status === 403) return 'Bạn chưa có quyền cập nhật hồ sơ học vụ này.'
    if (reason.status === 404) return 'Không tìm thấy tài khoản hoặc phạm vi học vụ đã chọn.'
  }
  return 'Chưa thể cập nhật phạm vi học thuật. Hãy kiểm tra kết nối và thử lại.'
}

export function AdminUserDetailPage() {
  const { userId } = useParams()
  const { state: navigationState } = useLocation()
  const returnTo = typeof navigationState?.returnTo === 'string' && /^\/admin\/access(?:\?|$)/.test(navigationState.returnTo)
    ? navigationState.returnTo : '/admin/access'
  const id = Number(userId)
  const { session } = useAuthSession()
  const [academicNames, setAcademicNames] = useState(() => createAcademicNameResolver(null))
  const admin = useAdminWorkspace()
  const [user, setUser] = useState<UserAccount | null>(null)
  const [state, setState] = useState<DetailState>('loading')
  const [notice, setNotice] = useState<string | null>(null)
  const [academicProfile, setAcademicProfile] = useState<AcademicProfile | null>(null)
  const [profileDraft, setProfileDraft] = useState({ departmentId: '', majorId: '' })
  const [academicEditing, setAcademicEditing] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  useEffect(() => {
    if (!session) return
    const controller = new AbortController()
    getAcademicHierarchy(session.accessToken, { search: '', includeInactive: true }, controller.signal)
      .then(rows => { if (!controller.signal.aborted) setAcademicNames(createAcademicNameResolver(rows)) })
      .catch(() => undefined)
    return () => controller.abort()
  }, [session])

  const load = useCallback(async (preserveProfileDraft = false) => {
    if (!session || !Number.isInteger(id) || id < 1) { setState('missing'); return }
    setState('loading')
    try {
      const next = await getUser(id, session.accessToken)
      setUser(next)
      setAcademicProfile(null)
      if (!preserveProfileDraft) {
        setProfileDraft({ departmentId: next.departmentId ? String(next.departmentId) : '', majorId: next.majorId ? String(next.majorId) : '' })
        setAcademicEditing(false)
      }
      setState('ready')
    } catch (reason) {
      setState(reason instanceof HttpError && reason.status === 403 ? 'forbidden' : reason instanceof HttpError && reason.status === 404 ? 'missing' : 'error')
    }
  }, [id, session])

  useEffect(() => { void load() }, [load])

  function beginAcademicEdit() {
    if (!user) return
    setProfileDraft({ departmentId: user.departmentId ? String(user.departmentId) : '', majorId: user.majorId ? String(user.majorId) : '' })
    setNotice(null)
    setAcademicEditing(true)
  }

  function cancelAcademicEdit() {
    if (user) setProfileDraft({ departmentId: user.departmentId ? String(user.departmentId) : '', majorId: user.majorId ? String(user.majorId) : '' })
    setNotice(null)
    setAcademicEditing(false)
  }

  async function change(action: 'activate' | 'deactivate' | 'block' | 'unblock') {
    if (!user) return
    const labels = { activate: 'kích hoạt', deactivate: 'vô hiệu hóa', block: 'khóa', unblock: 'mở khóa' }
    const confirmed = await requestConfirmation({
      title: `${labels[action]} tài khoản?`,
      description: `Máy chủ sẽ kiểm tra lại tài khoản ${user.fullName}, để bảo đảm hệ thống luôn có quản trị viên đang hoạt động.`,
      confirmLabel: `${labels[action]} tài khoản`,
      danger: action === 'deactivate' || action === 'block',
    })
    if (confirmed === null) return
    try { await admin[action](user.id); setNotice('Máy chủ đã cập nhật trạng thái tài khoản.'); await load() }
    catch { setNotice('Chưa thể cập nhật trạng thái tài khoản. Hãy tải lại hồ sơ rồi thử lại.') }
  }

  const numericOrNull = (value: string) => { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null }

  async function saveAcademicProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !session) return
    if (!user.concurrencyToken) { setNotice('Thông tin phiên bản tài khoản chưa đầy đủ. Tải lại hồ sơ trước khi chỉnh sửa.'); return }
    if (profileDraft.majorId && !profileDraft.departmentId) { setNotice('Chọn bộ môn trước khi chọn ngành.'); return }
    setProfileBusy(true); setNotice(null)
    try {
      const result = await updateAcademicProfile(user.id, {
        departmentId: numericOrNull(profileDraft.departmentId),
        majorId: numericOrNull(profileDraft.majorId),
        concurrencyToken: user.concurrencyToken,
      }, session.accessToken)
      setAcademicProfile(result)
      setUser(current => current ? { ...current, departmentId: result.departmentId, majorId: result.majorId, concurrencyToken: result.concurrencyToken } : current)
      setProfileDraft({ departmentId: result.departmentId ? String(result.departmentId) : '', majorId: result.majorId ? String(result.majorId) : '' })
      setAcademicEditing(false)
      setNotice('Đã cập nhật bộ môn và ngành theo dữ liệu máy chủ.')
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        await load(true)
        setNotice('Hồ sơ học vụ đã thay đổi. Thông tin mới đã được tải lại; dữ liệu bạn nhập được giữ để kiểm tra trước khi gửi lại.')
      } else setNotice(academicUpdateError(reason))
    } finally { setProfileBusy(false) }
  }

  return <div className="workspace-page admin-workspace admin-detail space-y-5" aria-labelledby="admin-user-title">
    <Link className="admin-back !mb-0" to={returnTo}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Danh sách tài khoản</Link>
    {state === 'loading' && <p role="status" className="text-sm text-ink-muted">Đang tải hồ sơ tài khoản…</p>}
    {state === 'forbidden' && <p className="admin-error" role="alert">Bạn không có quyền xem hồ sơ tài khoản này.</p>}
    {state === 'missing' && <p className="admin-error" role="alert">Không tìm thấy tài khoản.</p>}
    {state === 'error' && <p className="admin-error" role="alert">Chưa tải được hồ sơ tài khoản. <Button size="sm" variant="outline" onClick={() => void load()}>Thử lại</Button></p>}
    {state === 'ready' && user && <>
      <header className="admin-heading admin-user-heading">
        <div className="admin-user-identity">
          <span className="admin-user-avatar" aria-hidden="true">{user.fullName.trim().charAt(0).toLocaleUpperCase('vi-VN')}</span>
          <div>
            <p className="admin-kicker">Tài khoản #{user.id}</p>
            <h1 id="admin-user-title">{user.fullName}</h1>
            <p>{user.email}</p>
          </div>
        </div>
        <StatusBadge tone={accountStatusTone[user.status]} label={displayLabel(user.status)} />
      </header>
      {notice && <p className="admin-notice" role="status">{notice}</p>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* Bento 1: Danh tính & liên hệ */}
        <section className="admin-bento-card lg:col-span-6" aria-labelledby="admin-identity-title">
          <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">person</span>
              <h2 id="admin-identity-title" className="font-heading text-sm font-bold text-ink">Danh tính và liên hệ</h2>
            </div>
            <span className="font-mono text-xs font-semibold text-ink-muted">#{user.id}</span>
          </div>
          <div className="p-5">
            <dl>
              <dt>Email</dt><dd>{user.email}</dd>
              <dt>Mã tài khoản</dt><dd className="font-mono">{user.studentCode ?? user.employeeCode ?? 'Không có'}</dd>
              <dt>Chức danh</dt><dd>{user.title ?? 'Chưa cập nhật'}</dd>
              <dt>Điện thoại</dt><dd className="tabular-nums">{user.phone ?? 'Chưa cập nhật'}</dd>
            </dl>
          </div>
        </section>

        {/* Bento 2: Trạng thái & bảo mật */}
        <section className="admin-bento-card lg:col-span-6" aria-labelledby="admin-security-title">
          <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">shield</span>
              <h2 id="admin-security-title" className="font-heading text-sm font-bold text-ink">Trạng thái và bảo mật</h2>
            </div>
            <StatusBadge tone={accountStatusTone[user.status]} label={displayLabel(user.status)} />
          </div>
          <div className="p-5">
            <dl>
              <dt>Lần đăng nhập thất bại</dt>
              <dd className="tabular-nums">{user.accessFailedCount}</dd>
              <dt>Khóa đến</dt>
              <dd className="tabular-nums">{user.lockoutEndAt ? new Date(utcTimestamp(user.lockoutEndAt)).toLocaleString('vi-VN') : 'Không có'}</dd>
            </dl>
            <div className="admin-actions mt-4 border-t border-hairline pt-4">
              {user.status !== 'ACTIVE' && <Button onClick={() => void change('activate')}>Kích hoạt</Button>}
              {user.status !== 'INACTIVE' && <Button variant="secondary" onClick={() => void change('deactivate')}>Vô hiệu hóa</Button>}
              {user.status !== 'SUSPENDED' ? <Button variant="danger" onClick={() => void change('block')}>Khóa</Button> : <Button variant="secondary" onClick={() => void change('unblock')}>Mở khóa</Button>}
            </div>
          </div>
        </section>

        {/* Bento 3: Vai trò tài khoản + Quản lý gán vai trò */}
        <div className="lg:col-span-6 space-y-5">
          <section className="admin-bento-card" aria-labelledby="admin-roles-title">
            <div className="flex items-center justify-between gap-2 border-b border-hairline bg-canvas/70 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">admin_panel_settings</span>
                <h2 id="admin-roles-title" className="font-heading text-sm font-bold text-ink">Vai trò tài khoản</h2>
              </div>
              <span className="inline-flex items-center rounded-full border border-hairline bg-card px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink-soft">
                {user.roles.length} vai trò
              </span>
            </div>
            <div className="p-5 space-y-2.5">
              <p className="text-sm font-semibold text-ink">{user.roles.map(role => role === 'LECTURER' ? 'Giảng viên' : role === 'EVALUATOR' ? 'Người chấm' : displayLabel(role)).join(', ') || 'Chưa có vai trò'}</p>
              <p className="admin-boundary">Vai trò hệ thống khác với phân công hướng dẫn hoặc đánh giá của từng đồ án.</p>
            </div>
          </section>
          <AccountRoleAssignments user={user} roles={admin.rbac?.value.roles ?? []} rolesState={admin.rbac?.state ?? 'error'} accessToken={session?.accessToken ?? ''} onReadback={setUser} />
        </div>

        {/* Bento 4: Phạm vi học thuật */}
        <section className="admin-bento-card admin-academic-profile lg:col-span-6" aria-labelledby="admin-academic-title">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-primary" aria-hidden="true">school</span>
              <div>
                <h2 id="admin-academic-title" className="font-heading text-sm font-bold text-ink">Phạm vi học thuật</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Bộ môn và ngành được máy chủ xác nhận.</p>
              </div>
            </div>
            {!academicEditing && <Button type="button" size="sm" variant="secondary" onClick={beginAcademicEdit} disabled={!user.concurrencyToken}>Chỉnh sửa phạm vi học thuật</Button>}
          </div>
          <div className="p-5">
            <dl>
              <dt>Bộ môn hiện tại</dt>
              <dd>{academicProfile?.departmentName ?? (user.departmentId ? academicNames.department(user.departmentId) : 'Chưa liên kết')}</dd>
              <dt>Ngành hiện tại</dt>
              <dd>{academicProfile?.majorName ?? (user.majorId ? academicNames.major(user.majorId) : 'Chưa liên kết')}</dd>
              {academicProfile && <>
                <dt>Trạng thái hồ sơ</dt>
                <dd><StatusBadge status={academicProfile.status} label={displayLabel(academicProfile.status)} /></dd>
              </>}
            </dl>
            {academicEditing && (
              <form className="admin-form mt-4 border-t border-hairline pt-4" onSubmit={(event) => void saveAcademicProfile(event)}>
                <AcademicScopeFields {...profileDraft} onChange={setProfileDraft} disabled={profileBusy || !user.concurrencyToken} />
                <p className="admin-boundary">Thay đổi phạm vi có thể bị chặn khi tài khoản đang thuộc nhóm hoặc có phân công hướng dẫn/chấm còn hiệu lực.</p>
                <div className="admin-actions">
                  <Button type="submit" disabled={profileBusy || !user.concurrencyToken}>{profileBusy ? 'Đang cập nhật…' : 'Cập nhật phạm vi học thuật'}</Button>
                  <Button type="button" variant="secondary" onClick={cancelAcademicEdit} disabled={profileBusy}>Hủy chỉnh sửa</Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </>}
    {confirmationDialog}
  </div>
}
