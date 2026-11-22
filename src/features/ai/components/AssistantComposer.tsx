import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { AssistantDraft, AssistantRubricOption, AssistantToolMode } from '../academic-ai-api'

const acceptedFiles = '.png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.md,.csv,.json'

interface SlashCommandItem {
  command: string
  value: string
  label: string
  description: string
  icon: string
  requiresProject?: boolean
  requiresRubricPerm?: boolean
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  { command: '/tiendo', value: 'PROGRESS', label: 'Tiến độ & deadline', description: 'Tổng hợp tài liệu, chấm nguội, Review Gates & task quá hạn', icon: 'monitoring', requiresProject: true },
  { command: '/setup', value: 'PROJECT_SETUP', label: 'Tự động setup đồ án', description: 'Đề xuất mốc, tiêu chí nghiệm thu & danh sách task áp dụng 1 chạm', icon: 'auto_fix_high', requiresProject: true },
  { command: '/rubric', value: 'RUBRIC_SETUP', label: 'Tự động setup Rubric', description: 'Tạo khung bộ tiêu chí chấm điểm tổng 100% (DRAFT)', icon: 'grading', requiresRubricPerm: true },
  { command: '/soatbaocao', value: 'REPORT_REVIEW', label: 'Nhận xét báo cáo theo Rubric', description: 'Đính kèm báo cáo để AI đối chiếu từng tiêu chí', icon: 'fact_check', requiresProject: true },
  { command: '/baocao', value: 'WEEKLY_REPORT', label: 'Soạn báo cáo tuần', description: 'Tổng hợp việc đã làm, đang làm, vướng mắc & kế hoạch', icon: 'assignment' },
  { command: '/bienban', value: 'MEETING_MINUTES', label: 'Soạn biên bản họp', description: 'Chuyển ghi chú cuộc họp thành biên bản chuẩn', icon: 'summarize' },
  { command: '/kehoach', value: 'WORK_PLAN', label: 'Soạn kế hoạch công việc', description: 'Chia mục tiêu thành danh sách công việc & sản phẩm', icon: 'account_tree' },
  { command: '/task', value: 'TASK', label: 'Soạn công việc mới', description: 'Tạo bản nháp Task để lưu nhanh vào đồ án', icon: 'add_task' },
  { command: '/lichhop', value: 'MEETING', label: 'Soạn lịch họp mới', description: 'Tạo bản nháp lịch họp kèm thời gian & kênh video', icon: 'calendar_add_on' },
]

const modeBadgeLabels: Record<string, string> = {
  PROGRESS: 'Tiến độ & deadline',
  PROJECT_SETUP: 'Setup đồ án',
  RUBRIC_SETUP: 'Setup Rubric',
  REPORT_REVIEW: 'Rà soát báo cáo',
  WEEKLY_REPORT: 'Báo cáo tuần',
  MEETING_MINUTES: 'Biên bản họp',
  WORK_PLAN: 'Kế hoạch',
  TASK: 'Tạo công việc',
  MEETING: 'Tạo lịch họp',
}

interface SpeechRecognitionAlternativeLike { transcript: string }
interface SpeechRecognitionResultLike { isFinal: boolean; 0: SpeechRecognitionAlternativeLike }
interface SpeechRecognitionEventLike { results: ArrayLike<SpeechRecognitionResultLike> }
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function ImagePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url ? <img src={url} alt={`Xem trước ${file.name}`} className="h-10 w-10 shrink-0 rounded-md object-cover" /> : null
}

