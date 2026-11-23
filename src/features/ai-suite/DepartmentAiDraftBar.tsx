import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { HttpError } from '../../services/http/http-client'
import { humanizeHttpError } from '../../services/http/humanize-http-error'
import {
  createAssistantConversation,
  streamAssistant,
  type AcademicAssistantResponse,
  type AssistantToolMode,
} from '../ai/academic-ai-api'

const ASSISTANT_ACCEPTED_FILES = '.png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,.txt,.md,.csv,.json'

const MAX_FILES = 4
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_BYTES = 20 * 1024 * 1024

export interface DepartmentAiDraftStarter {
  label: string
  prompt: string
}

export function DepartmentAiDraftBar({
  open,
  onClose,
  title,
  description,
  toolMode,
  pageContext,
  placeholder,
  starters = [],
  defaultPrompt = '',
  renderResult,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  toolMode: AssistantToolMode
  pageContext: string
  placeholder: string
  starters?: DepartmentAiDraftStarter[]
  defaultPrompt?: string
  renderResult: (response: AcademicAssistantResponse, onReset: () => void) => ReactNode
}) {
  const [query, setQuery] = useState(defaultPrompt)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<AcademicAssistantResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  if (!open) return null

  function chooseFiles(incoming: File[]) {
    if (!incoming.length) return
    const next = [...files, ...incoming]
    if (
      next.length > MAX_FILES ||
      next.some(f => f.size <= 0 || f.size > MAX_FILE_BYTES) ||
      next.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES
    ) {
      setError('Chọn tối đa 4 tệp, mỗi tệp từ 1 byte đến 10 MB, tổng không quá 20 MB.')
      return
    }
    const allowed = ASSISTANT_ACCEPTED_FILES.split(',')
    if (next.some(f => !allowed.some(ext => f.name.toLowerCase().endsWith(ext)))) {
      setError('Định dạng chưa được hỗ trợ. Chọn PDF, DOCX, XLSX, PNG/JPG/WebP, TXT, MD, CSV hoặc JSON.')
      return
    }
    setFiles(next)
    setError(null)
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== index))
  }

  function stop() {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
  }

  function reset() {
    stop()
    setResponse(null)
    setPreviewText('')
    setError(null)
  }

  async function generate(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const trimmed = query.trim()
    if (!trimmed && files.length === 0) {
      setError('Nhập mô tả yêu cầu hoặc đính kèm tệp Syllabus/Đề cương (PDF, DOCX, XLSX, ảnh) trước khi tạo nháp.')
      return
    }
    const prompt = trimmed || `Phân tích tệp đính kèm và đề xuất bản nháp cấu hình (${toolMode}).`
    const controller = new AbortController()
    abortRef.current = controller
    setBusy(true)
    setError(null)
    setPreviewText('Đang khởi tạo phiên phân tích AI…')
    setResponse(null)

    try {
      const conversation = await createAssistantConversation(undefined, controller.signal)
      const result = await streamAssistant(
        prompt,
        files,
        conversation,
        pageContext,
        undefined,
        text => setPreviewText(text),
        controller.signal,
        { mode: toolMode },
      )
      setResponse(result)
      setPreviewText('')
    } catch (reason) {
      if (controller.signal.aborted) {
        setPreviewText('')
        return
      }
      if (reason instanceof HttpError) {
        setError(humanizeHttpError(reason, 'Chưa thể tạo bản nháp bằng AI. Kiểm tra tệp đính kèm hoặc thử lại.'))
      } else if (reason instanceof Error && reason.message) {
        setError(reason.message)
      } else {
        setError('Chưa thể tạo bản nháp bằng AI lúc này. Hãy thử lại.')
      }
    } finally {
      abortRef.current = null
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={() => {
        stop()
        onClose()
      }}
      title={title}
      description={description}
      className="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary-subtle/60 px-3.5 py-2.5 text-xs text-ink-soft">
          <strong className="text-primary">AI chỉ soạn bản nháp (DRAFT):</strong> Mọi nội dung AI trích xuất từ tệp hoặc mô tả đều cho phép bạn kiểm tra, chỉnh sửa trực tiếp rồi mới bấm lưu nháp — không tự công bố hay phê duyệt thay bạn.
        </div>

        <form onSubmit={e => void generate(e)} className="space-y-3">
          {starters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-muted">Gợi ý nhanh:</span>
              {starters.map(item => (
                <button
                  key={item.label}
                  type="button"
                  disabled={busy}
                  onClick={() => setQuery(item.prompt)}
                  className="rounded-full border border-hairline bg-canvas px-3 py-1 text-xs font-medium text-ink-soft hover:border-primary/40 hover:bg-primary-subtle hover:text-primary disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <label className="grid gap-1.5 text-xs font-semibold text-ink-soft">
            Yêu cầu hoặc mô tả ngữ cảnh đầu kỳ
            <textarea
              rows={3}
              maxLength={2000}
              disabled={busy}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-line-strong bg-card p-3 text-sm font-normal text-ink focus:border-primary focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-line-strong bg-canvas px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-ink">Đính kèm Syllabus, Đề cương, Quy định hoặc Bảng Excel</p>
              <p className="text-xs text-ink-muted">Hỗ trợ PDF, DOCX, XLSX, PNG/JPG/WebP, CSV, TXT (tối đa 4 tệp · 10 MB/tệp).</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ASSISTANT_ACCEPTED_FILES}
              aria-label="Chọn tệp đính kèm cho AI soạn nháp"
              className="sr-only"
              disabled={busy || files.length >= MAX_FILES}
              onChange={e => {
                chooseFiles(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              icon="upload_file"
              disabled={busy || files.length >= MAX_FILES}
              onClick={() => fileInputRef.current?.click()}
            >
              Chọn tệp ({files.length}/{MAX_FILES})
            </Button>
          </div>

          {files.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tệp đính kèm đã chọn">
              {files.map((file, idx) => (
                <li key={`${file.name}-${idx}`} className="inline-flex items-center gap-2 rounded-full border border-hairline bg-card px-3 py-1 text-xs">
                  <span className="material-symbols-outlined text-[15px] text-primary" aria-hidden="true">description</span>
                  <span className="max-w-[220px] truncate font-medium text-ink" title={file.name}>{file.name}</span>
                  <span className="text-ink-muted">({Math.ceil(file.size / 1024)} KB)</span>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Bỏ tệp ${file.name}`}
                    onClick={() => removeFile(idx)}
                    className="font-bold text-ink-muted hover:text-status-error-text"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg px-3.5 py-2.5 text-xs font-medium text-status-error-text">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {busy ? (
              <Button type="button" variant="danger" icon="stop" onClick={stop}>Dừng phân tích</Button>
            ) : (
              <Button type="submit" icon="auto_awesome" disabled={!query.trim() && files.length === 0}>
                {response ? 'Tạo lại bản nháp AI' : 'Tạo bản nháp bằng AI'}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => { stop(); onClose() }}>Đóng</Button>
          </div>
        </form>

        {busy && previewText && (
          <div role="status" className="rounded-xl border border-hairline bg-canvas p-4 text-xs text-ink-soft space-y-1">
            <p className="font-semibold text-primary">Đang xử lý…</p>
            <p className="whitespace-pre-wrap leading-relaxed">{previewText.slice(0, 600)}</p>
          </div>
        )}

        {response && (
          <div className="border-t border-hairline pt-4">
            {renderResult(response, reset)}
          </div>
        )}
      </div>
    </Modal>
  )
}
