import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/PageLoading'
import { Pagination, StatTileRow, StatusBadge, useClientPagination } from '../../components/ui'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { HttpError } from '../../services/http/http-client'
import type { PagedResult } from '../../types/backend'
import { useAcademicStructure } from '../academic/hooks/useAcademicStructure'
import { useExecutionAccess } from '../execution/context/ExecutionAccessContext'
import { CollaborationIntro, collaborationDate, collaborationError } from '../student-collaboration/collaboration-ui'
import * as api from './peer-eval-api'
import type { PeerEvaluationSubmission, PeerRound } from './peer-eval-types'

const peerStatusLabel: Record<string, string> = { OPEN: 'Đang mở', SCHEDULED: 'Sắp mở', EXPIRED: 'Đã hết hạn', CLOSED: 'Đã đóng' }
const peerStatusTone: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = { OPEN: 'success', SCHEDULED: 'info', EXPIRED: 'warning', CLOSED: 'neutral' }

export function SupervisorPeerRoundsPage() {
  const { project, supervisor, routeBase } = useExecutionAccess()
  const canCreate = supervisor?.assignmentType === 'PRIMARY' && supervisor.isPrimary && !supervisor.endedAt
    && ['ACTIVE', 'FINAL_SUBMISSION'].includes(project.status.toUpperCase())
  const majorNames = useMemo(
    () => Object.fromEntries((project.majors ?? []).map((major) => [major.majorId, `${major.majorCode} · ${major.majorName}`])),
    [project.majors],
  )
  return <WorkspacePage title="Đánh giá đồng đội" eyebrow="Theo dõi đóng góp" backTo={`${routeBase}/workspace`} description="Mở đợt phản hồi, theo dõi bài đã gửi và hiểu cách nhóm đang phối hợp.">
    <PeerRoundWorkspace key={project.id} projectId={project.id} canCreate={canCreate} majorNames={majorNames} />
  </WorkspacePage>
}

export function DepartmentPeerEvaluationsPage() {
  const projectId = Number(useParams().projectId)
  const academic = useAcademicStructure({ search: '', includeInactive: true })
  const majorNames = useMemo(() => {
    const entries: Array<[number, string]> = []
    academic.hierarchy?.forEach((org) => org.departments.forEach((dept) => dept.majors.forEach((major) => {
      entries.push([major.id, `${major.code} · ${major.name}`])
    })))
    return Object.fromEntries(entries)
  }, [academic.hierarchy])
  return <WorkspacePage title="Phản hồi đồng đội" eyebrow="Minh chứng đóng góp">{Number.isSafeInteger(projectId) && projectId > 0
    ? <PeerRoundWorkspace key={projectId} projectId={projectId} majorNames={majorNames} /> : <p>Đường dẫn đồ án không hợp lệ.</p>}</WorkspacePage>
}

