import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { Button } from '../../../components/ui/Button'
import { ListLoading } from '../../../components/ui/ListLoading'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { WorkspaceEmptyState } from '../../../components/ui/WorkspaceState'
import { HttpError } from '../../../services/http/http-client'
import { getAcademicHierarchy } from '../../academic/api/academic-api'
import {
  academicProfileStatus,
  rejectAcademicProfile,
  verifyAcademicProfile,
} from '../../academic/api/profile-verification-api'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { QualificationCertificateViewer } from '../../qualifications/components/QualificationCertificateViewer'
import {
  getDepartmentStudentDetail,
  listSpecializations,
  updateDepartmentStudentAcademic,
  type DepartmentSpecialization,
  type DepartmentStudentDetail,
} from '../api/department-students-api'

const accountStatusLabel: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  SUSPENDED: 'Đang bị khóa',
}
const accountStatusTone: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  SUSPENDED: 'danger',
}
const profileTone: Record<string, BadgeTone> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
}
const qualificationLabels: Record<string, string> = {
  VERIFIED: 'Đã xác minh đủ điều kiện',
  PENDING_VERIFICATION: 'Chờ xác minh điều kiện',
  REJECTED: 'Bị từ chối',
  EXPIRED: 'Đã hết hạn',
  NOT_SUBMITTED: 'Chưa nộp hồ sơ điều kiện',
}

const CLASS_CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9._ /-]{0,49}$/

function formatDate(value?: string | null): string {
  if (!value) return 'Chưa có'
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf())
    ? 'Không hợp lệ'
    : parsed.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

function detailError(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Sinh viên này không thuộc phạm vi Khoa bạn phụ trách.'
    if (reason.status === 404) return 'Không tìm thấy hồ sơ sinh viên.'
    if (reason.status === 409) return 'Hồ sơ vừa được cập nhật bởi phiên khác. Dữ liệu mới đã được tải lại để bạn kiểm tra.'
    if (reason.status === 422 || reason.status === 400) return reason.problem?.detail || 'Thông tin học vụ chưa hợp lệ. Kiểm tra ngành, lớp và chuyên ngành hẹp.'
  }
  return 'Chưa thể hoàn tất thao tác. Vui lòng thử lại.'
}

