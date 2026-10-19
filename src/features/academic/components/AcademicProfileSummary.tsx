import { HttpError } from '../../../services/http/http-client'
import { useEffect, useState } from 'react'
import { getMyAcademicProfile, type AcademicProfile } from '../api/profile-verification-api'
import { academicProfileStatus } from '../api/profile-verification-api'
export function AcademicProfileSummary() {
  const [profile, setProfile] = useState<AcademicProfile | null>(null)
  const [error, setError] = useState<'missing' | 'failed' | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    void getMyAcademicProfile()
      .then(result => {
        if (active) {
          setProfile(result)
          setError(null)
        }
      })
      .catch(reason => {
        if (active) setError(reason instanceof HttpError && reason.status === 404 ? 'missing' : 'failed')
      })
    return () => { active = false }
  }, [revision])

  return (
    <section className="border-t border-hairline py-5" aria-labelledby="academic-profile-title">
      <h3 id="academic-profile-title" className="text-sm font-semibold text-ink">Thông tin học vụ</h3>
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
        <>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            <div><dt className="text-xs text-ink-muted">Bộ môn</dt><dd className="mt-1 text-sm font-medium text-ink">{profile.departmentName || 'Chưa cập nhật'}</dd></div>
            <div><dt className="text-xs text-ink-muted">Chuyên ngành</dt><dd className="mt-1 text-sm font-medium text-ink">{profile.majorName || 'Chưa cập nhật'}</dd></div>
            <div><dt className="text-xs text-ink-muted">Xác minh</dt><dd className="mt-1 text-sm font-medium text-ink">{academicProfileStatus(profile.status)}</dd></div>
          </dl>
          {profile.rejectionReason && <p className="mt-3 text-sm text-status-warning-text">Cần bổ sung: {profile.rejectionReason}</p>}
        </>
      ) : (
        <p role="status" className="mt-2 text-sm text-ink-muted">Đang tải thông tin học vụ…</p>
      )}
    </section>
  )
}