export function AssistantComposer({
  query,
  onQueryChange,
  files,
  onChooseFiles,
  onRemoveFile,
  busy,
  hidden = false,
  dock = false,
  projectId,
  canApplyRubricSetup = false,
  toolMode,
  draftKind,
  onApplyMode,
  rubrics,
  rubricId,
  onRubricChange,
  rubricLoading,
  rubricError,
  onRubricRetry,
  onSubmit,
  onStop,
}: {
  query: string
  onQueryChange: (value: string) => void
  files: File[]
  onChooseFiles: (files: File[]) => void
  onRemoveFile: (index: number) => void
  busy: boolean
  hidden?: boolean
  dock?: boolean
  projectId?: number
  canApplyRubricSetup?: boolean
  toolMode?: AssistantToolMode
  draftKind?: AssistantDraft['kind']
  onApplyMode: (value: string) => void
  rubrics: AssistantRubricOption[]
  rubricId?: number
  onRubricChange: (id?: number) => void
  rubricLoading: boolean
  rubricError: boolean
  onRubricRetry: () => void
  onSubmit: (event?: FormEvent) => void
  onStop: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const [slashManualOpen, setSlashManualOpen] = useState(false)
  const [slashDismissedFor, setSlashDismissedFor] = useState<string | null>(null)
  const [slashIndex, setSlashIndex] = useState(0)
  const [recording, setRecording] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const speechSupported = useMemo(() => Boolean(getSpeechRecognitionCtor()), [])
  const activeModeValue = toolMode ?? draftKind ?? ''

  const availableCommands = useMemo(
    () => SLASH_COMMANDS.filter(cmd =>
      (!cmd.requiresProject || Boolean(projectId))
      && (!cmd.requiresRubricPerm || canApplyRubricSetup),
    ),
    [projectId, canApplyRubricSetup],
  )

  const slashTypedMatch = query.startsWith('/') && !query.includes(' ') && !query.includes('\n')
  const slashFilter = slashTypedMatch ? query.slice(1).toLowerCase() : ''
  const filteredCommands = useMemo(() => {
    if (!slashFilter) return availableCommands
    return availableCommands.filter(cmd =>
      cmd.command.slice(1).includes(slashFilter) || cmd.label.toLowerCase().includes(slashFilter),
    )
  }, [availableCommands, slashFilter])

  const slashOpen = !busy && (slashManualOpen || (slashTypedMatch && slashDismissedFor !== query)) && filteredCommands.length > 0

  const dismissSlash = () => {
    setSlashManualOpen(false)
    if (slashTypedMatch) setSlashDismissedFor(query)
  }

  useEffect(() => {
    setSlashIndex(0)
  }, [slashFilter, slashOpen])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(el.scrollHeight, dock ? 120 : 180)
    el.style.height = query ? `${next}px` : ''
  }, [query, dock])

  useEffect(() => () => {
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
  }, [])

  const pickSlashCommand = (cmd: SlashCommandItem) => {
    setSlashManualOpen(false)
    onApplyMode(cmd.value)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const toggleVoice = () => {
    if (recording) {
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
      setRecording(false)
      return
    }
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    try {
      const rec = new Ctor()
      rec.lang = 'vi-VN'
      rec.continuous = false
      rec.interimResults = true
      const baseText = query.trim()
      rec.onresult = (event) => {
        let transcript = ''
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        const combined = baseText ? `${baseText} ${transcript.trim()}` : transcript.trim()
        onQueryChange(combined.slice(0, 2000))
      }
      rec.onerror = () => setRecording(false)
      rec.onend = () => setRecording(false)
      recognitionRef.current = rec
      setRecording(true)
      rec.start()
    } catch {
      setRecording(false)
    }
  }

  return (
    <form
      hidden={hidden}
      className={dock ? 'assistant-composer' : 'assistant-composer is-standalone'}
      onSubmit={event => {
        setSlashManualOpen(false)
        onSubmit(event)
      }}
      onDragOver={event => { if (!busy) { event.preventDefault(); setDragging(true) } }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }}
      onDrop={event => {
        event.preventDefault()
        setDragging(false)
        if (!busy && event.dataTransfer.files.length) onChooseFiles(Array.from(event.dataTransfer.files))
      }}
    >
      {toolMode && (
        <div className="assistant-tool-help">
          <div className="assistant-tool-help-head">
            <span className="assistant-active-tool-pill">
              <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
              {modeBadgeLabels[toolMode] ?? toolMode}
              <button type="button" aria-label="Tắt chế độ công cụ" onClick={() => onApplyMode('')}>×</button>
            </span>
          </div>
          <p>
            {toolMode === 'PROGRESS'
              ? 'Tổng hợp tài liệu bàn giao, chấm nguội, Review Gates và công việc theo ngữ cảnh đồ án.'
              : toolMode === 'REPORT_REVIEW'
              ? 'Chọn rubric và gửi báo cáo. Góp ý có dẫn nguồn, không phải điểm chấm chính thức.'
              : toolMode === 'PROJECT_SETUP'
              ? 'AI đọc ngữ cảnh đồ án để đề xuất mốc, tài liệu, tiêu chí và task. Bạn xem trước, chỉnh nhanh rồi bấm Áp dụng 1 chạm.'
              : toolMode === 'RUBRIC_SETUP'
              ? 'AI tạo bản nháp bộ tiêu chí Rubric (tổng 100%, lưu trạng thái DRAFT để Khoa rà soát và phê duyệt).'
              : 'Soạn bản nháp để bạn kiểm tra, sau đó tải Word, Excel hoặc PDF từ câu trả lời.'}
          </p>
          {toolMode === 'REPORT_REVIEW' && (
            <>
              <select
                aria-label="Bộ tiêu chí nhận xét"
                value={rubricId ?? ''}
                disabled={busy || rubricLoading}
                onChange={event => onRubricChange(event.target.value ? Number(event.target.value) : undefined)}
              >
                <option value="">{rubricLoading ? 'Đang tải tiêu chí…' : 'Chọn bộ tiêu chí'}</option>
                {rubrics.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.title} · v{item.version}{item.assignedToProject ? ' · Đã gắn đồ án' : ' · Tham khảo'}
                  </option>
                ))}
              </select>
              {rubricError ? (
                <p role="alert">Chưa tải được tiêu chí. <button type="button" onClick={onRubricRetry}>Thử lại</button></p>
              ) : !rubricLoading && !rubrics.length && (
                <p>Chưa có rubric đã công bố thuộc khoa và kỳ của bạn. Liên hệ Khoa để bổ sung.</p>
              )}
            </>
          )}
        </div>
      )}

      {!toolMode && draftKind && (
        <div className="assistant-active-mode-bar">
          <span className="assistant-active-tool-pill">
            <span className="material-symbols-outlined" aria-hidden="true">edit_note</span>
            {modeBadgeLabels[draftKind] ?? draftKind}
            <button type="button" aria-label="Tắt chế độ soạn thảo" onClick={() => onApplyMode('')}>×</button>
          </span>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        multiple
        accept={acceptedFiles}
        aria-label="Đính kèm ảnh hoặc tài liệu"
        className="sr-only"
        disabled={busy}
        onChange={event => {
          onChooseFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />

      <div className={`assistant-composer-box${dragging ? ' is-dragging' : ''}${recording ? ' is-recording' : ''}`}>
        {slashOpen && (
          <div className="assistant-slash-popover" role="listbox" aria-label="Lệnh nhanh trợ lý AI">
            <div className="assistant-slash-head">
              <span>Lệnh nhanh (gõ / để lọc · ↑↓ chọn · Enter áp dụng)</span>
              <button type="button" onClick={dismissSlash} aria-label="Đóng lệnh nhanh">×</button>
            </div>
            <ul>
              {filteredCommands.map((cmd, idx) => (
                <li key={cmd.command}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={idx === slashIndex}
                    className={idx === slashIndex ? 'is-selected' : undefined}
                    onMouseEnter={() => setSlashIndex(idx)}
                    onClick={() => pickSlashCommand(cmd)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">{cmd.icon}</span>
                    <div>
                      <strong><code>{cmd.command}</code> · {cmd.label}</strong>
                      <small>{cmd.description}</small>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {dragging && (
          <div className="assistant-drop-hint" aria-hidden="true">
            <span className="material-symbols-outlined">upload_file</span>
            Thả ảnh hoặc tài liệu (PDF, DOCX, PNG…) vào đây
          </div>
        )}

        {files.length > 0 && (
          <ul aria-label="Tệp đã chọn" className="assistant-file-chips">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="assistant-file-chip">
                {/\.(png|jpe?g|webp)$/i.test(file.name)
                  ? <ImagePreview file={file} />
                  : <span className="material-symbols-outlined assistant-file-icon" aria-hidden="true">description</span>}
                <span className="min-w-0 flex-1 truncate" title={file.name}>
                  {file.name} <span className="text-ink-muted">({Math.ceil(file.size / 1024)} KB)</span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Bỏ ${file.name}`}
                  className="assistant-file-remove"
                  onClick={() => onRemoveFile(index)}
                >
                  {dock ? '×' : 'Bỏ'}
                </button>
              </li>
            ))}
          </ul>
        )}

        <textarea
          ref={textareaRef}
          aria-label="Câu hỏi học vụ"
          value={query}
          onChange={event => {
            if (slashDismissedFor !== null) setSlashDismissedFor(null)
            onQueryChange(event.target.value)
          }}
          onKeyDown={event => {
            if (slashOpen) {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSlashIndex(i => (i + 1) % filteredCommands.length)
                return
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSlashIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length)
                return
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault()
                pickSlashCommand(filteredCommands[slashIndex] ?? filteredCommands[0])
                return
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                dismissSlash()
                return
              }
            }
            if (dock && event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              onSubmit()
            }
          }}
          onPaste={event => {
            if (!busy && event.clipboardData.files.length) {
              event.preventDefault()
              onChooseFiles(Array.from(event.clipboardData.files))
            }
          }}
          rows={dock ? 2 : 3}
          maxLength={2000}
          className="assistant-textarea"
          placeholder={
            recording
              ? 'Đang nghe giọng nói tiếng Việt…'
              : files.length
              ? 'Nhập câu hỏi về tệp/ảnh đính kèm (hoặc bấm Gửi để phân tích ngay)…'
              : 'Hỏi trợ lý AI-PMS, gõ / chọn lệnh nhanh, dán ảnh (Ctrl+V)…'
          }
        />

        <div className="assistant-composer-actions">
          <button
            type="button"
            aria-label="+ Ảnh / tài liệu"
            title="Đính kèm ảnh (PNG/JPG/WebP) hoặc tài liệu (PDF/DOCX/TXT/CSV/JSON)"
            disabled={busy || files.length >= 4}
            className="assistant-attach"
            onClick={() => fileInput.current?.click()}
          >
            <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
            {!dock && 'Ảnh / tài liệu'}
          </button>

          {dock && (
            <button
              type="button"
              className={`assistant-slash-trigger${slashOpen ? ' is-active' : ''}`}
              disabled={busy}
              aria-label="Mở danh sách lệnh nhanh"
              title="Lệnh nhanh (/)"
              onClick={() => {
                if (slashOpen) dismissSlash()
                else setSlashManualOpen(true)
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">bolt</span>
            </button>
          )}

          {speechSupported && (
            <button
              type="button"
              className={`assistant-voice-btn${recording ? ' is-recording' : ''}`}
              disabled={busy}
              aria-label={recording ? 'Dừng ghi âm giọng nói' : 'Nhập bằng giọng nói'}
              title={recording ? 'Đang ghi âm · bấm để dừng' : 'Nhập bằng giọng nói (Tiếng Việt)'}
              onClick={toggleVoice}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{recording ? 'mic_off' : 'mic'}</span>
            </button>
          )}

          {dock && (
            <label className="assistant-mode">
              <select
                aria-label="Chế độ trợ lý"
                disabled={busy}
                value={activeModeValue}
                onChange={event => onApplyMode(event.target.value)}
              >
                <option value="">Hỏi đáp</option>
                <option value="PROGRESS" disabled={!projectId}>Tiến độ &amp; deadline</option>
                <option value="PROJECT_SETUP" disabled={!projectId}>Tự động setup tiêu chí &amp; task</option>
                {canApplyRubricSetup && <option value="RUBRIC_SETUP">Tự động setup bộ Rubric</option>}
                <option value="REPORT_REVIEW" disabled={!projectId}>Nhận xét báo cáo</option>
                <option value="WEEKLY_REPORT">Soạn báo cáo tuần</option>
                <option value="MEETING_MINUTES">Soạn biên bản họp</option>
                <option value="WORK_PLAN">Soạn kế hoạch</option>
                <option value="TASK">Soạn công việc</option>
                <option value="MEETING">Soạn lịch họp</option>
              </select>
            </label>
          )}

          {query.length > 1400 && (
            <span className="assistant-char-count" aria-live="polite">{query.length}/2000</span>
          )}

          {busy ? (
            <button
              type="button"
              className="assistant-send is-stop"
              aria-label="Dừng trả lời"
              title="Dừng trả lời"
              onClick={onStop}
            >
              <span className="material-symbols-outlined" aria-hidden="true">stop</span>
            </button>
          ) : (
            <button
              type="submit"
              aria-label={dock ? 'Gửi' : 'Hỏi trợ lý học vụ'}
              title="Gửi tin nhắn"
              disabled={!query.trim() && files.length === 0}
              className="assistant-send"
            >
              <span className="material-symbols-outlined" aria-hidden="true">arrow_upward</span>
              {!dock && 'Hỏi trợ lý học vụ'}
            </button>
          )}
        </div>
      </div>

      <div className="assistant-composer-meta">
        <p className="assistant-advisory">AI chỉ tư vấn · Kiểm tra nguồn trước khi sử dụng</p>
        <details className="assistant-file-help">
          <summary className="text-xs text-ink-muted">Định dạng tệp &amp; phím tắt</summary>
          <p className="text-xs leading-5 text-ink-muted">
            Hỗ trợ PNG, JPG, WebP, PDF, DOCX, TXT, MD, CSV, JSON (tối đa 4 tệp, 10 MB/tệp, tổng 20 MB).
            Gõ <code>/</code> để chọn nhanh công cụ AI, bấm <code>Alt + A</code> để mở/thu gọn nhanh trợ lý từ mọi trang.
          </p>
        </details>
      </div>
    </form>
  )
}
