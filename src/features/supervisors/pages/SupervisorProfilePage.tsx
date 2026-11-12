import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { displayLabel } from '../../../components/ui/display-label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { list, replaceExpertise, updateOwnProfile, type Supervisor, type SupervisorExpertiseDraft } from '../api/supervisor-api'

const emptyExpertise = (): SupervisorExpertiseDraft => ({ name: '', proficiencyLevel: null })
const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const

function proficiencyLabel(level: string | null | undefined) {
  const mapped: Record<string, string> = {
    BEGINNER: 'Cơ bản',
    INTERMEDIATE: 'Trung cấp',
    ADVANCED: 'Nâng cao',
    EXPERT: 'Chuyên gia',
  }
  if (!level) return 'Chưa xác định'
  return mapped[level] ?? displayLabel(level)
}

function failureMessage(reason: unknown) {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
    if (reason.status === 403) return 'Bạn chưa có quyền cập nhật hồ sơ giảng viên trong phạm vi hiện tại.'
    if (reason.status === 404) return 'Không tìm thấy hồ sơ giảng viên cần cập nhật.'
    if (reason.status === 409) return 'Hồ sơ đã thay đổi. Dữ liệu mới sẽ được tải lại trước khi bạn thao tác tiếp.'
  }
  return 'Không thể đồng bộ hồ sơ giảng viên. Hãy thử lại.'
}

