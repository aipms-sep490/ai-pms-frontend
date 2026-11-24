import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Pagination } from '../../../components/ui/Pagination'
import { StatTileRow } from '../../../components/ui/StatTileRow'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useClientPagination } from '../../../components/ui/useClientPagination'
import { HttpError } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { list, replaceExpertise, updateOwnProfile, type Supervisor, type SupervisorExpertiseDraft } from '../api/supervisor-api'

const emptyExpertise = (): SupervisorExpertiseDraft => ({ name: '', proficiencyLevel: null })

function failureMessage(reason: unknown) {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
    if (reason.status === 403) return 'Bạn chưa có quyền cập nhật hồ sơ giảng viên trong phạm vi hiện tại.'
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

  const indexedExpertise = useMemo(
    () => expertise.map((item, index) => ({ item, index })),
    [expertise],
  )
  const expertisePagination = useClientPagination(indexedExpertise, 8)

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

  const addExpertise = () => {
    setExpertise((items) => {
      const next = [...items, emptyExpertise()]
      const lastPage = Math.max(1, Math.ceil(next.length / expertisePagination.pageSize))
      expertisePagination.setPage(lastPage)
      return next
    })
  }

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

  const seniorExpertiseCount = expertise.filter(
    (item) => item.proficiencyLevel === 'ADVANCED' || item.proficiencyLevel === 'EXPERT',
  ).length

  if (!session) return <div className="workspace-page p-6"><Link to="/login">Đăng nhập để cập nhật hồ sơ giảng viên.</Link></div>

  return (
    <div className="workspace-page supervisor-profile-page space-y-5 pb-10" aria-labelledby="supervisor-profile-title">
      <header className="workspace-heading">
        <div className="workspace-heading-copy">
          <div className="workspace-context"><span className="workspace-kicker">Hồ sơ giảng viên</span></div>
          <h1 id="supervisor-profile-title">{session.user.fullName}</h1>
          <p>Cập nhật chuyên môn, giới thiệu và khả năng nhận hướng dẫn đồ án.</p>
        </div>
      </header>

      {error ? (
        <div ref={summaryRef} role="alert" tabIndex={-1} className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">
          <strong>Không thể lưu hồ sơ.</strong>
          <p className="mt-1">{error}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void load()}>Tải lại</Button>
        </div>
      ) : null}
      {message ? <p role="status" className="rounded-xl border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text">{message}</p> : null}
      {loading ? <section role="status" className="rounded-xl border border-hairline bg-card p-6 text-sm text-ink-muted">Đang tải hồ sơ giảng viên từ hệ thống…</section> : null}

      {!loading ? (
        <>
          <StatTileRow
            tiles={[
              {
                icon: 'school',
                label: 'Lĩnh vực chuyên môn',
                value: expertise.length,
                caption: profile ? profile.departmentName : 'Chưa khởi tạo hồ sơ',
                hero: true,
              },
              {
                icon: 'event_available',
                label: 'Mở nhận hướng dẫn',
                value: available ? 1 : 0,
                tone: available ? 'success' : 'warning',
                caption: available ? 'Đang mở nhận yêu cầu từ sinh viên' : 'Tạm ngưng nhận yêu cầu mới',
              },
              {
                icon: 'verified',
                label: 'Mức nâng cao / chuyên gia',
                value: seniorExpertiseCount,
                tone: 'info',
                caption: 'Lĩnh vực chuyên sâu nổi bật',
              },
              {
                icon: 'edit_note',
                label: 'Ký tự giới thiệu',
                value: bio.trim().length,
                tone: 'neutral',
                caption: 'Giới hạn tối đa 4.000 ký tự',
              },
            ]}
          />

          <form className="grid grid-cols-1 gap-5 xl:grid-cols-12 items-start" onSubmit={save} noValidate>
            {/* Left Bento column (5 cols): Thông tin & trạng thái tiếp nhận */}
            <section className="xl:col-span-5 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-canvas/70 border-b border-hairline px-5 py-3.5">
                <h2 className="text-base font-bold text-ink">Thông tin & trạng thái nhận đồ án</h2>
                <StatusBadge tone={available ? 'success' : 'warning'} label={available ? 'Đang mở nhận' : 'Tạm ngưng'} />
              </div>
              <div className="p-5 space-y-4">
                {!profile ? (
                  <p className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
                    Chưa có hồ sơ giảng viên. Lần lưu đầu tiên sẽ tạo hồ sơ cho tài khoản đã xác thực này.
                  </p>
                ) : (
                  <p className="text-sm font-medium text-ink-muted">{profile.departmentName} · Hồ sơ #{profile.id}</p>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink-soft" htmlFor="supervisor-bio">Giới thiệu chuyên môn</label>
                  <textarea
                    id="supervisor-bio"
                    value={bio}
                    maxLength={4000}
                    rows={5}
                    onChange={(event) => setBio(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-line-strong bg-card p-3 text-sm text-ink focus:border-primary focus:outline-none"
                    aria-describedby="supervisor-bio-help"
                  />
                  <p id="supervisor-bio-help" className="mt-1.5 text-xs text-ink-muted">Tối đa 4.000 ký tự. Để trống nếu chưa muốn công bố giới thiệu.</p>
                </div>

                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-hairline bg-canvas/70 p-3 text-sm font-medium text-ink-soft cursor-pointer">
                  <input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} />
                  Sẵn sàng nhận yêu cầu hướng dẫn
                </label>

                <div className="flex flex-wrap gap-3 border-t border-hairline pt-4">
                  <Button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu hồ sơ giảng viên'}</Button>
                  <Button type="button" variant="secondary" disabled={saving} onClick={() => void load()}>Hủy thay đổi</Button>
                </div>
              </div>
            </section>

            {/* Right Bento column (7 cols): Danh mục chuyên môn có phân trang */}
            <section className="xl:col-span-7 overflow-hidden rounded-xl border border-hairline bg-card shadow-xs" aria-labelledby="expertise-title">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas/70 border-b border-hairline px-5 py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="expertise-title" className="text-base font-bold text-ink">Chuyên môn</h2>
                    <StatusBadge tone="info" label={`${expertise.length} mục`} />
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">Thêm các lĩnh vực bạn có thể hướng dẫn cho sinh viên.</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={addExpertise}>Thêm chuyên môn</Button>
              </div>

              <div className="p-5">
                {expertise.length === 0 ? (
                  <p className="text-sm text-ink-muted">Chưa khai báo chuyên môn.</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {expertisePagination.paginatedItems.map(({ item, index }) => (
                        <div key={index} className="workspace-editor-row grid gap-3 rounded-lg border border-hairline bg-canvas/40 p-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
                          <label className="text-sm font-medium text-ink-soft">
                            Tên chuyên môn
                            <input
                              value={item.name}
                              maxLength={255}
                              onChange={(event) => setExpertise((items) => items.map((current, position) => position === index ? { ...current, name: event.target.value } : current))}
                              className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 text-sm text-ink"
                              aria-invalid={Boolean(error?.includes(`dòng ${index + 1}`))}
                            />
                          </label>
                          <label className="text-sm font-medium text-ink-soft">
                            Mức độ
                            <select
                              value={item.proficiencyLevel ?? ''}
                              onChange={(event) => setExpertise((items) => items.map((current, position) => position === index ? { ...current, proficiencyLevel: event.target.value || null } : current))}
                              className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-card px-3 text-sm text-ink"
                            >
                              <option value="">Chưa xác định</option>
                              <option value="BEGINNER">Cơ bản</option>
                              <option value="INTERMEDIATE">Trung cấp</option>
                              <option value="ADVANCED">Nâng cao</option>
                              <option value="EXPERT">Chuyên gia</option>
                            </select>
                          </label>
                          <Button type="button" variant="outline" className="self-end" onClick={() => setExpertise((items) => items.filter((_, position) => position !== index))}>
                            Xóa
                          </Button>
                        </div>
                      ))}
                    </div>

                    {expertisePagination.showPagination ? (
                      <Pagination
                        className="mt-4"
                        page={expertisePagination.page}
                        pages={expertisePagination.totalPages}
                        total={expertisePagination.total}
                        pageSize={expertisePagination.pageSize}
                        pageSizeOptions={[8, 16, 30]}
                        onPage={expertisePagination.setPage}
                        onPageSizeChange={expertisePagination.setPageSize}
                      />
                    ) : null}
                  </>
                )}
              </div>
            </section>
          </form>
        </>
      ) : null}
    </div>
  )
}
