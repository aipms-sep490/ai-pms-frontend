import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { HttpError } from '../../../services/http/http-client'
import {
  createDepartmentSpecialization,
  listSpecializations,
  updateDepartmentSpecialization,
  type DepartmentSpecialization,
} from '../api/department-students-api'

interface Props {
  departmentId: number
  majors: readonly { id: number; code: string; name: string }[]
  onClose: () => void
  onChanged: () => void
}

function errorText(reason: unknown): string {
  if (reason instanceof HttpError) {
    if (reason.status === 409) return 'Mã chuyên ngành hẹp đã tồn tại trong khoa của bạn.'
    if (reason.status === 422 || reason.status === 400) return reason.problem?.detail || 'Thông tin chuyên ngành hẹp chưa hợp lệ.'
    if (reason.status === 403) return 'Bạn không có quyền quản lý chuyên ngành hẹp của khoa này.'
  }
  return 'Chưa thể lưu chuyên ngành hẹp. Vui lòng thử lại.'
}

export function SpecializationCatalogPanel({ departmentId, majors, onClose, onChanged }: Props) {
  const [items, setItems] = useState<DepartmentSpecialization[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [majorId, setMajorId] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await listSpecializations({ departmentId, includeInactive: true })
      setItems(next)
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setLoading(false)
    }
  }, [departmentId])

  useEffect(() => { void load() }, [load])

  function resetForm() {
    setEditingId(null)
    setCode('')
    setName('')
    setMajorId('')
    setDescription('')
    setIsActive(true)
  }

  function startEdit(item: DepartmentSpecialization) {
    setEditingId(item.id)
    setCode(item.code)
    setName(item.name)
    setMajorId(item.majorId ? String(item.majorId) : '')
    setDescription(item.description ?? '')
    setIsActive(item.isActive)
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const trimmedCode = code.trim().toUpperCase()
    const trimmedName = name.trim()
    if (!trimmedCode || !trimmedName) {
      setError('Mã và tên chuyên ngành hẹp không được để trống.')
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    const parsedMajorId = Number(majorId) > 0 ? Number(majorId) : null
    try {
      if (editingId) {
        await updateDepartmentSpecialization(editingId, {
          majorId: parsedMajorId,
          code: trimmedCode,
          name: trimmedName,
          description: description.trim() || null,
          isActive,
        })
        setNotice(`Đã cập nhật chuyên ngành hẹp ${trimmedCode}.`)
      } else {
        await createDepartmentSpecialization({
          majorId: parsedMajorId,
          code: trimmedCode,
          name: trimmedName,
          description: description.trim() || null,
        })
        setNotice(`Đã thêm chuyên ngành hẹp ${trimmedCode}.`)
      }
      resetForm()
      await load()
      onChanged()
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus(item: DepartmentSpecialization) {
    if (busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await updateDepartmentSpecialization(item.id, {
        majorId: item.majorId,
        code: item.code,
        name: item.name,
        description: item.description,
        isActive: !item.isActive,
      })
      setNotice(item.isActive ? `Đã ngừng áp dụng ${item.code}.` : `Đã kích hoạt lại ${item.code}.`)
      await load()
      onChanged()
    } catch (reason) {
      setError(errorText(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      title="Danh mục Chuyên ngành hẹp của Khoa"
      description="Sinh viên thuộc Khoa sẽ chọn chuyên ngành hẹp từ danh mục đang hoạt động dưới đây khi khai báo hồ sơ học vụ."
      busy={busy}
      onClose={onClose}
    >
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-status-success-border bg-status-success-bg px-3 py-2 text-sm text-status-success-text">{notice}</p>}

        <form className="grid gap-3 rounded-xl border border-hairline bg-slate-50/60 p-4 sm:grid-cols-2" onSubmit={event => void handleSubmit(event)}>
          <label className="text-sm font-medium">
            Mã chuyên ngành hẹp *
            <input
              className="mt-1 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
              value={code}
              onChange={event => setCode(event.target.value)}
              placeholder="Ví dụ: SE-WEB, MKT-DIG"
              maxLength={40}
              required
              disabled={busy}
            />
          </label>
          <label className="text-sm font-medium">
            Tên chuyên ngành hẹp *
            <input
              className="mt-1 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Ví dụ: Kỹ thuật Web & Cloud"
              maxLength={150}
              required
              disabled={busy}
            />
          </label>
          <label className="text-sm font-medium">
            Áp dụng cho ngành (tùy chọn)
            <select
              className="mt-1 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
              value={majorId}
              onChange={event => setMajorId(event.target.value)}
              disabled={busy}
            >
              <option value="">Dùng chung toàn Khoa</option>
              {majors.map(m => <option key={m.id} value={m.id}>{m.code} · {m.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Mô tả ngắn
            <input
              className="mt-1 block w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Ghi chú phạm vi chuyên môn"
              maxLength={500}
              disabled={busy}
            />
          </label>
          {editingId && (
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
              <input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} disabled={busy} />
              Đang áp dụng cho sinh viên mới chọn
            </label>
          )}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}>{editingId ? 'Lưu thay đổi' : 'Thêm chuyên ngành hẹp'}</Button>
            {editingId && <Button type="button" variant="outline" disabled={busy} onClick={resetForm}>Hủy chỉnh sửa</Button>}
          </div>
        </form>

        {loading ? (
          <p role="status" className="text-sm text-ink-muted">Đang tải danh mục chuyên ngành hẹp…</p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-hairline p-4 text-sm text-ink-muted">Khoa chưa khai báo chuyên ngành hẹp nào.</p>
        ) : (
          <ul className="divide-y divide-hairline rounded-xl border border-hairline">
            {items.map(item => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{item.code}</strong>
                    <span>{item.name}</span>
                    <StatusBadge tone={item.isActive ? 'success' : 'neutral'} label={item.isActive ? 'Đang áp dụng' : 'Ngừng áp dụng'} />
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {item.majorName ? `Ngành: ${item.majorName}` : 'Toàn Khoa'}
                    {item.description ? ` · ${item.description}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => startEdit(item)}>Sửa</Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => void toggleStatus(item)}>
                    {item.isActive ? 'Ngừng dùng' : 'Kích hoạt'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="app-modal__actions">
          <Button variant="outline" onClick={onClose} disabled={busy}>Đóng</Button>
        </div>
      </div>
    </Modal>
  )
}
