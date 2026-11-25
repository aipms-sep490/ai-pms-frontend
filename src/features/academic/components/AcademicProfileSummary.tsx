import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import {
  listSpecializations,
  updateMyStudentAcademic,
  type DepartmentSpecialization,
} from '../../department/api/department-students-api'
import {
  academicProfileStatus,
  getMyAcademicProfile,
  type AcademicProfile,
} from '../api/profile-verification-api'

const statusTone: Record<string, BadgeTone> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
}

const CLASS_CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9._ /-]{0,49}$/

function updateErrorText(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 409) {
      return 'Hồ sơ học vụ đã được Khoa xác minh hoặc bạn đang tham gia nhóm đồ án nên không thể tự sửa. Vui lòng liên hệ Giáo vụ Khoa nếu cần điều chỉnh.'
    }
    if (reason.status === 422 || reason.status === 400) {
      return reason.problem?.detail || 'Lớp hành chính hoặc chuyên ngành hẹp chưa hợp lệ theo phạm vi Khoa/Ngành của bạn.'
    }
    if (reason.status === 403) return 'Chỉ tài khoản sinh viên mới có thể tự cập nhật mục này.'
  }
  return 'Chưa thể cập nhật lớp và chuyên ngành hẹp. Vui lòng thử lại.'
}

