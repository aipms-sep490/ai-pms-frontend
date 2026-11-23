import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { getInitials } from '../../../components/ui/initials'
import { HttpError } from '../../../services/http/http-client'
import { getUploadPolicy, uploadPolicyLabel, validateUploadFile, type UploadPolicy } from '../../../services/api/upload-policies.api'
import { getMyAvatarBlob, getMyAvatarMetadata, removeMyAvatar, uploadMyAvatar, type UserAvatarMetadata } from '../api/auth-api'
import { avatarChangedEvent } from './SelfAvatarImage'

const avatarAccept = '.png,.jpg,.jpeg'

export function ProfileAvatar({ fullName, userId }: { fullName: string; userId: number }) {
  const [metadata, setMetadata] = useState<UserAvatarMetadata | null>(null)
  const [policy, setPolicy] = useState<UploadPolicy | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [chosen, setChosen] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const imageRef = useRef<string | null>(null)
  const previewRef = useRef<string | null>(null)
  const requestId = useRef(0)

  const clearChosen = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setPreviewUrl(null)
    setChosen(null)
  }

  const load = useCallback(async (signal?: AbortSignal) => {
    const request = ++requestId.current
    setLoading(true)
    try {
      const next = await getMyAvatarMetadata(signal)
      const blob = next.hasAvatar ? await getMyAvatarBlob(signal) : null
      if (signal?.aborted || request !== requestId.current) return
      const url = blob ? URL.createObjectURL(blob) : null
      if (imageRef.current) URL.revokeObjectURL(imageRef.current)
      imageRef.current = url
      setImageUrl(url)
      setMetadata(next)
      setError(null)
      return true
    } catch (reason) {
      if (!signal?.aborted && request === requestId.current)
        setError(reason instanceof HttpError && reason.status === 403
          ? 'Tài khoản không được phép xem ảnh đại diện.' : 'Chưa tải được ảnh đại diện. Hãy thử lại.')
      return false
    } finally {
      if (!signal?.aborted && request === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    queueMicrotask(() => { if (!controller.signal.aborted) void load(controller.signal) })
    void getUploadPolicy('USER_AVATAR').then(value => { if (active) setPolicy(value) }).catch(() => undefined)
    const releaseObjectUrls = () => {
      if (imageRef.current) URL.revokeObjectURL(imageRef.current)
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
      imageRef.current = null
      previewRef.current = null
    }
    const invalidatePendingReadback = () => { requestId.current++ }
    return () => {
      active = false
      controller.abort()
      invalidatePendingReadback()
      releaseObjectUrls()
    }
  }, [load, userId])

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    const problem = file.size <= 0 ? 'Ảnh không được để trống.'
      : file.size > 2 * 1024 * 1024 ? 'Ảnh đại diện tối đa 2 MiB.'
        : !['image/png', 'image/jpeg'].includes(file.type) || !/\.(png|jpe?g)$/i.test(file.name)
          ? 'Chọn ảnh PNG hoặc JPEG.' : validateUploadFile(file, policy)
    if (problem) { setError(problem); return }
    clearChosen()
    const url = URL.createObjectURL(file)
    previewRef.current = url
    setPreviewUrl(url)
    setChosen(file)
    setNotice(null)
    setError(null)
  }

  const save = async () => {
    if (!chosen || !metadata || busy) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const updated = await uploadMyAvatar(chosen, metadata.concurrencyToken)
      setMetadata(updated)
      clearChosen()
      if (await load()) { window.dispatchEvent(new Event(avatarChangedEvent)); setNotice('Ảnh đại diện đã được lưu và tải lại từ hệ thống.') }
      else setError('Ảnh đã được lưu nhưng chưa tải lại được. Chọn Tải lại để kiểm tra.')
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        await load()
        setError('Ảnh đại diện đã thay đổi ở phiên khác. Ảnh bạn chọn vẫn được giữ; kiểm tra rồi lưu lại.')
      } else setError(reason instanceof HttpError && reason.status === 413 ? 'Ảnh vượt giới hạn 2 MiB.'
        : reason instanceof HttpError && [400, 422].includes(reason.status) ? 'Ảnh không hợp lệ. Chọn PNG hoặc JPEG tối đa 2 MiB.'
          : 'Chưa thể lưu ảnh đại diện. Hãy thử lại.')
    } finally { setBusy(false) }
  }

  const remove = async () => {
    if (!metadata?.hasAvatar || busy) return
    setBusy(true); setError(null); setNotice(null)
    try {
      const updated = await removeMyAvatar(metadata.concurrencyToken)
      setMetadata(updated)
      setConfirmRemove(false)
      if (await load()) { window.dispatchEvent(new Event(avatarChangedEvent)); setNotice('Đã xóa ảnh đại diện.') }
      else setError('Ảnh đã được xóa nhưng chưa tải lại được. Chọn Tải lại để kiểm tra.')
    } catch (reason) {
      if (reason instanceof HttpError && reason.status === 409) {
        await load()
        setError('Ảnh đại diện đã thay đổi. Hãy kiểm tra ảnh mới trước khi xóa.')
      } else setError('Chưa thể xóa ảnh đại diện. Hãy thử lại.')
    } finally { setBusy(false) }
  }

  return <div className="profile-avatar-control">
    <div className="profile-avatar-image" aria-label={previewUrl ? 'Ảnh mới chưa lưu' : metadata?.hasAvatar ? `Ảnh đại diện của ${fullName}` : `Chữ đại diện của ${fullName}`}>
      {previewUrl || imageUrl ? <img src={previewUrl ?? imageUrl ?? ''} alt="" onError={() => {
        setError('Không mở được ảnh này. Hãy chọn ảnh PNG hoặc JPEG khác.')
        if (previewRef.current) clearChosen()
        else { if (imageRef.current) URL.revokeObjectURL(imageRef.current); imageRef.current = null; setImageUrl(null) }
      }} /> : <span aria-hidden="true">{getInitials(fullName)}</span>}
    </div>
    <div className="profile-avatar-actions">
      <label className="profile-avatar-picker">Chọn ảnh<input type="file" accept={avatarAccept} aria-label="Chọn ảnh đại diện PNG hoặc JPEG" disabled={busy || loading} onChange={choose} /></label>
      {chosen && <><Button size="sm" disabled={busy} onClick={() => void save()}>{busy ? 'Đang lưu…' : 'Lưu ảnh'}</Button><Button size="sm" variant="secondary" disabled={busy} onClick={clearChosen}>Hủy</Button></>}
      {metadata?.hasAvatar && !chosen && !confirmRemove && <Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirmRemove(true)}>Xóa ảnh</Button>}
      {confirmRemove && <div className="profile-avatar-confirm" role="group" aria-label="Xác nhận xóa ảnh đại diện"><span>Xóa ảnh hiện tại?</span><Button size="sm" variant="danger" disabled={busy} onClick={() => void remove()}>Xác nhận xóa</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirmRemove(false)}>Giữ ảnh</Button></div>}
    </div>
    <p className="profile-avatar-hint">{policy ? uploadPolicyLabel(policy) : 'PNG hoặc JPEG · tối đa 2 MiB'}</p>
    {loading && <p role="status" className="profile-avatar-hint">Đang tải ảnh đại diện…</p>}
    {chosen && <p role="status" className="profile-avatar-hint">{chosen.name} · Chưa lưu</p>}
    {error && <p role="alert" className="profile-field-error">{error} {metadata && <button type="button" onClick={() => void load()}>Tải lại</button>}</p>}
    {notice && <p role="status" className="profile-avatar-hint">{notice}</p>}
  </div>
}