export function PeerRoundWorkspace({ projectId, canCreate = false, majorNames }: { projectId: number; canCreate?: boolean; majorNames?: Record<number, string> }) {
  const [page, setPage] = useState(1), [rounds, setRounds] = useState<PagedResult<PeerRound> | null>(null)
  const [selected, setSelected] = useState<PeerRound | null>(null), [revision, setRevision] = useState(0)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const [formOpen, setFormOpen] = useState(false), [form, setForm] = useState({ title: '', opensAt: '', closesAt: '' })
  const mutation = useRef(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  useEffect(() => {
    const abort = new AbortController(); setRounds(null); setSelected(null)
    void api.getPeerRounds(projectId, page, 10, abort.signal).then(data => {
      if (abort.signal.aborted) return
      setRounds(data); setSelected(data.items[0] ?? null)
    }).catch(reason => { if (!abort.signal.aborted) setError(collaborationError(reason)) })
    return () => abort.abort()
  }, [projectId, page, revision])
  async function run(action: () => Promise<PeerRound>, success: string) {
    if (mutation.current) return
    mutation.current = true; setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(success); setFormOpen(false); setForm({ title: '', opensAt: '', closesAt: '' }); setPage(1); setRevision(value => value + 1) }
    catch (reason) { setError(collaborationError(reason)); if (reason instanceof HttpError && reason.status === 409) setRevision(value => value + 1) }
    finally { mutation.current = false; setBusy(false) }
  }
  function create(event: FormEvent) {
    event.preventDefault()
    const start = Date.parse(form.opensAt), end = Date.parse(form.closesAt)
    if (!canCreate) return
    if (!form.title.trim() || !Number.isFinite(start) || !Number.isFinite(end) || start >= end || end <= Date.now() || end - start > 90 * 86400000) {
      setError('Nhập tên đợt, thời điểm mở trước đóng, hạn đóng trong tương lai và khoảng thời gian tối đa 90 ngày.'); return
    }
    void run(() => api.createPeerRound(projectId, { title: form.title.trim(), opensAt: new Date(start).toISOString(), closesAt: new Date(end).toISOString() }), 'Đã tạo đợt đánh giá và chốt danh sách thành viên.')
  }
  async function close(round: PeerRound) {
    if (!round.canManage || busy) return
    if (await requestConfirmation({ title: `Đóng đợt “${round.title}”?`, description: 'Sinh viên không thể gửi thêm bài. Các bài đã gửi được giữ lại; thay đổi danh sách nhóm cần một đợt mới.', confirmLabel: 'Đóng đợt', danger: true }) === null) return
    void run(() => api.closePeerRound(projectId, round.id, round.concurrencyToken), 'Đã đóng đợt đánh giá.')
  }
  const rosterPagination = useClientPagination(selected?.roster ?? [], 8)
  const openRoundsCount = rounds?.items.filter(item => item.status === 'OPEN').length ?? 0
  const closedRoundsCount = rounds?.items.filter(item => item.status === 'CLOSED').length ?? 0
  const totalRoundPages = rounds ? Math.max(1, Math.ceil(rounds.totalCount / 10)) : 1

  return (
    <div className="collab">
      {confirmationDialog}
      <CollaborationIntro icon="forum" title="Lắng nghe từ từng thành viên">
        Phản hồi là minh chứng tham khảo, không cộng vào điểm chính thức. Bạn chỉ thấy bài và người được đánh giá trong phạm vi được cấp.
      </CollaborationIntro>

      {rounds && (
        <StatTileRow
          tiles={[
            {
              icon: 'event_note',
              label: 'Tổng đợt đánh giá',
              value: rounds.totalCount,
              caption: 'Trong đồ án hiện tại',
              hero: true,
            },
            {
              icon: 'lock_open',
              label: 'Đợt đang mở',
              value: openRoundsCount,
              caption: openRoundsCount > 0 ? 'Đang tiếp nhận đánh giá' : 'Không có đợt đang mở',
              tone: openRoundsCount > 0 ? 'success' : 'neutral',
            },
            {
              icon: 'groups',
              label: 'Thành viên đợt chọn',
              value: selected?.memberCount ?? 0,
              caption: selected ? selected.title : 'Chưa chọn đợt',
              tone: 'info',
            },
            {
              icon: 'task_alt',
              label: 'Đợt đã đóng',
              value: closedRoundsCount,
              caption: 'Trên trang hiện tại',
              tone: 'neutral',
            },
          ]}
        />
      )}

      {error && <div role="alert" className="collab-error">{error} <Button variant="ghost" onClick={() => { setError(''); setRevision(value => value + 1) }}>Tải lại</Button></div>}
      {notice && <p role="status" className="collab-note">{notice}</p>}
      {canCreate && <div><Button icon="add" disabled={busy || !rounds} onClick={() => setFormOpen(value => !value)} aria-expanded={formOpen}>Tạo đợt đánh giá</Button></div>}

      {formOpen && canCreate && (
        <form className="collab-card collab-card-flush" onSubmit={create}>
          <div className="collab-card-header">
            <h2>Một đợt phản hồi mới</h2>
          </div>
          <div className="collab-card-body collab-form">
            <label>Tên đợt<input required maxLength={200} value={form.title} disabled={busy} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ví dụ: Nhìn lại sprint tháng 10" /></label>
            <div className="collab-score-grid">
              <label>Mở lúc<input required type="datetime-local" value={form.opensAt} disabled={busy} onChange={event => setForm({ ...form, opensAt: event.target.value })} /></label>
              <label>Đóng lúc<input required type="datetime-local" value={form.closesAt} disabled={busy} onChange={event => setForm({ ...form, closesAt: event.target.value })} /></label>
            </div>
            <p className="collab-muted">Thời gian theo múi giờ thiết bị ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Cần đóng đợt trước, kể cả đã hết hạn, trước khi tạo đợt mới.</p>
            <div className="collab-actions">
              <Button type="submit" disabled={busy}>Lưu đợt đánh giá</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setFormOpen(false)}>Hủy</Button>
            </div>
          </div>
        </form>
      )}

      {!rounds && !error ? <PageLoading /> : rounds && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <section className="collab-card collab-card-flush xl:col-span-7">
            <div className="collab-card-header">
              <h2>Các đợt đánh giá</h2>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                {rounds.totalCount}
              </span>
            </div>
            <div className="collab-card-body collab-stack">
              {!rounds.items.length && <p className="collab-empty">Chưa có đợt đánh giá nào.</p>}
              {rounds.items.map(round => (
                <div key={round.id} className="collab-section">
                  <div className="collab-row">
                    <Button variant={selected?.id === round.id ? 'secondary' : 'ghost'} aria-pressed={selected?.id === round.id} disabled={busy} onClick={() => setSelected(round)}>
                      {round.title}
                    </Button>
                    <StatusBadge tone={peerStatusTone[round.status] ?? 'neutral'} label={peerStatusLabel[round.status] ?? round.status} />
                  </div>
                  <p className="collab-muted mt-1.5 font-mono text-xs">{collaborationDate(round.opensAt)} — {collaborationDate(round.closesAt)}</p>
                </div>
              ))}
              {rounds.totalCount > 10 && (
                <div className="border-t border-hairline pt-3">
                  <Pagination page={page} pages={totalRoundPages} total={rounds.totalCount} pageSize={10} busy={busy} onPage={setPage} />
                </div>
              )}
            </div>
          </section>

          <aside className="collab-card collab-card-flush xl:col-span-5">
            <div className="collab-card-header">
              <h2>Danh sách được chốt</h2>
              {selected && (
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
                  {selected.memberCount} thành viên
                </span>
              )}
            </div>
            <div className="collab-card-body collab-stack">
              {selected ? (
                <>
                  <p className="collab-muted">{selected.memberCount} thành viên trong phạm vi được xem.</p>
                  <div className="divide-y divide-hairline">
                    {rosterPagination.paginatedItems.map(member => (
                      <div key={member.userId} className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                        <strong className="text-sm text-ink">{member.fullName}</strong>
                        {majorNames?.[member.majorId] && (
                          <span className="rounded-md border border-hairline bg-canvas px-2 py-0.5 text-xs font-medium text-ink-soft">
                            {majorNames[member.majorId]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {rosterPagination.showPagination && (
                    <div className="border-t border-hairline pt-3">
                      <Pagination page={rosterPagination.page} pages={rosterPagination.totalPages} total={rosterPagination.total} pageSize={rosterPagination.pageSize} onPage={rosterPagination.setPage} />
                    </div>
                  )}
                  {selected.canManage && selected.status !== 'CLOSED' && (
                    <div className="border-t border-hairline pt-3">
                      <Button variant="outline" disabled={busy} onClick={() => void close(selected)}>Đóng đợt này</Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="collab-muted">Chọn đợt để xem danh sách.</p>
              )}
            </div>
          </aside>
        </div>
      )}

      {selected && rounds && <PeerSubmissionList key={`${selected.id}:${revision}`} projectId={projectId} round={selected} />}
    </div>
  )
}

function PeerSubmissionList({ projectId, round }: { projectId: number; round: PeerRound }) {
  const [page, setPage] = useState(1), [data, setData] = useState<PagedResult<PeerEvaluationSubmission> | null>(null), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError('')
    void api.getPeerSubmissions(projectId, round.id, page, 10, abort.signal).then(result => { if (!abort.signal.aborted) setData(result) }).catch(reason => { if (!abort.signal.aborted) setError(collaborationError(reason)) })
    return () => abort.abort()
  }, [projectId, round.id, page, retry])
  const name = (id: number) => round.roster.find(member => member.userId === id)?.fullName ?? `Thành viên #${id}`
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / 10)) : 1

  return (
    <section className="collab-card collab-card-flush">
      <div className="collab-card-header">
        <div className="flex items-center gap-2.5">
          <h2>Bài đã gửi · {round.title}</h2>
          {data && (
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-primary">
              {data.totalCount}
            </span>
          )}
        </div>
        {data && <span className="collab-muted">{data.totalCount} bài trong phạm vi được xem</span>}
      </div>
      <div className="collab-card-body collab-stack">
        {error ? (
          <p role="alert" className="collab-error">{error} <Button variant="ghost" onClick={() => setRetry(value => value + 1)}>Thử lại</Button></p>
        ) : !data ? (
          <PageLoading />
        ) : (
          <>
            {!data.items.length && <p className="collab-empty">Chưa có bài đã gửi trong phạm vi của bạn.</p>}
            {data.items.map(submission => (
              <article className="collab-section collab-stack" key={submission.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-ink">{name(submission.authorId)}</h3>
                  <p className="collab-muted font-mono text-xs">Gửi lúc {collaborationDate(submission.submittedAt)}</p>
                </div>
                <div className="collab-score-grid">
                  {submission.items.map(item => (
                    <div className="collab-score" key={item.targetUserId}>
                      <div className="collab-score-head">
                        <h3>{name(item.targetUserId)}</h3>
                        <strong>{item.rating}<small className="text-xs font-medium text-ink-muted">/5</small></strong>
                      </div>
                      <div className="collab-score-body">
                        <p className="whitespace-pre-wrap">{item.comment || 'Không có nhận xét.'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {data.totalCount > 10 && (
              <div className="border-t border-hairline pt-3">
                <Pagination page={page} pages={totalPages} total={data.totalCount} pageSize={10} onPage={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
