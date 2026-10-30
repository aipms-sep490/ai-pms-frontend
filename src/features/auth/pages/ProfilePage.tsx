import { AcademicProfileSummary } from '../../academic/components/AcademicProfileSummary'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../context/useAuthSession'
import { getMyProfile, type EditableProfile, type StoredProfile } from '../api/auth-api'
import type { AuthSessionContextValue } from '../context/auth-session-context'
import type { LoginSession } from '../types/auth.types'
import './auth-pages.css'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'

function getProfileErrorMessage(error: Error): string {
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
    if (error.status === 403) return 'Tài khoản không có quyền xem hồ sơ hiện tại.'
  }

  return 'Không thể kết nối dịch vụ hồ sơ. Hãy thử lại.'
}

export function ProfilePage() {
  const auth = useAuthSession()
  if (!auth.session) {
    return (
      <section className="auth-profile-empty" aria-labelledby="profile-access-title">
        <p className="auth-eyebrow">Hồ sơ tài khoản</p>
        <h1 id="profile-access-title">Cần đăng nhập để xem hồ sơ</h1>
        <p>Đăng nhập để xem và cập nhật thông tin cá nhân.</p>
        <Link className="auth-link-button" to="/login">Mở trang đăng nhập</Link>
      </section>
    )
  }
  return <AuthenticatedProfile key={auth.session.user.id} {...auth} session={auth.session} />
}

