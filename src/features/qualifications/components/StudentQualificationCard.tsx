import { useEffect, useRef, useState } from 'react'
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

  useEffect(() => { const requests = sequence; void load(); return () => { requests.current++ } }, [])
  const submitted = (value: StudentQualificationDto) => {
    sequence.current++; setQualification(value); setLoading(false); setError(null)
    setNotice('Đã nộp chứng nhận. Trạng thái xác minh được cập nhật từ hệ thống.')
    if (onSubmitted) void onSubmitted().catch(() => setNotice('Đã nộp chứng nhận. Chưa cập nhật được điều kiện nhóm; hãy tải lại dữ liệu nhóm.'))
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="mt-1 text-base font-bold text-slate-900">Điều kiện tham gia đồ án</h2>
          <p className="mt-1 text-xs text-slate-500">Trạng thái này do dữ liệu đào tạo/chứng chỉ và xác minh học vụ quyết định; sinh viên không tự xác nhận đủ điều kiện.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || uploadBusy} className="min-h-11 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Tải lại
        </button>
      </div>
      {loading ? <p className="mt-4 text-sm text-slate-500">Đang tải trạng thái xác minh…</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p> : null}
      {!loading && !error && !qualification ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Chưa có chứng nhận. Bạn có thể nộp hồ sơ bên dưới để bộ môn xác minh.
        </div>
      ) : null}
      {!loading && !error && qualification ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-4">
          <div><dt className="text-xs text-slate-500">Đào tạo</dt><dd className="mt-1 text-sm font-medium">{qualification.trainingStatus === 'TRAINING_COMPLETED' ? 'Đã hoàn thành' : qualification.trainingStatus === 'PENDING_TRAINING' ? 'Chưa hoàn thành' : 'Chưa xác định'}</dd></div>
          <div><dt className="text-xs text-slate-500">Xác minh</dt><dd className="mt-1 text-sm font-medium">{{ PENDING_VERIFICATION: 'Chờ xác minh', VERIFIED: 'Đã xác minh', REJECTED: 'Bị từ chối', EXPIRED: 'Đã hết hạn' }[qualification.verificationStatus] ?? 'Chưa xác định'}</dd></div>
          <div><dt className="text-xs uppercase text-slate-400">Chứng chỉ</dt><dd className="mt-1 text-sm font-semibold">{qualification.certificateNumber ?? 'Chưa có'}</dd></div>
          <div><dt className="text-xs text-slate-500">Điều kiện đăng ký</dt><dd className="mt-1 text-sm">Theo kiểm tra điều kiện nhóm của hệ thống.</dd></div>
        </dl>
      ) : null}
      {!loading && !error && qualification?.rejectionReason && <p className="mt-3 text-sm text-status-error-text">Lý do từ chối: {qualification.rejectionReason}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-primary">{notice}</p>}
      {!loading && !error && <QualificationCertificateForm onSubmitted={submitted} onBusyChange={setUploadBusy} />}
    </section>
  )
}
