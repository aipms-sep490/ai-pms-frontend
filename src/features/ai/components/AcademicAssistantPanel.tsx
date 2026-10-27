import { useEffect, useRef, useState, type FormEvent } from 'react'
import { askAcademicAssistant, askAcademicAssistantWithFiles, downloadAssistantAnswer, createAssistantConversation, listAssistantConversations, getAssistantConversation, deleteAssistantConversation, getAssistantCitation, streamAssistant, type AssistantConversation, type AssistantDraft, type KnowledgeCitation, type AcademicAssistantResponse } from '../academic-ai-api'
import { AssistantDraftCard } from './AssistantDraftCard'
import { AssistantAnswerText } from './AssistantAnswerText'
import type { EvidenceReference } from '../ai-api'
import { HttpError } from '../../../services/http/http-client'
import { Modal } from '../../../components/ui/Modal'
import { listAssistantRubrics, type AssistantToolMode, type AssistantExportFormat, type AssistantRubricOption } from '../academic-ai-api'

const quickQuestions = ['Tôi cần làm gì ở giai đoạn hiện tại?', 'Hạn nộp và biểu mẫu cần dùng là gì?', 'Rubric của ngành tôi gồm những tiêu chí nào?', 'Điều kiện để công bố điểm là gì?']
const quickCards = [
  { icon: 'explore', title: 'Bước tiếp theo', detail: 'Định hướng công việc cần làm' },
  { icon: 'event_note', title: 'Hạn nộp & biểu mẫu', detail: 'Chuẩn bị đúng và đủ' },
  { icon: 'fact_check', title: 'Tiêu chí đánh giá', detail: 'Hiểu cách đồ án được chấm' },
  { icon: 'school', title: 'Công bố kết quả', detail: 'Kiểm tra các điều kiện' },
]
const acceptedFiles = '.png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.md,.csv,.json'

function ImagePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const next = URL.createObjectURL(file); setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url ? <img src={url} alt={`Xem trước ${file.name}`} className="h-14 w-14 shrink-0 rounded-md object-cover" /> : null
}

type ChatTurn = { id: number; query: string; fileNames: string[]; response?: AcademicAssistantResponse; error?: string; preview?: string }

