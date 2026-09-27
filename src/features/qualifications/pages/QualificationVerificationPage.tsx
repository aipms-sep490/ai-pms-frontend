import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { services } from '../../../services/service-gateway'
import type { StudentQualificationDto } from '../../../types/backend'
import { useActionConfirmation } from '../../../components/ui/useActionConfirmation'

export function QualificationVerificationPage() {
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
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
    } catch {
      setError('Chưa tải được danh sách hồ sơ. Hãy thử lại.')
    } finally {
      setLoading(false)
    }
  }, [search, status])

  useEffect(() => { void refresh() }, [refresh])

  const verify = async (id: number) => {
    if (await requestConfirmation({ title: 'Xác minh điều kiện tham gia', description: 'Xác nhận sinh viên đã hoàn thành các điều kiện và chứng chỉ để tham gia đồ án.', confirmLabel: 'Xác nhận đủ điều kiện' }) === null) return
    setPendingId(id)
    try {
      await services.qualification.verify(id)
      await refresh()
    } catch {
      setError('Chưa xác minh được hồ sơ. Hãy thử lại.')
    } finally {
      setPendingId(null)
    }
  }

  const reject = async (id: number) => {
    const reason = await requestConfirmation({ title: 'Từ chối xác minh', description: 'Nêu lý do để sinh viên biết cần bổ sung hoặc điều chỉnh thông tin nào.', confirmLabel: 'Từ chối xác minh', danger: true, reasonLabel: 'Lý do từ chối' })
    if (!reason?.trim()) return
    setPendingId(id)
    try {
      await services.qualification.reject(id, reason.trim())
      await refresh()
    } catch {
      setError('Chưa ghi nhận được quyết định từ chối. Hãy thử lại.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <p className="text-xs font-medium text-slate-600">Điều kiện tham gia</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Xác minh điều kiện tham gia đồ án</h1>
        <p className="mt-2 text-sm text-slate-600">Xác minh hồ sơ của sinh viên thuộc bộ môn trước khi tham gia nhóm và đăng ký đồ án.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap gap-3">
          <input className="min-w-64 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc mã sinh viên" />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="PENDING_VERIFICATION">Chờ xác minh</option>
            <option value="VERIFIED">Đã xác minh</option>
            <option value="REJECTED">Bị từ chối</option>
            <option value="EXPIRED">Đã hết hạn</option>
          </select>
          <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>Tải lại</Button>
        </div>
        {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Sinh viên</th><th className="p-3">Đào tạo</th><th className="p-3">Chứng chỉ</th><th className="p-3">Xác minh</th><th className="p-3 text-right">Thao tác</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="p-3"><b>{item.fullName}</b><div className="text-xs text-slate-500">{item.studentCode ?? 'User #' + item.userId}</div></td>
                <td className="p-3">{item.trainingStatus === 'TRAINING_COMPLETED' ? 'Đã hoàn thành' : item.trainingStatus === 'PENDING_TRAINING' ? 'Chưa hoàn thành' : 'Chưa xác định'}</td>
                <td className="p-3">{item.certificateNumber ?? 'Chưa có'}</td>
                <td className="p-3">{{ PENDING_VERIFICATION: 'Chờ xác minh', VERIFIED: 'Đã xác minh', REJECTED: 'Bị từ chối', EXPIRED: 'Đã hết hạn' }[item.verificationStatus] ?? 'Chưa xác định'}</td>
                <td className="p-3 text-right">
                  {item.verificationStatus === 'PENDING_VERIFICATION' ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" disabled={pendingId !== null} onClick={() => void verify(item.id)}>Xác minh</Button>
                      <Button size="sm" variant="danger" disabled={pendingId !== null} onClick={() => void reject(item.id)}>Từ chối</Button>
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
      {confirmationDialog}
    </main>
  )
}