export function AcademicProfileSummary() {
  const { session } = useAuthSession()
  const isStudent = Boolean(session?.user.roles.includes('STUDENT'))
  const [profile, setProfile] = useState<AcademicProfile | null>(null)
  const [error, setError] = useState<'missing' | 'failed' | null>(null)
  const [revision, setRevision] = useState(0)

  const [specializations, setSpecializations] = useState<DepartmentSpecialization[]>([])
  const [editing, setEditing] = useState(false)
  const [classCode, setClassCode] = useState('')
  const [specializationId, setSpecializationId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getMyAcademicProfile()
      .then(result => {
        if (!active) return
        setProfile(result)
        setError(null)
        setClassCode(result.classCode ?? '')
        setSpecializationId(result.specializationId ? String(result.specializationId) : '')
      })
      .catch(reason => {
        if (active) setError(reason instanceof HttpError && reason.status === 404 ? 'missing' : 'failed')
      })
    return () => { active = false }
  }, [revision])

  useEffect(() => {
    if (!isStudent || !profile?.departmentId) return
    const controller = new AbortController()
    listSpecializations(
      { departmentId: profile.departmentId, majorId: profile.majorId ?? undefined, includeInactive: false },
      controller.signal,
    )
      .then(list => { if (!controller.signal.aborted) setSpecializations(list) })
      .catch(() => undefined)
    return () => controller.abort()
  }, [isStudent, profile?.departmentId, profile?.majorId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || saving) return
    const trimmedClass = classCode.trim()
    if (!trimmedClass) {
      setSaveError('Vui lòng nhập Lớp hành chính (ví dụ: SE1801, MKT1802).')
      return
    }
    if (!CLASS_CODE_REGEX.test(trimmedClass)) {
      setSaveError('Lớp hành chính phải bắt đầu bằng chữ/số và chỉ chứa ký tự hợp lệ (A-Z, 0-9, khoảng trắng, ".", "_", "-", "/", tối đa 50 ký tự).')
      return
    }
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const updated = await updateMyStudentAcademic({
        classCode: trimmedClass,
        specializationId: Number(specializationId) > 0 ? Number(specializationId) : null,
      })
      setProfile(updated)
      setClassCode(updated.classCode ?? '')
      setSpecializationId(updated.specializationId ? String(updated.specializationId) : '')
      setEditing(false)
      setSaveSuccess('Đã cập nhật lớp hành chính và chuyên ngành hẹp. Hồ sơ đang ở trạng thái Chờ Khoa xác minh.')
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        setRevision(r => r + 1)
        setEditing(false)
      }
      setSaveError(updateErrorText(reason))
    } finally {
      setSaving(false)
    }
  }

  const isLocked = profile?.status === 'VERIFIED'

  return (
    <section className="flex flex-1 flex-col border-t border-hairline pt-5" aria-labelledby="academic-profile-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="academic-profile-title" className="text-xs font-bold uppercase tracking-wider text-ink-muted">Thông tin học vụ</h3>
        {profile && (
          <StatusBadge
            tone={statusTone[profile.status] ?? 'neutral'}
            label={academicProfileStatus(profile.status)}
          />
        )}
      </div>

      {error === 'missing' ? (
        <p className="mt-2 text-sm text-ink-muted">Tài khoản chưa có hồ sơ học vụ.</p>
      ) : error ? (
        <p className="mt-2 text-sm text-ink-muted">
          Chưa tải được hồ sơ học vụ.{' '}
          <button
            type="button"
            className="min-h-9 rounded-md px-2 font-semibold text-primary hover:bg-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => { setError(null); setRevision(revision + 1) }}
          >
            Thử lại
          </button>
        </p>
      ) : profile ? (
        <div className="mt-3 flex flex-1 flex-col gap-3.5">
          <dl className="grid gap-3 sm:grid-cols-3">
            {profile.studentCode && (
              <div className="rounded-xl border border-hairline/80 bg-canvas/65 px-3.5 py-2.5">
                <dt className="text-xs text-ink-muted">MSSV</dt>
                <dd className="mt-1 font-mono text-sm font-semibold text-ink">{profile.studentCode}</dd>
              </div>
            )}
            <div className="rounded-xl border border-hairline/80 bg-canvas/65 px-3.5 py-2.5">
              <dt className="text-xs text-ink-muted">Bộ môn / Khoa</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">{profile.departmentName || 'Chưa cập nhật'}</dd>
            </div>
            <div className="rounded-xl border border-hairline/80 bg-canvas/65 px-3.5 py-2.5">
              <dt className="text-xs text-ink-muted">Chuyên ngành</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">{profile.majorName || 'Chưa cập nhật'}</dd>
            </div>
            {isStudent && (
              <>
                <div className="rounded-xl border border-hairline/80 bg-canvas/65 px-3.5 py-2.5">
                  <dt className="text-xs text-ink-muted">Khung CTĐT</dt>
                  <dd className={`mt-1 text-sm ${profile.curriculumCode ? 'font-semibold text-ink' : 'font-medium text-ink-muted'}`}>
                    {profile.curriculumCode || 'Chưa cập nhật'}
                  </dd>
                </div>
                <div className="rounded-xl border border-hairline/80 bg-canvas/65 px-3.5 py-2.5">
                  <dt className="text-xs text-ink-muted">Lớp hành chính</dt>
                  <dd className={`mt-1 text-sm ${profile.classCode ? 'font-semibold text-ink' : 'font-medium text-ink-muted'}`}>
                    {profile.classCode || 'Chưa nhập lớp'}
                  </dd>
                </div>
                <div className="rounded-xl border border-hairline/80 bg-canvas/65 px-3.5 py-2.5">
                  <dt className="text-xs text-ink-muted">Chuyên ngành hẹp</dt>
                  <dd className={`mt-1 text-sm ${profile.specializationName ? 'font-semibold text-ink' : 'font-medium text-ink-muted'}`}>
                    {profile.specializationName
                      ? `${profile.specializationCode ? `${profile.specializationCode} · ` : ''}${profile.specializationName}`
                      : 'Chưa chọn chuyên ngành hẹp'}
                  </dd>
                </div>
              </>
            )}
          </dl>

          {profile.rejectionReason && (
            <p className="text-sm text-status-warning-text">Cần bổ sung: {profile.rejectionReason}</p>
          )}
          {saveError && <p role="alert" className="text-sm text-status-error-text">{saveError}</p>}
          {saveSuccess && <p role="status" className="text-sm text-status-success-text">{saveSuccess}</p>}

          {isStudent && isLocked && (
            <p className="mt-auto flex items-start gap-2 rounded-xl border border-hairline/80 bg-canvas/75 px-3.5 py-2.5 text-xs leading-relaxed text-ink-muted">
              <span className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-ink-muted" aria-hidden="true">lock</span>
              <span>Hồ sơ học vụ đã được Khoa xác minh và khóa tự chỉnh sửa. Nếu lớp hoặc chuyên ngành hẹp có thay đổi, vui lòng liên hệ Giáo vụ Khoa.</span>
            </p>
          )}

          {isStudent && !isLocked && (
            editing ? (
              <form className="grid gap-3 rounded-lg border border-hairline bg-canvas p-4 sm:grid-cols-2" onSubmit={event => void handleSubmit(event)}>
                <label className="text-sm font-medium text-ink-soft">
                  Lớp hành chính *
                  <input
                    className="mt-1 block w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink"
                    value={classCode}
                    onChange={event => { setClassCode(event.target.value); setSaveError(null) }}
                    placeholder="Ví dụ: SE1801, MKT1802"
                    maxLength={50}
                    required
                    disabled={saving}
                  />
                </label>
                <label className="text-sm font-medium text-ink-soft">
                  Chuyên ngành hẹp
                  <select
                    className="mt-1 block w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink"
                    value={specializationId}
                    onChange={event => { setSpecializationId(event.target.value); setSaveError(null) }}
                    disabled={saving}
                  >
                    <option value="">Chọn chuyên ngành hẹp (theo Khoa)</option>
                    {specializations.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.code} · {spec.name}</option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Button type="submit" size="sm" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu lớp & chuyên ngành hẹp'}</Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => {
                      setEditing(false)
                      setClassCode(profile.classCode ?? '')
                      setSpecializationId(profile.specializationId ? String(profile.specializationId) : '')
                      setSaveError(null)
                    }}
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <Button size="sm" variant="secondary" onClick={() => { setEditing(true); setSaveSuccess(null); setSaveError(null) }}>
                  Cập nhật lớp & chuyên ngành hẹp
                </Button>
              </div>
            )
          )}
        </div>
      ) : (
        <p role="status" className="mt-2 text-sm text-ink-muted">Đang tải thông tin học vụ…</p>
      )}
    </section>
  )
}
