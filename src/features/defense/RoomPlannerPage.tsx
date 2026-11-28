import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { FilterToolbar, type ActiveFilterChip } from '../../components/ui/FilterToolbar'
import { Pagination } from '../../components/ui/Pagination'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { useClientPagination } from '../../components/ui/useClientPagination'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { WorkspaceTabs } from '../../components/ui/WorkspaceTabs'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../components/ui/Table'
import { AcademicWorkflowContext } from '../../app/context/academic-workflow-context'
import { RoomFloorPlan } from './RoomFloorPlan'
import { DefenseChangeRequestsPanel } from './DefenseChangeRequestsPanel'
import { Gate3ScheduleChangePanel } from './Gate3ScheduleChangePanel'
import { RoomCatalogPanel } from './RoomCatalogPanel'
import { PeriodCalendarPanel } from './PeriodCalendarPanel'
import { listStandbyPool, standbySwapEvaluator, type StandbyPoolMember } from './defense-v4-api'
import { displayLabel } from '../../components/ui/display-label'
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

function formatVietnamTime(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso.slice(11, 16)
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(parsed)
}

function formatVietnamDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function projectDisplay(projectId: number, code?: string | null, title?: string | null): string {
  if (code && title) return `${code} · ${title}`
  if (code) return code
  if (title) return title
  return `Đồ án #${projectId}`
}

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
      key: `R3-${item.gateInstanceId}`, projectId: item.projectId, projectCode: item.projectCode,
      projectTitle: item.projectTitle, roomId: item.roomId,
      roomCode: item.roomCode, startAt: item.startAt, endAt: item.endAt, status: 'Đã công bố',
      gate3: item,
    }))
  }
  const sessions = await getPeriodDefenseSessions(periodId, undefined, signal)
  return sessions.filter(item => item.status === 'SCHEDULED').map(item => ({
    key: `R4-${item.id}`, projectId: item.projectId, projectCode: item.projectCode,
    projectTitle: item.projectTitle, roomId: item.roomId,
    roomCode: item.roomCode, startAt: item.startAt, endAt: item.endAt, status: item.status,
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
  const academicContext = useContext(AcademicWorkflowContext)
  const periodMeta = academicContext?.academic?.periods.find(p => p.id === periodId) ?? null
  const [sectionTab, setSectionTab] = useState<'auto' | 'published' | 'config'>('auto')
  const [targetGate, setTargetGate] = useState<'R3' | 'R4'>('R4')
  const [publishedSearch, setPublishedSearch] = useState('')
  const [publishedRoomFilter, setPublishedRoomFilter] = useState('ALL')
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
  const activeRooms = rooms.filter((room) => room.status === 'ACTIVE')
  const [standbyPool, setStandbyPool] = useState<StandbyPoolMember[]>([])
  const [swapSessionId, setSwapSessionId] = useState('')
  const [swapReplacedId, setSwapReplacedId] = useState('')
  const [swapReplacementId, setSwapReplacementId] = useState('')
  const [swapReason, setSwapReason] = useState('')
  const [swapBusy, setSwapBusy] = useState(false)
  const [swapNotice, setSwapNotice] = useState('')
  const [swapError, setSwapError] = useState('')

  useEffect(() => {
    if (!Number.isSafeInteger(periodId) || periodId < 1 || targetGate !== 'R4') return
    let active = true
    void listStandbyPool(periodId)
      .then(list => { if (active) setStandbyPool(list) })
      .catch(() => { if (active) setStandbyPool([]) })
    return () => { active = false }
  }, [periodId, targetGate])

  const handleStandbySwap = async () => {
    const sId = Number(swapSessionId), oldId = Number(swapReplacedId), newId = Number(swapReplacementId)
    if (!sId || !oldId || !newId || swapReason.trim().length < 5) {
      setSwapError('Nhập đầy đủ phiên bảo vệ, ID giám khảo cần thay, giám khảo Standby và lý do (≥ 5 ký tự).')
      return
    }
    setSwapBusy(true); setSwapError(''); setSwapNotice('')
    try {
      const res = await standbySwapEvaluator(sId, { replacedUserId: oldId, replacementUserId: newId, reason: swapReason.trim() })
      setSwapNotice(`Đã hoán đổi giám khảo cho phiên #${res.defenseSessionId}: thu hồi ${res.revokedAssignmentsCount} và cấp mới ${res.createdAssignmentsCount} phân công chấm.`)
      setSwapReason('')
      refreshPublished()
    } catch (reason) {
      setSwapError(plannerError(reason, 'Không thể hoán đổi giám khảo dự bị. Kiểm tra xung đột D17 hoặc lịch trùng.'))
    } finally {
      setSwapBusy(false)
    }
  }

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
        maxSlotsPerDay: targetGate === 'R4' ? 8 : 6,
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

  const publishedRooms = useMemo(
    () => Array.from(new Set(published.map(item => item.roomCode).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'vi')),
    [published],
  )
  const filteredPublished = useMemo(() => {
    const q = publishedSearch.trim().toLowerCase()
    return published.filter(item => {
      if (publishedRoomFilter !== 'ALL' && item.roomCode !== publishedRoomFilter) return false
      if (q) {
        const label = projectDisplay(item.projectId, item.projectCode, item.projectTitle)
        if (!`${label} ${item.roomCode ?? ''}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [published, publishedRoomFilter, publishedSearch])

  const publishedPager = useClientPagination(filteredPublished, 10)

  const hasPublishedFilters = Boolean(publishedSearch.trim() || publishedRoomFilter !== 'ALL')
  const publishedChips: ActiveFilterChip[] = []
  if (publishedRoomFilter !== 'ALL') publishedChips.push({ id: 'room', label: 'Phòng', value: publishedRoomFilter })

  if (!Number.isSafeInteger(periodId) || periodId < 1) {
    return <WorkspacePage size="wide" backTo="/academic/governance" backLabel="Học kỳ & kỳ đồ án" title="Phòng & lập lịch"><p role="alert" className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">Mã kỳ đồ án không hợp lệ.</p></WorkspacePage>
  }

  return (
    <WorkspacePage
      size="wide"
      backTo="/academic/governance"
      backLabel="Học kỳ & kỳ đồ án"
      title={`Phòng & lập lịch ${targetGate === 'R3' ? 'Gate 3 (Thẩm định chuyên môn)' : 'Gate 4 (Hội đồng bảo vệ)'}`}
      eyebrow="Điều phối phòng và lịch trình"
      description={periodMeta
        ? `${periodMeta.code} · ${periodMeta.name} — Chọn phòng mọi tầng đang hoạt động (ca 45p/60p theo POL-06), loại trừ ca nếu cần, rồi xem trước và duyệt công bố.`
        : 'Chọn phòng mọi tầng đang hoạt động (ca 45p/60p theo POL-06), loại trừ ca nếu cần, rồi xem trước và duyệt công bố.'}
    >
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <StatTileRow
          tiles={[
            { icon: 'meeting_room', label: 'Phòng hoạt động (Mọi tầng)', value: loading ? null : activeRooms.length, hero: true, caption: `Trên tổng ${rooms.length} phòng trong danh mục.` },
            { icon: 'event_available', label: `Lịch ${targetGate} đã công bố`, value: publishedLoading ? null : published.length, tone: 'success', caption: 'Các phiên đã xác nhận chính thức.' },
            { icon: 'block', label: 'Khung giờ / Phòng loại trừ', value: exclusions.length, tone: exclusions.length > 0 ? 'warning' : 'neutral', caption: 'Áp dụng cho lượt tự xếp hiện tại.' },
            { icon: 'date_range', label: 'Cửa sổ lập lịch', value: `${formatVietnamDate(startDate)} – ${formatVietnamDate(endDate)}`, tone: 'info', caption: validRange ? 'Khoảng ngày hợp lệ (≤ 31 ngày).' : 'Cần điều chỉnh khoảng ngày hợp lệ.' },
          ]}
        />

        {/* Gate Selection & Section Workspace Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn cổng kiểm duyệt cần lập lịch">
            <button
              type="button"
              aria-pressed={targetGate === 'R4'}
              onClick={() => changeGate('R4')}
              className={`min-h-11 rounded-lg px-4 text-sm font-bold transition-colors ${
                targetGate === 'R4'
                  ? 'bg-primary text-white shadow-xs'
                  : 'border border-hairline bg-card text-ink-muted hover:bg-canvas'
              }`}
            >
              Gate 4 · Lập lịch bảo vệ tốt nghiệp (Trực tiếp)
            </button>
            <button
              type="button"
              aria-pressed={targetGate === 'R3'}
              onClick={() => changeGate('R3')}
              className={`min-h-11 rounded-lg px-4 text-sm font-bold transition-colors ${
                targetGate === 'R3'
                  ? 'bg-primary text-white shadow-xs'
                  : 'border border-hairline bg-card text-ink-muted hover:bg-canvas'
              }`}
            >
              Gate 3 · Lập lịch thẩm định chuyên môn (Trực tiếp)
            </button>
          </div>
        </div>

        <WorkspaceTabs
          ariaLabel="Khu vực lập lịch phòng"
          activeId={sectionTab}
          onChange={(id) => setSectionTab(id)}
          tabs={[
            { id: 'auto' as const, label: 'Xếp lịch tự động & Phòng', icon: 'auto_fix_high' },
            { id: 'published' as const, label: 'Lịch đã công bố', icon: 'event_available', count: published.length },
            { id: 'config' as const, label: 'Cấu hình khung giờ & Phòng', icon: 'tune' },
          ]}
        />

        {/* Business Rule Banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          {targetGate === 'R3' ? (
            <p>
              <strong>Quy chuẩn Gate 3:</strong> Chỉ xếp cho các nhóm đã <strong>đạt Gate 2</strong> trong cửa sổ thời gian quy định. Yêu cầu 2 giảng viên phản biện (Chủ tọa &amp; Thư ký), không phải GVHD. Lịch sau khi công bố sẽ gửi thông báo và mở biên bản điện tử.
            </p>
          ) : (
            <p>
              <strong>Quy chuẩn Gate 4:</strong> Chỉ xếp cho các nhóm đã <strong>đạt Gate 3</strong>. Yêu cầu hội đồng bảo vệ đã phân công, đủ sức chứa phòng (SV + GV + 5 chỗ dự phòng), chống trùng ca giảng viên và GVHD không được ngồi hội đồng.
            </p>
          )}
        </div>

        {loading && <p role="status" className="text-sm">Đang tải danh mục phòng…</p>}
        {!loading && !error && rooms.length === 0 && <p className="rounded-lg border border-hairline bg-canvas p-3 text-sm text-ink-muted">Chưa có phòng trong danh mục. Cán bộ điều phối cần tạo phòng trước khi xếp lịch.</p>}
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">
            <span>{error}</span>
            {!loading && rooms.length === 0 && <button type="button" className="min-h-11 font-semibold underline" onClick={() => { setLoading(true); setError(''); setRoomsRevision(value => value + 1) }}>Tải lại phòng</button>}
          </div>
        )}
        {success && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline border-l-4 border-l-status-success-text bg-card p-3.5 text-sm text-ink shadow-xs">
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
              <span>{success}</span>
            </span>
            {sectionTab !== 'published' && (
              <button type="button" onClick={() => setSectionTab('published')} className="min-h-9 rounded-lg border border-hairline bg-canvas px-3 text-xs font-bold text-primary hover:border-primary hover:bg-primary-subtle">
                Xem lịch đã công bố →
              </button>
            )}
          </div>
        )}

        {/* TAB 1: AUTO SCHEDULE & FLOOR PLAN */}
        {sectionTab === 'auto' && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-hairline bg-card p-4 shadow-xs">
              <div className="flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-1 text-sm font-semibold">
                  Từ ngày
                  <input
                    type="date"
                    min={earliestDate}
                    value={startDate}
                    onChange={(event) => changeRange(event.target.value, endDate)}
                    className="min-h-11 rounded-lg border border-hairline bg-card px-3 font-normal text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold">
                  Đến ngày
                  <input
                    type="date"
                    min={startDate >= earliestDate ? startDate : earliestDate}
                    value={endDate}
                    onChange={(event) => changeRange(startDate, event.target.value)}
                    className="min-h-11 rounded-lg border border-hairline bg-card px-3 font-normal text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold">
                  Ngày chỉnh ca
                  <input
                    type="date"
                    min={startDate}
                    max={endDate}
                    value={selectedDate}
                    onChange={(event) => { setSelectedDate(event.target.value); setPreview(null); setConfirmPartial(false) }}
                    className="min-h-11 rounded-lg border border-hairline bg-card px-3 font-normal text-ink"
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
                <p role="alert" className="mt-3 text-sm text-status-error-text">
                  Ngày bắt đầu phải từ ngày mai (giờ Việt Nam); ngày kết thúc không trước ngày bắt đầu và khoảng ngày tối đa 32 ngày.
                </p>
              )}
              <p className="mt-3 text-sm text-ink-muted">
                {activeRooms.length} phòng hoạt động trên mọi tầng (chuẩn POL-06: 45p đơn ngành / 60p liên ngành) · {exclusions.length} mục loại trừ chỉ áp dụng cho lần xếp lịch này.
              </p>
            </div>

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
              <section aria-label="Kết quả xem trước" className="rounded-2xl border border-hairline bg-card p-4 shadow-xs">
                <h2 className="text-lg font-bold">Kết quả xem trước ({targetGate})</h2>
                <p className="mt-1 text-sm">
                  Đã xếp: <strong>{preview.scheduledCount}</strong> · Chưa xếp: <strong>{preview.unscheduledCount}</strong>
                </p>
                {preview.conflicts.length > 0 && (
                  <div className="mt-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-3">
                    <h3 className="text-sm font-bold text-status-warning-text">Các nhóm chưa đủ điều kiện hoặc có xung đột:</h3>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-status-warning-text">
                      {preview.conflicts.map((item) => (
                        <li key={item.projectId}>
                          {projectDisplay(item.projectId, item.projectCode, item.projectTitle)}: <strong>{formatScheduleConflictReason(item.reason)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-hairline">
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
                      {preview.allocations.map((item) => (
                        <TableRow key={item.projectId}>
                          <TableCell className="font-semibold">{projectDisplay(item.projectId, item.projectCode, item.projectTitle)}</TableCell>
                          <TableCell>{formatVietnamDate(item.date)}</TableCell>
                          <TableCell>Ca {item.slotNumber}</TableCell>
                          <TableCell className="text-xs text-ink-muted">
                            {formatVietnamTime(item.startAt)} – {formatVietnamTime(item.endAt)}
                          </TableCell>
                          <TableCell className="font-medium">{item.roomCode}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
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

        {/* TAB 2: PUBLISHED SCHEDULE & CHANGE REQUESTS */}
        {sectionTab === 'published' && (
          <div className="space-y-5">
            <section aria-label={`Lịch đã công bố ${targetGate}`} className="rounded-2xl border border-hairline bg-card p-4 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Lịch đã công bố · {targetGate}</h2>
                <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại lịch" onClick={refreshPublished} />
              </div>
              {published.length > 0 && (
                <FilterToolbar
                  embedded
                  search={publishedSearch}
                  onSearchChange={setPublishedSearch}
                  searchLabel="Tìm trong lịch đã công bố"
                  searchPlaceholder="Tìm theo mã đồ án, tên đồ án hoặc phòng..."
                  debounceMs={0}
                  controls={
                    publishedRooms.length > 1 ? (
                      <label className="ft-select-wrap">
                        <span className="sr-only">Lọc theo phòng</span>
                        <select className="ft-select" aria-label="Lọc theo phòng" value={publishedRoomFilter} onChange={e => setPublishedRoomFilter(e.target.value)}>
                          <option value="ALL">Tất cả phòng</option>
                          {publishedRooms.map(room => <option key={room} value={room}>Phòng {room}</option>)}
                        </select>
                      </label>
                    ) : undefined
                  }
                  activeChips={publishedChips}
                  onRemoveChip={id => { if (id === 'room') setPublishedRoomFilter('ALL') }}
                  onClearAll={() => { setPublishedSearch(''); setPublishedRoomFilter('ALL') }}
                  hasActiveFilters={hasPublishedFilters}
                  resultSummary={`${filteredPublished.length} / ${published.length} phiên`}
                  pagination={publishedPager.showPagination ? { page: publishedPager.page, pages: publishedPager.pages, total: publishedPager.total, pageSize: publishedPager.pageSize, busy: publishedLoading, onPage: publishedPager.setPage } : undefined}
                />
              )}
              {publishedLoading && <p role="status" className="text-sm text-ink-muted">Đang tải lịch đã công bố…</p>}
              {publishedError && <p role="alert" className="text-sm text-status-error-text">{publishedError}</p>}
              {!publishedLoading && !publishedError && filteredPublished.length === 0 && (
                <p className="text-sm text-ink-muted">{hasPublishedFilters ? 'Không có phiên nào khớp bộ lọc.' : 'Chưa có phiên nào được công bố trong phạm vi của bạn.'}</p>
              )}
              {!publishedLoading && !publishedError && filteredPublished.length > 0 && <div className="max-h-96 overflow-auto rounded-lg border border-hairline">
                <Table aria-label={`Danh sách lịch đã công bố ${targetGate}`}>
                  <TableHead><TableRow head>
                    <TableHeaderCell>Đồ án</TableHeaderCell>
                    <TableHeaderCell>Thời gian</TableHeaderCell>
                    <TableHeaderCell>Phòng</TableHeaderCell>
                    <TableHeaderCell>Trạng thái</TableHeaderCell>
                    {targetGate === 'R3' && <TableHeaderCell>Thao tác</TableHeaderCell>}
                  </TableRow></TableHead>
                  <TableBody>{publishedPager.paginatedItems.map(item => <TableRow key={item.key}>
                    <TableCell className="font-semibold">{projectDisplay(item.projectId, item.projectCode, item.projectTitle)}</TableCell>
                    <TableCell>{new Date(item.startAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</TableCell>
                    <TableCell>{item.roomCode ?? 'Chưa có phòng'}</TableCell>
                    <TableCell><StatusBadge tone="success" label={item.status === 'Đã công bố' ? item.status : displayLabel(item.status)} /></TableCell>
                    {targetGate === 'R3' && <TableCell>{item.gate3 &&
                      <button type="button" className="min-h-11 font-semibold text-primary underline" onClick={() => setEditingGate3(item.gate3!)}>Đổi phòng/ca</button>}</TableCell>}
                  </TableRow>)}</TableBody>
                </Table>
              </div>}
              {!publishedLoading && !publishedError && publishedPager.showPagination && (
                <Pagination
                  page={publishedPager.page}
                  pages={publishedPager.pages}
                  total={publishedPager.total}
                  pageSize={publishedPager.pageSize}
                  onPage={publishedPager.setPage}
                  onPageSizeChange={publishedPager.setPageSize}
                />
              )}
              {targetGate === 'R3' && editingGate3 && <div className="mt-4"><Gate3ScheduleChangePanel
                key={`${editingGate3.gateInstanceId}-${editingGate3.concurrencyToken}`}
                periodId={periodId} schedule={editingGate3} rooms={rooms}
                onChanged={refreshPublished} onClose={() => setEditingGate3(null)}
              /></div>}
            </section>
            {targetGate === 'R4' && (
              <section className="rounded-2xl border border-hairline bg-card p-4 shadow-xs space-y-3" aria-label="Standby Pool và Hoán đổi 1 chạm">
                <div>
                  <h2 className="text-base font-bold text-ink">Standby Pool &amp; Hoán đổi giám khảo 1 chạm (POL-06)</h2>
                  <p className="text-xs text-ink-muted">
                    Hoán đổi giám khảo bận đột xuất bằng giảng viên dự phòng cùng chuyên ngành trong kỳ (tự động kiểm D17 và thu hồi/cấp lại phân công Defense chưa chốt).
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <input
                    aria-label="ID phiên bảo vệ cần hoán đổi"
                    className="min-h-11 rounded-lg border border-hairline bg-canvas px-3 text-xs text-ink"
                    placeholder="ID phiên bảo vệ"
                    value={swapSessionId}
                    onChange={e => setSwapSessionId(e.target.value)}
                  />
                  <input
                    aria-label="ID giám khảo cần thay thế"
                    className="min-h-11 rounded-lg border border-hairline bg-canvas px-3 text-xs text-ink"
                    placeholder="ID giám khảo cần thay"
                    value={swapReplacedId}
                    onChange={e => setSwapReplacedId(e.target.value)}
                  />
                  <select
                    aria-label="Chọn giám khảo Standby dự phòng"
                    className="min-h-11 rounded-lg border border-hairline bg-canvas px-3 text-xs text-ink"
                    value={swapReplacementId}
                    onChange={e => setSwapReplacementId(e.target.value)}
                  >
                    <option value="">Chọn GK Standby ({standbyPool.length})…</option>
                    {standbyPool.map(member => (
                      <option key={member.id} value={member.userId}>
                        {member.fullName} (Ngành #{member.majorId})
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Lý do hoán đổi Standby"
                    className="min-h-11 rounded-lg border border-hairline bg-canvas px-3 text-xs text-ink"
                    placeholder="Lý do (≥ 5 ký tự)"
                    value={swapReason}
                    onChange={e => setSwapReason(e.target.value)}
                  />
                </div>
                {swapError && <p role="alert" className="text-xs text-status-error-text">{swapError}</p>}
                {swapNotice && <p role="status" className="text-xs text-status-success-text">{swapNotice}</p>}
                <Button size="sm" variant="secondary" disabled={swapBusy} onClick={() => void handleStandbySwap()}>
                  {swapBusy ? 'Đang hoán đổi…' : 'Hoán đổi giám khảo Standby'}
                </Button>
              </section>
            )}
            {targetGate === 'R4' && <DefenseChangeRequestsPanel periodId={periodId} rooms={rooms} onScheduleChanged={refreshPublished} />}
          </div>
        )}

        {/* TAB 3: SLOT CALENDAR & ROOM CATALOG */}
        {sectionTab === 'config' && (
          <div className="space-y-5">
            <PeriodCalendarPanel periodId={periodId} onChanged={() => { setPreview(null); setConfirmPartial(false); setSuccess('') }} />
            {!loading && !error && <RoomCatalogPanel rooms={rooms} onChanged={refreshRooms} />}
          </div>
        )}
      </fieldset>
    </WorkspacePage>
  )
}
