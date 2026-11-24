import { dateTimeLabel } from '../../execution/execution-utils'
import { displayLabel } from '../../../components/ui/display-label'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { Pagination } from '../../../components/ui/Pagination'
import { useClientPagination } from '../../../components/ui/useClientPagination'
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
  const majorName = (majorId: number) => journey.project?.majors.find((item) => item.majorId === majorId)?.majorName ?? `#${majorId}`
  const slotOptions: Slot[] = [
    ...(!selection.activeAssignment && selection.canSend ? [{ key: 'PRIMARY', type: 'PRIMARY' as const, label: 'GVHD chính' }] : []),
    ...selection.missingMentorMajorIds.map((majorId) => ({ key: `MENTOR-${majorId}`, type: 'DISCIPLINE_MENTOR' as const, majorId, label: `Mentor — ${majorName(majorId)}` })),
  ]
  const activeSlot = slotOptions.find((option) => option.key === selection.slotKey) ?? slotOptions[0] ?? null

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [message, setMessage] = useState('')
  const selected = selection.candidates.find((candidate) => candidate.id === selectedId) ?? null

  const candidatesPagination = useClientPagination(selection.candidates, 8)
  const requestsPagination = useClientPagination(selection.requests, 6)

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

  const showSelectionCatalog = !selection.activeAssignment || selection.missingMentorMajorIds.length > 0
  const pendingCount = selection.requests.filter((request) => request.status === 'PENDING').length
  const activeAssignmentsCount = Math.max(
    selection.assignments.filter((item) => !item.endedAt).length,
    selection.activeAssignment ? 1 : 0,
  )

  const requestsCard = (
    <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
        <h2 className="text-base font-bold text-ink">Yêu cầu hướng dẫn</h2>
        <StatusBadge tone={pendingCount > 0 ? 'warning' : 'neutral'} label={`${selection.requests.length} yêu cầu`} />
      </div>
      <div className="p-5">
        {selection.requests.length ? (
          <>
            <ul className="divide-y divide-hairline">
              {requestsPagination.paginatedItems.map((request) => (
                <li key={request.id} className="py-3.5 first:pt-0 last:pb-0 text-sm text-ink">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={requestStatusTone(request.status)} label={displayLabel(request.status)} />
                    <span className="font-semibold">{slotLabel(request.assignmentType, request.majorId, majorName)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink">
                    {request.supervisorName?.trim() || selection.assignments.find(item => item.supervisorProfileId === request.supervisorProfileId)?.supervisorName || selection.candidates.find(item => item.id === request.supervisorProfileId)?.fullName || 'Chưa tải được tên giảng viên'}
                    <span className="text-xs text-ink-muted"> · gửi lúc {dateTimeLabel(request.requestedAt)}</span>
                    {request.status === 'PENDING' && request.expiresAt ? <span className="text-xs text-ink-muted"> · hết hạn lúc {dateTimeLabel(request.expiresAt)}</span> : null}
                  </p>
                  {request.requestMessage ? <p className="mt-1.5 rounded-md border border-hairline bg-canvas/70 p-2 text-xs text-ink-soft">Lời nhắn: {request.requestMessage}</p> : null}
                  {request.responseMessage ? <p className="mt-1.5 rounded-md border border-hairline bg-canvas/70 p-2 text-xs text-ink-soft">Phản hồi: {request.responseMessage}</p> : null}
                  {request.status === 'PENDING' && selection.isLeader ? <Button className="mt-2.5" size="sm" variant="danger" disabled={selection.cancelPending !== null} onClick={() => void selection.cancel(request)}>Hủy yêu cầu</Button> : null}
                  {request.status === 'REJECTED' ? <p className="mt-2 text-xs text-ink-muted">Bạn có thể chọn một giảng viên phù hợp khác.</p> : null}
                  {request.status === 'EXPIRED' ? <p className="mt-2 text-xs text-ink-muted">Lời mời đã quá hạn phản hồi. Bạn có thể gửi lại cho vị trí này.</p> : null}
                </li>
              ))}
            </ul>
            {requestsPagination.showPagination ? (
              <Pagination
                className="mt-4"
                page={requestsPagination.page}
                pages={requestsPagination.totalPages}
                total={requestsPagination.total}
                pageSize={requestsPagination.pageSize}
                onPage={requestsPagination.setPage}
              />
            ) : null}
          </>
        ) : <p className="text-sm text-ink-muted">Chưa có yêu cầu hướng dẫn.</p>}
      </div>
    </section>
  )

  return (
    <div className="workspace-page mk-page-enter space-y-5 pb-10">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <div className="workspace-context"><span className="workspace-kicker">Định hướng đồ án</span></div>
          <h1>{selection.activeAssignment ? 'Giảng viên hướng dẫn' : 'Chọn giảng viên hướng dẫn'}</h1>
          <p className="mt-1.5 text-sm font-medium text-ink-soft">{journey.project.code} · {journey.project.title} · {projectStatusLabel(journey.project.status)}</p>
          <p>{selection.activeAssignment
            ? (selection.missingMentorMajorIds.length > 0 ? 'Đã có GVHD chính. Mời thêm Mentor cho các ngành liên quan còn thiếu xác nhận.' : 'Xem phân công hiện tại và lịch sử yêu cầu hướng dẫn của nhóm.')
            : 'Bạn có thể mời GVHD chính và Mentor từng ngành (nếu đồ án liên ngành) ngay khi đề cương còn là bản nháp — không cần chờ Bộ môn duyệt. Tìm giảng viên phù hợp và gửi lời mời từ tài khoản trưởng nhóm.'}</p>
        </div>
      </header>

      {selection.error ? (
        <section role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          {selection.error.message}
          <Button className="ml-3" size="sm" variant="secondary" onClick={() => void selection.refresh(true)}>Tải lại</Button>
        </section>
      ) : null}

      <StatTileRow
        tiles={[
          {
            icon: 'school',
            label: 'Giảng viên đã phân công',
            value: activeAssignmentsCount,
            caption: selection.activeAssignment ? 'Đã có GVHD chính thức' : 'Chưa có GVHD chính thức',
            hero: true,
          },
          {
            icon: 'group',
            label: 'Ứng viên khả dụng',
            value: selection.candidates.length,
            tone: 'info',
            caption: slotOptions.length > 0 ? `${slotOptions.length} vị trí đang mở mời` : 'Không còn vị trí cần mời',
          },
          {
            icon: 'mail',
            label: 'Yêu cầu đã gửi',
            value: selection.requests.length,
            tone: pendingCount > 0 ? 'warning' : 'neutral',
            caption: `${pendingCount} yêu cầu đang chờ phản hồi`,
          },
          {
            icon: 'fact_check',
            label: 'Vị trí còn thiếu',
            value: slotOptions.length,
            tone: slotOptions.length === 0 ? 'success' : 'warning',
            caption: slotOptions.length === 0 ? 'Đã hoàn tất phân công' : 'Chọn giảng viên phù hợp để mời',
          },
        ]}
      />

      {selection.activeAssignment ? (
        <section className="rounded-xl border border-status-success-border bg-status-success-bg p-5 shadow-xs">
          <h2 className="font-bold text-status-success-text">Đã có phân công hướng dẫn chính thức</h2>
          <p className="mt-1 text-sm text-status-success-text">{selection.activeAssignment.supervisorName} · phân công lúc {dateTimeLabel(selection.activeAssignment.assignedAt)}</p>
        </section>
      ) : null}

      {showSelectionCatalog ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start">
          {/* Cột trái (8 cột): Gợi ý & Danh sách ứng viên GVHD */}
          <div className="xl:col-span-8 space-y-5">
            {env.supervisorRecommendationEnabled && (selection.canSend || selection.canSendMentor) && journey.project && activeSlot && (
              <SupervisorRecommendationPanel
                key={`${journey.project.id}:${activeSlot.key}`}
                projectId={journey.project.id}
                assignmentType={activeSlot.type}
                majorId={activeSlot.majorId}
                candidateIds={new Set(selection.candidates.map(candidate => candidate.id))}
                onPick={id => choose(id)}
              />
            )}

            <section className="overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
                <div>
                  <h2 className="text-base font-bold text-ink">Danh sách giảng viên khả dụng</h2>
                  <p className="mt-0.5 text-xs text-ink-muted">Lọc theo tên hoặc chuyên môn và gửi lời mời trực tiếp.</p>
                </div>
                <StatusBadge tone="info" label={`${selection.candidates.length} giảng viên`} />
              </div>

              <div className="p-5">
                {slotOptions.length === 0 ? (
                  <p className="text-sm text-ink-muted">Bạn chưa thể gửi yêu cầu hướng dẫn ở trạng thái hiện tại.</p>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">Mời cho vị trí</p>
                      {slotOptions.length > 1 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {slotOptions.map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              aria-pressed={activeSlot?.key === option.key}
                              onClick={() => { selection.setSlotKey(option.key); setSelectedId(null); setSelectedSlot(null) }}
                              className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${activeSlot?.key === option.key ? 'border-primary bg-primary text-white' : 'border-hairline bg-card text-ink-soft hover:bg-canvas'}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-ink">{activeSlot?.label}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-hairline bg-canvas/70 p-3.5">
                      <div className="flex-1 min-w-[180px]">
                        <label htmlFor="candidate-search" className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">Tìm giảng viên</label>
                        <input
                          id="candidate-search"
                          className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                          value={selection.query.search}
                          onChange={(event) => selection.setQuery((current) => ({ ...current, search: event.target.value }))}
                        />
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <label htmlFor="candidate-expertise" className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">Chuyên môn</label>
                        <input
                          id="candidate-expertise"
                          className="mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
                          value={selection.query.expertise}
                          onChange={(event) => selection.setQuery((current) => ({ ...current, expertise: event.target.value }))}
                        />
                      </div>
                      <Button size="sm" variant="secondary" className="min-h-11 shrink-0" disabled={selection.candidateLoading} onClick={() => void selection.applyFilters()}>
                        Lọc danh sách
                      </Button>
                    </div>

                    {selection.candidates.length === 0 ? (
                      <p className="mt-4 text-sm text-ink-muted">Không có giảng viên phù hợp với điều kiện của đồ án.</p>
                    ) : (
                      <>
                        <ul className="mt-4 divide-y divide-hairline border-t border-hairline">
                          {candidatesPagination.paginatedItems.map((candidate) => (
                            <li key={candidate.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-ink">{candidate.fullName}</h3>
                                  <span className="text-xs text-ink-muted">· {candidate.departmentName}</span>
                                </div>
                                {candidate.bio ? <p className="mt-1.5 text-sm text-ink-soft">{candidate.bio}</p> : null}
                                <p className="mt-1.5 text-xs text-ink-muted">Chuyên môn: {candidate.expertise.map((item) => item.name).join(', ') || 'Chưa cập nhật'}</p>
                                <p className="mt-1 text-xs text-ink-muted tabular-nums">Đang hướng dẫn {candidate.activeProjects} đồ án · còn {candidate.remainingSlots}/{candidate.semesterLimit} vị trí</p>
                              </div>
                              <Button className="shrink-0" size="sm" disabled={!activeSlot || selection.sendRequestPending} onClick={() => choose(candidate.id)}>
                                {slotOptions.length > 1 ? `Chọn cho ${activeSlot?.label}` : 'Chọn giảng viên'}
                              </Button>
                            </li>
                          ))}
                        </ul>

                        {candidatesPagination.showPagination ? (
                          <Pagination
                            className="mt-4"
                            page={candidatesPagination.page}
                            pages={candidatesPagination.totalPages}
                            total={candidatesPagination.total}
                            pageSize={candidatesPagination.pageSize}
                            pageSizeOptions={[8, 16, 30]}
                            onPage={candidatesPagination.setPage}
                            onPageSizeChange={candidatesPagination.setPageSize}
                          />
                        ) : null}
                      </>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>

          {/* Cột phải (4 cột): Form gửi lời mời & Lịch sử yêu cầu hướng dẫn */}
          <div className="xl:col-span-4 space-y-5">
            {selected && selectedSlot ? (
              <form className="overflow-hidden rounded-xl border border-primary/40 bg-card shadow-xs" onSubmit={(event) => void submit(event)}>
                <div className="bg-primary-subtle border-b border-primary/20 px-5 py-3.5">
                  <h2 className="text-base font-bold text-primary">Gửi yêu cầu tới {selected.fullName} · {selectedSlot.label}</h2>
                </div>
                <div className="p-5">
                  <label htmlFor="request-message" className="block text-sm font-medium text-ink-soft">Lời nhắn (tùy chọn)</label>
                  <textarea
                    id="request-message"
                    rows={3}
                    className="mt-1.5 w-full rounded-lg border border-hairline bg-card p-3 text-sm text-ink focus:border-primary focus:outline-none"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="submit" disabled={selection.sendRequestPending}>Gửi yêu cầu</Button>
                    <Button type="button" variant="secondary" onClick={() => { setSelectedId(null); setSelectedSlot(null) }}>Hủy</Button>
                  </div>
                </div>
              </form>
            ) : null}

            {requestsCard}
          </div>
        </div>
      ) : (
        requestsCard
      )}
    </div>
  )
}
