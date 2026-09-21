import { useEffect, useState } from 'react'
import { services } from '../../../services/service-gateway'
import type { StudentQualificationDto } from '../../../types/backend'

export function StudentQualificationCard() {
  const [qualification, setQualification] = useState<StudentQualificationDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setQualification(await services.qualification.getMine())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải điều kiện tham gia đồ án.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const verified = qualification?.verificationStatus === 'VERIFIED'
    && (!qualification.expiresAt || new Date(qualification.expiresAt) > new Date())

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Project participation qualification</p>
          <h2 className="mt-1 text-base font-bold text-slate-900">Điều kiện tham gia đồ án</h2>
          <p className="mt-1 text-xs text-slate-500">Trạng thái này do dữ liệu đào tạo/chứng chỉ và xác minh học vụ quyết định; sinh viên không tự xác nhận đủ điều kiện.</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Tải lại
        </button>
      </div>
      {loading ? <p className="mt-4 text-sm text-slate-500">Đang tải trạng thái xác minh…</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{error}</p> : null}
      {!loading && !error && !qualification ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Chưa có hồ sơ qualification được xác minh. Khi Project Period yêu cầu qualification, trạng thái này chưa đủ để tham gia đăng ký đồ án.
        </div>
      ) : null}
      {qualification ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-4">
          <div><dt className="text-[11px] uppercase text-slate-400">Đào tạo</dt><dd className="mt-1 text-sm font-semibold">{qualification.trainingStatus}</dd></div>
          <div><dt className="text-[11px] uppercase text-slate-400">Xác minh</dt><dd className="mt-1 text-sm font-semibold">{qualification.verificationStatus}</dd></div>
          <div><dt className="text-[11px] uppercase text-slate-400">Chứng chỉ</dt><dd className="mt-1 text-sm font-semibold">{qualification.certificateNumber ?? 'Chưa có'}</dd></div>
          <div><dt className="text-[11px] uppercase text-slate-400">Tư cách</dt><dd className={'mt-1 text-sm font-bold ' + (verified ? 'text-emerald-700' : 'text-amber-700')}>{verified ? 'ĐỦ ĐIỀU KIỆN' : 'CHƯA ĐỦ ĐIỀU KIỆN'}</dd></div>
        </dl>
      ) : null}
    </section>
  )
}
