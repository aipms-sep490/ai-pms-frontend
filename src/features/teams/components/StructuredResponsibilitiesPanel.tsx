import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../../projects/api/discipline-governance-api'
import type { TeamAcademicScopeDto } from '../../../types/backend'
import { HttpError } from '../../../services/http/http-client'

interface ResponsibilitiesProps {
  teamId: number
  scope: TeamAcademicScopeDto
  majorNames: Record<number, string>
  canEdit: boolean
  onSaved: () => Promise<void>
}

export function StructuredResponsibilitiesPanel(props: ResponsibilitiesProps) {
  const [selection, setSelection] = useState({ teamId: props.teamId, majorId: props.scope.requirements[0]?.majorId ?? 0 })
  const majorId = selection.teamId === props.teamId && props.scope.requirements.some(item => item.majorId === selection.majorId)
    ? selection.majorId : props.scope.requirements[0]?.majorId ?? 0

  return <ResponsibilitiesEditor key={`${props.teamId}:${majorId}`} {...props} majorId={majorId}
    onMajorChange={value => setSelection({ teamId: props.teamId, majorId: value })} />
}

function ResponsibilitiesEditor({ teamId, scope, majorNames, canEdit, onSaved, majorId, onMajorChange }:
  ResponsibilitiesProps & { majorId: number; onMajorChange: (value: number) => void }) {
  const [data, setData] = useState<api.ResponsibilityList | null>(null)
  const [rows, setRows] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [hasDraft, setHasDraft] = useState(false)
  const readVersion = useRef(0)
  const mounted = useRef(true)
  const saveLock = useRef(false)
  const dirty = useRef(false)
  const coveredScopeToken = useRef<string | null>(null)

  const load = useCallback(async (preserveDraft = dirty.current) => {
    const version = ++readVersion.current
    if (!majorId) return false
    setLoading(true); setData(null); setError('')
    try {
      const next = await api.getTeamResponsibilities(teamId, majorId)
      if (!mounted.current || version !== readVersion.current) return false
      coveredScopeToken.current = next.concurrencyToken
      setData(next)
      if (!preserveDraft) { setRows(next.items.map(item => item.content)); dirty.current = false; setHasDraft(false) }
      return true
    } catch (reason) {
      if (mounted.current && version === readVersion.current) {
        setError(reason instanceof HttpError && reason.status === 403
          ? 'Hệ thống không cấp quyền xem trách nhiệm này.'
          : 'Không thể tải trách nhiệm theo chuyên ngành. Nội dung đang nhập được giữ lại; hãy thử tải lại.')
      }
      return false
    } finally {
      if (mounted.current && version === readVersion.current) setLoading(false)
    }
  }, [teamId, majorId])

  useEffect(() => {
    const lifecycle = mounted, version = readVersion
    mounted.current = true
    return () => { lifecycle.current = false; version.current++ }
  }, [])
  useEffect(() => {
    // Responsibilities and academic scope share the backend configuration token.
    // A delayed parent commit for our own save is already covered by readback;
    // external scope versions still refresh the token without losing the draft.
    if (!saveLock.current && coveredScopeToken.current !== scope.concurrencyToken) void load()
  }, [load, scope.concurrencyToken])

  const editRows = (update: (current: string[]) => string[]) => {
    dirty.current = true
    setHasDraft(true); setRows(update); setNotice('')
  }
  const save = async () => {
    if (!canEdit || !data?.concurrencyToken || data.isSnapshot || !data.isAvailable || loading || saveLock.current) return
    if (rows.some(row => !row.trim())) {
      setError('Nhập nội dung cho từng trách nhiệm hoặc xóa dòng đang để trống.')
      return
    }
    if (rows.length > 100 || rows.some(row => row.trim().length > 2000)) {
      setError('Mỗi ngành có tối đa 100 trách nhiệm, mỗi trách nhiệm không quá 2.000 ký tự.')
      return
    }
    const items = rows.map((content, sortOrder) => ({ content: content.trim(), sortOrder }))
    saveLock.current = true; setBusy(true); setError(''); setNotice('')
    let saved = false
    try {
      const next = await api.replaceTeamResponsibilities(teamId, majorId, data.concurrencyToken, items)
      saved = true
      if (!mounted.current) return
      coveredScopeToken.current = next.concurrencyToken
      setData(next); setRows(next.items.map(item => item.content)); dirty.current = false; setHasDraft(false)
      await onSaved()
      if (!mounted.current) return
      if (await load(false)) setNotice('Đã lưu phân công và cập nhật điều kiện của nhóm.')
      else if (mounted.current) setNotice('Phân công đã được lưu. Cần tải lại để kiểm tra dữ liệu mới nhất.')
    } catch (reason) {
      if (!mounted.current) return
      if (saved) {
        setNotice('Phân công đã được lưu.')
        setError('Chưa tải lại được điều kiện của nhóm. Hãy tải lại trang để kiểm tra trạng thái mới nhất.')
      } else if (reason instanceof HttpError && reason.status === 409) {
        if (await load(true)) setError('Thông tin nhóm đã thay đổi. Nội dung bạn nhập được giữ lại; hãy đối chiếu dữ liệu đã lưu bên dưới trước khi bấm Lưu lại.')
      } else {
        setError(reason instanceof HttpError && reason.status === 403
          ? 'Hệ thống không cấp quyền sửa trách nhiệm này. Nội dung bạn nhập được giữ lại.'
          : 'Chưa thể lưu phân công. Nội dung bạn nhập được giữ lại; hãy kiểm tra thông tin rồi thử lại.')
      }
    } finally {
      saveLock.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const editable = canEdit && !!data?.isAvailable && !data.isSnapshot && !busy && !loading
  return <section className="mt-5 rounded-xl border border-hairline bg-card p-5">
    <h3 className="font-semibold text-ink">Trách nhiệm theo chuyên ngành</h3>
    <p className="mt-1 text-sm text-ink-muted">Phân công được lưu cùng đề cương khi nộp. Bạn chỉ có thể sửa trước khi chốt.</p>
    {!majorId ? <p className="mt-3 text-sm text-ink-muted">Lưu phạm vi ngành trước khi thêm trách nhiệm theo chuyên ngành.</p> : <>
      <label className="mt-3 block text-sm font-medium text-ink-soft">Chuyên ngành
        <select disabled={busy} value={majorId} onChange={event => onMajorChange(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 font-normal text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20">
          {scope.requirements.map(item => <option key={item.majorId} value={item.majorId}>{majorNames[item.majorId] || `Chưa tải được tên ngành (mã ${item.majorId})`}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="mt-3 text-sm text-status-error-text">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-status-success-text">{notice}</p>}
      {loading && <p role="status" className="mt-3 text-sm text-ink-muted">Đang tải…</p>}
      {!loading && !data && error && <button type="button" disabled={busy} onClick={() => void load()} className="mt-3 min-h-11 rounded-lg border border-hairline bg-card px-3 text-sm font-semibold text-ink-soft hover:bg-canvas">Thử tải lại</button>}
      {data && !data.isAvailable ? <p className="mt-3 text-sm text-ink-muted">Chưa có phân công trách nhiệm cho chuyên ngành này.</p> : <>
        <div className="mt-3 space-y-2">{rows.map((row, index) => <div key={index} className="flex gap-2">
          <input aria-label={`Trách nhiệm ${index + 1}`} value={row} maxLength={2000} disabled={!editable}
            onChange={event => editRows(current => current.map((item, i) => i === index ? event.target.value : item))}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-line-strong bg-card px-3 text-sm text-ink focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:bg-canvas disabled:text-ink-muted" />
          {canEdit && <button type="button" disabled={!editable} onClick={() => editRows(current => current.filter((_, i) => i !== index))} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-status-error-text hover:bg-status-error-bg disabled:opacity-50">Xóa</button>}
        </div>)}</div>
        {data && hasDraft && !loading && <details className="mt-3 text-sm text-ink-muted"><summary className="cursor-pointer">Dữ liệu đã lưu để đối chiếu</summary>
          {data.items.length ? <ul className="mt-2 list-disc pl-5">{data.items.map(item => <li key={item.id}>{item.content}</li>)}</ul> : <p className="mt-2">Chưa có trách nhiệm được lưu cho ngành này.</p>}
        </details>}
        {!canEdit && data && !data.isSnapshot && <p className="mt-3 text-sm text-ink-muted">Bạn đang ở chế độ chỉ xem phân công.</p>}
        {data && !data.isSnapshot && canEdit && <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" disabled={!editable || rows.length >= 100} onClick={() => editRows(current => [...current, ''])} className="min-h-11 rounded-lg border border-hairline bg-card px-3.5 text-sm font-semibold text-ink-soft hover:bg-canvas disabled:opacity-50">Thêm trách nhiệm</button>
          <button type="button" disabled={!editable || !data.concurrencyToken} onClick={() => void save()} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu'}</button>
        </div>}
        {data?.isSnapshot && <p className="mt-3 text-sm text-status-warning-text">Phân công đã được chốt cùng đề cương và chỉ có thể xem.</p>}
      </>}
    </>}
  </section>
}
