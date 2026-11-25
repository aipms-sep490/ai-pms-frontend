import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { StatTileRow } from '../../components/ui/StatTileRow'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { ActionVerdict } from '../../components/ui/ActionVerdict'
import { WorkspaceEmptyState } from '../../components/ui/WorkspaceState'
import { PageLoading } from '../../components/ui/PageLoading'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { HttpError } from '../../services/http/http-client'
import { isActionAllowed, type PagedResult, type WorkflowActionDto } from '../../types/backend'
import { getMyCapabilities } from '../capabilities/capabilities-api'
import { CollaborationPager, collaborationDate, collaborationError } from '../student-collaboration/collaboration-ui'
import * as api from './working-agreement-api'
import { services } from '../../services/service-gateway'
import { WORKING_AGREEMENT_ACTIONS as actions, type AgreementSection, type WorkingAgreement } from './working-agreement-types'
import { WorkingAgreementAiDraftBar } from '../ai-suite/TeamAgreementAiPanels'

const statusLabel = { DRAFT: 'Bản nháp', ACTIVE: 'Đang áp dụng', SUPERSEDED: 'Đã thay thế' }
const blank = (): AgreementSection[] => [{ title: '', body: '' }]
const reasonLabel: Record<string, string> = {
  WORKING_AGREEMENT_ROSTER_CHANGED: 'Nhóm đã thay đổi thành viên. Cần công bố phiên bản mới và xác nhận lại.',
  WORKING_AGREEMENT_POLICY_NOT_LOCKED: 'Chính sách yêu cầu cam kết chưa được khóa.',
  WORKING_AGREEMENT_MISSING: 'Chưa có cam kết được công bố.',
  WORKING_AGREEMENT_INCOMPLETE: 'Chưa đủ xác nhận của các thành viên.',
}

export function ProjectAgreementReadPage() {
  const id = Number(useParams().projectId)
  const [refreshSignal, setRefreshSignal] = useState(0)
  const validId = Number.isSafeInteger(id) && id > 0
  return (
    <WorkspacePage
      title="Cam kết của nhóm"
      eyebrow="Theo dõi đồ án"
      action={
        validId ? (
          <Button
            variant="secondary"
            size="sm"
            icon="refresh"
            aria-label="Làm mới"
            title="Làm mới"
            onClick={() => setRefreshSignal(value => value + 1)}
          />
        ) : undefined
      }
    >
      {validId ? <WorkingAgreementWorkspace key={id} projectId={id} readOnly refreshSignal={refreshSignal} /> : <p>Đường dẫn đồ án không hợp lệ.</p>}
    </WorkspacePage>
  )
}

