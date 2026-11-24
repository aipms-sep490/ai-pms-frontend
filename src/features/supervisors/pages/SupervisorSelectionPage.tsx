import { dateTimeLabel } from '../../execution/execution-utils'
import { displayLabel } from '../../../components/ui/display-label'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { FilterToolbar } from '../../../components/ui/FilterToolbar'
import { Modal } from '../../../components/ui/Modal'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { useStudentJourney } from '../../../app/context'
import { useSupervisorSelection, type SupervisorAssignmentType } from '../hooks/useSupervisorSelection'
import { projectStatusLabel } from '../../projects/utils/project-status'
import { SupervisorRecommendationPanel } from '../components/SupervisorRecommendationPanel'
import { env } from '../../../app/config/env'
import { PageLoading } from '../../../components/ui/PageLoading'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { BadgeTone } from '../../../components/ui/status-badge-tone'

interface Slot { key: string; type: SupervisorAssignmentType; majorId?: number; label: string }

/** PENDING/ACCEPTED/REJECTED/CANCELLED/EXPIRED/RELEASED per SupervisorRequestDto.status — ACCEPTED
 * is the only terminal success; REJECTED needs the leader's attention; CANCELLED/EXPIRED/RELEASED
 * are all closed-without-action, shown as neutral so they read as history, not as a pending task. */
function requestStatusTone(status: string): BadgeTone {
  switch (status.toUpperCase()) {
    case 'ACCEPTED': return 'success'
    case 'PENDING': return 'warning'
    case 'REJECTED': return 'danger'
    default: return 'neutral'
  }
}

function slotLabel(assignmentType: string | undefined, majorId: number | null | undefined, majorName: (id: number) => string): string {
  return assignmentType === 'DISCIPLINE_MENTOR' ? `Mentor — ${majorId != null ? majorName(majorId) : 'ngành'}` : 'GVHD chính'
}

