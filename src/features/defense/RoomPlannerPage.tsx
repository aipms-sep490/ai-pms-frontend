import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { RoomFloorPlan } from './RoomFloorPlan'
import {
  applyDefenseSchedule,
  applyGate3Schedule,
  formatScheduleConflictReason,
  getPlannerRooms,
  previewDefenseSchedule,
  previewGate3Schedule,
} from './room-planner-api'
import type { AutoSchedulePreview, RoomDto, RoomSchedulingExclusion } from './room-planner-api'

const nextDayVietnam = () => new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' })

export function RoomPlannerPage() {
  const periodId = Number(useParams().periodId)
  const [targetGate, setTargetGate] = useState<'R3' | 'R4'>('R4')
  const [rooms, setRooms] = useState<RoomDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState(nextDayVietnam)
  const [endDate, setEndDate] = useState(nextDayVietnam)
  const [selectedDate, setSelectedDate] = useState(nextDayVietnam)
  const [exclusions, setExclusions] = useState<RoomSchedulingExclusion[]>([])
  const [preview, setPreview] = useState<AutoSchedulePreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getPlannerRooms(controller.signal).then((data) => {
      if (!controller.signal.aborted) setRooms(data)
    }).catch(() => {
      if (!controller.signal.aborted) setError('Chưa tải được danh mục phòng. Hãy kiểm tra kết nối BE và tải lại trang.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const changeGate = (gate: 'R3' | 'R4') => {
    setTargetGate(gate)
    setPreview(null)
    setSuccess('')
    setError('')
  }

  const changeExclusions = (next: RoomSchedulingExclusion[]) => { setExclusions(next); setPreview(null); setSuccess('') }
  const changeRange = (start: string, end: string) => {
    setStartDate(start); setEndDate(end); setSelectedDate(start)
    setExclusions((current) => current.filter((item) => item.date === null || (item.date >= start && item.date <= end)))
    setPreview(null); setSuccess('')
  }
  const activeRooms = rooms.filter((room) => room.status === 'ACTIVE' && [2, 3, 4].includes(room.floor))
  const validRange = startDate <= endDate && Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`) <= 31 * 86400000

  const runPreview = async () => {
    if (!Number.isSafeInteger(periodId) || periodId < 1 || !validRange || activeRooms.length === 0) return
    setBusy(true); setError(''); setSuccess(''); setPreview(null)
    try {
      const payload = {
        startDate,
        endDate,
        roomIds: activeRooms.map((room) => room.id),
        maxSlotsPerDay: 6,
        exclusions,
      }
      if (targetGate === 'R3') {
        setPreview(await previewGate3Schedule(periodId, payload))
      } else {
        setPreview(await previewDefenseSchedule(periodId, payload))
      }
    } catch {
      setError(`Không tạo được bản xem trước lịch ${targetGate === 'R3' ? 'Gate 3' : 'Gate 4'}. Kiểm tra cửa sổ ngày, quyền truy cập và dữ liệu người chấm.`)
    } finally {
      setBusy(false)
    }
  }

  const applyPreview = async () => {
    if (!preview || preview.unscheduledCount > 0 || preview.allocations.length === 0) return
    setBusy(true); setError('')
    try {
      if (targetGate === 'R3') {
        const result = await applyGate3Schedule(periodId, {
          allocations: preview.allocations,
          concurrencyToken: preview.concurrencyToken,
          exclusions,
        })
        setSuccess(`Đã duyệt và công bố ${result.length} phiên đánh giá Gate 3 vào lịch chính thức.`)
      } else {
        const result = await applyDefenseSchedule(periodId, {
          allocations: preview.allocations,
          concurrencyToken: preview.concurrencyToken,
          exclusions,
        })
        setSuccess(`Đã duyệt và công bố ${result.createdSessionsCount} phiên bảo vệ Gate 4 vào lịch chính thức.`)
      }
      setPreview(null)
    } catch {
      setError('Lịch hoặc điều kiện phân phòng đã thay đổi. Hãy chạy xem trước lại trước khi áp dụng.')
    } finally {
      setBusy(false)
    }
  }

  if (!Number.isSafeInteger(periodId) || periodId < 1) {
    return <WorkspacePage title="Sơ đồ phòng & lập lịch"><p role="alert">Mã kỳ đồ án không hợp lệ.</p></WorkspacePage>
  }

  return (
    <WorkspacePage
      title={`Sơ đồ phòng & lập lịch ${targetGate === 'R3' ? 'Gate 3 (Review chuyên môn)' : 'Gate 4 (Hội đồng bảo vệ)'}`}
      eyebrow={`Kỳ đồ án #${periodId}`}
      description="Chọn tầng 2–4, loại phòng hoặc ca khỏi lần tự xếp này, rồi xem trước và duyệt công bố lịch chính thức."
    >
      <div className="space-y-5">
        {/* Gate Selection Tabs */}
        <div className="flex gap-2 border-b border-hairline pb-2">
          <button
            type="button"
            onClick={() => changeGate('R4')}
            className={`min-h-11 rounded-lg px-4 text-sm font-bold transition-colors ${
              targetGate === 'R4'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface text-ink-muted hover:bg-canvas'
            }`}
          >
            Gate 4 · Lập lịch bảo vệ tốt nghiệp (Offline)
          </button>
          <button
            type="button"
            onClick={() => changeGate('R3')}
            className={`min-h-11 rounded-lg px-4 text-sm font-bold transition-colors ${
              targetGate === 'R3'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface text-ink-muted hover:bg-canvas'
            }`}
          >
            Gate 3 · Lập lịch thẩm định chuyên môn (Offline)
          </button>
        </div>

        {/* Business Rule Banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          {targetGate === 'R3' ? (
            <p>
              <strong>Quy chuẩn Gate 3:</strong> Chỉ xếp cho các nhóm đã <strong>PASSED Gate 2</strong> trong cửa sổ thời gian quy định. Yêu cầu 2 giảng viên phản biện (Chủ tọa & Thư ký), không phải GVHD. Lịch sau khi công bố sẽ gửi thông báo và mở biên bản điện tử.
            </p>
          ) : (
            <p>
              <strong>Quy chuẩn Gate 4:</strong> Chỉ xếp cho các nhóm đã <strong>PASSED Gate 3</strong>. Yêu cầu hội đồng bảo vệ đã phân công, đủ sức chứa phòng (SV + GV + 5 chỗ dự phòng), chống trùng ca giảng viên và GVHD không được ngồi hội đồng.
            </p>
          )}
        </div>

        {/* Filters and Action Bar */}
        <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-xs">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Từ ngày
              <input
                type="date"
                value={startDate}
                onChange={(event) => changeRange(event.target.value, endDate)}
                className="min-h-11 rounded-lg border border-hairline px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Đến ngày
              <input
                type="date"
                value={endDate}
                onChange={(event) => changeRange(startDate, event.target.value)}
                className="min-h-11 rounded-lg border border-hairline px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Ngày chỉnh ca
              <input
                type="date"
                min={startDate}
                max={endDate}
                value={selectedDate}
                onChange={(event) => { setSelectedDate(event.target.value); setPreview(null) }}
                className="min-h-11 rounded-lg border border-hairline px-3"
              />
            </label>
            <button
              type="button"
              disabled={busy || loading || !validRange || activeRooms.length === 0}
              onClick={runPreview}
              className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              {busy ? 'Đang xử lý…' : `Tự động xếp lịch ${targetGate} · Xem trước`}
            </button>
          </div>
          {!validRange && (
            <p role="alert" className="mt-3 text-sm text-status-error-text">
              Khoảng ngày phải theo thứ tự và tối đa 32 ngày.
            </p>
          )}
          <p className="mt-3 text-sm text-ink-muted">
            {activeRooms.length} phòng hoạt động ở tầng 2–4 · {exclusions.length} mục loại trừ chỉ áp dụng cho lần xếp lịch này (không lưu DB).
          </p>
        </div>

        {loading && <p role="status" className="text-sm">Đang tải danh mục phòng…</p>}
        {error && (
          <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
            {success}
          </p>
        )}

        {!loading && rooms.length > 0 && (
          <RoomFloorPlan
            rooms={rooms}
            selectedDate={selectedDate}
            exclusions={exclusions}
            onChange={changeExclusions}
          />
        )}

        {preview && (
          <section aria-label="Kết quả xem trước" className="rounded-2xl border border-hairline bg-surface p-4 shadow-xs">
            <h2 className="text-lg font-bold">Kết quả xem trước ({targetGate})</h2>
            <p className="mt-1 text-sm">
              Đã xếp: <strong>{preview.scheduledCount}</strong> · Chưa xếp: <strong>{preview.unscheduledCount}</strong>
            </p>
            {preview.conflicts.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <h3 className="text-sm font-bold text-amber-900">Các nhóm chưa đủ điều kiện hoặc có xung đột:</h3>
                <ul className="mt-1 list-inside list-disc text-sm text-amber-800 space-y-1">
                  {preview.conflicts.map((item) => (
                    <li key={item.projectId}>
                      Đồ án #{item.projectId}: <strong>{formatScheduleConflictReason(item.reason)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-hairline">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FFF7ED] text-primary">
                  <tr>
                    <th className="p-2.5 font-bold">Đồ án</th>
                    <th className="p-2.5 font-bold">Ngày</th>
                    <th className="p-2.5 font-bold">Ca</th>
                    <th className="p-2.5 font-bold">Thời gian</th>
                    <th className="p-2.5 font-bold">Phòng</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.allocations.map((item) => (
                    <tr key={item.projectId} className="border-t border-hairline hover:bg-surface-subtle">
                      <td className="p-2.5 font-semibold">#{item.projectId}</td>
                      <td className="p-2.5">{item.date}</td>
                      <td className="p-2.5">Ca {item.slotNumber}</td>
                      <td className="p-2.5 text-xs text-ink-muted">
                        {item.startAt.slice(11, 16)} – {item.endAt.slice(11, 16)}
                      </td>
                      <td className="p-2.5 font-medium">{item.roomCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={applyPreview}
                disabled={busy || preview.unscheduledCount > 0 || preview.allocations.length === 0}
                className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                Duyệt và áp dụng lịch
              </button>
              {preview.unscheduledCount > 0 && (
                <p className="text-sm text-amber-900">
                  Cần xử lý các nhóm chưa xếp được hoặc mở thêm phòng/ca trước khi áp dụng.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </WorkspacePage>
  )
}
