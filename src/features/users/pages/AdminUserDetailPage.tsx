import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { BackLink } from '../../../components/ui/BackLink'
import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'
import { ListLoading } from '../../../components/ui/ListLoading'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import { AcademicScopeFields } from '../../academic/components/AcademicScopeFields'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { createAcademicNameResolver } from '../../projects/components/academic-name-resolver'
import { utcTimestamp } from '../../projects/utils/collaboration-workspace'
import {
  getUser,
  getUserActiveObligations,
  issueTemporaryPassword,
  updateAcademicProfile,
  type AcademicProfile,
  type TemporaryPasswordResult,
  type UserAccount,
  type UserActiveObligations,
} from '../api/admin-api'
import { AccountRoleAssignments } from '../components/AccountRoleAssignments'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import './admin-workspace.css'

type DetailState = 'loading' | 'ready' | 'missing' | 'forbidden' | 'error'

const userStatusTone: Record<UserAccount['status'], BadgeTone> = {
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
    ? navigationState.returnTo
    : '/admin/access'
  const id = Number(userId)
  const { session } = useAuthSession()
  const [academicNames, setAcademicNames] = useState(() => createAcademicNameResolver(null))
  const admin = useAdminWorkspace()
  const [user, setUser] = useState<UserAccount | null>(null)
  const [state, setState] = useState<DetailState>('loading')
  const [notice, setNotice] = useState<string | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)
  const [academicProfile, setAcademicProfile] = useState<AcademicProfile | null>(null)
  const [profileDraft, setProfileDraft] = useState({ departmentId: '', majorId: '' })
  const [academicEditing, setAcademicEditing] = useState(false)
  const [profileBusy, setProfileBusy] = useState(false)
  const [lockModal, setLockModal] = useState<{
    action: 'deactivate' | 'block'
    loading: boolean
    obligations: UserActiveObligations | null
    loadError: string | null
    reason: string
    acknowledged: boolean
    submitting: boolean
  } | null>(null)
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    reason: string
    submitting: boolean
    result: TemporaryPasswordResult | null
    error: string | null
    copied: boolean
  } | null>(null)
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
    if (!session || !Number.isInteger(id) || id < 1) {
      setState('missing')
      return
    }
    setState('loading')
    try {
      const next = await getUser(id, session.accessToken)
      setUser(next)
      setAcademicProfile(null)
      if (!preserveProfileDraft) {
        setProfileDraft({
          departmentId: next.departmentId ? String(next.departmentId) : '',
          majorId: next.majorId ? String(next.majorId) : '',
        })
        setAcademicEditing(false)
      }
      setState('ready')
    } catch (reason) {
      setState(
        reason instanceof HttpError && reason.status === 403
          ? 'forbidden'
          : reason instanceof HttpError && reason.status === 404
            ? 'missing'
            : 'error',
      )
    }
  }, [id, session])

  useEffect(() => { void load() }, [load])

  function beginAcademicEdit() {
    if (!user) return
    setProfileDraft({
      departmentId: user.departmentId ? String(user.departmentId) : '',
      majorId: user.majorId ? String(user.majorId) : '',
    })
    setNotice(null)
    setErrorNotice(null)
    setAcademicEditing(true)
  }

  function cancelAcademicEdit() {
    if (user) {
      setProfileDraft({
        departmentId: user.departmentId ? String(user.departmentId) : '',
        majorId: user.majorId ? String(user.majorId) : '',
      })
    }
    setNotice(null)
    setErrorNotice(null)
    setAcademicEditing(false)
  }

  async function openLockDialog(action: 'deactivate' | 'block') {
    if (!user || !session) return
    setLockModal({
      action,
      loading: true,
      obligations: null,
      loadError: null,
      reason: '',
      acknowledged: false,
      submitting: false,
    })
    try {
      const obligations = await getUserActiveObligations(user.id, session.accessToken)
      setLockModal(current => current ? { ...current, loading: false, obligations } : null)
    } catch {
      setLockModal(current => current ? { ...current, loading: false, loadError: 'Không tải được bảng tác động nghiệp vụ. Bạn vẫn có thể xác nhận khóa khẩn cấp.' } : null)
    }
  }

  async function confirmLockAction() {
    if (!user || !lockModal || lockModal.submitting) return
    const hasObligations = (lockModal.obligations?.totalCount ?? 0) > 0
    if (hasObligations && !lockModal.acknowledged) return
    setLockModal(current => current ? { ...current, submitting: true } : null)
    setNotice(null)
    setErrorNotice(null)
    try {
      await admin[lockModal.action](user.id, {
        reason: lockModal.reason.trim() || null,
        acknowledgeObligations: hasObligations ? lockModal.acknowledged : true,
      })
      setLockModal(null)
      setNotice(hasObligations
        ? 'Đã cập nhật trạng thái tài khoản và gửi cảnh báo khẩn tới các Khoa bị ảnh hưởng.'
        : 'Máy chủ đã cập nhật trạng thái tài khoản.')
      await load()
    } catch (reason) {
      setLockModal(null)
      if (reason instanceof HttpError && reason.status === 409) {
        setErrorNotice(reason.problem?.detail || 'Không thể thực hiện khóa tài khoản (xung đột trạng thái hoặc quản trị viên cuối cùng).')
      } else {
        setErrorNotice('Chưa thể cập nhật trạng thái tài khoản. Hãy tải lại hồ sơ rồi thử lại.')
      }
    }
  }

  async function submitTemporaryPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !session || !tempPasswordModal || tempPasswordModal.submitting) return
    setTempPasswordModal(current => current ? { ...current, submitting: true, error: null } : null)
    try {
      const result = await issueTemporaryPassword(user.id, tempPasswordModal.reason.trim() || null, session.accessToken)
      setTempPasswordModal(current => current ? { ...current, submitting: false, result } : null)
      setNotice('Đã cấp mật khẩu tạm mới, thu hồi phiên cũ và bật yêu cầu đổi mật khẩu khi đăng nhập.')
      await load()
    } catch {
      setTempPasswordModal(current => current ? { ...current, submitting: false, error: 'Chưa thể cấp mật khẩu tạm. Hãy thử lại.' } : null)
    }
  }

  async function change(action: 'activate' | 'deactivate' | 'block' | 'unblock') {
    if (!user) return
    if (action === 'deactivate' || action === 'block') {
      await openLockDialog(action)
      return
    }
    const labels = { activate: 'Kích hoạt', deactivate: 'Vô hiệu hóa', block: 'Khóa', unblock: 'Mở khóa' }
    const confirmed = await requestConfirmation({
      title: `${labels[action]} tài khoản?`,
      description: `Máy chủ sẽ kiểm tra lại tài khoản ${user.fullName}, để bảo đảm hệ thống luôn có quản trị viên đang hoạt động.`,
      confirmLabel: `${labels[action]} tài khoản`,
      danger: false,
    })
    if (confirmed === null) return
    setNotice(null)
    setErrorNotice(null)
    try {
      await admin[action](user.id)
      setNotice('Máy chủ đã cập nhật trạng thái tài khoản.')
      await load()
    } catch {
      setErrorNotice('Chưa thể cập nhật trạng thái tài khoản. Hãy tải lại hồ sơ rồi thử lại.')
    }
  }

  const numericOrNull = (value: string) => {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }

  async function saveAcademicProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !session) return
    setNotice(null)
    setErrorNotice(null)
    if (!user.concurrencyToken) {
      setErrorNotice('Thông tin phiên bản tài khoản chưa đầy đủ. Tải lại hồ sơ trước khi chỉnh sửa.')
      return
    }
    if (profileDraft.majorId && !profileDraft.departmentId) {
      setErrorNotice('Chọn bộ môn trước khi chọn ngành.')
      return
    }
    setProfileBusy(true)
    try {
      const result = await updateAcademicProfile(user.id, {
        departmentId: numericOrNull(profileDraft.departmentId),
        majorId: numericOrNull(profileDraft.majorId),
        concurrencyToken: user.concurrencyToken,
      }, session.accessToken)
      setAcademicProfile(result)
      setUser(current => (current ? { ...current, departmentId: result.departmentId, majorId: result.majorId, concurrencyToken: result.concurrencyToken } : current))
      setProfileDraft({
        departmentId: result.departmentId ? String(result.departmentId) : '',
        majorId: result.majorId ? String(result.majorId) : '',
      })
      setAcademicEditing(false)
      setNotice('Đã cập nhật bộ môn và ngành theo dữ liệu máy chủ.')
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        await load(true)
        setErrorNotice('Hồ sơ học vụ đã thay đổi. Thông tin mới đã được tải lại; dữ liệu bạn nhập được giữ để kiểm tra trước khi gửi lại.')
      } else {
        setErrorNotice(academicUpdateError(reason))
      }
    } finally {
      setProfileBusy(false)
    }
  }

  return (
    <div className="workspace-page admin-workspace admin-detail" aria-labelledby="admin-user-title">
      {state !== 'ready' && (
        <div className="workspace-context">
          <BackLink className="workspace-back-inline" fallback={returnTo}>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            <span>Danh sách tài khoản</span>
          </BackLink>
        </div>
      )}

      {state === 'loading' && <ListLoading label="Đang tải hồ sơ tài khoản…" />}
      {state === 'forbidden' && <p className="admin-error" role="alert">Bạn không có quyền xem hồ sơ tài khoản này.</p>}
      {state === 'missing' && <p className="admin-error" role="alert">Không tìm thấy tài khoản.</p>}
      {state === 'error' && (
        <p className="admin-error" role="alert">
          Chưa tải được hồ sơ tài khoản. <Button size="sm" variant="outline" onClick={() => void load()}>Thử lại</Button>
        </p>
      )}

      {state === 'ready' && user && (
        <>
          <header className="admin-heading admin-user-heading">
            <div className="admin-user-identity">
              <Avatar name={user.fullName} size="lg" />
              <div>
                <div className="workspace-context">
                  <BackLink className="workspace-back-inline" fallback={returnTo}>
                    <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                    <span>Danh sách tài khoản</span>
                  </BackLink>
                  <span className="workspace-context-sep" aria-hidden="true" />
                  <p className="admin-kicker !m-0">{user.studentCode || user.employeeCode || 'Hồ sơ tài khoản'}</p>
                </div>
                <h1 id="admin-user-title">{user.fullName}</h1>
                <p>{user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user.roles.map(role => (
                <StatusBadge
                  key={role}
                  tone="neutral"
                  label={role === 'LECTURER' ? 'Giảng viên' : role === 'EVALUATOR' ? 'Người chấm' : displayLabel(role)}
                />
              ))}
              <StatusBadge tone={userStatusTone[user.status]} label={displayLabel(user.status)} />
            </div>
          </header>

          {notice && <p className="admin-notice" role="status"><span className="material-symbols-outlined admin-notice__icon" aria-hidden="true">check_circle</span><span>{notice}</span></p>}
          {errorNotice && <p className="admin-error" role="alert">{errorNotice}</p>}

          <div className="admin-detail-grid">
            <section className="admin-panel" aria-labelledby="admin-identity-title">
              <h2 id="admin-identity-title">Danh tính và liên hệ</h2>
              <dl>
                <dt>Email</dt><dd>{user.email}</dd>
                <dt>Mã tài khoản</dt><dd>{user.studentCode ?? user.employeeCode ?? 'Không có'}</dd>
                <dt>Chức danh</dt><dd>{user.title ?? 'Chưa cập nhật'}</dd>
                <dt>Điện thoại</dt><dd>{user.phone ?? 'Chưa cập nhật'}</dd>
              </dl>
            </section>

            <section className="admin-panel" aria-labelledby="admin-security-title">
              <h2 id="admin-security-title">Trạng thái và bảo mật</h2>
              <dl>
                <dt>Lần đăng nhập thất bại</dt><dd>{user.accessFailedCount}</dd>
                <dt>Khóa đến</dt><dd>{user.lockoutEndAt ? new Date(utcTimestamp(user.lockoutEndAt)).toLocaleString('vi-VN') : 'Không có'}</dd>
              </dl>
              <div className="admin-actions">
                {user.status !== 'ACTIVE' && <Button onClick={() => void change('activate')}>Kích hoạt</Button>}
                {user.status !== 'INACTIVE' && <Button variant="secondary" onClick={() => void change('deactivate')}>Vô hiệu hóa</Button>}
                {user.status !== 'SUSPENDED' ? (
                  <Button variant="danger" onClick={() => void change('block')}>Khóa</Button>
                ) : (
                  <Button variant="secondary" onClick={() => void change('unblock')}>Mở khóa</Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setTempPasswordModal({ reason: '', submitting: false, result: null, error: null, copied: false })}
                >
                  Cấp mật khẩu tạm
                </Button>
              </div>
            </section>

            <div className="lg:col-span-2">
              <AccountRoleAssignments
                user={user}
                roles={admin.rbac?.value.roles ?? []}
                rolesState={admin.rbac?.state ?? 'error'}
                accessToken={session?.accessToken ?? ''}
                onReadback={setUser}
              />
            </div>

            <section className="admin-panel admin-academic-profile" aria-labelledby="admin-academic-title">
              <div className="admin-panel-heading">
                <div>
                  <h2 id="admin-academic-title">Phạm vi học thuật</h2>
                  <p>Bộ môn và ngành được máy chủ xác nhận.</p>
                </div>
                {!academicEditing && (
                  <Button type="button" variant="secondary" onClick={beginAcademicEdit} disabled={!user.concurrencyToken}>
                    Chỉnh sửa phạm vi học thuật
                  </Button>
                )}
              </div>
              <dl className="mt-4">
                <dt>Bộ môn hiện tại</dt>
                <dd>{academicProfile?.departmentName ?? (user.departmentId ? academicNames.department(user.departmentId) : 'Chưa liên kết')}</dd>
                <dt>Ngành hiện tại</dt>
                <dd>{academicProfile?.majorName ?? (user.majorId ? academicNames.major(user.majorId) : 'Chưa liên kết')}</dd>
                {(academicProfile?.classCode ?? user.classCode) && (
                  <>
                    <dt>Lớp hành chính</dt>
                    <dd>{academicProfile?.classCode ?? user.classCode}</dd>
                  </>
                )}
                {(academicProfile?.specializationName ?? user.specializationName) && (
                  <>
                    <dt>Chuyên ngành hẹp</dt>
                    <dd>
                      {academicProfile?.specializationCode ?? user.specializationCode ? `${academicProfile?.specializationCode ?? user.specializationCode} · ` : ''}
                      {academicProfile?.specializationName ?? user.specializationName}
                    </dd>
                  </>
                )}
                {(academicProfile?.curriculumCode ?? user.curriculumCode) && (
                  <>
                    <dt>Khung CTĐT</dt>
                    <dd>{academicProfile?.curriculumCode ?? user.curriculumCode}</dd>
                  </>
                )}
                {academicProfile && (
                  <>
                    <dt>Trạng thái hồ sơ</dt>
                    <dd><StatusBadge tone={academicProfile.status === 'VERIFIED' ? 'success' : academicProfile.status === 'REJECTED' ? 'danger' : 'warning'} label={displayLabel(academicProfile.status)} /></dd>
                  </>
                )}
              </dl>
              {academicEditing && (
                <form className="admin-form" onSubmit={(event) => void saveAcademicProfile(event)}>
                  <AcademicScopeFields {...profileDraft} onChange={setProfileDraft} disabled={profileBusy || !user.concurrencyToken} />
                  <p className="admin-boundary">Thay đổi phạm vi có thể bị chặn khi tài khoản đang thuộc nhóm hoặc có phân công hướng dẫn/chấm còn hiệu lực.</p>
                  <div className="admin-actions">
                    <Button type="submit" disabled={profileBusy || !user.concurrencyToken}>
                      {profileBusy ? 'Đang cập nhật…' : 'Cập nhật phạm vi học thuật'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={cancelAcademicEdit} disabled={profileBusy}>
                      Hủy chỉnh sửa
                    </Button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </>
      )}

      {confirmationDialog}

      {lockModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="lock-obligations-title">
          <div className="w-full max-w-2xl rounded-2xl border border-hairline bg-card p-6 shadow-xl space-y-4">
            <h2 id="lock-obligations-title" className="text-lg font-bold text-ink">
              {lockModal.action === 'block' ? 'Khóa tài khoản' : 'Vô hiệu hóa tài khoản'}: {user.fullName}
            </h2>
            {lockModal.loading ? (
              <p className="text-sm text-ink-muted">Đang quét các vai trò và phân công đang hoạt động…</p>
            ) : (
              <>
                {lockModal.loadError && <p className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">{lockModal.loadError}</p>}
                {lockModal.obligations && lockModal.obligations.totalCount > 0 ? (
                  <div className="rounded-xl border border-status-error-border bg-status-error-bg p-4 space-y-3 text-sm">
                    <p className="font-semibold text-status-error-text">
                      Cảnh báo: Tài khoản đang giữ {lockModal.obligations.totalCount} vai trò/phân công hoạt động. Khi khóa khẩn cấp, hệ thống sẽ tự động gửi thông báo (In-App + Email) tới các Khoa bị ảnh hưởng.
                    </p>
                    <ul className="space-y-1 text-xs text-ink">
                      <li>• Nhóm / Đồ án sinh viên: <strong>{lockModal.obligations.teamMemberships.length}</strong></li>
                      <li>• Hướng dẫn (GVHD / Mentor): <strong>{lockModal.obligations.supervisions.length}</strong></li>
                      <li>• Phản biện cổng kiểm duyệt đang mở: <strong>{lockModal.obligations.gateReviews.length}</strong></li>
                      <li>• Hội đồng chấm (Cold/Defense) &amp; Phúc khảo đang mở: <strong>{lockModal.obligations.evaluationsAndAppeals.length}</strong></li>
                    </ul>
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-hairline bg-card p-2 text-xs">
                      {[
                        ...lockModal.obligations.teamMemberships,
                        ...lockModal.obligations.supervisions,
                        ...lockModal.obligations.gateReviews,
                        ...lockModal.obligations.evaluationsAndAppeals,
                      ].map((item, idx) => (
                        <p key={`${item.category}-${item.entityId}-${idx}`} className="py-0.5 text-ink-soft">
                          <strong>{item.projectCode ?? `#${item.entityId}`}</strong> · {item.roleOrScope} ({item.status}){item.departmentName ? ` — ${item.departmentName}` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">Tài khoản hiện không giữ vai trò hoạt động nào trên đồ án hay hội đồng.</p>
                )}
              </>
            )}
            <label className="block text-sm font-medium text-ink-soft">
              Lý do khóa / vô hiệu hóa (ghi Audit Log &amp; gửi Khoa)
              <textarea
                className="mt-1 w-full rounded-lg border border-hairline bg-canvas p-2.5 text-sm text-ink"
                rows={2}
                value={lockModal.reason}
                disabled={lockModal.submitting}
                onChange={e => setLockModal(current => current ? { ...current, reason: e.target.value } : null)}
                placeholder="Ví dụ: Sự cố bảo mật tài khoản, nghỉ phép đột xuất, kỷ luật học vụ..."
              />
            </label>
            {(lockModal.obligations?.totalCount ?? 0) > 0 && (
              <label className="flex items-start gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={lockModal.acknowledged}
                  disabled={lockModal.submitting}
                  onChange={e => setLockModal(current => current ? { ...current, acknowledged: e.target.checked } : null)}
                />
                <span>Tôi xác nhận khóa khẩn cấp và gửi cảnh báo tới Khoa quản lý liên quan.</span>
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" disabled={lockModal.submitting} onClick={() => setLockModal(null)}>Hủy</Button>
              <Button
                variant="danger"
                disabled={lockModal.loading || lockModal.submitting || ((lockModal.obligations?.totalCount ?? 0) > 0 && !lockModal.acknowledged)}
                onClick={() => void confirmLockAction()}
              >
                {lockModal.submitting ? 'Đang xử lý…' : lockModal.action === 'block' ? 'Xác nhận khóa tài khoản' : 'Xác nhận vô hiệu hóa'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {tempPasswordModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="temp-password-title">
          <div className="w-full max-w-lg rounded-2xl border border-hairline bg-card p-6 shadow-xl space-y-4">
            <h2 id="temp-password-title" className="text-lg font-bold text-ink">Cấp mật khẩu tạm cho {user.fullName}</h2>
            {!tempPasswordModal.result ? (
              <form className="space-y-4" onSubmit={e => void submitTemporaryPassword(e)}>
                <p className="text-sm text-ink-soft">
                  Hệ thống sẽ sinh mật khẩu tạm mạnh (12 ký tự), đặt cờ bắt buộc đổi mật khẩu ở lần đăng nhập kế tiếp, mở khóa lockout 15 phút và thu hồi toàn bộ phiên đăng nhập cũ.
                </p>
                <label className="block text-sm font-medium text-ink-soft">
                  Lý do cấp mật khẩu tạm (tùy chọn)
                  <input
                    className="mt-1 w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm text-ink"
                    value={tempPasswordModal.reason}
                    disabled={tempPasswordModal.submitting}
                    onChange={e => setTempPasswordModal(current => current ? { ...current, reason: e.target.value } : null)}
                    placeholder="Ví dụ: Quên mật khẩu khi dịch vụ email tạm gián đoạn"
                  />
                </label>
                {tempPasswordModal.error && <p role="alert" className="text-sm text-status-error-text">{tempPasswordModal.error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" disabled={tempPasswordModal.submitting} onClick={() => setTempPasswordModal(null)}>Hủy</Button>
                  <Button type="submit" disabled={tempPasswordModal.submitting}>{tempPasswordModal.submitting ? 'Đang tạo…' : 'Tạo mật khẩu tạm'}</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-xs font-medium text-status-warning-text">
                  Mật khẩu tạm chỉ hiển thị đúng 1 lần duy nhất và không được lưu dạng văn bản thuần trên máy chủ. Hãy sao chép và bàn giao an toàn cho người dùng.
                </p>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas px-4 py-3">
                  <code className="font-mono text-base font-bold tracking-wider text-ink select-all">{tempPasswordModal.result.temporaryPassword}</code>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void navigator.clipboard?.writeText(tempPasswordModal.result!.temporaryPassword)
                      setTempPasswordModal(current => current ? { ...current, copied: true } : null)
                    }}
                  >
                    {tempPasswordModal.copied ? 'Đã sao chép' : 'Sao chép'}
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => setTempPasswordModal(null)}>Đã bàn giao &amp; đóng</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