export function SupervisorSelectionPage() {
  const journey = useStudentJourney()
  const selection = useSupervisorSelection({
    project: journey.project,
    team: journey.team,
    profile: journey.profile,
    actions: journey.projectActions,
    refreshAll: journey.refreshAll,
  })
  const majorNamesMap = useMemo(
    () => Object.fromEntries((journey.project?.majors ?? []).map((item) => [item.majorId, item.majorName])),
    [journey.project],
  )
  const majorName = (majorId: number) => majorNamesMap[majorId] ?? 'Chuyên ngành'
  const slotOptions: Slot[] = [
    ...(!selection.activeAssignment && selection.canSend ? [{ key: 'PRIMARY', type: 'PRIMARY' as const, label: 'GVHD chính' }] : []),
    ...selection.missingMentorMajorIds.map((majorId) => ({ key: `MENTOR-${majorId}`, type: 'DISCIPLINE_MENTOR' as const, majorId, label: `Mentor — ${majorName(majorId)}` })),
  ]
  const activeSlot = slotOptions.find((option) => option.key === selection.slotKey) ?? slotOptions[0] ?? null

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [message, setMessage] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [sortBy, setSortBy] = useState<'default' | 'slots_desc' | 'name_asc'>('default')
  const selected = selection.candidates.find((candidate) => candidate.id === selectedId) ?? null

  const departmentOptions = useMemo(() => {
    const set = new Set<string>()
    selection.candidates.forEach((c) => { if (c.departmentName) set.add(c.departmentName) })
    return [...set].sort((a, b) => a.localeCompare(b, 'vi-VN'))
  }, [selection.candidates])

  const visibleCandidates = useMemo(() => {
    const filtered = selection.candidates.filter((c) => {
      if (onlyAvailable && c.remainingSlots <= 0) return false
      if (departmentFilter && c.departmentName !== departmentFilter) return false
      return true
    })
    if (sortBy === 'default') return filtered
    return [...filtered].sort((a, b) =>
      sortBy === 'slots_desc'
        ? b.remainingSlots - a.remainingSlots
        : a.fullName.localeCompare(b.fullName, 'vi-VN'),
    )
  }, [selection.candidates, onlyAvailable, departmentFilter, sortBy])

  const candidatePager = useClientPagination(visibleCandidates, 10)
  const requestPager = useClientPagination(selection.requests, 10)

  const choose = (candidateId: number) => { setSelectedId(candidateId); setSelectedSlot(activeSlot) }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !selectedSlot) return
    const sent = await selection.send(selected, message, selectedSlot.type, selectedSlot.majorId)
    if (sent) { setSelectedId(null); setSelectedSlot(null); setMessage('') }
  }

  if (journey.isLoading || selection.loading) return <div className="p-6"><PageLoading label="Đang tải quy trình chọn giảng viên hướng dẫn…" /></div>
  if (!journey.project) return <section className="p-6"><h1>Chọn giảng viên hướng dẫn</h1><p>Bạn chưa có đồ án để thực hiện bước này.</p></section>
  if (selection.error?.kind === 'authentication') return <p className="p-6"><Link to="/login">Đăng nhập lại để tiếp tục.</Link></p>

  const hasFilters = Boolean(selection.query.search.trim() || selection.query.expertise.trim() || onlyAvailable || departmentFilter || sortBy !== 'default')
  const clearAllFilters = () => {
    setOnlyAvailable(false)
    setDepartmentFilter('')
    setSortBy('default')
    void selection.applyFilters({ search: '', expertise: '' })
  }

  return (
    <WorkspacePage
      size="wide"
      className="mk-page-enter space-y-6"
      eyebrow={`${journey.project.code} · ${projectStatusLabel(journey.project.status)}`}
      title={selection.activeAssignment ? 'Giảng viên hướng dẫn' : 'Chọn giảng viên hướng dẫn'}
      description={selection.activeAssignment
        ? (selection.missingMentorMajorIds.length > 0 ? 'Đã có GVHD chính. Mời thêm giảng viên chuyên ngành cho các ngành liên quan còn thiếu xác nhận.' : 'Xem phân công hiện tại và lịch sử yêu cầu hướng dẫn của nhóm.')
        : 'Bạn có thể mời GVHD chính và giảng viên chuyên ngành (nếu đồ án liên ngành) ngay khi đề cương còn là bản nháp — không cần chờ Bộ môn duyệt. Tìm giảng viên phù hợp và gửi lời mời từ tài khoản trưởng nhóm.'}
    >
      {selection.error ? <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{selection.error.message}<Button className="ml-3" size="sm" variant="secondary" onClick={() => void selection.refresh(true)}>Tải lại</Button></section> : null}

      {selection.activeAssignment ? (
        <section className="rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-5 text-ink shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined mt-0.5 text-[20px] text-status-success-text" aria-hidden="true">check_circle</span>
              <div>
                <h2 className="font-bold text-ink">Đã có phân công hướng dẫn chính thức</h2>
                <p className="mt-1 text-sm text-ink-soft">{selection.activeAssignment.supervisorName} · phân công lúc {dateTimeLabel(selection.activeAssignment.assignedAt)}</p>
              </div>
            </div>
            <StatusBadge tone="success" label="Đang hoạt động" />
          </div>
        </section>
      ) : null}

      <section className="workspace-surface p-5">
        <h2 className="text-base font-bold text-ink">Yêu cầu hướng dẫn</h2>
        {selection.requests.length ? (
          <>
            <ul className="mt-3 divide-y divide-hairline">{requestPager.paginatedItems.map((request) => <li key={request.id} className="py-3 text-sm text-ink">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={requestStatusTone(request.status)} label={displayLabel(request.status)} />
                <span className="font-semibold">{slotLabel(request.assignmentType, request.majorId, majorName)}</span>
                <span>· {request.supervisorName?.trim() || selection.assignments.find(item => item.supervisorProfileId === request.supervisorProfileId)?.supervisorName || selection.candidates.find(item => item.id === request.supervisorProfileId)?.fullName || 'Chưa tải được tên giảng viên'}</span>
                <span className="text-xs text-ink-muted">· gửi lúc {dateTimeLabel(request.requestedAt)}</span>
                {request.status === 'PENDING' && request.expiresAt ? <span className="text-xs text-ink-muted">· hết hạn lúc {dateTimeLabel(request.expiresAt)}</span> : null}
              </div>
              {request.requestMessage ? <p className="mt-1 text-ink-soft">Lời nhắn: {request.requestMessage}</p> : null}
              {request.responseMessage ? <p className="mt-1 text-ink-soft">Phản hồi: {request.responseMessage}</p> : null}
              {request.status === 'PENDING' && selection.isLeader ? <Button className="mt-2" size="sm" variant="danger" disabled={selection.cancelPending !== null} onClick={() => void selection.cancel(request)}>Hủy yêu cầu</Button> : null}
              {request.status === 'REJECTED' ? <p className="mt-2 text-xs text-ink-muted">Bạn có thể chọn một giảng viên phù hợp khác.</p> : null}
              {request.status === 'EXPIRED' ? <p className="mt-2 text-xs text-ink-muted">Lời mời đã quá hạn phản hồi. Bạn có thể gửi lại cho vị trí này.</p> : null}
            </li>)}</ul>
            {requestPager.showPagination && (
              <div className="mt-3 border-t border-hairline pt-3">
                <Pagination
                  page={requestPager.page}
                  pages={requestPager.pages}
                  total={requestPager.total}
                  pageSize={requestPager.pageSize}
                  onPage={requestPager.setPage}
                  onPageSizeChange={requestPager.setPageSize}
                />
              </div>
            )}
          </>
        ) : <p className="mt-2 text-sm text-ink-muted">Chưa có yêu cầu hướng dẫn.</p>}
      </section>

      {env.supervisorRecommendationEnabled && (selection.canSend || selection.canSendMentor) && journey.project && activeSlot && <SupervisorRecommendationPanel
        key={`${journey.project.id}:${activeSlot.key}`}
        projectId={journey.project.id}
        assignmentType={activeSlot.type}
        majorId={activeSlot.majorId}
        majorNames={majorNamesMap}
        candidateIds={new Set(selection.candidates.map(candidate => candidate.id))}
        onPick={id => choose(id)} />}

      {(!selection.activeAssignment || selection.missingMentorMajorIds.length > 0) && <section className="workspace-surface overflow-hidden">
        {slotOptions.length === 0 ? <p className="p-5 text-sm text-ink-muted">Bạn chưa thể gửi yêu cầu hướng dẫn ở trạng thái hiện tại.</p> : <>
          <div className="border-b border-hairline px-5 py-4">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">Mời cho vị trí</p>
            {slotOptions.length > 1 ? <div className="flex flex-wrap items-center gap-2">
              {slotOptions.map((option) => <button key={option.key} type="button" aria-pressed={activeSlot?.key === option.key}
                onClick={() => { selection.setSlotKey(option.key); setSelectedId(null); setSelectedSlot(null) }}
                className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${activeSlot?.key === option.key ? 'border-primary bg-primary text-white' : 'border-hairline bg-card text-ink-soft hover:bg-canvas'}`}>
                {option.label}
              </button>)}
            </div> : <p className="text-sm font-semibold text-ink">{activeSlot?.label}</p>}
          </div>

          <FilterToolbar
            embedded
            search={selection.query.search}
            onSearchChange={(val) => void selection.applyFilters({ search: val, expertise: selection.query.expertise })}
            searchLabel="Tìm giảng viên"
            searchPlaceholder="Tìm theo tên giảng viên…"
            controls={
              <>
                <input
                  aria-label="Chuyên môn"
                  type="search"
                  placeholder="Lọc theo chuyên môn (AI, Web…)"
                  value={selection.query.expertise}
                  onChange={(e) => {
                    const nextExpertise = e.target.value
                    selection.setQuery((current) => ({ ...current, expertise: nextExpertise }))
                    void selection.applyFilters({ search: selection.query.search, expertise: nextExpertise })
                  }}
                  className="min-h-10 rounded-lg border border-line-strong bg-card px-3 text-xs text-ink outline-none focus:border-primary"
                />
                {departmentOptions.length > 1 && (
                  <select aria-label="Khoa / Bộ môn" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                    <option value="">Tất cả khoa / bộ môn</option>
                    {departmentOptions.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                )}
                <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-card px-3 text-xs font-semibold text-ink-soft">
                  <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="accent-primary" />
                  Chỉ hiện GV còn slot
                </label>
              </>
            }
            sort={{
              value: sortBy,
              onChange: (val) => setSortBy(val as 'default' | 'slots_desc' | 'name_asc'),
              options: [
                { value: 'default', label: 'Mặc định' },
                { value: 'slots_desc', label: 'Nhiều slot trống nhất' },
                { value: 'name_asc', label: 'Tên A–Z' },
              ],
            }}
            hasActiveFilters={hasFilters}
            onClearAll={clearAllFilters}
            resultSummary={selection.candidateLoading ? 'Đang tải danh sách giảng viên…' : `${visibleCandidates.length} / ${selection.candidates.length} giảng viên`}
          />

          <div className="p-5">
            {selection.candidateLoading && visibleCandidates.length === 0 ? (
              <p role="status" className="text-sm text-ink-muted">Đang lọc danh sách giảng viên…</p>
            ) : visibleCandidates.length === 0 ? (
              <div className="py-4 text-center text-sm text-ink-muted">
                <p>Không có giảng viên phù hợp với điều kiện của đồ án.</p>
                {hasFilters && <button type="button" onClick={clearAllFilters} className="mt-2 font-semibold text-primary underline">Xóa lọc</button>}
              </div>
            ) : (
              <>
                <ul className="divide-y divide-hairline">
                  {candidatePager.paginatedItems.map((candidate) => (
                    <li key={candidate.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar name={candidate.fullName} size="md" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-ink">{candidate.fullName}</h3>
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${candidate.remainingSlots > 0 ? 'border-status-success-border bg-status-success-bg text-status-success-text' : 'border-hairline bg-canvas text-ink-muted'}`}>
                              Còn {candidate.remainingSlots}/{candidate.semesterLimit} vị trí
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-muted">{candidate.departmentName} · Đang hướng dẫn {candidate.activeProjects} đồ án</p>
                          {candidate.bio ? <p className="mt-1.5 text-sm text-ink-soft">{candidate.bio}</p> : null}
                          <p className="mt-1.5 text-xs text-ink-muted">Chuyên môn: {candidate.expertise.map((item) => item.name).join(', ') || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <Button className="mt-2 md:mt-0" size="sm" variant="secondary" disabled={!activeSlot || selection.sendRequestPending} onClick={() => choose(candidate.id)}>
                        {slotOptions.length > 1 ? `Chọn cho ${activeSlot?.label}` : 'Chọn giảng viên'}
                      </Button>
                    </li>
                  ))}
                </ul>
                {candidatePager.showPagination && (
                  <div className="mt-3 border-t border-hairline pt-3">
                    <Pagination
                      page={candidatePager.page}
                      pages={candidatePager.pages}
                      total={candidatePager.total}
                      pageSize={candidatePager.pageSize}
                      onPage={candidatePager.setPage}
                      onPageSizeChange={candidatePager.setPageSize}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </>}
      </section>}

      <Modal
        open={Boolean(selected && selectedSlot)}
        title={selected && selectedSlot ? `Gửi yêu cầu tới ${selected.fullName}` : 'Gửi yêu cầu hướng dẫn'}
        description={selectedSlot ? `Vị trí mời: ${selectedSlot.label}` : undefined}
        busy={selection.sendRequestPending}
        onClose={() => { setSelectedId(null); setSelectedSlot(null) }}
      >
        {selected && selectedSlot ? <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div>
            <label htmlFor="request-message" className="block text-sm font-medium text-ink-soft">Lời nhắn (tùy chọn)</label>
            <textarea id="request-message" rows={4} className="mt-1 w-full rounded-lg border border-hairline bg-card p-3 text-sm text-ink focus:border-primary focus:outline-none" placeholder="Giới thiệu ngắn về hướng đề tài và kỳ vọng của nhóm…" value={message} onChange={(event) => setMessage(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={selection.sendRequestPending} onClick={() => { setSelectedId(null); setSelectedSlot(null) }}>Hủy</Button><Button type="submit" disabled={selection.sendRequestPending}>Gửi yêu cầu</Button></div>
        </form> : null}
      </Modal>
    </WorkspacePage>
  )
}
