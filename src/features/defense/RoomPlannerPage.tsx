import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { WorkspaceTabs } from '../../components/ui/WorkspaceTabs'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Pagination } from '../../components/ui/Pagination'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
import { RoomFloorPlan } from './RoomFloorPlan'
import { DefenseChangeRequestsPanel } from './DefenseChangeRequestsPanel'
import { Gate3ScheduleChangePanel } from './Gate3ScheduleChangePanel'
import { RoomCatalogPanel } from './RoomCatalogPanel'
import { PeriodCalendarPanel } from './PeriodCalendarPanel'
import { HttpError } from '../../services/http/http-client'
import {
  applyDefenseSchedule,
  applyGate3Schedule,
  formatScheduleConflictReason,
  getGate3Schedules,
  getPeriodDefenseSessions,
  getPlannerRooms,
  previewDefenseSchedule,
  previewGate3Schedule,
} from './room-planner-api'
import type { AutoSchedulePreview, DefenseAllocation, ReviewGate3ScheduleDto, RoomDto, RoomSchedulingExclusion } from './room-planner-api'

const nextDayVietnam = () => new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })

function plannerError(reason: unknown, fallback: string): string {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
    if (reason.status === 403) return 'Bạn không có quyền xem hoặc điều phối lịch trong kỳ đồ án này.'
    if (reason.status === 404) return 'Không tìm thấy kỳ đồ án hoặc dữ liệu lịch được yêu cầu.'
    if (reason.status === 409) return 'Lịch hoặc điều kiện xếp phòng vừa thay đổi. Tải lại lịch và xem trước lại.'
    if (reason.status === 400 || reason.status === 422) return 'Dữ liệu phòng, ngày, ca hoặc cửa sổ Gate chưa hợp lệ. Hãy kiểm tra và thử lại.'
  }
  return fallback
}

interface PublishedSession {
  key: string
  projectId: number
  projectCode?: string | null
  projectTitle?: string | null
  committeeName?: string | null
  roomId: number | null
  roomCode: string | null
  startAt: string
  endAt: string
  status: string
  gate3?: ReviewGate3ScheduleDto
}

async function readPublished(periodId: number, gate: 'R3' | 'R4', signal?: AbortSignal): Promise<PublishedSession[]> {
  if (gate === 'R3') {
    const sessions = await getGate3Schedules(periodId, signal)
    return sessions.filter(item => Boolean(item.publishedAt)).map(item => ({
      key: `R3-${item.gateInstanceId}`, projectId: item.projectId, roomId: item.roomId,
      roomCode: item.roomCode, startAt: item.startAt, endAt: item.endAt, status: 'Đã công bố',
      gate3: item,
    }))
  }
  const sessions = await getPeriodDefenseSessions(periodId, undefined, signal)
  return sessions.filter(item => item.status === 'SCHEDULED').map(item => ({
    key: `R4-${item.id}`, projectId: item.projectId, projectCode: item.projectCode,
    projectTitle: item.projectTitle, committeeName: item.committeeName,
    roomId: item.roomId, roomCode: item.roomCode, startAt: item.startAt, endAt: item.endAt, status: item.status,
  }))
}

function matchesAllocation(session: PublishedSession, allocation: DefenseAllocation, gate: 'R3' | 'R4') {
  return session.projectId === allocation.projectId && session.roomId === allocation.roomId
    && Date.parse(session.startAt) === Date.parse(allocation.startAt)
    && Date.parse(session.endAt) === Date.parse(allocation.endAt)
    && (gate === 'R3' ? session.status === 'Đã công bố' : session.status === 'SCHEDULED')
}

export function RoomPlannerPage() {
  const periodId = Number(useParams().periodId)
  return <RoomPlannerWorkspace key={periodId} periodId={periodId} />
}

