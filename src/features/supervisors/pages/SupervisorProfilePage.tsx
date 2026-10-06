import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { list, replaceExpertise, updateOwnProfile, type Supervisor, type SupervisorExpertiseDraft } from '../api/supervisor-api'

const emptyExpertise = (): SupervisorExpertiseDraft => ({ name: '', proficiencyLevel: null })

function failureMessage(reason: unknown) {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
    if (reason.status === 403) return 'Hệ thống từ chối quyền cập nhật hồ sơ giảng viên trong scope hiện tại.'
    if (reason.status === 404) return 'Không tìm thấy hồ sơ giảng viên cần cập nhật.'
    if (reason.status === 409) return 'Hồ sơ đã thay đổi. Dữ liệu mới sẽ được tải lại trước khi bạn thao tác tiếp.'
  }
  return 'Không thể đồng bộ hồ sơ giảng viên. Hãy thử lại.'
}

export function SupervisorProfilePage() {
  const { session } = useAuthSession()
  const [profile, setProfile] = useState<Supervisor | null>(null)
  const [bio, setBio] = useState('')
  const [available, setAvailable] = useState(true)
  const [expertise, setExpertise] = useState<SupervisorExpertiseDraft[]>([])
  const [loading, setLoading] = useState(Boolean(session))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const hydrate = (next: Supervisor | null) => {
    setProfile(next)
    setBio(next?.bio ?? '')
    setAvailable(next?.isAvailable ?? true)
    setExpertise(next?.expertise.map((item) => ({ name: item.name, proficiencyLevel: item.proficiencyLevel })) ?? [])
  }

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const directory = await list(session.accessToken, { search: session.user.fullName, page: 1, pageSize: 100 })
      hydrate(directory.items.find((item) => item.userId === session.user.id) ?? null)
    } catch (reason) {
      setError(failureMessage(reason))
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (error) summaryRef.current?.focus() }, [error])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session) return
    const invalid = expertise.findIndex((item) => !item.name.trim())
    if (invalid >= 0) {
      setError(`Chuyên môn ở dòng ${invalid + 1} cần có tên.`)
      return
    }
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const nextProfile = await updateOwnProfile(session.user.id, { bio: bio.trim() || null, isAvailable: available }, session.accessToken)
      const nextExpertise = expertise.map((item) => ({ name: item.name.trim(), proficiencyLevel: item.proficiencyLevel?.trim() || null }))
      const saved = await replaceExpertise(nextProfile.id, nextExpertise, session.accessToken)
      hydrate(saved)
      setMessage('Hồ sơ và chuyên môn đã được hệ thống cập nhật.')
    } catch (reason) {
      setError(failureMessage(reason))
      if (reason instanceof HttpError && reason.status === 409) await load()
    } finally {
      setSaving(false)
    }
  }

  if (!session) return <main className="mx-auto max-w-3xl p-6"><Link to="/login">Đăng nhập để cập nhật hồ sơ giảng viên.</Link></main>
  return <main className="mx-auto max-w-3xl space-y-5 pb-12" aria-labelledby="supervisor-profile-title">
    <header className="rounded-2xl border border-hairline bg-card p-6 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hồ sơ giảng viên</p>
      <h1 id="supervisor-profile-title" className="mt-1 text-2xl font-bold text-slate-900">{session.user.fullName}</h1>
      <p className="mt-1 text-sm text-slate-600">Sẵn sàng nhận hướng dẫn và chuyên môn được hệ thống kiểm tra theo tài khoản hiện tại.</p>
    </header>

    {error ? <div ref={summaryRef} role="alert" tabIndex={-1} className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><strong>Không thể lưu hồ sơ.</strong><p className="mt-1">{error}</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void load()}>Tải lại</Button></div> : null}
    {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p> : null}
    {loading ? <section role="status" className="rounded-2xl border border-hairline bg-card p-6 text-sm text-slate-600">Đang tải hồ sơ giảng viên từ hệ thống…</section> : null}
    {!loading ? <form className="space-y-5 rounded-2xl border border-hairline bg-card p-6 shadow-xs" onSubmit={save} noValidate>
      {!profile ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Chưa có hồ sơ giảng viên. Lần lưu đầu tiên sẽ tạo hồ sơ cho tài khoản đã xác thực này.</p> : <p className="text-sm text-slate-600">{profile.departmentName} · Profile #{profile.id}</p>}
      <label className="block text-sm font-medium text-slate-800" htmlFor="supervisor-bio">Giới thiệu chuyên môn</label>
      <textarea id="supervisor-bio" value={bio} maxLength={4000} rows={5} onChange={(event) => setBio(event.target.value)} className="w-full rounded-lg border border-slate-300 p-3 text-sm" aria-describedby="supervisor-bio-help" />
      <p id="supervisor-bio-help" className="-mt-3 text-xs text-slate-500">Tối đa 4.000 ký tự. Để trống nếu chưa muốn công bố giới thiệu.</p>
      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-800"><input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} /> Sẵn sàng nhận yêu cầu hướng dẫn</label>
      <section aria-labelledby="expertise-title"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="expertise-title" className="text-lg font-bold text-slate-900">Chuyên môn</h2><p className="text-sm text-slate-600">Các mục được thay thế nguyên danh sách sau khi hệ thống xác thực.</p></div><Button type="button" variant="secondary" onClick={() => setExpertise((items) => [...items, emptyExpertise()])}>Thêm chuyên môn</Button></div>
        <div className="mt-3 space-y-3">{expertise.map((item, index) => <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_12rem_auto]"><label className="text-sm font-medium text-slate-800">Tên chuyên môn<input value={item.name} maxLength={255} onChange={(event) => setExpertise((items) => items.map((current, position) => position === index ? { ...current, name: event.target.value } : current))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" aria-invalid={Boolean(error?.includes(`dòng ${index + 1}`))} /></label><label className="text-sm font-medium text-slate-800">Mức độ<select value={item.proficiencyLevel ?? ''} onChange={(event) => setExpertise((items) => items.map((current, position) => position === index ? { ...current, proficiencyLevel: event.target.value || null } : current))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3"><option value="">Chưa xác định</option><option value="BEGINNER">Cơ bản</option><option value="INTERMEDIATE">Trung cấp</option><option value="ADVANCED">Nâng cao</option><option value="EXPERT">Chuyên gia</option></select></label><Button type="button" variant="outline" className="self-end" onClick={() => setExpertise((items) => items.filter((_, position) => position !== index))}>Xóa</Button></div>)}</div>
        {expertise.length === 0 ? <p className="mt-3 text-sm text-slate-600">Chưa khai báo chuyên môn.</p> : null}
      </section>
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu hồ sơ giảng viên'}</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => void load()}>Khôi phục dữ liệu hệ thống</Button></div>
    </form> : null}
  </main>
}
