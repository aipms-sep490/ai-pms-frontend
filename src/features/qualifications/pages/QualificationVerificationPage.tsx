import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { services } from '../../../services/service-gateway'
import type { StudentQualificationDto } from '../../../types/backend'

export function QualificationVerificationPage() {
  const [items, setItems] = useState<StudentQualificationDto[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('PENDING_VERIFICATION')
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await services.qualification.getVerificationQueue({ status, search: search.trim() || undefined })
      setItems(result.items)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải hàng đợi xác minh.')
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => { void refresh() }, [refresh])

  const verify = async (id: number) => {
    if (!confirm('Xác nhận sinh viên đã hoàn thành điều kiện/chứng chỉ và đủ điều kiện tham gia đồ án?')) return
    setPendingId(id)
    try {
      await services.qualification.verify(id)
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể xác minh qualification.')
    } finally {
      setPendingId(null)
    }
  }

  const reject = async (id: number) => {
    const reason = prompt('Nhập lý do từ chối xác minh:')
    if (!reason?.trim()) return
    setPendingId(id)
    try {
      await services.qualification.reject(id, reason.trim())
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Không thể từ chối qualification.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Academic eligibility governance</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Xác minh điều kiện tham gia đồ án</h1>
        <p className="mt-2 text-sm text-slate-600">Department Staff chỉ xác minh sinh viên thuộc phạm vi học vụ của mình. VERIFIED là nguồn dữ liệu backend dùng cho Team eligibility, Invitation, Registration và Leader Change.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap gap-3">
          <input className="min-w-64 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc mã sinh viên" />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="PENDING_VERIFICATION">Pending verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>Tải lại</Button>
        </div>
        {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Sinh viên</th><th className="p-3">Training</th><th className="p-3">Chứng chỉ</th><th className="p-3">Verification</th><th className="p-3 text-right">Thao tác</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="p-3"><b>{item.fullName}</b><div className="text-xs text-slate-500">{item.studentCode ?? 'User #' + item.userId}</div></td>
                <td className="p-3">{item.trainingStatus}</td>
                <td className="p-3">{item.certificateNumber ?? 'Chưa có'}</td>
                <td className="p-3">{item.verificationStatus}</td>
                <td className="p-3 text-right">
                  {item.verificationStatus === 'PENDING_VERIFICATION' ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" disabled={pendingId !== null} onClick={() => void verify(item.id)}>Verify</Button>
                      <Button size="sm" variant="danger" disabled={pendingId !== null} onClick={() => void reject(item.id)}>Reject</Button>
                    </div>
                  ) : <span className="text-xs text-slate-400">Đã xử lý</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Không có hồ sơ phù hợp.</p> : null}
        {loading ? <p className="p-6 text-center text-sm text-slate-500">Đang tải…</p> : null}
      </section>
    </main>
  )
}
