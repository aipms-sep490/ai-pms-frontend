import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { Button } from '../../components/ui/Button'
import { PageLoading } from '../../components/ui/PageLoading'
import { useActionConfirmation } from '../../components/ui/useActionConfirmation'
import { HttpError } from '../../services/http/http-client'
import { isActionAllowed, type PagedResult, type WorkflowActionDto } from '../../types/backend'
import { getMyCapabilities } from '../capabilities/capabilities-api'
import { CollaborationIntro, CollaborationPager, collaborationDate, collaborationError } from '../student-collaboration/collaboration-ui'
import * as api from './working-agreement-api'
import { services } from '../../services/service-gateway'
import { WORKING_AGREEMENT_ACTIONS as actions, type AgreementSection, type WorkingAgreement } from './working-agreement-types'

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
  return <WorkspacePage title="Cam kết của nhóm" eyebrow="Theo dõi đồ án">{Number.isSafeInteger(id) && id > 0
    ? <WorkingAgreementWorkspace key={id} projectId={id} readOnly /> : <p>Đường dẫn đồ án không hợp lệ.</p>}</WorkspacePage>
}

export function WorkingAgreementWorkspace({ projectId, readOnly = false }: { projectId: number; readOnly?: boolean }) {
  const [latest, setLatest] = useState<WorkingAgreement | null>(null), [active, setActive] = useState<WorkingAgreement | null>(null)
  const [capabilities, setCapabilities] = useState<WorkflowActionDto[]>([])
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0), [editing, setEditing] = useState(false)
  const [memberNames, setMemberNames] = useState<Record<number, string>>({})
  const [sections, setSections] = useState<AgreementSection[]>(blank), [conflict, setConflict] = useState(false)
  const [busy, setBusy] = useState(false), [historyOpen, setHistoryOpen] = useState(false)
  const mutation = useRef(false)
  const { requestConfirmation, confirmationDialog } = useActionConfirmation()
  useEffect(() => {
    const abort = new AbortController(); setLoading(true)
    void api.getWorkingAgreement(projectId, abort.signal).then(async row => {
      let grants = row?.actions ?? []
      if (!row && !readOnly) grants = (await getMyCapabilities(projectId, abort.signal)).actions
      // A successor draft does not supersede the current agreement until publication.
      const previous = row?.status === 'DRAFT'
        ? (await api.getWorkingAgreementHistory(projectId, 1, 10, abort.signal)).items.find(item => item.status === 'ACTIVE') ?? null : row
      if (abort.signal.aborted) return
      setLatest(row); setActive(previous); setCapabilities(grants); setError('')
    }).catch(reason => { if (!abort.signal.aborted) { setError(collaborationError(reason)); setCapabilities([]); setLatest(null); setActive(null) } })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [projectId, readOnly, revision])
  useEffect(() => {
    let active = true
    void services.project.getProject(projectId).then(project => services.team.getTeam(project.teamId)).then(team => {
      if (active) setMemberNames(Object.fromEntries(team.members.map(member => [member.userId, member.fullName])))
    }).catch(() => { if (active) setMemberNames({}) })
    return () => { active = false }
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
      if (reason instanceof HttpError && reason.status === 409) { setConflict(editing); setNotice('Cam kết vừa được cập nhật. Đã yêu cầu tải lại bản mới nhất, hãy kiểm tra trước khi tiếp tục.'); setRevision(value => value + 1) }
    } finally { mutation.current = false; setBusy(false) }
  }
  const edit = () => { const content = latest ? api.parseAgreementSections(latest.contentJson) : []; setSections(content.length ? content : blank()); setEditing(true); setConflict(false) }
  const save = () => {
    if (!manage || conflict) return
    const cleaned = sections.map(section => ({ title: section.title.trim(), body: section.body.trim() }))
    if (!cleaned.length || cleaned.length > 20 || cleaned.some(section => !section.title || !section.body || section.title.length > 200 || section.body.length > 4000)) {
      setError('Cần 1–20 mục, mỗi mục có tiêu đề tối đa 200 và nội dung tối đa 4.000 ký tự.'); return
    }
    void mutate(() => api.saveWorkingAgreement(projectId, { expectedLatestVersion: latest?.version ?? 0,
      ...(latest?.status === 'DRAFT' ? { concurrencyToken: latest.concurrencyToken } : {}), sections: cleaned }), 'Đã lưu bản nháp.', true)
  }
  async function confirmPublish() {
    if (!latest || !publish || busy || loading) return
    if (await requestConfirmation({ title: `Công bố cam kết v${latest.version}?`, description: 'Nội dung sẽ được khóa. Các thành viên hiện tại cần xác nhận phiên bản này; xác nhận cũ không được chuyển sang.', confirmLabel: 'Công bố cam kết' }) === null) return
    void mutate(() => api.publishWorkingAgreement(projectId, latest.id, latest.concurrencyToken), 'Đã công bố cam kết. Các thành viên có thể xác nhận.')
  }
  return <div className="collab">{confirmationDialog}
    <CollaborationIntro icon="handshake" title="Thống nhất cách làm việc">Khi thay đổi nguyên tắc hoặc thành viên, nhóm cùng xác nhận một phiên bản mới. Nội dung đã công bố được giữ nguyên.</CollaborationIntro>
    {loading && <PageLoading label="Đang tải cam kết nhóm…" />}
    {error && <div role="alert" className="collab-error">{error} <Button variant="ghost" onClick={() => setRevision(value => value + 1)}>Tải lại</Button></div>}
    {notice && <p role="status" className="collab-note">{notice}</p>}
    {conflict && <div role="alert" className="collab-note">Bản trên máy chủ đã thay đổi. Nội dung bạn soạn vẫn được giữ bên dưới. Hãy đối chiếu rồi <Button variant="outline" disabled={loading || !manage} onClick={() => setConflict(false)}>Dùng phiên bản mới làm nền</Button></div>}
    {!loading && !error && !latest && <p className="collab-empty">Nhóm chưa có bản cam kết làm việc nào.</p>}
    {!loading && latest && <div className="collab-grid"><article className="collab-card">
      <div className="collab-row"><h2>Phiên bản {latest.version}</h2><span className="collab-muted">{statusLabel[latest.status]}</span></div>
      <AgreementContents agreement={latest} />
      {publish && !editing && <div className="collab-actions"><Button disabled={busy || conflict} icon="publish" onClick={() => void confirmPublish()}>Công bố phiên bản</Button></div>}
    </article><aside className="collab-card collab-stack"><h2>Xác nhận của thành viên</h2>
      <span className="collab-metric">{latest.acceptances.length}<span className="collab-muted"> / {latest.memberCount}</span></span>
      <progress className="collab-progress" value={latest.acceptances.length} max={Math.max(1, latest.memberCount)} aria-label="Tiến độ xác nhận" />
      <p className="collab-muted">Đã xác nhận {latest.acceptances.length}/{latest.memberCount} thành viên.</p>
      <p className="collab-muted">{latest.required ? 'Kỳ này yêu cầu đủ xác nhận trước khi đồ án được kích hoạt.' : 'Cam kết hỗ trợ nhóm phối hợp, theo chính sách của kỳ.'}</p>
      {(latest.readiness.reasons ?? []).map(code => <p className="collab-note" key={code}>{reasonLabel[code] ?? 'Chưa đủ điều kiện theo chính sách hiện tại.'}</p>)}
      {latest.acceptances.map(item => <div key={item.userId}><strong>{memberNames[item.userId] ?? 'Thành viên chưa tải được tên'}</strong><p className="collab-muted">{collaborationDate(item.acceptedAt)}</p></div>)}
    </aside></div>}
    {!loading && active?.status === 'ACTIVE' && <section className="collab-card">
      {latest?.id !== active.id && <><h2>Cam kết đang áp dụng · v{active.version}</h2><AgreementContents agreement={active} /></>}
      {active.acceptedByMe ? <p role="status" className="collab-note">Bạn đã xác nhận bản cam kết này.</p>
        : !readOnly && isActionAllowed(active.actions, actions.accept) ? <Button icon="done_all" disabled={busy || conflict} onClick={() => void mutate(() => api.acceptWorkingAgreement(projectId, active.id, active.concurrencyToken), 'Đã ghi nhận xác nhận.')}>Tôi đồng ý với cam kết</Button>
        : <p className="collab-muted">Hiện chưa thể xác nhận cam kết này. Quyền và danh sách thành viên được kiểm tra theo phiên bản hiện tại.</p>}
    </section>}
    {manage && !editing && <div><Button variant="outline" icon="edit_note" disabled={busy || conflict} onClick={edit}>{!latest ? 'Soạn cam kết đầu tiên' : latest.status === 'DRAFT' ? 'Sửa bản nháp' : 'Tạo phiên bản kế tiếp'}</Button></div>}
    {editing && <form className="collab-card collab-form" onSubmit={event => { event.preventDefault(); save() }}><h2>Soạn thỏa thuận của nhóm</h2><p className="collab-muted">Gợi ý: lịch họp, kênh liên lạc, tiêu chuẩn bàn giao và cách giải quyết bất đồng.</p>
      {sections.map((section, index) => <fieldset className="collab-stack collab-section" key={index} disabled={busy || loading || !manage || conflict}><legend className="collab-section-number">MỤC {String(index + 1).padStart(2, '0')}</legend>
        <label>Tiêu đề mục {index + 1}<input required maxLength={200} value={section.title} onChange={event => setSections(rows => rows.map((row, i) => i === index ? { ...row, title: event.target.value } : row))} /></label>
        <label>Nội dung mục {index + 1}<textarea required maxLength={4000} rows={4} value={section.body} onChange={event => setSections(rows => rows.map((row, i) => i === index ? { ...row, body: event.target.value } : row))} /></label>
        {sections.length > 1 && <div><Button variant="ghost" onClick={() => setSections(rows => rows.filter((_, i) => i !== index))}>Bỏ mục {index + 1}</Button></div>}
      </fieldset>)}
      <div className="collab-actions"><Button variant="outline" disabled={busy || conflict || sections.length >= 20} onClick={() => setSections(rows => [...rows, ...blank()])}>Thêm mục</Button><Button type="submit" disabled={busy || loading || conflict || !manage}>{busy ? 'Đang lưu…' : 'Lưu bản nháp'}</Button><Button variant="ghost" disabled={busy} onClick={() => setEditing(false)}>Hủy chỉnh sửa</Button></div>
    </form>}
    <div><Button variant="ghost" icon="history" aria-expanded={historyOpen} onClick={() => setHistoryOpen(value => !value)}>Lịch sử cam kết</Button></div>
    {historyOpen && <AgreementHistory key={`${projectId}:${revision}`} projectId={projectId} />}
  </div>
}

