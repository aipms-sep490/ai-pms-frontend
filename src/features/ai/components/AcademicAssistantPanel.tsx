import { useEffect, useRef, useState, type FormEvent } from 'react'
import { askAcademicAssistant, askAcademicAssistantWithFiles, downloadAssistantAnswer, type AcademicAssistantResponse } from '../academic-ai-api'
import { HttpError } from '../../../services/http/http-client'

const quickQuestions = ['Tôi cần làm gì ở giai đoạn hiện tại?', 'Hạn nộp và biểu mẫu cần dùng là gì?', 'Rubric của ngành tôi gồm những tiêu chí nào?', 'Điều kiện để công bố điểm là gì?']
const acceptedFiles = '.png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.md,.csv,.json'

function ImagePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const next = URL.createObjectURL(file); setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url ? <img src={url} alt={`Xem trước ${file.name}`} className="h-14 w-14 shrink-0 rounded-md object-cover" /> : null
}

type ChatTurn = { id: number; query: string; fileNames: string[]; response?: AcademicAssistantResponse; error?: string }

export function AcademicAssistantPanel({ projectId, dock = false }: { projectId?: number; dock?: boolean }) {
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
  useEffect(() => { history.current?.scrollTo?.({ top: history.current.scrollHeight, behavior: 'smooth' }) }, [turns])
  useEffect(() => {
    request.current?.abort(); download.current?.abort()
    setAnswer(null); setTurns([]); setQuery(''); setError(null); setFiles([]); setBusy(false); setDownloading(false)
    return () => { request.current?.abort(); download.current?.abort() }
  }, [projectId])

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
    if (!value || busy) return
    request.current?.abort(); download.current?.abort()
    const controller = new AbortController(); request.current = controller
    const turnId = ++sequence.current
    if (dock) setTurns(current => [...current.slice(-19), { id: turnId, query: value, fileNames: files.map(file => file.name) }])
    setQuery(dock ? '' : value); setBusy(true); setError(null); setAnswer(null); setDownloading(false)
    try {
      const result = files.length
        ? await askAcademicAssistantWithFiles(value, files, projectId, controller.signal)
        : await askAcademicAssistant(value, projectId, controller.signal)
      if (!controller.signal.aborted) {
        setAnswer(result)
        if (dock) { setTurns(current => current.map(turn => turn.id === turnId ? { ...turn, response: result } : turn)); setFiles([]) }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message = err instanceof HttpError && [400, 409, 413].includes(err.status) ? err.message : 'Chưa nhận được phản hồi từ trợ lý. Hãy thử lại sau.'
        setError(message)
        if (dock) { setTurns(current => current.map(turn => turn.id === turnId ? { ...turn, error: message } : turn)); setQuery(value) }
      }
    } finally { if (!controller.signal.aborted) setBusy(false) }
  }

  const saveAnswer = async (format: 'txt' | 'md', selectedAnswer: AcademicAssistantResponse) => {
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

  const renderAnswer = (answer: AcademicAssistantResponse) => (<div className="mt-5 rounded-lg border border-primary-subtle bg-primary-subtle p-4">
      <p className="mb-2 text-xs font-semibold text-primary">{answer.generationStatus === 'FALLBACK' ? (answer.citations.length || answer.projectEvidence.length ? 'Trích đoạn nguồn · fallback' : 'AI tạm thời không khả dụng') : answer.insufficientEvidence ? 'Chưa đủ thông tin xác nhận' : answer.answerType === 'GENERAL' ? 'Hỏi đáp chung' : answer.answerType === 'ATTACHMENT' ? 'Dựa trên tệp bạn gửi' : 'Câu trả lời có nguồn'}</p>
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-soft">{answer.answer}</p>
      {answer.insufficientEvidence && <p className="mt-3 text-sm text-status-warning-text">Chưa đủ căn cứ chính thức để kết luận.</p>}
      {answer.limitationNote && <p className="mt-3 text-xs text-ink-muted">{answer.limitationNote}</p>}
      {!!answer.attachments?.length && <p className="mt-3 break-words text-xs text-ink-muted">Tệp tham chiếu: {answer.attachments.map(file => file.fileName).join(', ')}</p>}
      {!!answer.runId && <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={downloading} onClick={() => void saveAnswer('txt', answer)} className="rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50">Tải TXT</button><button type="button" disabled={downloading} onClick={() => void saveAnswer('md', answer)} className="rounded-lg border border-hairline bg-card px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50">Tải Markdown</button></div>}
      {answer.citations.length > 0 && <><h3 className="mt-4 text-sm font-semibold text-ink">Tài liệu tham chiếu</h3><ul className="mt-2 space-y-2">{answer.citations.map((item, index) => <li key={`${item.versionId}-${index}`} className="rounded-lg border border-hairline bg-card p-3"><p className="text-sm font-semibold text-ink">{item.title} · v{item.version}</p><p className="mt-1 text-xs text-ink-muted">{item.documentType}{item.section ? ` · ${item.section}` : ''}{item.page ? ` · trang ${item.page}` : ''}</p><p className="mt-2 text-sm leading-6 text-ink-soft">{item.excerpt}</p></li>)}</ul></>}
      {answer.projectEvidence.length > 0 && <><h3 className="mt-4 text-sm font-semibold text-ink">Dữ liệu project</h3><ul className="mt-2 space-y-2">{answer.projectEvidence.map((item, index) => <li key={index} className="rounded-lg border border-hairline bg-card p-3 text-sm"><p className="font-semibold">{item.title}</p><p className="mt-1 text-ink-soft">{item.excerpt}</p></li>)}</ul></>}
    </div>)

  return <section className={dock ? 'assistant-conversation' : 'rounded-xl border border-hairline bg-card p-5 shadow-xs'} aria-label="Trợ lý AI học vụ">
    {(!dock || turns.length === 0) && <div className={dock ? 'assistant-welcome' : undefined}>
    <div>
      <p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">Học vụ và hỏi đáp</p>
      <h2 className="mt-1 font-heading text-lg font-semibold text-ink">Bạn muốn hỏi gì hôm nay?</h2>
      <p className="mt-1 text-sm leading-6 text-ink-muted">Hỏi kiến thức chung, gửi ảnh hoặc tài liệu để cùng phân tích. Quy định học vụ được đối chiếu với tài liệu đã công bố; AI chỉ tư vấn.</p>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">{quickQuestions.map(item => <button key={item} type="button" disabled={busy} className="rounded-full border border-hairline px-3 py-2 text-xs text-ink-soft hover:border-primary hover:text-primary disabled:opacity-50" onClick={() => void ask(undefined, item)}>{item}</button>)}</div>
    </div>}
    {dock && <div ref={history} className="assistant-history" role="log" aria-label="Cuộc trò chuyện với trợ lý" aria-live="polite">{turns.map(turn => <div key={turn.id} className="assistant-turn">
      <div className="assistant-user-bubble"><p>{turn.query}</p>{turn.fileNames.map((name, index) => <small key={index}>{name}</small>)}</div>
      {turn.response ? renderAnswer(turn.response) : turn.error ? <p className="assistant-turn-error">{turn.error}</p> : <p className="assistant-thinking" role="status">Trợ lý đang trả lời<span aria-hidden="true">…</span></p>}
    </div>)}</div>}
    <form className={dock ? 'assistant-composer' : 'mt-4 flex flex-col gap-3'} onSubmit={event => void ask(event)}>
      <textarea aria-label="Câu hỏi học vụ" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (dock && event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask() } }} onPaste={event => { if (!busy && event.clipboardData.files.length) { event.preventDefault(); chooseFiles(Array.from(event.clipboardData.files)) } }} rows={dock ? 2 : 3} maxLength={2000} className="rounded-lg border border-hairline bg-card p-3 text-sm text-ink" placeholder="Gửi ảnh và hỏi: Lỗi trong ảnh này là gì? Hoặc gửi tài liệu để nhờ tóm tắt…" />
      <input ref={fileInput} type="file" multiple accept={acceptedFiles} aria-label="Đính kèm ảnh hoặc tài liệu" className="sr-only" disabled={busy} onChange={event => { chooseFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
      {files.length > 0 && <ul aria-label="Tệp đã chọn" className="space-y-2">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-3 rounded-lg border border-hairline bg-card p-3 text-sm">
        {/\.(png|jpe?g|webp)$/i.test(file.name) && <ImagePreview file={file} />}
        <span className="min-w-0 flex-1 break-all">{file.name} <span className="text-ink-muted">({Math.ceil(file.size / 1024)} KB)</span></span>
        <button type="button" disabled={busy} aria-label={`Bỏ ${file.name}`} className="shrink-0 text-primary" onClick={() => setFiles(current => current.filter((_, i) => i !== index))}>Bỏ</button>
      </li>)}</ul>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || files.length >= 4} className="min-h-11 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink-soft disabled:opacity-50" onClick={() => fileInput.current?.click()}>+ Ảnh / tài liệu</button>
        <button type="submit" disabled={busy || !query.trim()} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang trả lời…' : dock ? 'Gửi' : 'Hỏi trợ lý học vụ'}</button>
      </div>
      <details className="assistant-file-help"><summary className="text-xs text-ink-muted">Định dạng tệp và lưu ý</summary><p className="text-xs leading-5 text-ink-muted">PNG, JPG, WebP, PDF có văn bản, DOCX, TXT, MD, CSV, JSON · Tối đa 4 tệp, 4 MB/tệp, tổng 8 MB. Nội dung được gửi tới model AI; văn bản trích xuất được lưu cùng lượt hỏi, không lưu tệp gốc. Gỡ tệp sau khi hỏi nếu không muốn gửi lại.</p>
      <p className="text-xs text-ink-muted">Tạo ảnh chưa khả dụng. Mỗi câu hỏi được xử lý độc lập; đoạn hội thoại chỉ giữ trong phiên đang mở.</p></details>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-status-error-text">{error}</p>}
    {!dock && answer && renderAnswer(answer)}
  </section>
}
