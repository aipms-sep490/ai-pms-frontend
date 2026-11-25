import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar, type ActiveFilterChip } from '../../../components/ui/FilterToolbar'
import { ListLoading } from '../../../components/ui/ListLoading'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'
import { HttpError } from '../../../services/http/http-client'
import * as api from '../api/profile-verification-api'
import '../../execution/execution.css'

const academicProfileStatus = api.academicProfileStatus
const profileStatusTone = (value: string): BadgeTone =>
  value === 'VERIFIED' ? 'success' : value === 'REJECTED' ? 'danger' : 'warning'

export function ProfileVerificationsPage({ embedded = false }: { embedded?: boolean }) {
  const [status, setStatus] = useState('PENDING'), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [majorFilter, setMajorFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<'default' | 'name_asc' | 'code_asc'>('default')
  const [resolved, setResolved] = useState<{ key: string; data: Awaited<ReturnType<typeof api.getAcademicProfiles>> | null; error: string } | null>(null)
  const [busy, setBusy] = useState(false), [actionError, setActionError] = useState(''), [notice, setNotice] = useState('')
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  const requestVersion = useRef(0)
  const queryKey = `${status}:${page}:${pageSize}`
  const readProfiles = useCallback(async (key: string, nextStatus: string, nextPage: number, nextPageSize: number) => {
    try {
      const next = await api.getAcademicProfiles(nextStatus, nextPage, nextPageSize)
      return { key, data: next, error: '' }
    } catch (reason) {
      return { key, data: null as Awaited<ReturnType<typeof api.getAcademicProfiles>> | null, error: errorText(reason) }
    }
  }, [])
  const load = useCallback(async () => {
    const version = ++requestVersion.current
    setActionError('')
    setResolved(null)
    const next = await readProfiles(queryKey, status, page, pageSize)
    if (version === requestVersion.current) setResolved(next)
  }, [readProfiles, queryKey, status, page, pageSize])
  useEffect(() => {
    const version = ++requestVersion.current
    void readProfiles(queryKey, status, page, pageSize).then(next => {
      if (version === requestVersion.current) setResolved(next)
    })
  }, [readProfiles, queryKey, status, page, pageSize])
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
    const filtered = (data?.items ?? []).filter(item => {
      if (deptFilter !== 'ALL' && item.departmentName !== deptFilter) return false
      if (majorFilter !== 'ALL' && item.majorName !== majorFilter) return false
      if (q && !`${item.fullName} ${item.studentCode ?? ''} ${item.email ?? ''} ${item.departmentName ?? ''} ${item.majorName ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
    if (sortBy === 'name_asc') return [...filtered].sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'))
    if (sortBy === 'code_asc') return [...filtered].sort((a, b) => (a.studentCode ?? '').localeCompare(b.studentCode ?? '', 'vi'))
    return filtered
  }, [data, search, deptFilter, majorFilter, sortBy])

  async function review(item: api.AcademicProfile, approve: boolean) {
    const decision = await requestConfirmation({ title: approve ? `Xác minh hồ sơ ${item.fullName}?` : `Yêu cầu ${item.fullName} bổ sung hồ sơ?`, description: approve ? 'Xác nhận bộ môn, chuyên ngành, lớp và chuyên ngành hẹp đã được kiểm tra.' : 'Ghi rõ nội dung cần bổ sung để người dùng có thể cập nhật hồ sơ.', confirmLabel: approve ? 'Xác minh' : 'Gửi yêu cầu', danger: !approve, ...(!approve ? { reasonLabel: 'Nội dung cần bổ sung' } : {}) })
    if (decision === null || busy) return
    setBusy(true); setActionError(''); setNotice('')
    try { if (approve) await api.verifyAcademicProfile(item.userId); else await api.rejectAcademicProfile(item.userId, decision); await load(); setNotice(approve ? 'Đã xác minh hồ sơ.' : 'Đã gửi yêu cầu bổ sung hồ sơ.') }
    catch (reason) { setActionError(errorText(reason)) }
    finally { setBusy(false) }
  }
  const totalPages = Math.max(1, data?.totalPages ?? 1)
  const hasActiveFilters = Boolean(search.trim() || deptFilter !== 'ALL' || majorFilter !== 'ALL' || sortBy !== 'default')
  const activeChips: ActiveFilterChip[] = []
  if (deptFilter !== 'ALL') activeChips.push({ id: 'dept', label: 'Bộ môn', value: deptFilter })
  if (majorFilter !== 'ALL') activeChips.push({ id: 'major', label: 'Chuyên ngành', value: majorFilter })

  const content = <>
    {confirmationDialog}
    {error && <p role="alert" className="ex-notice ex-notice-error">{error}</p>}
    {notice && (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card px-4 py-3 text-sm text-ink">
        <span className="material-symbols-outlined shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
        <p role="status">{notice}</p>
      </div>
    )}
    {!embedded && (
      <div className="mb-5">
        <StatTileRow
          tiles={[
            { icon: 'badge', label: 'Hồ sơ theo bộ lọc', value: data ? data.totalCount : null, hero: true, caption: status ? academicProfileStatus(status) : 'Tất cả trạng thái hồ sơ học vụ.' },
            { icon: 'hourglass_top', label: 'Chờ xác minh (trang)', value: data ? data.items.filter(i => i.status === 'PENDING').length : null, tone: 'warning', caption: 'Cần đối chiếu bộ môn và chuyên ngành.' },
            { icon: 'verified', label: 'Đã xác minh (trang)', value: data ? data.items.filter(i => i.status === 'VERIFIED').length : null, tone: 'success', caption: 'Đã xác nhận thông tin học vụ.' },
            { icon: 'edit_note', label: 'Cần bổ sung (trang)', value: data ? data.items.filter(i => i.status === 'REJECTED').length : null, tone: 'danger', caption: 'Đang chờ sinh viên cập nhật lại.' },
          ]}
        />
      </div>
    )}
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
      sort={{
        value: sortBy,
        onChange: val => setSortBy(val as 'default' | 'name_asc' | 'code_asc'),
        options: [
          { value: 'default', label: 'Mặc định' },
          { value: 'name_asc', label: 'Họ tên A–Z' },
          { value: 'code_asc', label: 'MSSV A–Z' },
        ],
      }}
      rightActions={embedded ? <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={loading || busy} onClick={() => void load()} /> : undefined}
      activeChips={activeChips}
      onRemoveChip={chipId => {
        if (chipId === 'dept') setDeptFilter('ALL')
        if (chipId === 'major') setMajorFilter('ALL')
      }}
      onClearAll={() => { setSearch(''); setDeptFilter('ALL'); setMajorFilter('ALL'); setSortBy('default') }}
      hasActiveFilters={hasActiveFilters}
      resultSummary={`${visibleItems.length} / ${data?.totalCount ?? 0} hồ sơ`}
      pagination={totalPages > 1 ? { page, pages: totalPages, total: data?.totalCount ?? 0, pageSize, busy: loading || busy, onPage: setPage } : undefined}
    />
    <section className="ex-panel">
      {loading ? <ListLoading label="Đang tải danh sách hồ sơ…" /> : !visibleItems.length ? <p className="ex-padding ex-muted">Chưa có hồ sơ phù hợp.</p> : <ul>{visibleItems.map(item => <li key={item.userId} className="grid gap-4 border-b border-hairline p-5 last:border-b-0 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"><Avatar name={item.fullName} size="md" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-ink">{item.fullName}</strong><StatusBadge tone={profileStatusTone(item.status)} label={academicProfileStatus(item.status)} /></div><p className="ex-muted break-words">{item.studentCode || item.email}</p><p className="mt-1.5 text-sm text-ink-soft">{item.departmentName || 'Chưa có bộ môn'} · {item.majorName || 'Chưa có chuyên ngành'}</p>{(item.classCode || item.specializationName || item.curriculumCode) && <p className="mt-1 text-xs text-ink-muted">{[item.classCode ? `Lớp ${item.classCode}` : null, item.specializationName ? `CN hẹp: ${item.specializationName}` : null, item.curriculumCode ? `Khung ${item.curriculumCode}` : null].filter(Boolean).join(' · ')}</p>}{item.rejectionReason && <p className="mt-2 text-sm text-status-warning-text">Cần bổ sung: {item.rejectionReason}</p>}</div><div className="flex flex-wrap items-center gap-2">{embedded && <Link className="text-sm font-medium text-primary hover:underline" to={`/department/students/${item.userId}`}>Chi tiết</Link>}{item.status !== 'VERIFIED' && <Button disabled={busy || !item.departmentId || !item.majorId} onClick={() => void review(item, true)}>Xác minh</Button>}<Button variant="secondary" disabled={busy} onClick={() => void review(item, false)}>Yêu cầu bổ sung</Button></div></li>)}</ul>}
      {(totalPages > 1 || (data?.totalCount ?? 0) > pageSize) && (
        <div className="border-t border-hairline p-4">
          <Pagination
            page={page}
            pages={totalPages}
            total={data?.totalCount ?? 0}
            pageSize={pageSize}
            busy={loading || busy}
            onPage={setPage}
            onPageSizeChange={nextSize => { setPageSize(nextSize); setPage(1) }}
          />
        </div>
      )}
    </section>
  </>

  if (embedded) return <div className="execution-page space-y-4">{content}</div>
  return <WorkspacePage size="wide" className="execution-page" title="Xác minh hồ sơ học vụ" eyebrow="Quản lý học vụ" description="Kiểm tra thông tin bộ môn, chuyên ngành, lớp và phản hồi hồ sơ cần bổ sung." action={<Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" disabled={loading || busy} onClick={() => void load()} />}>
    {content}
  </WorkspacePage>
}
function errorText(reason: unknown) { if (reason instanceof HttpError) { if (reason.status === 403) return 'Bạn chưa có quyền xác minh hồ sơ trong phạm vi này.'; if (reason.status === 409) return 'Hồ sơ vừa thay đổi. Tải lại trước khi tiếp tục.'; if (reason.status === 400) return reason.problem?.detail || 'Kiểm tra thông tin và lý do bổ sung.' } return 'Chưa hoàn tất thao tác. Hãy thử lại.' }

