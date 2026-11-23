import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '../../../components/ui/Avatar'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/profile-verification-api'
import '../../execution/execution.css'

const academicProfileStatus = api.academicProfileStatus
const profileStatusTone = (value: string): BadgeTone =>
  value === 'VERIFIED' ? 'success' : value === 'REJECTED' ? 'danger' : 'warning'

export function ProfileVerificationsPage() {
  const [status, setStatus] = useState('PENDING'), [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [majorFilter, setMajorFilter] = useState('ALL')
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

  const departments = useMemo(
    () => Array.from(new Set((data?.items ?? []).map(item => item.departmentName).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'vi')),
    [data],
  )
  const majors = useMemo(
    () => Array.from(new Set((data?.items ?? []).map(item => item.majorName).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'vi')),
    [data],
  )
  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.items ?? []).filter(item => {
      if (deptFilter !== 'ALL' && item.departmentName !== deptFilter) return false
      if (majorFilter !== 'ALL' && item.majorName !== majorFilter) return false
      if (q && !`${item.fullName} ${item.studentCode ?? ''} ${item.email ?? ''} ${item.departmentName ?? ''} ${item.majorName ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, search, deptFilter, majorFilter])

  async function review(item: api.AcademicProfile, approve: boolean) {
    const decision = await requestConfirmation({ title: approve ? `Xác minh hồ sơ ${item.fullName}?` : `Yêu cầu ${item.fullName} bổ sung hồ sơ?`, description: approve ? 'Xác nhận bộ môn và chuyên ngành đã được kiểm tra.' : 'Ghi rõ nội dung cần bổ sung để người dùng có thể cập nhật hồ sơ.', confirmLabel: approve ? 'Xác minh' : 'Gửi yêu cầu', danger: !approve, ...(!approve ? { reasonLabel: 'Nội dung cần bổ sung' } : {}) })
    if (decision === null || busy) return
    setBusy(true); setActionError(''); setNotice('')
    try { if (approve) await api.verifyAcademicProfile(item.userId); else await api.rejectAcademicProfile(item.userId, decision); await load(); setNotice(approve ? 'Đã xác minh hồ sơ.' : 'Đã gửi yêu cầu bổ sung hồ sơ.') }
    catch (reason) { setActionError(errorText(reason)) }
    finally { setBusy(false) }
  }

  const totalPages = Math.max(1, data?.totalPages ?? 1)
  const hasActiveFilters = Boolean(search.trim() || deptFilter !== 'ALL' || majorFilter !== 'ALL')
  const activeChips: ActiveFilterChip[] = []
  if (deptFilter !== 'ALL') activeChips.push({ id: 'dept', label: 'Bộ môn', value: deptFilter })
  if (majorFilter !== 'ALL') activeChips.push({ id: 'major', label: 'Chuyên ngành', value: majorFilter })

  return <WorkspacePage size="wide" className="execution-page" title="Xác minh hồ sơ học vụ" eyebrow="Quản lý học vụ" description="Kiểm tra thông tin bộ môn, chuyên ngành và phản hồi hồ sơ cần bổ sung." action={<Button variant="secondary" icon="refresh" disabled={loading || busy} onClick={() => void load()}>Tải lại</Button>}>
    {confirmationDialog}{error && <p role="alert" className="ex-notice ex-notice-error">{error}</p>}{notice && <p role="status" className="ex-notice">{notice}</p>}
    <FilterToolbar
      search={search}
      onSearchChange={setSearch}
      searchLabel="Tìm hồ sơ học vụ"
      searchPlaceholder="Tìm theo họ tên, MSSV hoặc email..."
      debounceMs={0}
      tabs={[
        { value: 'PENDING', label: 'Chờ xác minh' },
        { value: 'VERIFIED', label: 'Đã xác minh' },
        { value: 'REJECTED', label: 'Cần bổ sung' },
        { value: '', label: 'Tất cả' },
      ]}
      activeTab={status}
      onTabChange={next => { if (!busy) { setStatus(next); setPage(1) } }}
      tabsLabel="Lọc hồ sơ học vụ theo trạng thái"
      controls={
        <>
          {departments.length > 1 && (
            <label className="ft-select-wrap">
              <span className="sr-only">Bộ môn</span>
              <select className="ft-select" aria-label="Lọc theo bộ môn" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="ALL">Tất cả bộ môn</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </label>
          )}
          {majors.length > 1 && (
            <label className="ft-select-wrap">
              <span className="sr-only">Chuyên ngành</span>
              <select className="ft-select" aria-label="Lọc theo chuyên ngành" value={majorFilter} onChange={e => setMajorFilter(e.target.value)}>
                <option value="ALL">Tất cả chuyên ngành</option>
                {majors.map(major => <option key={major} value={major}>{major}</option>)}
              </select>
            </label>
          )}
        </>
      }
      activeChips={activeChips}
      onRemoveChip={chipId => {
        if (chipId === 'dept') setDeptFilter('ALL')
        if (chipId === 'major') setMajorFilter('ALL')
      }}
      onClearAll={() => { setSearch(''); setDeptFilter('ALL'); setMajorFilter('ALL') }}
      hasActiveFilters={hasActiveFilters}
      resultSummary={`${visibleItems.length} / ${data?.totalCount ?? 0} hồ sơ`}
    />
    <section className="ex-panel">
      {loading ? <ListLoading label="Đang tải danh sách hồ sơ…" /> : !visibleItems.length ? <p className="ex-padding ex-muted">Chưa có hồ sơ phù hợp.</p> : <ul>{visibleItems.map(item => <li key={item.userId} className="grid gap-4 border-b border-hairline p-5 last:border-b-0 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"><Avatar name={item.fullName} size="md" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-ink">{item.fullName}</strong><StatusBadge tone={profileStatusTone(item.status)} label={academicProfileStatus(item.status)} /></div><p className="ex-muted break-words">{item.studentCode || item.email}</p><p className="mt-1.5 text-sm text-ink-soft">{item.departmentName || 'Chưa có bộ môn'} · {item.majorName || 'Chưa có chuyên ngành'}</p>{item.rejectionReason && <p className="mt-2 text-sm text-status-warning-text">Cần bổ sung: {item.rejectionReason}</p>}</div><div className="flex flex-wrap items-center gap-2">{item.status !== 'VERIFIED' && <Button disabled={busy || !item.departmentId || !item.majorId} onClick={() => void review(item, true)}>Xác minh</Button>}<Button variant="secondary" disabled={busy} onClick={() => void review(item, false)}>Yêu cầu bổ sung</Button></div></li>)}</ul>}
      {totalPages > 1 && <nav className="ex-pagination" aria-label="Phân trang hồ sơ"><Button variant="secondary" disabled={loading || busy || page <= 1} onClick={() => setPage(page - 1)}>Trang trước</Button><span className="ex-muted">Trang {page} / {totalPages}</span><Button variant="secondary" disabled={loading || busy || page >= totalPages} onClick={() => setPage(page + 1)}>Trang sau</Button></nav>}
    </section>
  </WorkspacePage>
}
function errorText(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 403) return 'Bạn chưa có quyền xác minh hồ sơ trong phạm vi này.'; if (reason.status === 409) return 'Hồ sơ vừa thay đổi. Tải lại trước khi tiếp tục.'; if (reason.status === 400) return reason.problem?.detail || 'Kiểm tra thông tin và lý do bổ sung.' } return 'Chưa hoàn tất thao tác. Hãy thử lại.' }

