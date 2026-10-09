import { useRef, useState, type FormEvent } from 'react'
import { env } from '../../../app/config/env'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import type { StudentQualificationDto } from '../../../types/backend'

const inputClass = 'mt-1 min-h-11 w-full rounded-lg border border-hairline bg-card px-3 py-2 text-sm'

export function QualificationCertificateForm({ onSubmitted, onBusyChange }: { onSubmitted: (value: StudentQualificationDto) => void; onBusyChange?: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const errorRef = useRef<HTMLParagraphElement>(null)
  function fail(message: string) { setError(message); requestAnimationFrame(() => errorRef.current?.focus()) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || env.isMockMode) return
    const form = event.currentTarget
    const data = new FormData(form)
    const file = (form.elements.namedItem('file') as HTMLInputElement).files?.[0]
    if (!file || file.size === 0) return fail('Chọn tệp chứng nhận có nội dung.')
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) return fail('Chỉ hỗ trợ PDF, PNG hoặc JPEG. Hệ thống sẽ kiểm tra nội dung tệp khi nhận hồ sơ.')
    if (file.size > 20 * 1024 * 1024) return fail('Tệp chứng nhận không được vượt quá 20 MiB.')
    if (!data.has('completed')) return fail('Xác nhận đã hoàn thành đào tạo trước khi nộp chứng nhận.')
    const issued = String(data.get('issuedAt') ?? '')
    const expires = String(data.get('expiresAt') ?? '')
    if (issued && expires && expires <= issued) return fail('Ngày hết hạn phải sau ngày cấp.')
    pending.current = true; setBusy(true); onBusyChange?.(true); setError('')
    try {
      const value = await services.qualification.uploadCertificate({ file,
        certificateNumber: String(data.get('certificateNumber') ?? '').trim() || undefined,
        issuedAt: issued ? new Date(`${issued}T00:00:00+07:00`).toISOString() : undefined,
        expiresAt: expires ? new Date(`${expires}T00:00:00+07:00`).toISOString() : undefined,
      })
      form.reset()
      onSubmitted(value)
    } catch (reason) { fail(uploadError(reason)) }
    finally { pending.current = false; setBusy(false); onBusyChange?.(false) }
  }
  return <form className="mt-5 border-t border-hairline pt-4" onSubmit={event => void submit(event)} aria-label="Nộp chứng nhận đào tạo">
    <h3 className="font-semibold text-slate-900">Nộp hoặc nộp lại chứng nhận</h3>
    <p id="certificate-help" className="mt-1 text-sm leading-6 text-slate-600">PDF, PNG hoặc JPEG, tối đa 20 MiB. Hồ sơ sẽ chờ bộ môn xác minh; nộp tệp chưa xác nhận đủ điều kiện đăng ký.</p>
    {env.isMockMode && <p role="status" className="mt-2 text-sm text-slate-600">Nộp chứng nhận cần kết nối API. Chế độ dữ liệu mẫu chỉ hỗ trợ xem.</p>}
    <fieldset disabled={busy || env.isMockMode} className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-sm font-medium sm:col-span-2">Tệp chứng nhận<input name="file" type="file" accept="application/pdf,image/png,image/jpeg" aria-describedby="certificate-help certificate-error" className={`${inputClass} min-w-0 max-w-full`} /></label>
      <label className="text-sm font-medium sm:col-span-2">Số chứng nhận (không bắt buộc)<input name="certificateNumber" maxLength={100} className={inputClass} /></label>
      <label className="text-sm font-medium">Ngày cấp (không bắt buộc)<input name="issuedAt" type="date" className={inputClass} /></label>
      <label className="text-sm font-medium">Ngày hết hạn (không bắt buộc)<input name="expiresAt" type="date" className={inputClass} /></label>
      <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2"><input name="completed" type="checkbox" />Tôi đã hoàn thành đào tạo và gửi chứng nhận để xác minh.</label>
    </fieldset>
    <p id="certificate-error" ref={errorRef} tabIndex={-1} role={error ? 'alert' : undefined} className="mt-2 text-sm text-status-error-text">{error}</p>
    <button type="submit" disabled={busy || env.isMockMode} className="mt-2 min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang nộp…' : 'Nộp chứng nhận'}</button>
  </form>
}

function uploadError(reason: unknown) {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Đăng nhập lại trước khi nộp.'
    if (reason.status === 403) return 'Bạn chưa có quyền nộp chứng nhận cho hồ sơ này.'
    if (reason.status === 409) return 'Hồ sơ đã thay đổi hoặc ngày chứng nhận chưa hợp lệ. Tải lại trạng thái và kiểm tra trước khi nộp lại.'
    if (reason.status === 413) return 'Tệp vượt giới hạn tải lên. Chọn tệp tối đa 20 MiB.'
    if (reason.status === 400 || reason.status === 422) return 'Hệ thống không chấp nhận tệp hoặc thông tin chứng nhận. Kiểm tra nội dung, định dạng và ngày cấp.'
  }
  return 'Chưa xác nhận được việc nộp hồ sơ. Tải lại trạng thái trước khi quyết định nộp lại.'
}
