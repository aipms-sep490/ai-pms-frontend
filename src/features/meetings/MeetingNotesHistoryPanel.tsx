import { useEffect, useState } from 'react'
import * as api from '../../services/api/meetings.api'
import type { MeetingNotesVersion } from './meeting-types'
import { formatMeetingTime, meetingError } from './meeting-utils'

/**
 * BE-N07 · paged history of locked/unlocked meeting-notes snapshots. Read-only: editing always
 * goes through MeetingNotesForm against the live meeting record, never against a past version.
 */
export function MeetingNotesHistoryPanel({ meetingId, refreshKey }: { meetingId: number; refreshKey: number }) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<MeetingNotesVersion[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setVersions([]); setPage(1); setTotalPages(1) } }, [open, meetingId, refreshKey])

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true); setError('')
    api.getMeetingNotesHistory(meetingId, page, 20, controller.signal)
      .then((result) => { if (controller.signal.aborted) return; setVersions((current) => page === 1 ? result.items : [...current, ...result.items]); setTotalPages(result.totalPages) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(meetingError(reason)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [open, meetingId, page])

  return <div className="mtg-notes-history">
    <button type="button" className="mtg-text-button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? 'Đóng lịch sử biên bản' : 'Xem lịch sử biên bản'}</button>
    {open && <>
      {loading && versions.length === 0 && <p role="status" className="mtg-help">Đang tải lịch sử…</p>}
      {error && <p role="alert" className="mtg-validation">{error}</p>}
      {!loading && !error && versions.length === 0 && <p className="mtg-help">Chưa có phiên bản biên bản nào được lưu.</p>}
      {versions.length > 0 && <ol className="mtg-feedback-list">{versions.map((version) => (
        <li key={version.id}>
          <div className="mtg-section-heading"><strong>Phiên bản {version.version}</strong>{version.isLocked && <span className="mtg-organizer">Đã khóa</span>}</div>
          <p className="mtg-prose">{version.meetingNotes || 'Không có nội dung biên bản.'}</p>
          <small className="mtg-help">Cập nhật {formatMeetingTime(version.changedAt)}</small>
        </li>
      ))}</ol>}
      {page < totalPages && <button type="button" className="mtg-button mtg-button--secondary" disabled={loading} onClick={() => setPage((value) => value + 1)}>Xem thêm</button>}
    </>}
  </div>
}