export function AcademicAssistantPanel({ projectId, dock = false, pageContext = '', onUseDraft, onOpenEvidence }: { projectId?: number; dock?: boolean; pageContext?: string; onUseDraft?: (draft: AssistantDraft) => void; onOpenEvidence?: (evidence: EvidenceReference) => void }) {
  const [conversation, setConversation] = useState<AssistantConversation | null>(null)
  const [conversations, setConversations] = useState<AssistantConversation[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyBusy, setHistoryBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AssistantConversation | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const cancelDelete = useRef<HTMLButtonElement>(null)
  const [moreHistory, setMoreHistory] = useState(false)
  const [moreTurns, setMoreTurns] = useState(false)
  const [source, setSource] = useState<KnowledgeCitation | null>(null)
  const [draftKind, setDraftKind] = useState<AssistantDraft['kind'] | undefined>()
  const [toolMode, setToolMode] = useState<AssistantToolMode | undefined>()
  const [rubrics, setRubrics] = useState<AssistantRubricOption[]>([])
  const [rubricId, setRubricId] = useState<number | undefined>()
  const [rubricLoading, setRubricLoading] = useState(false)
  const [rubricError, setRubricError] = useState(false)
  const [rubricRetry, setRubricRetry] = useState(0)
  const historyRequest = useRef<AbortController | null>(null)
  const sourceRequest = useRef<AbortController | null>(null)
  const sending = useRef(false)
  const [query, setQuery] = useState('')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const sequence = useRef(0)
  const history = useRef<HTMLDivElement>(null)
  const [answer, setAnswer] = useState<AcademicAssistantResponse | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const download = useRef<AbortController | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    setRubricId(undefined); setRubrics([]); setRubricError(false); setRubricLoading(false)
    if (toolMode !== 'REPORT_REVIEW' || !projectId) return
    const controller = new AbortController()
    setRubricLoading(true)
    listAssistantRubrics(projectId, controller.signal).then(items => {
      if (!controller.signal.aborted) setRubrics(items)
    }).catch(() => { if (!controller.signal.aborted) setRubricError(true) })
      .finally(() => { if (!controller.signal.aborted) setRubricLoading(false) })
    return () => controller.abort()
  }, [projectId, toolMode, rubricRetry])
  useEffect(() => { history.current?.scrollTo?.({ top: history.current.scrollHeight, behavior: 'smooth' }) }, [turns])
  useEffect(() => {
    request.current?.abort(); download.current?.abort(); historyRequest.current?.abort(); sourceRequest.current?.abort()
    sending.current = false; setConversation(null); setConversations([]); setShowHistory(false); setSource(null)
    setPendingDelete(null); setDeleteError(null); setHistoryBusy(false)
    setToolMode(undefined); setDraftKind(undefined)
    setAnswer(null); setTurns([]); setQuery(''); setError(null); setFiles([]); setBusy(false); setDownloading(false)
    return () => { request.current?.abort(); download.current?.abort(); historyRequest.current?.abort(); sourceRequest.current?.abort() }
  }, [projectId])

  const loadHistory = async (more = false) => {
    historyRequest.current?.abort()
    const controller = new AbortController(); historyRequest.current = controller
    setHistoryBusy(true); setShowHistory(true); setError(null)
    try {
      const items = await listAssistantConversations(projectId, more ? conversations.at(-1)?.id : undefined, controller.signal)
      if (!controller.signal.aborted) { setConversations(current => more ? [...current, ...items] : items); setMoreHistory(items.length === 20) }
    } catch { if (!controller.signal.aborted) setError('Chưa tải được lịch sử hội thoại.') }
    finally { if (!controller.signal.aborted) setHistoryBusy(false) }
  }
  const openConversation = async (id: number, older = false) => {
    if (sending.current) return
    historyRequest.current?.abort(); sourceRequest.current?.abort()
    const controller = new AbortController(); historyRequest.current = controller
    setHistoryBusy(true); setError(null); setSource(null)
    try {
      const detail = await getAssistantConversation(id, older ? turns[0]?.id : undefined, controller.signal)
      if (!controller.signal.aborted) {
        setConversation(detail.conversation); setMoreTurns(detail.hasMore)
        const loaded = detail.turns.map(turn => ({ ...turn, fileNames: turn.response.attachments?.map(file => file.fileName) ?? [] }))
        setTurns(current => older ? [...loaded, ...current] : loaded); setShowHistory(false); setFiles([])
      }
    } catch { if (!controller.signal.aborted) setError('Không mở được hội thoại. Có thể quyền truy cập đã thay đổi.') }
    finally { if (!controller.signal.aborted) setHistoryBusy(false) }
  }
  const removeConversation = async (id: number) => {
    if (historyBusy) return
    const controller = new AbortController(); historyRequest.current?.abort(); historyRequest.current = controller
    setHistoryBusy(true); setDeleteError(null); setError(null)
    try {
      await deleteAssistantConversation(id, controller.signal)
      if (!controller.signal.aborted) { setPendingDelete(null); setConversations(items => items.filter(item => item.id !== id)); if (conversation?.id === id) { setConversation(null); setTurns([]) } }
    } catch { if (!controller.signal.aborted) setDeleteError('Chưa xóa được hội thoại. Bạn có thể thử lại.') }
    finally { if (!controller.signal.aborted) setHistoryBusy(false) }
  }
  const openSource = async (runId: number, index: number) => {
    sourceRequest.current?.abort(); const controller = new AbortController(); sourceRequest.current = controller
    setError(null)
    try { const citation = await getAssistantCitation(runId, index, controller.signal); if (!controller.signal.aborted) setSource(citation) }
    catch { if (!controller.signal.aborted) setError('Không mở được nguồn. Kiểm tra lại quyền truy cập.') }
  }

  const chooseFiles = (incoming: File[]) => {
    const next = [...files, ...incoming]
    if (next.length > 4 || next.some(file => file.size === 0 || file.size > 4 * 1024 * 1024) || next.reduce((sum, file) => sum + file.size, 0) > 8 * 1024 * 1024) {
      setError('Chọn tối đa 4 tệp, mỗi tệp từ 1 byte đến 4 MB, tổng không quá 8 MB.'); return
    }
    if (next.some(file => !acceptedFiles.split(',').some(extension => file.name.toLowerCase().endsWith(extension)))) {
      setError('Định dạng chưa được hỗ trợ. Chọn PNG/JPG/WebP, PDF, DOCX, TXT, MD, CSV hoặc JSON.'); return
    }
    setFiles(next); setError(null)
  }

  const ask = async (event?: FormEvent, explicitQuery?: string) => {
    event?.preventDefault()
    const value = (explicitQuery ?? query).trim()
    if (!value || sending.current || historyBusy) return
    if (toolMode === 'REPORT_REVIEW' && (!rubricId || !files.length)) { setError('Chọn bộ tiêu chí và đính kèm báo cáo trước khi gửi.'); return }
    if (toolMode === 'PROGRESS' && files.length) { setError('Bỏ tệp đính kèm để xem tiến độ từ dữ liệu hệ thống.'); return }
    sending.current = true
    request.current?.abort(); download.current?.abort()
    const controller = new AbortController(); request.current = controller
    const turnId = --sequence.current
    if (dock) setTurns(current => [...current, { id: turnId, query: value, fileNames: files.map(file => file.name) }])
    setQuery(dock ? '' : value); setBusy(true); setError(null); setAnswer(null); setDownloading(false)
    try {
      let active = conversation
      if (dock && !active) {
        active = await createAssistantConversation(projectId, controller.signal)
        if (controller.signal.aborted) return
        setConversation(active)
      }
      const result = dock && active
        ? await streamAssistant(value, files, active, pageContext, draftKind, text => {
          if (!controller.signal.aborted) setTurns(current => current.map(turn => turn.id === turnId ? { ...turn, preview: text } : turn))
        }, controller.signal, ...(toolMode ? [{ mode: toolMode, rubricId: toolMode === 'REPORT_REVIEW' ? rubricId : undefined }] : []))
        : files.length
        ? await askAcademicAssistantWithFiles(value, files, projectId, controller.signal)
        : await askAcademicAssistant(value, projectId, controller.signal)
      if (!controller.signal.aborted) {
        setAnswer(result)
        if (active) setConversation({ ...active, revision: result.revision ?? active.revision, title: active.revision === 0 ? value.slice(0, 120) : active.title })
        if (dock) { setTurns(current => current.map(turn => turn.id === turnId ? { ...turn, response: result } : turn)); setFiles([]) }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message = err instanceof HttpError && [400, 409, 413].includes(err.status) ? err.message : 'Chưa nhận được phản hồi đầy đủ. Mở lại lịch sử để kiểm tra trước khi gửi lại.'
        setError(message)
        if (dock) { setTurns(current => current.map(turn => turn.id === turnId ? { ...turn, error: message } : turn)); setQuery(value) }
      }
    } finally { if (!controller.signal.aborted) { setBusy(false); sending.current = false } }
  }

  const stop = () => {
    request.current?.abort(); sending.current = false; setBusy(false)
    setTurns(current => current.map(turn => !turn.response && !turn.error ? { ...turn, preview: undefined, error: 'Đã dừng. Mở lại lịch sử nếu câu trả lời vừa kịp lưu.' } : turn))
  }

  const saveAnswer = async (format: AssistantExportFormat, selectedAnswer: AcademicAssistantResponse) => {
    if (!selectedAnswer.runId || downloading) return
    const id = selectedAnswer.runId
    const controller = new AbortController(); download.current = controller
    setDownloading(true); setError(null)
    try {
      const blob = await downloadAssistantAnswer(id, format, controller.signal)
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `tro-ly-ai.${format}`
      document.body.append(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      if (!controller.signal.aborted) setError('Không tải được câu trả lời. Kiểm tra quyền truy cập và thử lại.')
    } finally { if (!controller.signal.aborted) setDownloading(false) }
  }

  const renderAnswer = (answer: AcademicAssistantResponse) => (<div className="assistant-answer mt-5 rounded-lg border border-primary-subtle bg-primary-subtle p-4">
      <p className="assistant-answer-label mb-2 text-xs font-semibold text-primary"><span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>{answer.generationStatus === 'FALLBACK' ? (answer.citations.length || answer.projectEvidence.length ? 'Trích đoạn nguồn · fallback' : 'AI tạm thời không khả dụng') : answer.insufficientEvidence ? 'Chưa đủ thông tin xác nhận' : answer.answerType === 'GENERAL' ? 'Hỏi đáp chung' : answer.answerType === 'ATTACHMENT' ? 'Dựa trên tệp bạn gửi' : 'Câu trả lời có nguồn'}</p>
      <AssistantAnswerText text={answer.answer} />
      {answer.insufficientEvidence && <p className="mt-3 text-sm text-status-warning-text">Chưa đủ căn cứ chính thức để kết luận.</p>}
      {answer.limitationNote && <p className="mt-3 text-xs text-ink-muted">{answer.limitationNote}</p>}
      {!!answer.attachments?.length && <p className="mt-3 break-words text-xs text-ink-muted">Tệp tham chiếu: {answer.attachments.map(file => file.fileName).join(', ')}</p>}
      {answer.draft && <AssistantDraftCard draft={answer.draft} onUse={onUseDraft} />}
      {!!answer.runId && <details className="assistant-export"><summary><span className="material-symbols-outlined" aria-hidden="true">download</span>{downloading ? 'Đang chuẩn bị tệp…' : 'Tải câu trả lời'}</summary><div className="assistant-export-options">{([['docx', 'Word'], ['xlsx', 'Excel'], ['pdf', 'PDF'], ['txt', 'TXT'], ['md', 'Markdown']] as const).map(([format, label]) => <button key={format} type="button" disabled={downloading} onClick={() => void saveAnswer(format, answer)}>Tải {label}</button>)}</div></details>}
      {answer.citations.length > 0 && <details className="assistant-citations" open={!dock}><summary>Tài liệu tham chiếu ({answer.citations.length})</summary><ul className="mt-2 space-y-2">{answer.citations.map((item, index) => <li key={`${item.versionId}-${index}`} className="rounded-lg border border-hairline bg-card p-3"><p className="text-sm font-semibold text-ink">{answer.runId ? <button type="button" className="underline underline-offset-4" onClick={() => void openSource(answer.runId!, index)}>{item.title} · v{item.version}</button> : <>{item.title} · v{item.version}</>}</p><p className="mt-1 text-xs text-ink-muted">{item.documentType}{item.section ? ` · ${item.section}` : ''}{item.page ? ` · trang ${item.page}` : ''}</p><p className="mt-2 text-sm leading-6 text-ink-soft">{item.excerpt}</p></li>)}</ul></details>}
      {answer.projectEvidence.length > 0 && <><h3 className="mt-4 text-sm font-semibold text-ink">Dữ liệu project</h3><ul className="mt-2 space-y-2">{answer.projectEvidence.map((item, index) => <li key={index} className="rounded-lg border border-hairline bg-card p-3 text-sm"><p className="font-semibold">{onOpenEvidence && /^\/api\/v1\/(tasks|milestones|meetings|progress-reports)\/\d+$/.test(item.referenceUrl ?? '') ? <button type="button" className="underline underline-offset-4" onClick={() => onOpenEvidence(item)}>{item.title}</button> : item.title}</p><p className="mt-1 text-ink-soft">{item.excerpt}</p></li>)}</ul></>}
    </div>)

  return <section className={dock ? 'assistant-conversation' : 'relative rounded-xl border border-hairline bg-card p-5 shadow-xs'} aria-label="Trợ lý AI học vụ">
    {pendingDelete && <div onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation() }}>
      <Modal open title="Xóa hội thoại?" description="Hội thoại sẽ được xóa khỏi lịch sử của bạn." busy={historyBusy} initialFocusRef={cancelDelete} onClose={() => setPendingDelete(null)}>
        <p className="break-words rounded-xl border border-hairline bg-primary-subtle p-4 text-sm font-semibold text-ink">{pendingDelete.title}</p>
        {deleteError && <p role="alert" className="mt-3 text-sm text-status-error-text">{deleteError}</p>}
        <div className="app-modal__actions">
          <button ref={cancelDelete} type="button" className="app-modal__button" disabled={historyBusy} onClick={() => setPendingDelete(null)}>Hủy</button>
          <button type="button" className="app-modal__button app-modal__button--danger" disabled={historyBusy} onClick={() => void removeConversation(pendingDelete.id)}>{historyBusy ? 'Đang xóa…' : 'Xóa hội thoại'}</button>
        </div>
      </Modal>
    </div>}
    {dock && <div className="assistant-toolbar"><button type="button" disabled={busy || historyBusy} onClick={() => showHistory ? setShowHistory(false) : void loadHistory()}><span className="material-symbols-outlined" aria-hidden="true">{showHistory ? 'arrow_back' : 'history'}</span>{showHistory ? 'Trở lại chat' : 'Lịch sử hội thoại'}</button><span className="assistant-context"><span className="material-symbols-outlined" aria-hidden="true">{projectId ? 'folder_open' : 'chat_bubble_outline'}</span>{pageContext || 'Hỏi đáp chung'}</span></div>}
    {showHistory && <div className="assistant-saved-history" aria-label="Lịch sử đã lưu">
      {historyBusy && <p role="status">Đang tải…</p>}
      {!historyBusy && conversations.length === 0 && <div className="assistant-history-empty"><span className="material-symbols-outlined" aria-hidden="true">forum</span><strong>Câu chuyện bắt đầu từ đây</strong><p>Chưa có hội thoại trong phạm vi này.</p></div>}
      {conversations.map(item => <div key={item.id}><button type="button" disabled={historyBusy} onClick={() => void openConversation(item.id)}><strong>{item.title}</strong><small>{new Date(item.updatedAt).toLocaleString('vi-VN')}</small></button><button type="button" disabled={historyBusy} aria-label={`Xóa hội thoại ${item.title}`} onClick={() => { setDeleteError(null); setPendingDelete(item) }}>Xóa</button></div>)}
      {moreHistory && <button type="button" disabled={historyBusy} onClick={() => void loadHistory(true)}>Xem thêm hội thoại</button>}
    </div>}
    {source && <aside className="assistant-source" aria-label="Nguồn trích dẫn" role="dialog" aria-modal="true">
      <div className="assistant-source-header">
        <div>
          <span className="assistant-source-kicker"><span className="material-symbols-outlined" aria-hidden="true">verified</span>Nguồn đã lưu</span>
          <h3>{source.title}</h3>
        </div>
        <button type="button" aria-label="Đóng nguồn" onClick={() => setSource(null)}><span className="material-symbols-outlined" aria-hidden="true">close</span>Đóng</button>
      </div>
      <div className="assistant-source-meta"><span>{source.documentType || 'Tài liệu học vụ'}</span><span>Phiên bản {source.version}</span>{source.section && <span>{source.section}</span>}{source.page ? <span>Trang {source.page}</span> : null}</div>
      <div className="assistant-source-body"><p className="whitespace-pre-wrap">{source.excerpt}</p></div>
      <p className="assistant-source-note"><span className="material-symbols-outlined" aria-hidden="true">info</span>Trích đoạn được lưu tại thời điểm trả lời; đây không phải toàn bộ tệp gốc.</p>
    </aside>}
    {!showHistory && !toolMode && (!dock || turns.length === 0) && <div className={dock ? 'assistant-welcome' : undefined}>
    <div>
      {dock && <div className="assistant-welcome-mark" aria-hidden="true"><span className="material-symbols-outlined">auto_awesome</span></div>}
      <p className="assistant-eyebrow font-mono text-xs font-semibold uppercase tracking-wide text-primary">Một chút gợi ý, thêm tự tin</p>
      <h2 className="mt-1 font-heading text-lg font-semibold text-ink">Bạn muốn hỏi gì hôm nay?</h2>
      <p className="mt-1 text-sm leading-6 text-ink-muted">Cùng gỡ rối đồ án, tìm hiểu học vụ hoặc phân tích ảnh và tài liệu bạn gửi.</p>
    </div>
    <div className={dock ? 'assistant-quick-grid' : 'mt-3 flex flex-wrap gap-2'}>{quickQuestions.map((item, index) => <button key={item} type="button" aria-label={item} disabled={busy} className="assistant-quick-card rounded-full border border-hairline px-3 py-2 text-xs text-ink-soft hover:border-primary hover:text-primary disabled:opacity-50" onClick={() => void ask(undefined, item)}>{dock ? <><span className="material-symbols-outlined" aria-hidden="true">{quickCards[index].icon}</span><strong>{quickCards[index].title}</strong><small>{quickCards[index].detail}</small></> : item}</button>)}</div>
    </div>}
    {dock && !showHistory && <div ref={history} className="assistant-history" role="log" aria-label="Cuộc trò chuyện với trợ lý" aria-live="polite">{toolMode && turns.length === 0 && <div className="assistant-tool-intro"><span className="material-symbols-outlined" aria-hidden="true">{toolMode === 'PROGRESS' ? 'event_note' : toolMode === 'REPORT_REVIEW' ? 'fact_check' : 'description'}</span><h3>{toolMode === 'PROGRESS' ? 'Nắm rõ bước tiếp theo' : toolMode === 'REPORT_REVIEW' ? 'Hoàn thiện báo cáo của bạn' : 'Từ ý tưởng đến bản nháp'}</h3><p>{toolMode === 'PROGRESS' ? 'Xem các công việc và mốc tiến độ cần chú ý trong đồ án.' : toolMode === 'REPORT_REVIEW' ? 'Đối chiếu nội dung với bộ tiêu chí đã công bố, kèm góp ý và nguồn tham chiếu.' : 'Bổ sung nội dung thực tế vào câu hỏi. Trợ lý giúp sắp xếp thành tài liệu để bạn chỉnh sửa và tải về.'}</p></div>}{moreTurns && conversation && <button type="button" disabled={busy || historyBusy} onClick={() => void openConversation(conversation.id, true)}>Xem tin nhắn trước</button>}{turns.map(turn => <div key={turn.id} className="assistant-turn">
      <div className="assistant-user-bubble"><p>{turn.query}</p>{turn.fileNames.map((name, index) => <small key={index}>{name}</small>)}</div>
      {turn.response ? renderAnswer(turn.response) : turn.error ? <p className="assistant-turn-error">{turn.error}</p> : <div className="assistant-thinking" role="status"><small>Đang viết · nội dung tạm, chưa xác minh nguồn</small><p className="whitespace-pre-wrap">{turn.preview || 'Trợ lý đang trả lời…'}</p></div>}
    </div>)}</div>}
    <form hidden={showHistory} className={dock ? 'assistant-composer' : 'mt-4 flex flex-col gap-3'} onSubmit={event => void ask(event)}>
      {toolMode && <div className="assistant-tool-help">
        <p>{toolMode === 'PROGRESS' ? 'Tổng hợp dữ liệu đồ án hiện tại, nêu rõ phạm vi đã truy hồi. Không cần đính kèm tệp.' : toolMode === 'REPORT_REVIEW' ? 'Chọn rubric và gửi báo cáo. Góp ý có dẫn nguồn, không phải điểm chấm chính thức.' : 'Soạn bản nháp để bạn kiểm tra, sau đó tải Word, Excel hoặc PDF từ câu trả lời.'}</p>
        {toolMode === 'REPORT_REVIEW' && <>
          <select aria-label="Bộ tiêu chí nhận xét" value={rubricId ?? ''} disabled={busy || rubricLoading} onChange={event => setRubricId(event.target.value ? Number(event.target.value) : undefined)}>
            <option value="">{rubricLoading ? 'Đang tải tiêu chí…' : 'Chọn bộ tiêu chí'}</option>
            {rubrics.map(item => <option key={item.id} value={item.id}>{item.title} · v{item.version}{item.assignedToProject ? ' · Đã gắn đồ án' : ' · Tham khảo'}</option>)}
          </select>
          {rubricError ? <p role="alert">Chưa tải được tiêu chí. <button type="button" onClick={() => setRubricRetry(value => value + 1)}>Thử lại</button></p> : !rubricLoading && !rubrics.length && <p>Chưa có rubric đã công bố thuộc khoa và kỳ của bạn. Liên hệ Khoa để bổ sung.</p>}
        </>}
      </div>}
      <textarea aria-label="Câu hỏi học vụ" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (dock && event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask() } }} onPaste={event => { if (!busy && event.clipboardData.files.length) { event.preventDefault(); chooseFiles(Array.from(event.clipboardData.files)) } }} rows={dock ? 2 : 3} maxLength={2000} className="rounded-lg border border-hairline bg-card p-3 text-sm text-ink" placeholder="Hỏi bất cứ điều gì bạn đang băn khoăn…" />
      <input ref={fileInput} type="file" multiple accept={acceptedFiles} aria-label="Đính kèm ảnh hoặc tài liệu" className="sr-only" disabled={busy} onChange={event => { chooseFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
      {files.length > 0 && <ul aria-label="Tệp đã chọn" className="space-y-2">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-hairline bg-card p-3 text-sm">
        {/\.(png|jpe?g|webp)$/i.test(file.name) && <ImagePreview file={file} />}
        <span className="min-w-0 flex-1 break-all">{file.name} <span className="text-ink-muted">({Math.ceil(file.size / 1024)} KB)</span></span>
        <button type="button" disabled={busy} aria-label={`Bỏ ${file.name}`} className="shrink-0 text-primary" onClick={() => setFiles(current => current.filter((_, i) => i !== index))}>Bỏ</button>
      </li>)}</ul>}
      <div className="assistant-composer-actions flex flex-wrap items-center gap-3">
        <button type="button" aria-label="+ Ảnh / tài liệu" title="Đính kèm ảnh hoặc tài liệu" disabled={busy || files.length >= 4} className="assistant-attach" onClick={() => fileInput.current?.click()}><span className="material-symbols-outlined" aria-hidden="true">attach_file</span>{!dock && 'Ảnh / tài liệu'}</button>
        {dock && <label className="assistant-mode"><select aria-label="Chế độ trợ lý" disabled={busy} value={toolMode ?? draftKind ?? ''} onChange={event => {
          const value = event.target.value
          setError(null)
          setDraftKind(value === 'TASK' || value === 'MEETING' ? value : undefined)
          setToolMode(value && value !== 'TASK' && value !== 'MEETING' ? value as AssistantToolMode : undefined)
          const prompts: Record<string, string> = { PROGRESS: 'Tóm tắt tiến độ, công việc quá hạn và các mốc cần chú ý của đồ án.', REPORT_REVIEW: 'Nhận xét báo cáo đính kèm theo bộ tiêu chí đã chọn: điểm tốt, minh chứng còn thiếu và cách cải thiện.', WEEKLY_REPORT: 'Soạn báo cáo tuần gồm việc đã làm, đang làm, vướng mắc và kế hoạch tuần tới. Nội dung tuần này: ', MEETING_MINUTES: 'Soạn biên bản họp từ ghi chú sau, gồm nội dung, quyết định và việc cần làm: ', WORK_PLAN: 'Lập kế hoạch công việc và sản phẩm bàn giao cho mục tiêu sau: ' }
          if (prompts[value]) setQuery(prompts[value])
        }}><option value="">Hỏi đáp</option><option value="PROGRESS" disabled={!projectId}>Tiến độ & deadline</option><option value="REPORT_REVIEW" disabled={!projectId}>Nhận xét báo cáo</option><option value="WEEKLY_REPORT">Soạn báo cáo tuần</option><option value="MEETING_MINUTES">Soạn biên bản họp</option><option value="WORK_PLAN">Soạn kế hoạch</option><option value="TASK">Soạn công việc</option><option value="MEETING">Soạn lịch họp</option></select></label>}
        {busy ? <button type="button" className="assistant-send" aria-label="Dừng trả lời" title="Dừng trả lời" onClick={stop}><span className="material-symbols-outlined" aria-hidden="true">stop</span></button> : <button type="submit" aria-label={dock ? 'Gửi' : 'Hỏi trợ lý học vụ'} title="Gửi tin nhắn" disabled={!query.trim()} className="assistant-send"><span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span>{!dock && 'Hỏi trợ lý học vụ'}</button>}
      </div>
      <p className="assistant-advisory">AI chỉ tư vấn · Kiểm tra nguồn trước khi sử dụng</p>
      <details className="assistant-file-help"><summary className="text-xs text-ink-muted">Định dạng tệp và lưu ý</summary><p className="text-xs leading-5 text-ink-muted">PNG, JPG, WebP, PDF có văn bản, DOCX, TXT, MD, CSV, JSON · Tối đa 4 tệp, 4 MB/tệp, tổng 8 MB. Nội dung được gửi tới model AI; văn bản trích xuất được lưu cùng lượt hỏi, không lưu tệp gốc. Gỡ tệp sau khi hỏi nếu không muốn gửi lại.</p>
      <p className="text-xs text-ink-muted">Tạo ảnh chưa khả dụng. Hội thoại được lưu theo tài khoản và đồ án. Trợ lý nhớ tối đa 8 lượt gần nhất; cần gửi lại ảnh/tệp để phân tích tiếp nội dung gốc.</p></details>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-status-error-text">{error}</p>}
    {!dock && answer && renderAnswer(answer)}
  </section>
}