export function WorkingAgreementWorkspace({ projectId, readOnly = false, refreshSignal = 0 }: { projectId: number; readOnly?: boolean; refreshSignal?: number }) {
  const [latest, setLatest] = useState<WorkingAgreement | null>(null)
  const [active, setActive] = useState<WorkingAgreement | null>(null)
  const [capabilities, setCapabilities] = useState<WorkflowActionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState(false)
  const [teamMembers, setTeamMembers] = useState<Array<{ userId: number; fullName: string }>>([])
  const [sections, setSections] = useState<AgreementSection[]>(blank)
  const [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const mutation = useRef(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    void api.getWorkingAgreement(projectId, abort.signal).then(async row => {
      let grants = row?.actions ?? []
      if (!row && !readOnly) grants = (await getMyCapabilities(projectId, abort.signal)).actions
      const previous = row?.status === 'DRAFT'
        ? (await api.getWorkingAgreementHistory(projectId, 1, 10, abort.signal)).items.find(item => item.status === 'ACTIVE') ?? null
        : row
      if (abort.signal.aborted) return
      setLatest(row); setActive(previous); setCapabilities(grants); setError('')
    }).catch(reason => {
      if (!abort.signal.aborted) { setError(collaborationError(reason)); setCapabilities([]); setLatest(null); setActive(null) }
    }).finally(() => {
      if (!abort.signal.aborted) setLoading(false)
    })
    return () => abort.abort()
  }, [projectId, readOnly, revision, refreshSignal])

  useEffect(() => {
    let alive = true
    void services.project.getProject(projectId)
      .then(project => services.team.getTeam(project.teamId))
      .then(team => {
        if (alive) setTeamMembers(team.members.map(member => ({ userId: member.userId, fullName: member.fullName })))
      })
      .catch(() => { if (alive) setTeamMembers([]) })
    return () => { alive = false }
  }, [projectId])

  const manage = !readOnly && !loading && isActionAllowed(capabilities, actions.manage)
  const publish = !readOnly && latest?.status === 'DRAFT' && isActionAllowed(latest.actions, actions.publish)

  async function mutate(action: () => Promise<WorkingAgreement>, message: string, closeEditor = false) {
    if (mutation.current) return
    mutation.current = true; setBusy(true); setError(''); setNotice('')
    try {
      await action(); setNotice(message); setConflict(false)
      if (closeEditor) setEditing(false)
      setRevision(value => value + 1)
    } catch (reason) {
      setError(collaborationError(reason))
      if (reason instanceof HttpError && reason.status === 409) {
        setConflict(editing)
        setNotice('Cam kết vừa được cập nhật. Đã yêu cầu tải lại bản mới nhất, hãy kiểm tra trước khi tiếp tục.')
        setRevision(value => value + 1)
      }
    } finally {
      mutation.current = false
      setBusy(false)
    }
  }

  const edit = () => {
    const content = latest ? api.parseAgreementSections(latest.contentJson) : []
    setSections(content.length ? content : blank())
    setEditing(true)
    setConflict(false)
  }

  const save = () => {
    if (!manage || conflict) return
    const cleaned = sections.map(section => ({ title: section.title.trim(), body: section.body.trim() }))
    if (!cleaned.length || cleaned.length > 20 || cleaned.some(section => !section.title || !section.body || section.title.length > 200 || section.body.length > 4000)) {
      setError('Cần 1–20 mục, mỗi mục có tiêu đề tối đa 200 và nội dung tối đa 4.000 ký tự.')
      return
    }
    void mutate(
      () => api.saveWorkingAgreement(projectId, {
        expectedLatestVersion: latest?.version ?? 0,
        ...(latest?.status === 'DRAFT' ? { concurrencyToken: latest.concurrencyToken } : {}),
        sections: cleaned,
      }),
      'Đã lưu bản nháp.',
      true,
    )
  }

  async function confirmPublish() {
    if (!latest || !publish || busy || loading) return
    if (await requestConfirmation({ title: `Công bố cam kết v${latest.version}?`, description: 'Nội dung sẽ được khóa. Các thành viên hiện tại cần xác nhận phiên bản này; xác nhận cũ không được chuyển sang.', confirmLabel: 'Công bố cam kết' }) === null) return
    void mutate(() => api.publishWorkingAgreement(projectId, latest.id, latest.concurrencyToken), 'Đã công bố cam kết. Các thành viên có thể xác nhận.')
  }

  const memberNameMap = Object.fromEntries(teamMembers.map(m => [m.userId, m.fullName]))
  const acceptedMap = new Map((latest?.acceptances ?? []).map(item => [item.userId, item.acceptedAt]))
  const memberChecklist = (() => {
    const rows: Array<{ userId: number; name: string; acceptedAt: string | null }> = []
    const seen = new Set<number>()
    for (const m of teamMembers) {
      seen.add(m.userId)
      rows.push({ userId: m.userId, name: m.fullName, acceptedAt: acceptedMap.get(m.userId) ?? null })
    }
    for (const acc of latest?.acceptances ?? []) {
      if (!seen.has(acc.userId)) {
        rows.push({ userId: acc.userId, name: memberNameMap[acc.userId] ?? 'Thành viên nhóm', acceptedAt: acc.acceptedAt })
      }
    }
    return rows
  })()

  return (
    <div className="collab">
      {confirmationDialog}
      {loading && <PageLoading label="Đang tải cam kết nhóm…" />}
      {error && !editing && (
        <div role="alert" className="collab-error">
          {error} <Button variant="ghost" onClick={() => setRevision(value => value + 1)}>Tải lại</Button>
        </div>
      )}
      {notice && !editing && <p role="status" className="collab-note">{notice}</p>}
      {!loading && !error && !latest && (
        <WorkspaceEmptyState
          title="Chưa có bản cam kết làm việc"
          message="Nhóm chưa có bản cam kết làm việc nào."
          action={manage ? <Button icon="edit_note" disabled={busy || conflict} onClick={edit}>Soạn cam kết đầu tiên</Button> : undefined}
        />
      )}

      {!loading && latest && (
        <div className="mb-5">
          <StatTileRow
            tiles={[
              { icon: 'handshake', label: 'Phiên bản hiện tại', value: `v${latest.version}`, hero: true, caption: statusLabel[latest.status] },
              { icon: 'how_to_reg', label: 'Xác nhận thành viên', value: `${latest.acceptances.length}/${latest.memberCount}`, tone: latest.acceptances.length >= latest.memberCount ? 'success' : 'warning', caption: 'Các thành viên đã đồng ý cam kết.' },
              { icon: 'list_alt', label: 'Số điều khoản', value: api.parseAgreementSections(latest.contentJson).length, tone: 'info', caption: 'Quy ước làm việc chung của nhóm.' },
              { icon: 'verified', label: 'Yêu cầu chính sách', value: latest.required ? 'Bắt buộc' : 'Khuyến nghị', tone: 'neutral', caption: latest.required ? 'Cần đủ xác nhận để kích hoạt đồ án.' : 'Hỗ trợ minh bạch phối hợp nhóm.' },
            ]}
          />
        </div>
      )}

      {!loading && latest && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px] items-start">
          <div className="space-y-4 min-w-0">
            <article className="collab-card space-y-4">
              <div className="collab-row border-b border-hairline pb-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="!m-0">Phiên bản {latest.version}</h2>
                  <span className="rounded-full border border-primary/20 bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {statusLabel[latest.status]}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon="history"
                    className="!min-h-9 !py-1.5"
                    aria-expanded={historyOpen}
                    onClick={() => setHistoryOpen(value => !value)}
                  >
                    Lịch sử cam kết
                  </Button>
                  {manage && !editing && (
                    <Button variant="outline" size="sm" icon="edit_note" className="!min-h-9 !py-1.5" disabled={busy || conflict} onClick={edit}>
                      {latest.status === 'DRAFT' ? 'Sửa bản nháp' : 'Tạo phiên bản kế tiếp'}
                    </Button>
                  )}
                  {publish && !editing && (
                    <Button size="sm" className="!min-h-9 !py-1.5" disabled={busy || conflict} icon="publish" onClick={() => void confirmPublish()}>Công bố phiên bản</Button>
                  )}
                </div>
              </div>
              <AgreementContents agreement={latest} />
            </article>

            {active?.status === 'ACTIVE' && latest.id !== active.id && (
              <section className="collab-card space-y-4">
                <div className="collab-row border-b border-hairline pb-3.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="!m-0">Cam kết đang áp dụng · v{active.version}</h2>
                    <span className="rounded-full border border-status-success-border bg-status-success-bg px-2.5 py-0.5 text-xs font-semibold text-status-success-text">
                      Đang áp dụng
                    </span>
                  </div>
                </div>
                <AgreementContents agreement={active} />
              </section>
            )}

            {manage && (
              <WorkingAgreementAiDraftBar
                projectId={projectId}
                disabled={busy || conflict}
                onApplySections={(aiSections) => {
                  setSections(aiSections.length ? aiSections : blank())
                  setEditing(true)
                  setConflict(false)
                }}
              />
            )}

            {historyOpen && <AgreementHistory key={`${projectId}:${revision}:${refreshSignal}`} projectId={projectId} />}
          </div>

          <aside className="collab-card space-y-4 lg:sticky lg:top-20">
            <div className="space-y-2.5">
              <h2 className="!m-0">Xác nhận của thành viên</h2>
              <div className="flex items-baseline gap-1.5">
                <span className="collab-metric">{latest.acceptances.length}</span>
                <span className="text-base font-medium text-ink-muted">/ {latest.memberCount}</span>
              </div>
              <progress className="collab-progress !my-0" value={latest.acceptances.length} max={Math.max(1, latest.memberCount)} aria-label="Tiến độ xác nhận" />
              <p className="collab-muted">Đã xác nhận {latest.acceptances.length}/{latest.memberCount} thành viên.</p>
              <p className="collab-muted">{latest.required ? 'Kỳ này yêu cầu đủ xác nhận trước khi đồ án được kích hoạt.' : 'Cam kết hỗ trợ nhóm phối hợp, theo chính sách của kỳ.'}</p>
            </div>
            <ActionVerdict
              actions={[{ code: 'WORKING_AGREEMENT_READINESS', allowed: (latest.readiness.reasons ?? []).length === 0, reasons: (latest.readiness.reasons ?? []).map(code => reasonLabel[code] ?? 'Chưa đủ điều kiện theo chính sách hiện tại.') }]}
              actionCode="WORKING_AGREEMENT_READINESS"
              status="ready"
              okLabel="Đủ điều kiện cam kết làm việc"
              blockedLabel="Chưa đủ điều kiện cam kết"
            />
            {memberChecklist.length > 0 && (
              <ul className="divide-y divide-hairline border-t border-hairline pt-2">
                {memberChecklist.map(member => (
                  <li key={member.userId} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={member.name} size="sm" shape="circle" />
                      <div className="min-w-0">
                        <strong className="block truncate text-xs text-ink">{member.name}</strong>
                        <span className="block text-xs text-ink-muted">
                          {member.acceptedAt ? collaborationDate(member.acceptedAt) : 'Chưa xác nhận'}
                        </span>
                      </div>
                    </div>
                    {member.acceptedAt ? (
                      <span className="shrink-0 rounded-full border border-status-success-border bg-status-success-bg px-2 py-0.5 text-xs font-semibold text-status-success-text">
                        Đã ký
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-status-warning-border bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning-text">
                        Chờ ký
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {active?.status === 'ACTIVE' && (
              <div className="border-t border-hairline pt-4 space-y-2">
                {latest.id !== active.id && (
                  <p className="text-xs font-medium text-ink-muted">Xác nhận áp dụng cho bản đang hiệu lực (v{active.version})</p>
                )}
                {active.acceptedByMe ? (
                  <p role="status" className="collab-note !py-2.5 !px-3.5 text-xs font-medium">Bạn đã xác nhận bản cam kết này.</p>
                ) : !readOnly && isActionAllowed(active.actions, actions.accept) ? (
                  <Button
                    className="w-full justify-center"
                    icon="done_all"
                    disabled={busy || conflict}
                    onClick={() => void mutate(() => api.acceptWorkingAgreement(projectId, active.id, active.concurrencyToken), 'Đã ghi nhận xác nhận.')}
                  >
                    Tôi đồng ý với cam kết
                  </Button>
                ) : !readOnly ? (
                  <p className="collab-muted text-xs">Hiện chưa thể xác nhận cam kết này. Quyền và danh sách thành viên được kiểm tra theo phiên bản hiện tại.</p>
                ) : null}
              </div>
            )}
          </aside>
        </div>
      )}

      {!loading && !latest && manage && (
        <WorkingAgreementAiDraftBar
          projectId={projectId}
          disabled={busy || conflict}
          onApplySections={(aiSections) => {
            setSections(aiSections.length ? aiSections : blank())
            setEditing(true)
            setConflict(false)
          }}
        />
      )}

      {editing && (
        <Modal open drawer title="Soạn thỏa thuận của nhóm" description="Gợi ý: lịch họp, kênh liên lạc, tiêu chuẩn bàn giao và cách giải quyết bất đồng." busy={busy} onClose={() => setEditing(false)}>
          <div className="space-y-4">
            {error && <div role="alert" className="collab-error">{error}</div>}
            {notice && <p role="status" className="collab-note">{notice}</p>}
            {conflict && (
              <div role="alert" className="collab-note flex flex-wrap items-center justify-between gap-2">
                <span>Bản trên máy chủ đã thay đổi. Nội dung bạn soạn vẫn được giữ bên dưới.</span>
                <Button variant="outline" disabled={loading || !manage} onClick={() => setConflict(false)}>Dùng phiên bản mới làm nền</Button>
              </div>
            )}
            <form className="collab-form space-y-4" onSubmit={event => { event.preventDefault(); save() }}>
              {sections.map((section, index) => (
                <fieldset className="collab-stack collab-section rounded-xl border border-hairline bg-canvas/50 p-4" key={index} disabled={busy || loading || !manage || conflict}>
                  <legend className="text-xs font-bold uppercase tracking-wider text-primary px-1">Mục {index + 1}</legend>
                  <label>Tiêu đề mục {index + 1}<input required maxLength={200} value={section.title} onChange={event => setSections(rows => rows.map((row, i) => i === index ? { ...row, title: event.target.value } : row))} /></label>
                  <label>Nội dung mục {index + 1}<textarea required maxLength={4000} rows={4} value={section.body} onChange={event => setSections(rows => rows.map((row, i) => i === index ? { ...row, body: event.target.value } : row))} /></label>
                  {sections.length > 1 && <div><Button variant="ghost" onClick={() => setSections(rows => rows.filter((_, i) => i !== index))}>Bỏ mục {index + 1}</Button></div>}
                </fieldset>
              ))}
              <div className="collab-actions">
                <Button variant="outline" disabled={busy || conflict || sections.length >= 20} onClick={() => setSections(rows => [...rows, ...blank()])}>Thêm mục</Button>
                <Button type="submit" disabled={busy || loading || conflict || !manage}>{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</Button>
                <Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>Hủy chỉnh sửa</Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  )
}

function AgreementContents({ agreement }: { agreement: WorkingAgreement }) {
  return (
    <div className="divide-y divide-hairline">
      {api.parseAgreementSections(agreement.contentJson).map((section, index) => (
        <section className="py-4 first:pt-1 last:pb-1 space-y-1.5" key={index}>
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary-subtle font-mono text-xs font-bold text-primary">{index + 1}</span>
            <span>{section.title}</span>
          </h3>
          <p className="whitespace-pre-wrap pl-8 text-sm leading-relaxed text-ink-soft">{section.body}</p>
        </section>
      ))}
    </div>
  )
}

function AgreementHistory({ projectId }: { projectId: number }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PagedResult<WorkingAgreement> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const abort = new AbortController()
    setData(null); setError('')
    void api.getWorkingAgreementHistory(projectId, page, 10, abort.signal)
      .then(result => { if (!abort.signal.aborted) setData(result) })
      .catch(reason => { if (!abort.signal.aborted) setError(collaborationError(reason)) })
    return () => abort.abort()
  }, [projectId, page])

  return (
    <section className="collab-card collab-history">
      <h2>Lịch sử phiên bản</h2>
      {error ? <p role="alert">{error}</p> : !data ? <PageLoading /> : (
        <>
          {!data.items.length && <p className="collab-empty">Chưa có phiên bản nào.</p>}
          {data.items.map(row => (
            <details key={row.id}>
              <summary>Phiên bản {row.version} · {statusLabel[row.status]} · {collaborationDate(row.createdAt)}</summary>
              <AgreementContents agreement={row} />
              <p className="collab-muted">{row.acceptances.length}/{row.memberCount} thành viên đã xác nhận.</p>
            </details>
          ))}
          <CollaborationPager page={page} total={data.totalCount} onChange={setPage} />
        </>
      )}
    </section>
  )
}