export function DepartmentStudentDetailPage() {
  const { userId } = useParams()
  const [searchParams] = useSearchParams()
  const studentId = Number(userId)
  const semesterId = Number(searchParams.get('semesterId')) > 0 ? Number(searchParams.get('semesterId')) : undefined

  const { session } = useAuthSession()
  const { academic } = useAcademicWorkflow()
  const departmentId = academic?.departments[0]?.id ?? null
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  const [detail, setDetail] = useState<DepartmentStudentDetail | null>(null)
  const [majors, setMajors] = useState<Array<{ id: number; code: string; name: string }>>([])
  const [specializations, setSpecializations] = useState<DepartmentSpecialization[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [draftMajorId, setDraftMajorId] = useState('')
  const [draftClassCode, setDraftClassCode] = useState('')
  const [draftSpecId, setDraftSpecId] = useState('')
  const [draftCurriculum, setDraftCurriculum] = useState('')

  const syncDraft = useCallback((next: DepartmentStudentDetail) => {
    setDraftMajorId(next.summary.majorId ? String(next.summary.majorId) : '')
    setDraftClassCode(next.summary.classCode ?? '')
    setDraftSpecId(next.summary.specializationId ? String(next.summary.specializationId) : '')
    setDraftCurriculum(next.summary.curriculumCode ?? '')
  }, [])

  const load = useCallback(async (keepDraft = false) => {
    if (!Number.isInteger(studentId) || studentId <= 0) {
      setError('Mã sinh viên không hợp lệ.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const next = await getDepartmentStudentDetail(studentId, semesterId)
      setDetail(next)
      if (!keepDraft) syncDraft(next)
    } catch (reason) {
      setError(detailError(reason))
    } finally {
      setLoading(false)
    }
  }, [studentId, semesterId, syncDraft])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!session?.accessToken || !departmentId) return
    const controller = new AbortController()
    Promise.all([
      getAcademicHierarchy(session.accessToken, { search: '', includeInactive: true }, controller.signal),
      listSpecializations({ departmentId, includeInactive: false }, controller.signal),
    ]).then(([orgs, specs]) => {
      if (controller.signal.aborted) return
      const dept = orgs.flatMap(o => o.departments).find(d => d.department.id === departmentId)
      setMajors(dept?.majors.map(m => ({ id: m.id, code: m.code, name: m.name })) ?? [])
      setSpecializations(specs)
    }).catch(() => undefined)
    return () => controller.abort()
  }, [session?.accessToken, departmentId])

  const filteredSpecs = useMemo(() => {
    if (!draftMajorId) return specializations
    const mid = Number(draftMajorId)
    return specializations.filter(s => s.majorId === null || s.majorId === mid)
  }, [specializations, draftMajorId])

  async function handleSaveAcademic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!detail || saving) return
    const trimmedClass = draftClassCode.trim()
    if (trimmedClass && !CLASS_CODE_REGEX.test(trimmedClass)) {
      setError('Lớp hành chính phải bắt đầu bằng chữ/số và chỉ chứa ký tự hợp lệ (A-Z, 0-9, khoảng trắng, ".", "_", "-", "/", tối đa 50 ký tự).')
      return
    }
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const updated = await updateDepartmentStudentAcademic(detail.summary.userId, {
        majorId: Number(draftMajorId) > 0 ? Number(draftMajorId) : null,
        classCode: trimmedClass || null,
        specializationId: Number(draftSpecId) > 0 ? Number(draftSpecId) : null,
        curriculumCode: draftCurriculum.trim() || null,
        concurrencyToken: detail.concurrencyToken,
      }, semesterId)
      setDetail(updated)
      syncDraft(updated)
      setNotice('Đã cập nhật thông tin học vụ (Ngành, Lớp, Chuyên ngành hẹp, Khung CTĐT) của sinh viên.')
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        await load(true)
      }
      setError(detailError(reason))
    } finally {
      setSaving(false)
    }
  }

  async function handleVerify(approve: boolean) {
    if (!detail || saving) return
    const decision = await requestConfirmation({
      title: approve ? `Xác minh hồ sơ ${detail.summary.fullName}?` : `Yêu cầu ${detail.summary.fullName} bổ sung hồ sơ?`,
      description: approve
        ? 'Sau khi xác minh, sinh viên sẽ được khóa tự sửa lớp và chuyên ngành hẹp để đảm bảo dữ liệu đồ án ổn định.'
        : 'Ghi rõ lý do để sinh viên cập nhật lại lớp hoặc chuyên ngành hẹp trước khi gửi xác minh lại.',
      confirmLabel: approve ? 'Xác minh hồ sơ' : 'Gửi yêu cầu bổ sung',
      danger: !approve,
      ...(!approve ? { reasonLabel: 'Nội dung cần sinh viên bổ sung' } : {}),
    })
    if (decision === null) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      if (approve) await verifyAcademicProfile(detail.summary.userId)
      else await rejectAcademicProfile(detail.summary.userId, decision)
      await load()
      setNotice(approve ? 'Đã xác minh hồ sơ học vụ sinh viên.' : 'Đã gửi yêu cầu bổ sung hồ sơ tới sinh viên.')
    } catch (reason) {
      setError(detailError(reason))
    } finally {
      setSaving(false)
    }
  }

  const summary = detail?.summary

  return (
    <WorkspacePage
      title={summary ? summary.fullName : 'Chi tiết sinh viên'}
      eyebrow={summary?.studentCode ? `MSSV ${summary.studentCode}` : 'Hồ sơ 360° sinh viên Khoa'}
      description="Xem toàn diện thông tin danh tính, cập nhật lớp/chuyên ngành hẹp/khung CTĐT, xác minh hồ sơ học vụ và theo dõi trạng thái nhóm đồ án."
      action={
        <div className="flex flex-wrap gap-2">
          <Link className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-medium text-ink hover:border-primary" to="/department/students">
            <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span>
            Danh sách sinh viên Khoa
          </Link>
          <Button variant="secondary" icon="refresh" disabled={loading || saving} onClick={() => void load()}>
            Tải lại
          </Button>
        </div>
      }
    >
      {confirmationDialog}
      {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg px-4 py-3 text-sm text-status-error-text">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success-text">{notice}</p>}

      {loading ? (
        <ListLoading label="Đang tải hồ sơ sinh viên…" />
      ) : !detail || !summary ? (
        <WorkspaceEmptyState
          title="Không hiển thị được hồ sơ sinh viên"
          message="Hồ sơ không tồn tại hoặc nằm ngoài phạm vi Khoa của bạn."
          action={<Link className="font-medium text-primary hover:underline" to="/department/students">Quay lại danh sách sinh viên</Link>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="workspace-surface space-y-3 p-5" aria-labelledby="student-identity-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="student-identity-heading" className="font-heading text-base font-semibold">1. Danh tính & Tài khoản (Chỉ đọc)</h2>
              <StatusBadge tone={accountStatusTone[summary.status] ?? 'neutral'} label={accountStatusLabel[summary.status] ?? summary.status} />
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-ink-muted">Họ và tên</dt><dd className="font-medium">{summary.fullName}</dd></div>
              <div><dt className="text-xs text-ink-muted">MSSV</dt><dd className="font-mono font-medium">{summary.studentCode ?? 'Chưa có'}</dd></div>
              <div><dt className="text-xs text-ink-muted">Email</dt><dd className="break-all">{summary.email}</dd></div>
              <div><dt className="text-xs text-ink-muted">Số điện thoại</dt><dd>{summary.phone ?? 'Chưa cập nhật'}</dd></div>
              <div><dt className="text-xs text-ink-muted">Đăng nhập gần nhất</dt><dd>{formatDate(summary.lastLoginAt)}</dd></div>
              <div><dt className="text-xs text-ink-muted">Khoa trực thuộc</dt><dd>{summary.departmentName ?? 'Chưa liên kết'}</dd></div>
            </dl>
            <p className="text-xs text-ink-muted">
              Trạng thái khóa/mở tài khoản, đặt lại mật khẩu và phân quyền hệ thống thuộc thẩm quyền của Quản trị viên (Admin).
            </p>
          </section>

          <section className="workspace-surface space-y-3 p-5" aria-labelledby="student-academic-heading">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="student-academic-heading" className="font-heading text-base font-semibold">2. Thông tin học vụ Khoa</h2>
              <StatusBadge tone={profileTone[summary.academicProfileStatus] ?? 'neutral'} label={academicProfileStatus(summary.academicProfileStatus)} />
            </div>

            <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => void handleSaveAcademic(event)}>
              <label className="text-sm font-medium">
                Ngành đào tạo
                <select
                  className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                  value={draftMajorId}
                  onChange={event => { setDraftMajorId(event.target.value); setDraftSpecId('') }}
                  disabled={saving}
                >
                  <option value="">Chọn ngành</option>
                  {majors.map(m => <option key={m.id} value={m.id}>{m.code} · {m.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">
                Lớp hành chính
                <input
                  className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                  value={draftClassCode}
                  onChange={event => setDraftClassCode(event.target.value)}
                  placeholder="Ví dụ: SE1801, MKT1802"
                  maxLength={50}
                  disabled={saving}
                />
              </label>
              <label className="text-sm font-medium">
                Chuyên ngành hẹp
                <select
                  className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                  value={draftSpecId}
                  onChange={event => setDraftSpecId(event.target.value)}
                  disabled={saving}
                >
                  <option value="">Chưa chọn chuyên ngành hẹp</option>
                  {filteredSpecs.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">
                Khung CTĐT
                <input
                  className="mt-1 block w-full rounded-lg border border-hairline px-3 py-2 text-sm"
                  value={draftCurriculum}
                  onChange={event => setDraftCurriculum(event.target.value)}
                  placeholder="Ví dụ: K18_SE"
                  maxLength={100}
                  disabled={saving}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thông tin học vụ'}</Button>
              </div>
            </form>

            {detail.academicProfileRejectionReason && (
              <p className="text-sm text-status-warning-text">Ghi chú yêu cầu bổ sung gần nhất: {detail.academicProfileRejectionReason}</p>
            )}

            <div className="flex flex-wrap gap-2 border-t border-hairline pt-3">
              {summary.academicProfileStatus !== 'VERIFIED' && (
                <Button variant="secondary" disabled={saving || !summary.departmentId || !summary.majorId} onClick={() => void handleVerify(true)}>
                  Xác minh hồ sơ học vụ
                </Button>
              )}
              <Button variant="outline" disabled={saving} onClick={() => void handleVerify(false)}>
                Yêu cầu sinh viên bổ sung
              </Button>
            </div>
          </section>

          <section className="workspace-surface space-y-3 p-5" aria-labelledby="student-qualification-heading">
            <h2 id="student-qualification-heading" className="font-heading text-base font-semibold">3. Điều kiện tham gia đồ án & Chứng chỉ</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-ink-muted">Trạng thái điều kiện</dt><dd className="font-medium">{qualificationLabels[summary.qualificationStatus] ?? summary.qualificationStatus}</dd></div>
              <div><dt className="text-xs text-ink-muted">Đào tạo chuẩn bị</dt><dd>{detail.trainingStatus === 'TRAINING_COMPLETED' ? 'Đã hoàn thành' : detail.trainingStatus ?? 'Chưa hoàn thành'}</dd></div>
              <div><dt className="text-xs text-ink-muted">Số chứng chỉ</dt><dd className="break-all">{detail.certificateNumber ?? 'Chưa khai báo'}</dd></div>
              <div><dt className="text-xs text-ink-muted">Hiệu lực chứng chỉ</dt><dd>{formatDate(detail.qualificationIssuedAt)} — {formatDate(detail.qualificationExpiresAt)}</dd></div>
            </dl>
            {detail.qualificationRejectionReason && (
              <p className="text-sm text-status-error-text">Lý do từ chối: {detail.qualificationRejectionReason}</p>
            )}
            {detail.qualificationId && detail.certificateFileId && (
              <QualificationCertificateViewer qualificationId={detail.qualificationId} />
            )}
          </section>

          <section className="workspace-surface space-y-3 p-5" aria-labelledby="student-team-heading">
            <h2 id="student-team-heading" className="font-heading text-base font-semibold">4. Nhóm & Đồ án hiện tại</h2>
            {summary.teamCode ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-ink-muted">Nhóm</dt><dd className="font-medium">{summary.teamCode}</dd></div>
                <div><dt className="text-xs text-ink-muted">Vai trò trong nhóm</dt><dd>{summary.isTeamLeader ? 'Trưởng nhóm' : 'Thành viên'}</dd></div>
                <div><dt className="text-xs text-ink-muted">Mã đồ án</dt><dd className="font-mono">{summary.projectCode ?? 'Chưa đăng ký đồ án'}</dd></div>
                <div><dt className="text-xs text-ink-muted">Trạng thái / Hướng đồ án</dt><dd>{[summary.projectStatus, detail.trackCode].filter(Boolean).join(' · ') || '—'}</dd></div>
                {detail.projectTitle && (
                  <div className="sm:col-span-2"><dt className="text-xs text-ink-muted">Tên đồ án</dt><dd className="font-medium">{detail.projectTitle}</dd></div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-ink-muted">Sinh viên chưa tham gia nhóm đồ án nào trong học kỳ đang chọn.</p>
            )}
            {summary.projectId && (
              <div className="pt-2">
                <Link className="text-sm font-medium text-primary hover:underline" to={`/department/projects/review/${summary.projectId}`}>
                  Mở hồ sơ đồ án của nhóm →
                </Link>
              </div>
            )}
          </section>
        </div>
      )}
    </WorkspacePage>
  )
}
