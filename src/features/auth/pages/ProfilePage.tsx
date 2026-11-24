import { AcademicProfileSummary } from '../../academic/components/AcademicProfileSummary'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../context/useAuthSession'
import { getMyProfile, type EditableProfile, type StoredProfile } from '../api/auth-api'
import type { AuthSessionContextValue } from '../context/auth-session-context'
import type { LoginSession } from '../types/auth.types'
import './auth-pages.css'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { ProfileAvatar } from '../components/ProfileAvatar'

const PROFILE_ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Sinh viên',
  LECTURER: 'Giảng viên',
  DEPARTMENT_STAFF: 'Cán bộ bộ môn',
  ADMIN: 'Quản trị viên',
  INDUSTRY_EXPERT: 'Chuyên gia doanh nghiệp',
  SUPERVISOR: 'Giảng viên hướng dẫn',
  EVALUATOR: 'Người chấm đánh giá',
  MENTOR: 'Cố vấn chuyên môn',
}

function getProfileErrorMessage(error: Error): string {
  if (error instanceof HttpError) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
    if (error.status === 403) return 'Tài khoản không có quyền xem hồ sơ hiện tại.'
    if (error.status === 400 || error.status === 422) return 'Thông tin hồ sơ chưa hợp lệ. Kiểm tra họ tên, số điện thoại và chức danh rồi lưu lại.'
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
  const isPureStudent = session.user.roles.includes('STUDENT') && !session.user.roles.some(r => r !== 'STUDENT')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'fullName' | 'phone' | 'title', string>>>({})
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
      setFieldErrors({ fullName: 'Họ và tên không được để trống.' })
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

    const lengthErrors = {
      ...(fullName.length > 255 ? { fullName: 'Họ và tên tối đa 255 ký tự.' } : {}),
      ...(phone && phone.length > 30 ? { phone: 'Số điện thoại tối đa 30 ký tự.' } : {}),
      ...(title && title.length > 100 ? { title: 'Chức danh tối đa 100 ký tự.' } : {}),
    }
    if (Object.keys(lengthErrors).length) {
      setFieldErrors(lengthErrors)
      setFormError(Object.values(lengthErrors)[0])
      return
    }
    setFieldErrors({})

    const payload: EditableProfile = {
      fullName,
      ...(phone !== undefined ? { phone } : {}),
      ...(title !== undefined ? { title } : {}),
    }

    setSaving(true)
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
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormError(null)
    setFieldErrors({})
    setDirty({ phone: false, title: false })
  }

  return (
    <WorkspacePage
      size="wide"
      title="Hồ sơ tài khoản"
      eyebrow="Tài khoản cá nhân"
      description="Quản lý thông tin cá nhân và thiết lập bảo mật của bạn."
      action={
        <Button variant="secondary" size="sm" onClick={() => { void refreshProfile(); retryProfile() }} disabled={isRefreshing || profileLoading} icon="refresh" aria-label="Làm mới hồ sơ" title="Làm mới hồ sơ" />
      }
    >
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        {/* Left Bento Column: Identity Card, Avatar & Security Action */}
        <section className="workspace-surface flex flex-col gap-5 p-6 xl:col-span-4" aria-labelledby="profile-title">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left xl:flex-col xl:text-center">
            <ProfileAvatar key={session.user.id} fullName={session.user.fullName} userId={session.user.id} />
            <div className="min-w-0">
              <span className="mb-1.5 inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-primary">
                Hồ sơ đã xác thực
              </span>
              <h2 id="profile-title" className="text-xl font-bold text-ink">{session.user.fullName}</h2>
              <p className="mt-0.5 break-all text-xs text-ink-muted">{session.user.email}</p>
              {!isPureStudent && profile?.title && <p className="mt-1 text-sm font-medium text-ink-soft">{profile.title}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-4">
            <div className="rounded-lg border border-hairline bg-canvas/70 p-3">
              <span className="block text-xs text-ink-muted">Vai trò tài khoản</span>
              <strong className="mt-1 block text-xs font-bold text-ink">
                {session.user.roles.length > 0
                  ? session.user.roles
                      .map((role) => PROFILE_ROLE_LABELS[role] ?? displayLabel(role))
                      .join(', ')
                  : 'Chưa có vai trò'}
              </strong>
            </div>
            <div className="rounded-lg border border-hairline bg-canvas/70 p-3">
              <span className="block text-xs text-ink-muted">Trạng thái</span>
              <div className="mt-1"><StatusBadge tone="success" label="Đang hoạt động" /></div>
            </div>
          </div>

          {profile && !isEditing && (
            <div className="flex flex-col gap-2.5 border-t border-hairline pt-4">
              <Button icon="edit" onClick={() => setIsEditing(true)}>Chỉnh sửa hồ sơ</Button>
              <Link className="profile-security-link justify-center" to="/profile/security">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">shield</span>
                Bảo mật tài khoản
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
              </Link>
            </div>
          )}
        </section>

        {/* Right Bento Column: Contact Info, Academic Scope & Inline Editor */}
        <section className="workspace-surface flex flex-col gap-5 p-6 xl:col-span-8" aria-label="Thông tin chi tiết và học vụ">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted">Thông tin liên hệ</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-hairline bg-canvas/60 px-4 py-3">
                <span className="block text-xs text-ink-muted">Số điện thoại</span>
                <strong className="mt-0.5 block text-sm font-semibold text-ink">{profile?.phone || 'Chưa cập nhật'}</strong>
              </div>
              {!isPureStudent && (
                <div className="rounded-lg border border-hairline bg-canvas/60 px-4 py-3">
                  <span className="block text-xs text-ink-muted">Chức danh</span>
                  <strong className="mt-0.5 block text-sm font-semibold text-ink">{profile?.title || 'Chưa cập nhật'}</strong>
                </div>
              )}
            </div>
          </div>

          <AcademicProfileSummary />
          {(error || formError) && <p className="auth-error" role="alert">{formError ?? getProfileErrorMessage(error!)}</p>}
          {profileLoading && !profile && <p className="auth-status" role="status">Đang tải thông tin hồ sơ…</p>}
          {profileError && <div className="auth-error" role="alert"><p>{getProfileErrorMessage(profileError)}</p><Button type="button" variant="secondary" onClick={retryProfile}>Thử lại tải hồ sơ</Button></div>}
          {formSuccess && <p className="auth-status" role="status">{formSuccess}</p>}

          {isEditing && profile ? (
            <form className="auth-form border-t border-hairline pt-5" onSubmit={submit} noValidate>
              <div className="profile-form-heading"><h3>Chỉnh sửa thông tin cá nhân</h3><p>Các thay đổi chỉ được lưu sau khi máy chủ xác nhận.</p></div>
              <label htmlFor="profile-name">Họ và tên</label>
              <input id="profile-name" name="fullName" defaultValue={session.user.fullName} required aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby={fieldErrors.fullName ? 'profile-name-error' : undefined} onChange={() => { setFieldErrors(current => ({ ...current, fullName: undefined })); setFormError(null) }} />
              {fieldErrors.fullName && <p id="profile-name-error" className="profile-field-error">{fieldErrors.fullName}</p>}

              <label htmlFor="profile-phone">Số điện thoại</label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={profile.phone ?? ''}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? 'profile-phone-error' : undefined}
                onChange={() => { setDirty((d) => ({ ...d, phone: true })); setFieldErrors(current => ({ ...current, phone: undefined })); setFormError(null) }}
              />
              {fieldErrors.phone && <p id="profile-phone-error" className="profile-field-error">{fieldErrors.phone}</p>}

              {!isPureStudent && (
                <>
                  <label htmlFor="profile-job-title">Chức danh</label>
                  <input
                    id="profile-job-title"
                    name="title"
                    autoComplete="organization-title"
                    defaultValue={profile.title ?? ''}
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? 'profile-title-error' : undefined}
                    onChange={() => { setDirty((d) => ({ ...d, title: true })); setFieldErrors(current => ({ ...current, title: undefined })); setFormError(null) }}
                  />
                  {fieldErrors.title && <p id="profile-title-error" className="profile-field-error">{fieldErrors.title}</p>}
                </>
              )}

              <div className="auth-actions">
                <Button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu hồ sơ'}</Button>
                <Button type="button" variant="secondary" disabled={saving} onClick={handleCancel}>
                  Hủy
                </Button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </WorkspacePage>
  )
}