export function SupervisorProfilePage() {
  const { session } = useAuthSession()
  const [profile, setProfile] = useState<Supervisor | null>(null)
  const [bio, setBio] = useState('')
  const [available, setAvailable] = useState(true)
  const [expertise, setExpertise] = useState<SupervisorExpertiseDraft[]>([])
  const [loading, setLoading] = useState(Boolean(session))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const hydrate = (next: Supervisor | null) => {
    setProfile(next)
    setBio(next?.bio ?? '')
    setAvailable(next?.isAvailable ?? true)
    setExpertise(next?.expertise.map((item) => ({ name: item.name, proficiencyLevel: item.proficiencyLevel })) ?? [])
  }

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const directory = await list(session.accessToken, { search: session.user.fullName, page: 1, pageSize: 100 })
      hydrate(directory.items.find((item) => item.userId === session.user.id) ?? null)
    } catch (reason) {
      setError(failureMessage(reason))
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (error) summaryRef.current?.focus() }, [error])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session) return
    const invalid = expertise.findIndex((item) => !item.name.trim())
    if (invalid >= 0) {
      setError(`Chuyên môn ở dòng ${invalid + 1} cần có tên.`)
      return
    }
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const nextProfile = await updateOwnProfile(session.user.id, { bio: bio.trim() || null, isAvailable: available }, session.accessToken)
      const nextExpertise = expertise.map((item) => ({ name: item.name.trim(), proficiencyLevel: item.proficiencyLevel?.trim() || null }))
      const saved = await replaceExpertise(nextProfile.id, nextExpertise, session.accessToken)
      hydrate(saved)
      setMessage('Hồ sơ và chuyên môn đã được hệ thống cập nhật.')
    } catch (reason) {
      setError(failureMessage(reason))
      if (reason instanceof HttpError && reason.status === 409) await load()
    } finally {
      setSaving(false)
    }
  }

  if (!session) return <div className="workspace-page p-6"><Link to="/login">Đăng nhập để cập nhật hồ sơ giảng viên.</Link></div>
  return (
    <WorkspacePage
      size="standard"
      className="supervisor-profile-page space-y-5 pb-12"
      eyebrow="Hồ sơ giảng viên"
      title={session.user.fullName}
      description="Cập nhật chuyên môn, giới thiệu và khả năng nhận hướng dẫn đồ án."
      action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={loading || saving} onClick={() => void load()} />}
    >
      {error ? <div ref={summaryRef} role="alert" tabIndex={-1} className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><strong>Không thể lưu hồ sơ.</strong><p className="mt-1">{error}</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void load()}>Tải lại</Button></div> : null}
      {message ? (
        <div role="status" className="flex items-center gap-2.5 rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-4 text-sm text-ink shadow-xs">
          <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
          <span>{message}</span>
        </div>
      ) : null}
      {loading ? <section role="status" className="rounded-2xl border border-hairline bg-card p-6 text-sm text-ink-muted">Đang tải hồ sơ giảng viên từ hệ thống…</section> : null}
      {!loading ? (
        <form className="space-y-6 rounded-2xl border border-hairline bg-card p-6 shadow-xs" onSubmit={save} noValidate>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-5">
            <div className="flex items-center gap-3.5">
              <Avatar name={session.user.fullName} toneSeed={session.user.id} size="lg" shape="circle" />
              <div>
                <p className="font-heading text-base font-bold text-ink">{session.user.fullName}</p>
                {profile ? (
                  <p className="text-sm text-ink-muted">Bộ môn: {profile.departmentName}</p>
                ) : (
                  <p className="text-xs text-status-warning-text">Chưa khởi tạo hồ sơ giảng viên</p>
                )}
              </div>
            </div>
            <StatusBadge
              tone={available ? 'success' : 'neutral'}
              label={available ? 'Đang nhận hướng dẫn' : 'Tạm ngưng nhận mới'}
            />
          </div>

          {!profile ? (
            <p className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
              Chưa có hồ sơ giảng viên. Lần lưu đầu tiên sẽ tạo hồ sơ cho tài khoản đã xác thực này.
            </p>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-ink-soft" htmlFor="supervisor-bio">Giới thiệu chuyên môn</label>
            <textarea
              id="supervisor-bio"
              value={bio}
              maxLength={4000}
              rows={5}
              onChange={(event) => setBio(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line-strong bg-card p-3 text-sm text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              aria-describedby="supervisor-bio-help"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-ink-muted">
              <p id="supervisor-bio-help">Tối đa 4.000 ký tự. Để trống nếu chưa muốn công bố giới thiệu.</p>
              <span className="font-mono">{bio.length}/4000</span>
            </div>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-hairline bg-canvas p-3.5 text-sm font-medium text-ink-soft">
            <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} />
            Sẵn sàng nhận yêu cầu hướng dẫn
          </label>

          <section aria-labelledby="expertise-title" className="space-y-3 border-t border-hairline pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="expertise-title" className="font-heading text-lg font-bold text-ink">Chuyên môn</h2>
                <p className="text-sm text-ink-muted">Thêm các lĩnh vực bạn có thể hướng dẫn cho sinh viên.</p>
              </div>
              <Button type="button" variant="secondary" icon="add" onClick={() => setExpertise((items) => [...items, emptyExpertise()])}>Thêm chuyên môn</Button>
            </div>
            <div className="space-y-3">
              {expertise.map((item, index) => (
                <div key={index} className="workspace-editor-row grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem_auto]">
                  <label className="text-sm font-medium text-ink-soft">
                    Tên chuyên môn
                    <input
                      value={item.name}
                      maxLength={255}
                      onChange={(event) => setExpertise((items) => items.map((current, position) => position === index ? { ...current, name: event.target.value } : current))}
                      className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 text-ink"
                      aria-invalid={Boolean(error?.includes(`dòng ${index + 1}`))}
                    />
                  </label>
                  <label className="text-sm font-medium text-ink-soft">
                    Mức độ
                    <select
                      value={item.proficiencyLevel ?? ''}
                      onChange={(event) => setExpertise((items) => items.map((current, position) => position === index ? { ...current, proficiencyLevel: event.target.value || null } : current))}
                      className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 text-ink"
                    >
                      <option value="">Chưa xác định</option>
                      {PROFICIENCY_LEVELS.map((level) => (
                        <option key={level} value={level}>{proficiencyLabel(level)}</option>
                      ))}
                    </select>
                  </label>
                  <Button type="button" variant="outline" className="self-end" onClick={() => setExpertise((items) => items.filter((_, position) => position !== index))}>Xóa</Button>
                </div>
              ))}
            </div>
            {expertise.length === 0 ? <p className="text-sm text-ink-muted">Chưa khai báo chuyên môn.</p> : null}
          </section>

          <div className="flex flex-wrap gap-3 border-t border-hairline pt-5">
            <Button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu hồ sơ giảng viên'}</Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void load()}>Hủy thay đổi</Button>
          </div>
        </form>
      ) : null}
    </WorkspacePage>
  )
}
