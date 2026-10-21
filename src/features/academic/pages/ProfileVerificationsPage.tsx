import { useCallback, useEffect, useRef, useState } from 'react'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/profile-verification-api'
import '../../execution/execution.css'

const academicProfileStatus = api.academicProfileStatus
export function ProfileVerificationsPage() {
  const [status, setStatus] = useState('PENDING'), [page, setPage] = useState(1)
  const [resolved, setResolved] = useState<{ key: string; data: Awaited<ReturnType<typeof api.getAcademicProfiles>> | null; error: string } | null>(null)
  const [busy, setBusy] = useState(false), [actionError, setActionError] = useState(''), [notice, setNotice] = useState('')
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const requestVersion = useRef(0)
  const queryKey = `${status}:${page}`
  const readProfiles = useCallback(async (key: string, nextStatus: string, nextPage: number) => {
    try {
      const next = await api.getAcademicProfiles(nextStatus, nextPage)
      return { key, data: next, error: '' }
    } catch (reason) {
      return { key, data: null as Awaited<ReturnType<typeof api.getAcademicProfiles>> | null, error: errorText(reason) }
    }
  }, [])
  const load = useCallback(async () => {
    const version = ++requestVersion.current
    setActionError('')
    setResolved(null)
    const next = await readProfiles(queryKey, status, page)
    if (version === requestVersion.current) setResolved(next)
  }, [readProfiles, queryKey, status, page])
  useEffect(() => {
    const version = ++requestVersion.current
    void readProfiles(queryKey, status, page).then(next => {
      if (version === requestVersion.current) setResolved(next)
    })
  }, [readProfiles, queryKey, status, page])
  const active = resolved?.key === queryKey ? resolved : null
  const data = active?.data ?? null
  const loading = active === null
  const error = actionError || active?.error || ''
  async function review(item: api.AcademicProfile, approve: boolean) {
    const decision = await requestConfirmation({ title: approve ? `Xác minh hồ sơ ${item.fullName}?` : `Yêu cầu ${item.fullName} bổ sung hồ sơ?`, description: approve ? 'Xác nhận bộ môn và chuyên ngành đã được kiểm tra.' : 'Ghi rõ nội dung cần bổ sung để người dùng có thể cập nhật hồ sơ.', confirmLabel: approve ? 'Xác minh' : 'Gửi yêu cầu', danger: !approve, ...(!approve ? { reasonLabel: 'Nội dung cần bổ sung' } : {}) })
    if (decision === null || busy) return
    setBusy(true); setActionError(''); setNotice('')
    try { if (approve) await api.verifyAcademicProfile(item.userId); else await api.rejectAcademicProfile(item.userId, decision); await load(); setNotice(approve ? 'Đã xác minh hồ sơ.' : 'Đã gửi yêu cầu bổ sung hồ sơ.') }
    catch (reason) { setActionError(errorText(reason)) }
    finally { setBusy(false) }
  }
  return <WorkspacePage className="execution-page" title="Xác minh hồ sơ học vụ" eyebrow="Quản lý học vụ" description="Kiểm tra thông tin bộ môn, chuyên ngành và phản hồi hồ sơ cần bổ sung." action={<Button variant="secondary" icon="refresh" disabled={loading || busy} onClick={() => void load()}>Tải lại</Button>}>
    {confirmationDialog}{error && <p role="alert" className="ex-notice ex-notice-error">{error}</p>}{notice && <p role="status" className="ex-notice">{notice}</p>}
    <section className="ex-panel"><div className="ex-filters"><label className="text-sm font-medium text-ink-soft">Trạng thái<select className="mt-1 block min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:bg-canvas disabled:text-ink-muted" disabled={busy} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="PENDING">Chờ xác minh</option><option value="VERIFIED">Đã xác minh</option><option value="REJECTED">Cần bổ sung</option><option value="">Tất cả hồ sơ</option></select></label><span className="ex-muted">{data?.totalCount ?? 0} hồ sơ</span></div>
    {loading ? <p role="status" className="ex-padding">Đang tải hồ sơ…</p> : !data?.items.length ? <p className="ex-padding ex-muted">Chưa có hồ sơ phù hợp.</p> : <ul>{data.items.map(item => <li key={item.userId} className="grid gap-4 border-b border-hairline p-6 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><strong className="block">{item.fullName}</strong><p className="ex-muted break-all">{item.studentCode || item.email}</p><p className="mt-2 text-sm">{item.departmentName || 'Chưa có bộ môn'} · {item.majorName || 'Chưa có chuyên ngành'}</p>{item.rejectionReason && <p className="mt-2 text-sm text-status-warning-text">Cần bổ sung: {item.rejectionReason}</p>}</div><div className="flex flex-wrap items-center gap-3"><span className="ex-badge">{academicProfileStatus(item.status)}</span>{item.status !== 'VERIFIED' && <Button disabled={busy || !item.departmentId || !item.majorId} onClick={() => void review(item, true)}>Xác minh</Button>}<Button variant="secondary" disabled={busy} onClick={() => void review(item, false)}>Yêu cầu bổ sung</Button></div></li>)}</ul>}
    <nav className="ex-pagination" aria-label="Phân trang hồ sơ"><Button variant="secondary" disabled={loading || busy || page <= 1} onClick={() => setPage(page - 1)}>Trang trước</Button><span className="ex-muted">Trang {page} / {Math.max(1, data?.totalPages ?? 1)}</span><Button variant="secondary" disabled={loading || busy || page >= (data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Trang sau</Button></nav></section>
  </WorkspacePage>
}
function errorText(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 403) return 'Bạn chưa có quyền xác minh hồ sơ trong phạm vi này.'; if (reason.status === 409) return 'Hồ sơ vừa thay đổi. Tải lại trước khi tiếp tục.'; if (reason.status === 400) return reason.problem?.detail || 'Kiểm tra thông tin và lý do bổ sung.' } return 'Chưa hoàn tất thao tác. Hãy thử lại.' }

