import { displayLabel } from '../../../components/ui/display-label'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { getUser, updateAcademicProfile, type AcademicProfile, type UserAccount } from '../api/admin-api'
import { useAdminWorkspace } from '../hooks/useAdminWorkspace'
import './admin-workspace.css'

export function AdminUserDetailPage() {
  const { userId } = useParams()
  const id = Number(userId)
  const { session } = useAuthSession()
  const admin = useAdminWorkspace()
  const [user, setUser] = useState<UserAccount | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'forbidden' | 'error'>('loading')
  const [notice, setNotice] = useState<string | null>(null)
  const [academicProfile, setAcademicProfile] = useState<AcademicProfile | null>(null)
  const [profileDraft, setProfileDraft] = useState({ departmentId: '', majorId: '' })
  const [profileBusy, setProfileBusy] = useState(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const load = useCallback(async (preserveProfileDraft = false) => {
    if (!session || !Number.isInteger(id) || id < 1) { setState('missing'); return }
    setState('loading')
    try {
      const next = await getUser(id, session.accessToken)
      setUser(next)
      if (!preserveProfileDraft) setProfileDraft({ departmentId: next.departmentId ? String(next.departmentId) : '', majorId: next.majorId ? String(next.majorId) : '' })
      setState('ready')
    } catch (reason) { setState(reason instanceof HttpError && reason.status === 403 ? 'forbidden' : reason instanceof HttpError && reason.status === 404 ? 'missing' : 'error') }
  }, [id, session])
  useEffect(() => { void load() }, [load])
  async function change(action: 'activate' | 'deactivate' | 'block' | 'unblock') {
    if (!user) return
    const labels = { activate: 'kích hoạt', deactivate: 'vô hiệu hóa', block: 'khóa', unblock: 'mở khóa' }
    const confirmed = await requestConfirmation({ title: `${labels[action]} tài khoản?`, description: `Máy chủ sẽ kiểm tra lại tài khoản ${user.fullName}, bao gồm ràng buộc System Administrator cuối cùng.`, confirmLabel: `${labels[action]} tài khoản`, danger: action === 'deactivate' || action === 'block' })
    if (confirmed === null) return
    try { await admin[action](user.id); setNotice('Máy chủ đã cập nhật trạng thái tài khoản.'); await load() } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Chưa thể cập nhật trạng thái.') }
  }
  const numericOrNull = (value: string) => { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null }
  async function saveAcademicProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !session) return
    if (!user.concurrencyToken) { setNotice('Hệ thống chưa trả concurrency token của tài khoản; không gửi thay đổi profile.'); return }
    setProfileBusy(true); setNotice(null)
    try {
      const result = await updateAcademicProfile(user.id, { departmentId: numericOrNull(profileDraft.departmentId), majorId: numericOrNull(profileDraft.majorId), concurrencyToken: user.concurrencyToken }, session.accessToken)
      setAcademicProfile(result)
      setUser(current => current ? { ...current, departmentId: result.departmentId, majorId: result.majorId, concurrencyToken: result.concurrencyToken } : current)
      setProfileDraft({ departmentId: result.departmentId ? String(result.departmentId) : '', majorId: result.majorId ? String(result.majorId) : '' })
      setNotice('Máy chủ đã cập nhật phạm vi học thuật và trả bản tổng hợp mới.')
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) { await load(true); setNotice('Academic profile đã thay đổi trên máy chủ. bản tổng hợp đã tải lại; dữ liệu bạn nhập được giữ để kiểm tra trước khi gửi lại.') }
      else if (reason instanceof HttpError && reason.status === 403) setNotice('Hệ thống từ chối cập nhật academic profile trong phạm vi hiện tại.')
      else setNotice(reason instanceof HttpError ? reason.problem?.detail ?? reason.message : 'Chưa thể cập nhật academic profile.')
    } finally { setProfileBusy(false) }
  }
  return <main className="admin-workspace admin-detail" aria-labelledby="admin-user-title"><Link className="admin-back" to="/admin/access">← Danh sách tài khoản</Link>{state === 'loading' ? <p role="status">Đang tải hồ sơ tài khoản…</p> : null}{state === 'forbidden' ? <p className="admin-error" role="alert">Bạn không có quyền xem hồ sơ tài khoản này.</p> : null}{state === 'missing' ? <p className="admin-error" role="alert">Không tìm thấy tài khoản.</p> : null}{state === 'error' ? <p className="admin-error" role="alert">Chưa tải được hồ sơ tài khoản. <Button size="sm" variant="outline" onClick={() => void load()}>Thử lại</Button></p> : null}{state === 'ready' && user ? <><header className="admin-heading"><div><p className="admin-kicker">TÀI KHOẢN #{user.id}</p><h1 id="admin-user-title">{user.fullName}</h1><p>{user.email}</p></div><span className={`admin-status admin-status-${user.status.toLowerCase()}`}>{displayLabel(user.status)}</span></header>{notice ? <p className="admin-notice" role="status">{notice}</p> : null}<div className="admin-detail-grid"><section className="admin-panel"><h2>Danh tính</h2><dl><dt>Email</dt><dd>{user.email}</dd><dt>Mã</dt><dd>{user.studentCode ?? user.employeeCode ?? 'Không có'}</dd><dt>Chức danh</dt><dd>{user.title ?? 'Không có'}</dd><dt>Điện thoại</dt><dd>{user.phone ?? 'Không có'}</dd></dl></section><section className="admin-panel"><h2>Vai trò</h2><p>{user.roles.join(', ') || 'Chưa có vai trò'}</p><p className="admin-boundary">Chỉnh sửa thông tin tài khoản và vai trò hệ thống. Phân công hướng dẫn hoặc đánh giá được quản lý theo từng đồ án.</p></section><section className="admin-panel"><h2>Trạng thái và bảo mật</h2><dl><dt>Lần đăng nhập thất bại</dt><dd>{user.accessFailedCount}</dd><dt>Khóa đến</dt><dd>{user.lockoutEndAt ? new Date(user.lockoutEndAt).toLocaleString('vi-VN') : 'Không có'}</dd></dl><div className="admin-actions">{user.status !== 'ACTIVE' ? <Button onClick={() => void change('activate')}>Kích hoạt</Button> : null}{user.status !== 'INACTIVE' ? <Button variant="secondary" onClick={() => void change('deactivate')}>Vô hiệu hóa</Button> : null}{user.status !== 'SUSPENDED' ? <Button variant="danger" onClick={() => void change('block')}>Khóa</Button> : <Button variant="secondary" onClick={() => void change('unblock')}>Mở khóa</Button>}</div></section><section className="admin-panel"><h2>Phạm vi học thuật</h2><dl><dt>Bộ môn</dt><dd>{academicProfile?.departmentName ?? (user.departmentId ? `#${user.departmentId}` : 'Chưa liên kết')}</dd><dt>Ngành</dt><dd>{academicProfile?.majorName ?? (user.majorId ? `#${user.majorId}` : 'Chưa liên kết')}</dd>{academicProfile ? <><dt>Trạng thái profile</dt><dd>{displayLabel(academicProfile.status)}</dd></> : null}</dl><form className="admin-form" onSubmit={(event) => void saveAcademicProfile(event)}><label>Bộ môn ID<input value={profileDraft.departmentId} inputMode="numeric" onChange={(event) => setProfileDraft(current => ({ ...current, departmentId: event.target.value }))} disabled={profileBusy || !user.concurrencyToken} /></label><label>Ngành ID<input value={profileDraft.majorId} inputMode="numeric" onChange={(event) => setProfileDraft(current => ({ ...current, majorId: event.target.value }))} disabled={profileBusy || !user.concurrencyToken} /></label><p className="admin-boundary">Chọn bộ môn và chuyên ngành đang hoạt động, phù hợp với thông tin học vụ của tài khoản.</p><Button type="submit" disabled={profileBusy || !user.concurrencyToken}>{profileBusy ? 'Đang cập nhật…' : 'Cập nhật phạm vi học thuật'}</Button></form></section></div></> : null}{confirmationDialog}</main>
}