function AuthenticatedProfile({ session, status, error, refreshProfile, updateProfile }: AuthSessionContextValue & { session: LoginSession }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [dirty, setDirty] = useState<Record<'phone' | 'title', boolean>>({ phone: false, title: false })
  const [profile, setProfile] = useState<StoredProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<Error | null>(null)
  const requestId = useRef(0)

  const loadProfile = useCallback(async (signal?: AbortSignal) => {
    const request = ++requestId.current
    try {
      const latest = await getMyProfile(signal)
      if (!signal?.aborted && request === requestId.current) setProfile(latest)
    } catch (reason) {
      if (!signal?.aborted && request === requestId.current) setProfileError(reason instanceof Error ? reason : new Error('Profile read failed.'))
    } finally {
      if (!signal?.aborted && request === requestId.current) setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() => loadProfile(controller.signal))
    return () => controller.abort()
  }, [loadProfile])

  const retryProfile = () => {
    setProfileLoading(true)
    setProfileError(null)
    void loadProfile()
  }

  const isRefreshing = status === 'refreshing'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get('fullName') ?? '').trim()
    if (!fullName) {
      setFormError('Họ và tên không được để trống.')
      setFormSuccess(null)
      return
    }
    if (!updateProfile) {
      setFormError('Chức năng cập nhật hồ sơ hiện chưa sẵn sàng.')
      setFormSuccess(null)
      return
    }
    setFormError(null)
    setFormSuccess(null)

    // Untouched fields are omitted so updateMyProfile reads their current server values.
    const phoneRaw = form.get('phone')
    const titleRaw = form.get('title')

    const phone = dirty.phone
      ? (String(phoneRaw ?? '').trim() || null)
      : undefined

    const title = dirty.title
      ? (String(titleRaw ?? '').trim() || null)
      : undefined

    const payload: EditableProfile = {
      fullName,
      ...(phone !== undefined ? { phone } : {}),
      ...(title !== undefined ? { title } : {}),
    }

    try {
      const updated = await updateProfile(payload)
      if (updated.phone === undefined || updated.title === undefined) throw new Error('The saved profile response is incomplete.')
      ++requestId.current
      setProfile({ phone: updated.phone, title: updated.title })
      setProfileLoading(false)
      setProfileError(null)
      setFormSuccess('Đã cập nhật hồ sơ của bạn.')
      setIsEditing(false)
      setDirty({ phone: false, title: false })
    } catch (reason) {
      setFormError(getProfileErrorMessage(reason instanceof Error ? reason : new Error()))
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormError(null)
    setDirty({ phone: false, title: false })
  }

  return (
    <WorkspacePage
      title="Hồ sơ tài khoản"
      eyebrow="Tài khoản cá nhân"
      description="Quản lý thông tin cá nhân và thiết lập bảo mật của bạn."
      action={
        <Button variant="secondary" onClick={() => { void refreshProfile(); retryProfile() }} disabled={isRefreshing || profileLoading} icon="refresh">
          {isRefreshing || profileLoading ? 'Đang làm mới…' : 'Làm mới hồ sơ'}
        </Button>
      }
    >
      <section className="profile-workspace workspace-surface" aria-labelledby="profile-title">
        <div className="profile-identity">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
            {session.user.fullName.charAt(0)}
          </div>
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary/20 font-mono text-xs font-bold uppercase tracking-wider mb-1">
              Hồ sơ đã xác thực
            </span>
            <h2 id="profile-title" className="text-xl font-bold text-ink">{session.user.fullName}</h2>
            <p className="auth-description text-xs text-ink-muted mt-0.5">{session.user.email}</p>
            {profile?.title && <p className="text-sm font-medium text-ink-muted mt-0.5">{profile.title}</p>}
          </div>
        </div>

        <div className="auth-profile-grid">
          <div>
            <span>Mã tài khoản</span>
            <strong>#{session.user.id}</strong>
          </div>
          <div>
            <span>Vai trò tài khoản</span>
            <strong>
              {session.user.roles.length > 0
                ? session.user.roles
                    .map(
                      (role) =>
                        ({
                          STUDENT: 'Sinh viên',
                          LECTURER: 'Giảng viên',
                          DEPARTMENT_STAFF: 'Cán bộ bộ môn',
                          ADMIN: 'Quản trị viên',
                        }[role] ?? role)
                    )
                    .join(', ')
                : 'Chưa có vai trò'}
            </strong>
          </div>
          {profile?.title && (
            <div>
              <span>Chức danh</span>
              <strong>{profile.title}</strong>
            </div>
          )}
          {profile?.phone && (
            <div>
              <span>Số điện thoại</span>
              <strong>{profile.phone}</strong>
            </div>
          )}
        </div>

        <AcademicProfileSummary />
        {(error || formError) && <p className="auth-error" role="alert">{formError ?? getProfileErrorMessage(error!)}</p>}
        {profileLoading && !profile && <p className="auth-status" role="status">Đang tải thông tin hồ sơ…</p>}
        {profileError && <div className="auth-error" role="alert"><p>{getProfileErrorMessage(profileError)}</p><Button type="button" variant="secondary" onClick={retryProfile}>Thử lại tải hồ sơ</Button></div>}
        {formSuccess && <p className="auth-status" role="status">{formSuccess}</p>}

        {isEditing && profile ? (
          <form className="auth-form" onSubmit={submit} noValidate>
            <label htmlFor="profile-name">Họ và tên</label>
            <input id="profile-name" name="fullName" defaultValue={session.user.fullName} required />

            <label htmlFor="profile-phone">Số điện thoại</label>
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue={profile.phone ?? ''}
              onChange={() => setDirty((d) => ({ ...d, phone: true }))}
            />

            <label htmlFor="profile-job-title">Chức danh</label>
            <input
              id="profile-job-title"
              name="title"
              autoComplete="organization-title"
              defaultValue={profile.title ?? ''}
              onChange={() => setDirty((d) => ({ ...d, title: true }))}
            />

            <div className="auth-actions">
              <Button type="submit">Lưu hồ sơ</Button>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Hủy
              </Button>
            </div>
          </form>
        ) : profile ? (
          <div className="auth-actions">
            <Button onClick={() => setIsEditing(true)}>Chỉnh sửa hồ sơ</Button>
            <Link className="profile-security-link" to="/profile/security">
              Bảo mật tài khoản
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        ) : null}
      </section>
    </WorkspacePage>
  )
}
