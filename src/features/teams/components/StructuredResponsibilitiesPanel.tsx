import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../../projects/api/discipline-governance-api'
import type { TeamAcademicScopeDto } from '../../../types/backend'
import { HttpError } from '../../../services/http/http-client'

export function StructuredResponsibilitiesPanel({ teamId, scope, majorNames, canEdit, onSaved }: { teamId: number; scope: TeamAcademicScopeDto; majorNames: Record<number, string>; canEdit: boolean; onSaved: () => Promise<void> }) {
  const [majorId, setMajorId] = useState(scope.requirements[0]?.majorId ?? 0); const [data, setData] = useState<api.ResponsibilityList | null>(null); const [rows, setRows] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('')
  const readVersion = useRef(0), saveLock = useRef(false)
  const load = useCallback(async () => {
    const version = ++readVersion.current
    setData(null); setRows([]); setError(''); setNotice('')
    if (!majorId) return
    try {
      const next = await api.getTeamResponsibilities(teamId, majorId)
      if (version !== readVersion.current) return
      setData(next); setRows(next.items.map(x => x.content))
    } catch (reason) {
      if (version === readVersion.current) setError(reason instanceof HttpError && reason.status === 403 ? 'Hệ thống không cấp quyền xem trách nhiệm này.' : 'Không thể tải trách nhiệm theo chuyên ngành.')
    }
  }, [teamId, majorId])
  useEffect(() => { const versionRef = readVersion; void load(); return () => { versionRef.current++ } }, [load])
  const save = async () => {
    if (!canEdit || !data?.concurrencyToken || data.isSnapshot || saveLock.current) return
    const version = readVersion.current
    const items = rows.map(x => x.trim()).filter(Boolean).map((content, sortOrder) => ({ content, sortOrder }))
    saveLock.current = true; setBusy(true); setError(''); setNotice('')
    try {
      await api.replaceTeamResponsibilities(teamId, majorId, data.concurrencyToken, items)
      await onSaved()
      if (version !== readVersion.current) return
      await load()
      setNotice('Đã lưu phân công và cập nhật điều kiện của nhóm.')
    } catch (reason) {
      if (version !== readVersion.current) return
      if (reason instanceof HttpError && reason.status === 409) await load()
      setError(reason instanceof HttpError && reason.status === 409
        ? 'Thông tin nhóm đã thay đổi. Dữ liệu đã được tải lại; hãy kiểm tra phân công trước khi lưu.'
        : 'Chưa thể lưu phân công. Hãy kiểm tra thông tin rồi thử lại.')
    } finally { saveLock.current = false; setBusy(false) }
  }
  return <section className="mt-5 rounded-xl border border-hairline bg-card p-5"><h3 className="font-semibold text-ink">Trách nhiệm theo chuyên ngành</h3><p className="mt-1 text-sm text-ink-muted">Phân công được lưu cùng đề cương khi nộp. Bạn chỉ có thể sửa trước khi chốt.</p><label className="mt-3 block text-sm">Chuyên ngành<select disabled={busy} value={majorId} onChange={event => setMajorId(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-hairline px-3">{scope.requirements.map(x => <option key={x.majorId} value={x.majorId}>{majorNames[x.majorId] || `Chưa tải được tên ngành (mã ${x.majorId})`}</option>)}</select></label>{error && <p role="alert" className="mt-3 text-sm text-status-error-text">{error}</p>}{notice && <p role="status" className="mt-3 text-sm text-status-success-text">{notice}</p>}{!data ? (!error && <p role="status" className="mt-3 text-sm">Đang tải…</p>) : !data.isAvailable ? <p className="mt-3 text-sm">Chưa có phân công trách nhiệm cho chuyên ngành này.</p> : <><div className="mt-3 space-y-2">{rows.map((row, index) => <div key={index} className="flex gap-2"><input aria-label={`Trách nhiệm ${index + 1}`} value={row} disabled={data.isSnapshot || busy || !canEdit} onChange={event => setRows(current => current.map((item, i) => i === index ? event.target.value : item))} className="min-h-11 min-w-0 flex-1 rounded-lg border border-hairline px-3" />{canEdit && <button type="button" disabled={data.isSnapshot || busy} onClick={() => setRows(current => current.filter((_, i) => i !== index))} className="min-h-11 px-3 text-sm font-semibold text-status-error-text">Xóa</button>}</div>)}</div>{!canEdit && !data.isSnapshot && <p className="mt-3 text-sm text-ink-muted">Bạn đang ở chế độ chỉ xem phân công.</p>}{!data.isSnapshot && canEdit && <div className="mt-3 flex gap-3"><button type="button" disabled={busy} onClick={() => setRows(current => [...current, ''])} className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-semibold">Thêm trách nhiệm</button><button type="button" disabled={busy || !data.concurrencyToken} onClick={() => void save()} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Lưu</button></div>}{data.isSnapshot && <p className="mt-3 text-sm text-status-warning-text">Phân công đã được chốt cùng đề cương và chỉ có thể xem.</p>}</>}</section>
}
