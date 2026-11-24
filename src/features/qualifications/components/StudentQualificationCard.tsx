import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { services } from '../../../services/service-gateway'
import type { StudentQualificationDto } from '../../../types/backend'
import { QualificationCertificateForm } from './QualificationCertificateForm'

export function StudentQualificationCard({ onSubmitted }: { onSubmitted?: () => Promise<void> }) {
  const [qualification, setQualification] = useState<StudentQualificationDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [uploadBusy, setUploadBusy] = useState(false)
  const sequence = useRef(0)

  const load = async () => {
    const request = ++sequence.current
    setLoading(true)
    setError(null)
    try {
      const value = await services.qualification.getMine()
      if (request === sequence.current) setQualification(value)
    } catch (reason) {
      if (request === sequence.current) setError(reason instanceof Error ? reason.message : 'Không thể tải điều kiện tham gia đồ án.')
    } finally {
      if (request === sequence.current) setLoading(false)
    }
  }

  useEffect(() => {
    const requests = sequence
    const request = ++requests.current
    void services.qualification.getMine()
      .then(value => { if (request === requests.current) { setQualification(value); setError(null) } })
      .catch((reason: unknown) => { if (request === requests.current) setError(reason instanceof Error ? reason.message : 'Không thể tải điều kiện tham gia đồ án.') })
      .finally(() => { if (request === requests.current) setLoading(false) })
    return () => { requests.current++ }
  }, [])
  const submitted = (value: StudentQualificationDto) => {
    sequence.current++; setQualification(value); setLoading(false); setError(null)
    setNotice('Đã nộp chứng nhận. Trạng thái xác minh được cập nhật từ hệ thống.')
    if (onSubmitted) void onSubmitted().catch(() => setNotice('Đã nộp chứng nhận. Chưa cập nhật được điều kiện nhóm; hãy tải lại dữ liệu nhóm.'))
  }

  return (
    <section className="rounded-2xl border border-hairline bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mt-1 text-base font-bold text-ink">Điều kiện tham gia đồ án</h2>
          <p className="mt-1 text-xs text-ink-muted">Trạng thái này do dữ liệu đào tạo/chứng chỉ và xác minh học vụ quyết định; sinh viên không tự xác nhận đủ điều kiện.</p>
        </div>
        <Button variant="secondary" size="sm" icon="refresh" aria-label="Tải lại" onClick={() => void load()} disabled={loading || uploadBusy} />
      </div>
      {loading ? <p className="mt-4 text-sm text-ink-muted">Đang tải trạng thái xác minh…</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-xs text-status-error-text">{error}</p> : null}
      {!loading && !error && !qualification ? (
        <div className="mt-4 rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-status-warning-text">
          Chưa có chứng nhận. Bạn có thể nộp hồ sơ bên dưới để bộ môn xác minh.
        </div>
      ) : null}
      {!loading && !error && qualification ? (
        <dl className="mt-4 grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-canvas p-3"><dt className="text-xs text-ink-muted">Đào tạo</dt><dd className="mt-1 text-sm font-semibold text-ink">{qualification.trainingStatus === 'TRAINING_COMPLETED' ? 'Đã hoàn thành' : qualification.trainingStatus === 'PENDING_TRAINING' ? 'Chưa hoàn thành' : 'Chưa xác định'}</dd></div>
          <div className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-canvas p-3"><dt className="text-xs text-ink-muted">Xác minh</dt><dd className="mt-1 text-sm font-semibold text-ink">{{ PENDING_VERIFICATION: 'Chờ xác minh', VERIFIED: 'Đã xác minh', REJECTED: 'Bị từ chối', EXPIRED: 'Đã hết hạn' }[qualification.verificationStatus] ?? 'Chưa xác định'}</dd></div>
          <div className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-canvas p-3"><dt className="text-xs text-ink-muted">Chứng chỉ</dt><dd className="mt-1 break-all text-sm font-semibold text-ink">{qualification.certificateNumber ?? 'Chưa có'}</dd></div>
          <div className="flex h-full flex-col justify-between rounded-xl border border-hairline bg-canvas p-3"><dt className="text-xs text-ink-muted">Điều kiện đăng ký</dt><dd className="mt-1 text-sm text-ink-soft">Theo kiểm tra điều kiện nhóm của hệ thống.</dd></div>
        </dl>
      ) : null}
      {!loading && !error && qualification?.rejectionReason && <p className="mt-3 rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text">Lý do từ chối: {qualification.rejectionReason}</p>}
      {notice && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-hairline border-l-4 border-l-status-success-text bg-card p-3 text-sm text-ink">
          <span className="material-symbols-outlined shrink-0 text-[18px] text-status-success-text" aria-hidden="true">check_circle</span>
          <p role="status">{notice}</p>
        </div>
      )}
      {!loading && !error && <QualificationCertificateForm onSubmitted={submitted} onBusyChange={setUploadBusy} />}
    </section>
  )
}