function RoomPlannerWorkspace({ periodId }: { periodId: number }) {
  const [activeTab, setActiveTab] = useState<'planner' | 'published' | 'config'>('planner')
  const [targetGate, setTargetGate] = useState<'R3' | 'R4'>('R4')
  const [rooms, setRooms] = useState<RoomDto[]>([])
  const [loading, setLoading] = useState(true)
  const [roomsRevision, setRoomsRevision] = useState(0)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState(nextDayVietnam)
  const [endDate, setEndDate] = useState(nextDayVietnam)
  const [selectedDate, setSelectedDate] = useState(nextDayVietnam)
  const [exclusions, setExclusions] = useState<RoomSchedulingExclusion[]>([])
  const [preview, setPreview] = useState<AutoSchedulePreview | null>(null)
  const [confirmPartial, setConfirmPartial] = useState(false)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState('')
  const requestVersion = useRef(0)
  const publishedRequestVersion = useRef(0)
  const [published, setPublished] = useState<PublishedSession[]>([])
  const [publishedLoading, setPublishedLoading] = useState(true)
  const [publishedError, setPublishedError] = useState('')
  const [publishedRevision, setPublishedRevision] = useState(0)
  const [editingGate3, setEditingGate3] = useState<ReviewGate3ScheduleDto | null>(null)

  useEffect(() => () => { requestVersion.current += 1 }, [])

  useEffect(() => {
    const controller = new AbortController()
    getPlannerRooms(controller.signal).then((data) => {
      if (!controller.signal.aborted) setRooms(data)
    }).catch(reason => {
      if (!controller.signal.aborted) { setRooms([]); setError(plannerError(reason, 'Chưa tải được danh mục phòng. Hãy thử lại.')) }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [roomsRevision])

  useEffect(() => {
    if (!Number.isSafeInteger(periodId) || periodId < 1) return
    const controller = new AbortController()
    const request = ++publishedRequestVersion.current
    readPublished(periodId, targetGate, controller.signal).then(rows => {
      if (!controller.signal.aborted && request === publishedRequestVersion.current) setPublished(rows)
    }).catch(reason => {
      if (!controller.signal.aborted && request === publishedRequestVersion.current) {
        setPublished([])
        setPublishedError(plannerError(reason, 'Chưa tải được lịch đã công bố. Hãy thử tải lại.'))
      }
    }).finally(() => {
      if (!controller.signal.aborted && request === publishedRequestVersion.current) setPublishedLoading(false)
    })
    return () => controller.abort()
  }, [periodId, targetGate, publishedRevision])

  const changeGate = (gate: 'R3' | 'R4') => {
    setTargetGate(gate)
    setPublished([])
    setPublishedLoading(true)
    setPublishedError('')
    setEditingGate3(null)
    setPreview(null)
    setConfirmPartial(false)
    setSuccess('')
    setError('')
  }

  const changeExclusions = (next: RoomSchedulingExclusion[]) => { setExclusions(next); setPreview(null); setConfirmPartial(false); setSuccess('') }
  const refreshRooms = () => {
    setRooms([]); setLoading(true); setPreview(null); setConfirmPartial(false); setSuccess(''); setExclusions([])
    setRoomsRevision(value => value + 1)
  }
  const refreshPublished = () => {
    setPublished([])
    setEditingGate3(null)
    setPublishedLoading(true)
    setPublishedError('')
    setPublishedRevision(value => value + 1)
  }
  const changeRange = (start: string, end: string) => {
    setStartDate(start); setEndDate(end); setSelectedDate(start)
    setExclusions((current) => current.filter((item) => item.date === null || (item.date >= start && item.date <= end)))
    setPreview(null); setConfirmPartial(false); setSuccess('')
  }
  const activeRooms = rooms.filter((room) => room.status === 'ACTIVE' && [2, 3, 4].includes(room.floor))
  const earliestDate = nextDayVietnam()
  const validRange = startDate >= earliestDate && startDate <= endDate
    && Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`) <= 31 * 86400000

  const runPreview = async () => {
    if (!Number.isSafeInteger(periodId) || periodId < 1 || !validRange || activeRooms.length === 0) return
    setBusy(true); setError(''); setSuccess(''); setPreview(null); setConfirmPartial(false)
    const request = ++requestVersion.current
    try {
      const payload = {
        startDate,
        endDate,
        roomIds: activeRooms.map((room) => room.id),
        maxSlotsPerDay: 6,
        exclusions,
      }
      const result = targetGate === 'R3'
        ? await previewGate3Schedule(periodId, payload)
        : await previewDefenseSchedule(periodId, payload)
      if (request === requestVersion.current) setPreview(result)
    } catch (reason) {
      if (request === requestVersion.current) setError(plannerError(reason, `Không tạo được bản xem trước lịch ${targetGate === 'R3' ? 'Gate 3' : 'Gate 4'}. Kiểm tra cửa sổ ngày và dữ liệu người chấm.`))
    } finally {
      if (request === requestVersion.current) setBusy(false)
    }
  }

  const applyPreview = async () => {
    if (!preview || preview.allocations.length === 0 || preview.unscheduledCount > 0 && !confirmPartial) return
    setBusy(true); setError('')
    const request = ++requestVersion.current
    let applied = false
    try {
      if (targetGate === 'R3') {
        await applyGate3Schedule(periodId, {
          allocations: preview.allocations,
          concurrencyToken: preview.concurrencyToken,
          exclusions,
        })
      } else {
        await applyDefenseSchedule(periodId, {
          allocations: preview.allocations,
          concurrencyToken: preview.concurrencyToken,
          exclusions,
        })
      }
      applied = true
      if (request !== requestVersion.current) return
      ++publishedRequestVersion.current
      setPreview(null)
      const rows = await readPublished(periodId, targetGate)
      if (request !== requestVersion.current) return
      setPublished(rows)
      setPublishedLoading(false)
      if (!preview.allocations.every(allocation => rows.some(row => matchesAllocation(row, allocation, targetGate))))
        throw new Error('Published schedule readback did not match the applied allocations.')
      setPublishedError('')
      setSuccess(`Đã xác minh ${preview.allocations.length} phiên ${targetGate === 'R3' ? 'đánh giá Gate 3' : 'bảo vệ Gate 4'} trong lịch đã công bố.${preview.unscheduledCount > 0 ? ` ${preview.unscheduledCount} nhóm chưa được xếp lịch.` : ''}`)
    } catch (reason) {
      if (request === requestVersion.current) {
        if (applied) {
          setPreview(null)
          setPublishedLoading(false)
          setPublishedError('Chưa xác minh được lịch sau khi công bố. Hãy tải lại lịch đã công bố.')
          setError('Đã gửi yêu cầu công bố nhưng chưa xác minh được lịch. Hãy tải lại lịch trước khi thao tác tiếp.')
        } else {
          setError(plannerError(reason, 'Chưa áp dụng được lịch. Hãy kiểm tra điều kiện và thử lại.'))
        }
      }
    } finally {
      if (request === requestVersion.current) setBusy(false)
    }
  }

  const previewConflicts = useMemo(() => preview?.conflicts ?? [], [preview])
  const previewAllocations = useMemo(() => preview?.allocations ?? [], [preview])
  const conflictPagination = useClientPagination(previewConflicts, 8)
  const allocationPagination = useClientPagination(previewAllocations, 10)
  const publishedPagination = useClientPagination(published, 10)
  const totalActiveCapacity = useMemo(() => activeRooms.reduce((sum, room) => sum + room.capacity, 0), [activeRooms])
  const projectLabelById = useMemo(() => {
    const map = new Map<number, { code?: string | null; title?: string | null; committeeName?: string | null }>()
    for (const item of published) {
      if (item.projectCode || item.projectTitle) {
        map.set(item.projectId, { code: item.projectCode, title: item.projectTitle, committeeName: item.committeeName })
      }
    }
    return map
  }, [published])
  const formatProjectLabel = (projectId: number, code?: string | null, title?: string | null) => {
    const fallback = projectLabelById.get(projectId)
    const resolvedCode = code ?? fallback?.code
    const resolvedTitle = title ?? fallback?.title
    if (resolvedCode && resolvedTitle) return `${resolvedCode} · ${resolvedTitle}`
    if (resolvedCode) return `${resolvedCode} (Đồ án #${projectId})`
    if (resolvedTitle) return `${resolvedTitle} (#${projectId})`
    return `Đồ án #${projectId}`
  }

  if (!Number.isSafeInteger(periodId) || periodId < 1) {
    return <WorkspacePage title="Phòng & lập lịch"><p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">Mã kỳ đồ án không hợp lệ.</p></WorkspacePage>
  }

  return (
    <WorkspacePage
      className="space-y-5 pb-10"
      title={`Phòng & lập lịch ${targetGate === 'R3' ? 'Gate 3 (Review chuyên môn)' : 'Gate 4 (Hội đồng bảo vệ)'}`}
      eyebrow={`Kỳ đồ án #${periodId}`}
      description="Chọn tầng 2–4, loại phòng hoặc ca khỏi lần tự xếp này, rồi xem trước và duyệt công bố lịch chính thức."
    >
      <StatTileRow tiles={[
        { icon: 'meeting_room', label: 'Phòng hoạt động (T2–4)', value: loading ? null : activeRooms.length, hero: true, caption: loading ? 'Đang tải danh mục phòng…' : `Trên tổng ${rooms.length} phòng · ${totalActiveCapacity} chỗ` },
        { icon: 'event_available', label: `Ca đã công bố (${targetGate})`, value: publishedLoading ? null : published.length, tone: 'success', caption: published.length > 0 ? 'Đã có lịch chính thức' : 'Chưa có phiên được công bố' },
        preview
          ? { icon: 'auto_awesome', label: 'Nhóm đã xếp (xem trước)', value: preview.scheduledCount, tone: 'info', caption: 'Chờ duyệt áp dụng' }
          : { icon: 'event_seat', label: 'Sức chứa mỗi ca (T2–4)', value: loading ? null : totalActiveCapacity, tone: 'info', caption: 'Tổng chỗ ngồi phòng đang hoạt động' },
        preview
          ? { icon: 'warning', label: 'Xung đột / Chưa đủ ĐK', value: preview.unscheduledCount, tone: preview.unscheduledCount > 0 ? 'warning' : 'success', caption: `${preview.conflicts.length} nhóm có ghi chú` }
          : { icon: 'block', label: 'Mục loại trừ tạm', value: exclusions.length, tone: exclusions.length > 0 ? 'warning' : 'neutral', caption: exclusions.length > 0 ? 'Áp dụng cho lượt xem trước tiếp theo' : 'Chưa khóa phòng hoặc ca nào' },
      ]} />

      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-card p-3 shadow-xs">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn cổng đánh giá">
            <button
              type="button"
              aria-pressed={targetGate === 'R4'}
              onClick={() => changeGate('R4')}
              className={`min-h-11 rounded-xl px-4 text-sm font-bold transition-colors ${
                targetGate === 'R4'
                  ? 'bg-primary text-white shadow-xs'
                  : 'border border-hairline bg-canvas text-ink-soft hover:bg-card hover:text-ink'
              }`}
            >
              Gate 4 · Lập lịch bảo vệ tốt nghiệp (Offline)
            </button>
            <button
              type="button"
              aria-pressed={targetGate === 'R3'}
              onClick={() => changeGate('R3')}
              className={`min-h-11 rounded-xl px-4 text-sm font-bold transition-colors ${
                targetGate === 'R3'
                  ? 'bg-primary text-white shadow-xs'
                  : 'border border-hairline bg-canvas text-ink-soft hover:bg-card hover:text-ink'
              }`}
            >
              Gate 3 · Lập lịch thẩm định chuyên môn (Offline)
            </button>
          </div>
          <span className="px-2 text-xs font-medium text-ink-muted">
            <strong className="tabular-nums text-ink">{activeRooms.length}</strong> phòng tầng 2–4 · <strong className="tabular-nums text-ink">{exclusions.length}</strong> loại trừ tạm
          </span>
        </div>

        <WorkspaceTabs
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Khu vực điều phối phòng và lịch"
          tabs={[
            { id: 'planner', label: 'Xếp lịch tự động & Sơ đồ phòng', icon: 'auto_awesome', count: preview ? preview.scheduledCount : activeRooms.length },
            { id: 'published', label: 'Lịch đã công bố & Đơn đổi phòng', icon: 'event_available', count: publishedLoading ? null : published.length, badgeTone: published.length > 0 ? 'success' : 'default' },
            { id: 'config', label: 'Ngày nghỉ kỳ & Danh mục phòng', icon: 'settings', count: loading ? null : rooms.length },
          ]}
        />

        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">
            <span>{error}</span>
            {!loading && rooms.length === 0 && <button type="button" className="min-h-11 font-semibold underline" onClick={() => { setLoading(true); setError(''); setRoomsRevision(value => value + 1) }}>Tải lại phòng</button>}
          </div>
        )}
        {success && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-success-border bg-status-success-bg p-3 text-sm text-status-success-text">
            <span>{success}</span>
            {activeTab !== 'published' && (
              <button type="button" onClick={() => setActiveTab('published')} className="min-h-11 rounded-lg border border-status-success-border bg-card px-3 text-xs font-bold text-status-success-text hover:bg-canvas">
                Xem lịch đã công bố →
              </button>
            )}
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <h2 className="text-base font-bold text-ink">Tham số xếp lịch tự động ({targetGate})</h2>
                <StatusBadge tone="info" label={targetGate === 'R3' ? 'Thẩm định chuyên môn' : 'Bảo vệ tốt nghiệp'} />
              </div>

              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-end gap-4">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
                    Từ ngày
                    <input
                      type="date"
                      min={earliestDate}
                      value={startDate}
                      onChange={(event) => changeRange(event.target.value, endDate)}
                      className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
                    Đến ngày
                    <input
                      type="date"
                      min={startDate >= earliestDate ? startDate : earliestDate}
                      value={endDate}
                      onChange={(event) => changeRange(startDate, event.target.value)}
                      className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-ink-soft">
                    Ngày chỉnh ca
                    <input
                      type="date"
                      min={startDate}
                      max={endDate}
                      value={selectedDate}
                      onChange={(event) => { setSelectedDate(event.target.value); setPreview(null); setConfirmPartial(false) }}
                      className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-normal text-ink"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || loading || !validRange || activeRooms.length === 0}
                    onClick={runPreview}
                    className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary-hover disabled:opacity-50"
                  >
                    {busy ? 'Đang xử lý…' : `Tự động xếp lịch ${targetGate} · Xem trước`}
                  </button>
                </div>
                {!validRange && (
                  <p role="alert" className="text-sm text-status-error-text">
                    Ngày bắt đầu phải từ ngày mai (giờ Việt Nam); ngày kết thúc không trước ngày bắt đầu và khoảng ngày tối đa 32 ngày.
                  </p>
                )}
                <details className="rounded-xl border border-primary/20 bg-primary-subtle/70">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-xs font-bold text-primary">
                    <span>Quy chuẩn tự động xếp lịch {targetGate === 'R3' ? 'Gate 3' : 'Gate 4'}</span>
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">expand_more</span>
                  </summary>
                  <div className="border-t border-primary/15 px-4 py-3 text-xs leading-5 text-primary">
                    {targetGate === 'R3' ? (
                      <p>
                        Chỉ xếp cho các nhóm đã <strong>đạt Gate 2</strong> trong cửa sổ thời gian quy định. Yêu cầu 2 giảng viên phản biện (Chủ tọa &amp; Thư ký), không phải GVHD. Lịch sau khi công bố sẽ gửi thông báo và mở biên bản điện tử.
                      </p>
                    ) : (
                      <p>
                        Chỉ xếp cho các nhóm đã <strong>đạt Gate 3</strong>. Yêu cầu hội đồng bảo vệ đã phân công, đủ sức chứa phòng (SV + GV + 5 chỗ dự phòng), chống trùng ca giảng viên và GVHD không được ngồi hội đồng.
                      </p>
                    )}
                  </div>
                </details>
              </div>
            </section>

            {loading && <p role="status" className="text-sm text-ink-muted">Đang tải danh mục phòng…</p>}
            {!loading && !error && rooms.length === 0 && <p className="rounded-lg border border-hairline bg-canvas p-3 text-sm text-ink-muted">Chưa có phòng trong danh mục. Cán bộ điều phối cần tạo phòng tại tab &quot;Ngày nghỉ kỳ &amp; Danh mục phòng&quot; trước khi xếp lịch.</p>}

            {!loading && rooms.length > 0 && (
              <RoomFloorPlan
                rooms={rooms}
                selectedDate={selectedDate}
                exclusions={exclusions}
                onChange={changeExclusions}
                allocations={preview?.allocations}
              />
            )}

            {preview && (
              <section aria-label="Kết quả xem trước" className="overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                  <div>
                    <h2 className="text-base font-bold text-ink">Kết quả xem trước ({targetGate})</h2>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Đã xếp: <strong className="tabular-nums text-ink">{preview.scheduledCount}</strong> · Chưa xếp: <strong className="tabular-nums text-ink">{preview.unscheduledCount}</strong>
                    </p>
                  </div>
                  <StatusBadge tone={preview.unscheduledCount > 0 ? 'warning' : 'success'} label={preview.unscheduledCount > 0 ? `${preview.unscheduledCount} chưa xếp` : 'Xếp đủ toàn bộ'} />
                </div>

                <div className="grid grid-cols-1 items-start gap-5 p-5 xl:grid-cols-12">
                  <div className={`space-y-4 ${preview.conflicts.length > 0 ? 'xl:col-span-7' : 'xl:col-span-12'}`}>
                    <div className="overflow-x-auto rounded-xl border border-hairline">
                      <Table aria-label="Danh sách phân bổ lịch">
                        <TableHead>
                          <TableRow head>
                            <TableHeaderCell>Đồ án</TableHeaderCell>
                            <TableHeaderCell>Ngày</TableHeaderCell>
                            <TableHeaderCell>Ca</TableHeaderCell>
                            <TableHeaderCell>Thời gian</TableHeaderCell>
                            <TableHeaderCell>Phòng</TableHeaderCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {allocationPagination.paginatedItems.map((item) => (
                            <TableRow key={item.projectId}>
                              <TableCell className="font-semibold text-ink">{formatProjectLabel(item.projectId)}</TableCell>
                              <TableCell className="tabular-nums">{item.date}</TableCell>
                              <TableCell>Ca {item.slotNumber}</TableCell>
                              <TableCell className="text-xs tabular-nums text-ink-muted">
                                {item.startAt.slice(11, 16)} – {item.endAt.slice(11, 16)}
                              </TableCell>
                              <TableCell className="font-medium">{item.roomCode}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {allocationPagination.showPagination && (
                      <Pagination
                        page={allocationPagination.page}
                        pages={allocationPagination.totalPages}
                        total={allocationPagination.total}
                        pageSize={allocationPagination.pageSize}
                        onPage={allocationPagination.setPage}
                      />
                    )}
                  </div>

                  {preview.conflicts.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-status-warning-border bg-status-warning-bg p-4 xl:col-span-5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-status-warning-text">Các nhóm chưa đủ điều kiện hoặc có xung đột:</h3>
                        <span className="rounded-full bg-card px-2 py-0.5 text-xs font-bold tabular-nums text-status-warning-text">{preview.conflicts.length}</span>
                      </div>
                      <ul className="list-inside list-disc space-y-1.5 text-sm text-status-warning-text">
                        {conflictPagination.paginatedItems.map((item) => (
                          <li key={item.projectId}>
                            {formatProjectLabel(item.projectId)}: <strong>{formatScheduleConflictReason(item.reason)}</strong>
                          </li>
                        ))}
                      </ul>
                      {conflictPagination.showPagination && (
                        <Pagination
                          page={conflictPagination.page}
                          pages={conflictPagination.totalPages}
                          total={conflictPagination.total}
                          pageSize={conflictPagination.pageSize}
                          onPage={conflictPagination.setPage}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-hairline bg-canvas/50 px-5 py-4">
                  <button
                    type="button"
                    onClick={applyPreview}
                    disabled={busy || preview.allocations.length === 0 || preview.unscheduledCount > 0 && !confirmPartial}
                    className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-xs transition-colors hover:bg-primary-hover disabled:opacity-50"
                  >
                    Duyệt và áp dụng lịch
                  </button>
                  {preview.unscheduledCount > 0 && (
                    <label className="flex min-h-11 items-center gap-2 text-sm text-status-warning-text">
                      <input type="checkbox" checked={confirmPartial} onChange={event => setConfirmPartial(event.target.checked)} />
                      Tôi xác nhận chỉ công bố {preview.allocations.length} phiên đã xếp; {preview.unscheduledCount} nhóm chưa có lịch.
                    </label>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'published' && (
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
            <section aria-label={`Lịch đã công bố ${targetGate}`} className={`overflow-hidden rounded-2xl border border-hairline bg-card shadow-xs ${targetGate === 'R4' ? 'xl:col-span-7' : 'xl:col-span-12'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/70 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-ink">Lịch đã công bố · {targetGate}</h2>
                  <span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary">{published.length} phiên</span>
                </div>
                <button type="button" onClick={refreshPublished}
                  className="min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-semibold text-primary hover:bg-canvas">
                  Tải lại lịch
                </button>
              </div>
              <div className="space-y-4 p-5">
                {publishedLoading && <p role="status" className="text-sm text-ink-muted">Đang tải lịch đã công bố…</p>}
                {publishedError && <p role="alert" className="text-sm text-status-error-text">{publishedError}</p>}
                {!publishedLoading && !publishedError && published.length === 0 &&
                  <p className="text-sm text-ink-muted">Chưa có phiên nào được công bố trong phạm vi của bạn.</p>}
                {!publishedLoading && !publishedError && published.length > 0 && (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-hairline">
                      <Table aria-label={`Danh sách lịch đã công bố ${targetGate}`}>
                        <TableHead><TableRow head>
                          <TableHeaderCell>Đồ án</TableHeaderCell>
                          <TableHeaderCell>Thời gian</TableHeaderCell>
                          <TableHeaderCell>Phòng</TableHeaderCell>
                          <TableHeaderCell>Trạng thái</TableHeaderCell>
                          {targetGate === 'R3' && <TableHeaderCell>Thao tác</TableHeaderCell>}
                        </TableRow></TableHead>
                        <TableBody>{publishedPagination.paginatedItems.map(item => <TableRow key={item.key}>
                          <TableCell>
                            <span className="block font-semibold text-ink">{formatProjectLabel(item.projectId, item.projectCode, item.projectTitle)}</span>
                            {item.committeeName && <span className="block text-xs text-ink-muted">{item.committeeName}</span>}
                          </TableCell>
                          <TableCell className="tabular-nums">{new Date(item.startAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</TableCell>
                          <TableCell className="font-medium">{item.roomCode ?? 'Chưa có phòng'}</TableCell>
                          <TableCell><StatusBadge tone="success" label={item.status === 'SCHEDULED' ? 'Đã lên lịch' : item.status} /></TableCell>
                          {targetGate === 'R3' && <TableCell>{item.gate3 &&
                            <button type="button" className="min-h-11 font-semibold text-primary underline" onClick={() => setEditingGate3(item.gate3!)}>Đổi phòng/ca</button>}</TableCell>}
                        </TableRow>)}</TableBody>
                      </Table>
                    </div>
                    {publishedPagination.showPagination && (
                      <Pagination
                        page={publishedPagination.page}
                        pages={publishedPagination.totalPages}
                        total={publishedPagination.total}
                        pageSize={publishedPagination.pageSize}
                        pageSizeOptions={[10, 20, 40]}
                        onPage={publishedPagination.setPage}
                        onPageSizeChange={publishedPagination.setPageSize}
                      />
                    )}
                  </>
                )}
                {targetGate === 'R3' && editingGate3 && <div><Gate3ScheduleChangePanel
                  key={`${editingGate3.gateInstanceId}-${editingGate3.concurrencyToken}`}
                  periodId={periodId} schedule={editingGate3} rooms={rooms}
                  onChanged={refreshPublished} onClose={() => setEditingGate3(null)}
                /></div>}
              </div>
            </section>
            {targetGate === 'R4' && (
              <div className="xl:col-span-5">
                <DefenseChangeRequestsPanel periodId={periodId} rooms={rooms} onScheduleChanged={refreshPublished} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
            <div className={!loading && !error ? 'xl:col-span-6' : 'xl:col-span-12'}>
              <PeriodCalendarPanel periodId={periodId} onChanged={() => { setPreview(null); setConfirmPartial(false); setSuccess('') }} />
            </div>
            {!loading && !error && (
              <div className="xl:col-span-6">
                <RoomCatalogPanel rooms={rooms} onChanged={refreshRooms} />
              </div>
            )}
          </div>
        )}
      </fieldset>
    </WorkspacePage>
  )
}