function AgreementContents({ agreement }: { agreement: WorkingAgreement }) {
  return <div className="collab-stack">{api.parseAgreementSections(agreement.contentJson).map((section, index) => <section className="collab-section" key={index}><p className="collab-section-number">{String(index + 1).padStart(2, '0')}</p><h3>{section.title}</h3><p className="whitespace-pre-wrap">{section.body}</p></section>)}</div>
}

function AgreementHistory({ projectId }: { projectId: number }) {
  const [page, setPage] = useState(1), [data, setData] = useState<PagedResult<WorkingAgreement> | null>(null), [error, setError] = useState('')
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError('')
    void api.getWorkingAgreementHistory(projectId, page, 10, abort.signal).then(result => { if (!abort.signal.aborted) setData(result) }).catch(reason => { if (!abort.signal.aborted) setError(collaborationError(reason)) })
    return () => abort.abort()
  }, [projectId, page])
  return <section className="collab-card collab-history"><h2>Lịch sử phiên bản</h2>{error ? <p role="alert">{error}</p> : !data ? <PageLoading /> : <>
    {!data.items.length && <p className="collab-empty">Chưa có phiên bản nào.</p>}
    {data.items.map(row => <details key={row.id}><summary>Phiên bản {row.version} · {statusLabel[row.status]} · {collaborationDate(row.createdAt)}</summary><AgreementContents agreement={row} /><p className="collab-muted">{row.acceptances.length}/{row.memberCount} thành viên đã xác nhận.</p></details>)}
    <CollaborationPager page={page} total={data.totalCount} onChange={setPage} /></>}</section>
}
