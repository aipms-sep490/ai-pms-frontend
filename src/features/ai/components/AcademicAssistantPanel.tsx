import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  askAcademicAssistant,
  askAcademicAssistantWithFiles,
  createAssistantConversation,
  deleteAssistantConversation,
  downloadAssistantAnswer,
  downloadAssistantConversation,
  getAssistantCitation,
  getAssistantConversation,
  listAssistantConversations,
  listAssistantRubrics,
  streamAssistant,
  submitAssistantFeedback,
  updateAssistantConversation,
  type AcademicAssistantResponse,
  type AssistantConversation,
  type AssistantDraft,
  type AssistantExportFormat,
  type AssistantRubricOption,
  type AssistantToolMode,
} from '../academic-ai-api'
import type { EvidenceReference } from '../ai-api'
import { AssistantDraftCard } from './AssistantDraftCard'
import { AssistantAnswerText, type CitationKind } from './AssistantAnswerText'
import { AssistantStructuredReportView } from './AssistantStructuredReport'
import { AssistantComposer } from './AssistantComposer'
import { AssistantSourceInspector, type InspectedSource } from './AssistantSourceInspector'
import { HttpError } from '../../../services/http/http-client'
import { Modal } from '../../../components/ui/Modal'

type QuickCard = { icon: string; title: string; detail: string; query: string; mode?: AssistantToolMode }

function buildQuickCards(projectId: number | undefined, userRoles: readonly string[] | undefined): QuickCard[] {
  const roles = (userRoles ?? []).map(r => r.toUpperCase())
  const isStaff = roles.includes('DEPARTMENT_STAFF')
  const isLecturer = roles.includes('LECTURER') && !isStaff

  if (projectId) {
    if (isLecturer) {
      return [
        { icon: 'description', title: 'Tài liệu & bài nộp nhóm', detail: 'Tiến độ bàn giao, chấm nguội & Gates', query: 'Tài liệu bàn giao, báo cáo chấm nguội và Review Gates của nhóm đã làm đến đâu rồi, mục nào còn thiếu hoặc cần yêu cầu sửa?' },
        { icon: 'troubleshoot', title: 'Điểm nghẽn & quá hạn', detail: 'Task bị chặn, trễ hạn & người phụ trách', query: 'Task nào trong đồ án đang bị chặn, quá hạn, thiếu minh chứng hoặc có tác động mở lại ở đâu, ai đang phụ trách?' },
        { icon: 'summarize', title: 'Soạn biên bản buổi họp', detail: 'Tổng hợp quyết định & đầu việc theo dõi', query: 'Soạn biên bản họp từ ghi chú sau, gồm nội dung, quyết định và việc cần làm: ', mode: 'MEETING_MINUTES' },
        { icon: 'fact_check', title: 'Rà soát báo cáo theo Rubric', detail: 'Đính kèm bài nộp SV để đối chiếu tiêu chí', query: 'Nhận xét báo cáo đính kèm theo bộ tiêu chí đã chọn: điểm tốt, minh chứng còn thiếu và cách cải thiện.', mode: 'REPORT_REVIEW' },
      ]
    }
    return [
      { icon: 'description', title: 'Tài liệu đến đâu rồi?', detail: 'Tiến độ bàn giao, chấm nguội & Gates', query: 'Tài liệu bàn giao, báo cáo chấm nguội và Review Gates của nhóm đã làm đến đâu rồi, mục nào còn thiếu hoặc GVHD yêu cầu sửa?' },
      { icon: 'troubleshoot', title: 'Task bị gì ở đâu?', detail: 'Quá hạn, bị chặn, phản hồi & phụ trách', query: 'Task nào trong đồ án đang bị chặn, quá hạn, thiếu minh chứng hoặc có tác động mở lại ở đâu, ai đang phụ trách?' },
      { icon: 'auto_fix_high', title: 'Tự động setup đồ án', detail: 'Sinh mốc, tiêu chí & task để áp dụng', query: 'Đề xuất và thiết lập giúp nhóm các mốc tiến độ, hạng mục tài liệu kèm tiêu chí đạt yêu cầu và danh sách công việc phù hợp với đồ án này.', mode: 'PROJECT_SETUP' },
      { icon: 'fact_check', title: 'Tiêu chí đánh giá', detail: 'Hiểu rõ rubric & điều kiện chấm', query: 'Rubric và điều kiện đánh giá áp dụng cho ngành của nhóm gồm những tiêu chí nào?' },
    ]
  }

  if (isStaff) {
    return [
      { icon: 'grading', title: 'Thiết lập Rubric 100%', detail: 'Tạo khung tiêu chí chuẩn (DRAFT) nhanh', query: 'Thiết lập bộ tiêu chí chấm điểm (Rubric DRAFT tổng 100%) cho chuyên ngành/giai đoạn sau: ', mode: 'RUBRIC_SETUP' },
      { icon: 'menu_book', title: 'Tra cứu quy định Khoa', detail: 'Kiểm tra văn bản học vụ đang hiệu lực', query: 'Hạn nộp và biểu mẫu cần dùng trong học kỳ hiện tại là gì?' },
      { icon: 'fact_check', title: 'Tiêu chí & trọng số chấm', detail: 'Rà soát cấu trúc đánh giá các vòng', query: 'Rubric của ngành tôi gồm những tiêu chí nào?' },
      { icon: 'school', title: 'Điều kiện công bố điểm', detail: 'Kiểm tra các điều kiện khóa & công bố', query: 'Điều kiện để công bố điểm là gì?' },
    ]
  }

  return [
    { icon: 'explore', title: 'Bước tiếp theo', detail: 'Định hướng công việc cần làm', query: 'Tôi cần làm gì ở giai đoạn hiện tại?' },
    { icon: 'event_note', title: 'Hạn nộp & biểu mẫu', detail: 'Chuẩn bị đúng và đủ', query: 'Hạn nộp và biểu mẫu cần dùng là gì?' },
    { icon: 'fact_check', title: 'Tiêu chí đánh giá', detail: 'Hiểu cách đồ án được chấm', query: 'Rubric của ngành tôi gồm những tiêu chí nào?' },
    { icon: 'school', title: 'Công bố kết quả', detail: 'Kiểm tra các điều kiện', query: 'Điều kiện để công bố điểm là gì?' },
  ]
}

const acceptedFiles = '.png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,.txt,.md,.csv,.json'
const FEEDBACK_REASONS = ['Thiếu nguồn dẫn chứng', 'Chưa sát ngữ cảnh đồ án', 'Trả lời còn dài / chung chung', 'Thông tin chưa chính xác']

type ChatTurn = {
  id: number
  query: string
  fileNames: string[]
  sentAt?: string
  response?: AcademicAssistantResponse
  error?: string
  preview?: string
}

const formatMessageTime = (value?: string) => {
  if (!value) return null
  const normalized = value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
  })
}

const isStatusMessage = (text?: string) =>
  Boolean(text && /^Đang (kiểm tra|đọc|tra cứu|tạo|tổng hợp|phân tích|xử lý)/i.test(text.trim()) && text.trim().length <= 90)

function AssistantTyping({ preview }: { preview?: string }) {
  const statusOnly = isStatusMessage(preview)
  return (
    <div className="assistant-thinking" aria-busy="true">
      <div className="assistant-typing-status" role="status">
        <span className="assistant-typing-dots" aria-hidden="true"><i /><i /><i /></span>
        <span>{statusOnly ? preview : 'Đang trả lời…'}</span>
      </div>
      {preview && !statusOnly && (
        <div className="assistant-stream-live">
          <AssistantAnswerText text={preview} streaming />
          <small>Nội dung đang được hoàn thiện, chưa xác minh nguồn.</small>
        </div>
      )}
    </div>
  )
}

export function AcademicAssistantPanel({
  projectId,
  dock = false,
  layout,
  pageContext = '',
  allowReportForm = true,
  canApplyProjectSetup = false,
  canApplyRubricSetup = false,
  academicSemesterId,
  userDisplayName,
  userRoles,
  externalConversationId,
  onConversationChange,
  onInspectSource,
  onUseDraft,
  onOpenEvidence,
  onOpenTarget,
  onOpenRubrics,
}: {
  projectId?: number
  allowReportForm?: boolean
  dock?: boolean
  layout?: 'dock' | 'fullscreen' | 'embedded'
  pageContext?: string
  canApplyProjectSetup?: boolean
  canApplyRubricSetup?: boolean
  academicSemesterId?: number
  userDisplayName?: string
  userRoles?: readonly string[]
  externalConversationId?: number | null
  onConversationChange?: (conversation: AssistantConversation | null) => void
  onInspectSource?: (source: InspectedSource | null) => void
  onUseDraft?: (draft: AssistantDraft) => void
  onOpenEvidence?: (evidence: EvidenceReference) => void
  onOpenTarget?: (target: string, resourceId?: number | null) => void
  onOpenRubrics?: () => void
}) {
  const effectiveLayout = layout ?? (dock ? 'dock' : 'embedded')
  const showBuiltInToolbar = dock && effectiveLayout === 'dock'

  const [conversation, setConversation] = useState<AssistantConversation | null>(null)
  const [conversations, setConversations] = useState<AssistantConversation[]>([])
  const [historySearch, setHistorySearch] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [historyBusy, setHistoryBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AssistantConversation | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editingConvId, setEditingConvId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const cancelDelete = useRef<HTMLButtonElement>(null)
  const [moreHistory, setMoreHistory] = useState(false)
  const [moreTurns, setMoreTurns] = useState(false)
  const [inspected, setInspected] = useState<InspectedSource | null>(null)
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
  const historyRef = useRef<HTMLDivElement>(null)
  const autoFollowRef = useRef(true)
  const [showScrollJump, setShowScrollJump] = useState(false)
  const scrollFrame = useRef<number | null>(null)
  const previewFrame = useRef<number | null>(null)
  const pendingPreview = useRef<{ turnId: number; text: string } | null>(null)
  const [answer, setAnswer] = useState<AcademicAssistantResponse | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const [feedbackRatings, setFeedbackRatings] = useState<Record<number, number>>({})
  const [feedbackOpenRunId, setFeedbackOpenRunId] = useState<number | null>(null)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackBusyRunId, setFeedbackBusyRunId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const download = useRef<AbortController | null>(null)

  const ttsSupported = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, [])
  const quickCards = useMemo(() => buildQuickCards(projectId, userRoles), [projectId, userRoles])

  const updateInspected = (next: InspectedSource | null) => {
    setInspected(next)
    onInspectSource?.(next)
  }

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

  // Smart auto-scroll: follow when near bottom, pause if user scrolled up
  useEffect(() => {
    if (!autoFollowRef.current) return
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current)
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null
      historyRef.current?.scrollTo?.({ top: historyRef.current.scrollHeight, behavior: 'auto' })
    })
    return () => {
      if (scrollFrame.current !== null) {
        cancelAnimationFrame(scrollFrame.current)
        scrollFrame.current = null
      }
    }
  }, [turns])

  useEffect(() => () => {
    if (previewFrame.current !== null) cancelAnimationFrame(previewFrame.current)
    previewFrame.current = null
    pendingPreview.current = null
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel() } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    request.current?.abort(); download.current?.abort(); historyRequest.current?.abort(); sourceRequest.current?.abort()
    sending.current = false
    setConversation(null); setConversations([]); setShowHistory(false); updateInspected(null)
    setPendingDelete(null); setDeleteError(null); setHistoryBusy(false); setHistorySearch('')
    setToolMode(undefined); setDraftKind(undefined)
    setAnswer(null); setTurns([]); setQuery(''); setError(null); setFiles([]); setBusy(false); setDownloading(false)
    setFeedbackOpenRunId(null); setFeedbackNote(''); autoFollowRef.current = true; setShowScrollJump(false)
    onConversationChange?.(null)
    return () => { request.current?.abort(); download.current?.abort(); historyRequest.current?.abort(); sourceRequest.current?.abort() }
  }, [projectId])

  // Sync externally selected conversation (used by Full-Screen 3-column workspace)
  useEffect(() => {
    if (externalConversationId === undefined) return
    if (externalConversationId === null) {
      if (conversation !== null || turns.length > 0) {
        request.current?.abort()
        sending.current = false
        setConversation(null); setTurns([]); setAnswer(null); setError(null); setFiles([]); setBusy(false)
        setToolMode(undefined); setDraftKind(undefined); updateInspected(null)
      }
      return
    }
    if (conversation?.id !== externalConversationId) {
      void openConversation(externalConversationId, false)
    }
  }, [externalConversationId])

  const loadHistory = async (more = false, searchOverride?: string) => {
    historyRequest.current?.abort()
    const controller = new AbortController(); historyRequest.current = controller
    setHistoryBusy(true); setShowHistory(true); setError(null)
    try {
      const q = searchOverride ?? historySearch
      const items = await listAssistantConversations(
        projectId,
        more ? conversations.at(-1)?.id : undefined,
        controller.signal,
        q || undefined,
      )
      if (!controller.signal.aborted) {
        setConversations(current => more ? [...current, ...items] : items)
        setMoreHistory(items.length >= 20)
      }
    } catch { if (!controller.signal.aborted) setError('Chưa tải được lịch sử hội thoại.') }
    finally { if (!controller.signal.aborted) setHistoryBusy(false) }
  }

  const openConversation = async (id: number, older = false) => {
    if (sending.current) return
    historyRequest.current?.abort(); sourceRequest.current?.abort()
    const controller = new AbortController(); historyRequest.current = controller
    setHistoryBusy(true); setError(null); updateInspected(null)
    try {
      const detail = await getAssistantConversation(id, older ? turns[0]?.id : undefined, controller.signal)
      if (!controller.signal.aborted) {
        setConversation(detail.conversation)
        onConversationChange?.(detail.conversation)
        setMoreTurns(detail.hasMore)
        const loaded = detail.turns.map(turn => ({ ...turn, fileNames: turn.response.attachments?.map(file => file.fileName) ?? [] }))
        const nextRatings: Record<number, number> = {}
        for (const t of detail.turns) {
          if (t.response.runId && t.response.feedbackRating) nextRatings[t.response.runId] = t.response.feedbackRating
        }
        if (Object.keys(nextRatings).length > 0) setFeedbackRatings(prev => ({ ...prev, ...nextRatings }))
        setTurns(current => older ? [...loaded, ...current] : loaded)
        setShowHistory(false); setFiles([])
        autoFollowRef.current = !older
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
      if (!controller.signal.aborted) {
        setPendingDelete(null)
        setConversations(items => items.filter(item => item.id !== id))
        if (conversation?.id === id) {
          setConversation(null); setTurns([]); onConversationChange?.(null)
        }
      }
    } catch { if (!controller.signal.aborted) setDeleteError('Chưa xóa được hội thoại. Bạn có thể thử lại.') }
    finally { if (!controller.signal.aborted) setHistoryBusy(false) }
  }

  const togglePinConversation = async (item: AssistantConversation) => {
    try {
      const updated = await updateAssistantConversation(item.id, { isPinned: !item.isPinned })
      setConversations(items =>
        items.map(c => c.id === item.id ? updated : c)
          .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))),
      )
      if (conversation?.id === item.id) {
        setConversation(updated); onConversationChange?.(updated)
      }
    } catch {
      setError('Chưa cập nhật được trạng thái ghim hội thoại.')
    }
  }

  const commitInlineRename = async (item: AssistantConversation) => {
    const trimmed = editingTitle.trim()
    setEditingConvId(null)
    if (!trimmed || trimmed === item.title) return
    try {
      const updated = await updateAssistantConversation(item.id, { title: trimmed })
      setConversations(items => items.map(c => c.id === item.id ? updated : c))
      if (conversation?.id === item.id) {
        setConversation(updated); onConversationChange?.(updated)
      }
    } catch {
      setError('Chưa đổi được tên hội thoại.')
    }
  }

  const exportFullConversation = async (item: AssistantConversation, format: 'md' | 'docx' | 'pdf') => {
    if (downloading) return
    setDownloading(true); setError(null)
    try {
      const blob = await downloadAssistantConversation(item.id, format)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `hoi-thoai-tro-ly-ai.${format}`
      document.body.appendChild(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError('Chưa tải được toàn bộ hội thoại.')
    } finally {
      setDownloading(false)
    }
  }

  const openDocSource = async (runId: number, index: number) => {
    sourceRequest.current?.abort(); const controller = new AbortController(); sourceRequest.current = controller
    setError(null)
    try {
      const citation = await getAssistantCitation(runId, index, controller.signal)
      if (!controller.signal.aborted) updateInspected({ kind: 'DOC', data: citation, label: `DOC-${index + 1}` })
    } catch {
      if (!controller.signal.aborted) setError('Không mở được nguồn. Kiểm tra lại quyền truy cập.')
    }
  }

  const handleInlineCiteClick = (response: AcademicAssistantResponse, kind: CitationKind, index: number) => {
    if (kind === 'DOC') {
      if (response.runId && index >= 0 && index < response.citations.length) {
        void openDocSource(response.runId, index)
      } else if (response.citations[index]) {
        updateInspected({ kind: 'DOC', data: response.citations[index], label: `DOC-${index + 1}` })
      }
      return
    }
    if (kind === 'PROJECT' && response.projectEvidence[index]) {
      updateInspected({ kind: 'PROJECT', data: response.projectEvidence[index], label: `PROJECT-${index + 1}` })
    }
  }

  const chooseFiles = (incoming: File[]) => {
    const maxFileBytes = 10 * 1024 * 1024
    const maxTotalBytes = 20 * 1024 * 1024
    const next = [...files, ...incoming]
    if (next.length > 4 || next.some(file => file.size === 0 || file.size > maxFileBytes) || next.reduce((sum, file) => sum + file.size, 0) > maxTotalBytes) {
      setError('Chọn tối đa 4 tệp, mỗi tệp từ 1 byte đến 10 MB, tổng không quá 20 MB.'); return
    }
    if (next.some(file => !acceptedFiles.split(',').some(extension => file.name.toLowerCase().endsWith(extension)))) {
      setError('Định dạng chưa được hỗ trợ. Chọn PNG/JPG/WebP, PDF, DOCX, XLSX, TXT, MD, CSV hoặc JSON.'); return
    }
    setFiles(next); setError(null)
  }

  const ask = async (event?: FormEvent, explicitQuery?: string, explicitMode?: AssistantToolMode) => {
    event?.preventDefault()
    const rawValue = (explicitQuery ?? query).trim()
    const value = rawValue || (files.length > 0 ? 'Phân tích nội dung ảnh hoặc tài liệu đính kèm giúp tôi.' : '')
    const activeToolMode = explicitMode ?? toolMode
    if (!value || sending.current || historyBusy) return
    if (activeToolMode === 'REPORT_REVIEW' && (!rubricId || !files.length)) { setError('Chọn bộ tiêu chí và đính kèm báo cáo trước khi gửi.'); return }
    if (activeToolMode === 'PROGRESS' && files.length) { setError('Bỏ tệp đính kèm để xem tiến độ từ dữ liệu hệ thống.'); return }
    if (explicitMode && explicitMode !== toolMode) { setToolMode(explicitMode); setDraftKind(undefined) }

    sending.current = true
    autoFollowRef.current = true
    setShowScrollJump(false)
    request.current?.abort(); download.current?.abort()
    const controller = new AbortController(); request.current = controller
    const turnId = --sequence.current
    const sentAt = new Date().toISOString()
    const useStreamingConversation = dock || effectiveLayout === 'fullscreen'
    if (useStreamingConversation) {
      setTurns(current => [...current, { id: turnId, query: value, sentAt, fileNames: files.map(file => file.name) }])
    }
    setQuery(useStreamingConversation ? '' : value)
    setBusy(true); setError(null); setAnswer(null); setDownloading(false)

    try {
      let active = conversation
      if (useStreamingConversation && !active) {
        active = await createAssistantConversation(projectId, controller.signal)
        if (controller.signal.aborted) return
        setConversation(active)
        onConversationChange?.(active)
      }
      const result = useStreamingConversation && active
        ? await streamAssistant(value, files, active, pageContext, draftKind, text => {
          if (controller.signal.aborted) return
          pendingPreview.current = { turnId, text }
          if (previewFrame.current !== null) return
          setTurns(current => current.map(turn => turn.id === turnId ? { ...turn, preview: text } : turn))
          pendingPreview.current = null
          previewFrame.current = requestAnimationFrame(() => {
            previewFrame.current = null
            const pending = pendingPreview.current
            pendingPreview.current = null
            if (!pending || controller.signal.aborted) return
            setTurns(current => current.map(turn => turn.id === pending.turnId ? { ...turn, preview: pending.text } : turn))
          })
        }, controller.signal, ...(activeToolMode ? [{ mode: activeToolMode, rubricId: activeToolMode === 'REPORT_REVIEW' ? rubricId : undefined }] : []))
        : files.length
        ? await askAcademicAssistantWithFiles(value, files, projectId, controller.signal)
        : await askAcademicAssistant(value, projectId, controller.signal)

      if (!controller.signal.aborted) {
        if (previewFrame.current !== null) cancelAnimationFrame(previewFrame.current)
        previewFrame.current = null
        pendingPreview.current = null
        setAnswer(result)
        if (active) {
          const updatedConv: AssistantConversation = {
            ...active,
            revision: result.revision ?? active.revision,
            title: active.revision === 0 ? value.slice(0, 120) : active.title,
            updatedAt: result.generatedAt || new Date().toISOString(),
            turnCount: (active.turnCount ?? 0) + 1,
          }
          setConversation(updatedConv)
          onConversationChange?.(updatedConv)
        }
        if (useStreamingConversation) {
          setTurns(current => current.map(turn => turn.id === turnId ? { ...turn, response: result } : turn))
          setFiles([])
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message = err instanceof HttpError && [400, 409, 413].includes(err.status)
          ? err.message
          : 'Chưa nhận được phản hồi đầy đủ. Mở lại lịch sử để kiểm tra trước khi gửi lại.'
        setError(message)
        if (useStreamingConversation) {
          setTurns(current => current.map(turn => turn.id === turnId ? { ...turn, error: message } : turn))
          setQuery(value)
        }
      }
    } finally {
      if (!controller.signal.aborted) { setBusy(false); sending.current = false }
    }
  }

  const stop = () => {
    request.current?.abort(); sending.current = false; setBusy(false)
    if (previewFrame.current !== null) cancelAnimationFrame(previewFrame.current)
    previewFrame.current = null
    pendingPreview.current = null
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
      document.body.appendChild(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      if (!controller.signal.aborted) setError('Không tải được câu trả lời. Kiểm tra quyền truy cập và thử lại.')
    } finally { if (!controller.signal.aborted) setDownloading(false) }
  }

  const applyMode = (value: string) => {
    setError(null)
    setDraftKind(value === 'TASK' || value === 'MEETING' ? value : undefined)
    setToolMode(value && value !== 'TASK' && value !== 'MEETING' ? value as AssistantToolMode : undefined)
    const prompts: Record<string, string> = {
      PROGRESS: 'Tóm tắt tiến độ tài liệu, chấm nguội, Review Gates, công việc quá hạn và các mốc cần chú ý của đồ án.',
      REPORT_REVIEW: 'Nhận xét báo cáo đính kèm theo bộ tiêu chí đã chọn: điểm tốt, minh chứng còn thiếu và cách cải thiện.',
      PROJECT_SETUP: 'Đề xuất và thiết lập giúp nhóm các mốc tiến độ, hạng mục tài liệu kèm tiêu chí đạt yêu cầu và danh sách công việc phù hợp với đồ án này cho giai đoạn: ',
      RUBRIC_SETUP: 'Thiết lập bộ tiêu chí chấm điểm (Rubric DRAFT tổng 100%) cho chuyên ngành/giai đoạn sau: ',
      WEEKLY_REPORT: 'Soạn báo cáo tuần gồm việc đã làm, đang làm, vướng mắc và kế hoạch tuần tới. Nội dung tuần này: ',
      MEETING_MINUTES: 'Soạn biên bản họp từ ghi chú sau, gồm nội dung, quyết định và việc cần làm: ',
      WORK_PLAN: 'Lập kế hoạch công việc và sản phẩm bàn giao cho mục tiêu sau: ',
    }
    if (prompts[value]) setQuery(prompts[value])
    else if (value === 'TASK' || value === 'MEETING' || value === '') {
      if (query.startsWith('/')) setQuery('')
    }
  }

  const copyAnswerText = async (text: string, key: string) => {
    try {
      await navigator.clipboard?.writeText(text)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(current => (current === key ? null : current)), 1800)
    } catch { /* clipboard unavailable */ }
  }

  const toggleSpeak = (text: string, key: string) => {
    if (!ttsSupported) return
    try {
      window.speechSynthesis.cancel()
      if (speakingKey === key) { setSpeakingKey(null); return }
      const plain = text.replace(/```[\s\S]*?```/g, ' (đoạn mã) ').replace(/[*`#>_[\]]/g, '').trim()
      const utter = new SpeechSynthesisUtterance(plain.slice(0, 1500))
      utter.lang = 'vi-VN'
      utter.onend = () => setSpeakingKey(curr => curr === key ? null : curr)
      utter.onerror = () => setSpeakingKey(curr => curr === key ? null : curr)
      setSpeakingKey(key)
      window.speechSynthesis.speak(utter)
    } catch {
      setSpeakingKey(null)
    }
  }

  const sendFeedback = async (runId: number, rating: 1 | -1, note?: string) => {
    if (feedbackBusyRunId === runId) return
    setFeedbackBusyRunId(runId)
    try {
      await submitAssistantFeedback(runId, rating, note)
      setFeedbackRatings(prev => ({ ...prev, [runId]: rating }))
      setFeedbackOpenRunId(null)
      setFeedbackNote('')
    } catch {
      setError('Chưa gửi được đánh giá phản hồi lúc này.')
    } finally {
      setFeedbackBusyRunId(null)
    }
  }

  const handleHistoryScroll = () => {
    const el = historyRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const nearBottom = distanceFromBottom < 120
    autoFollowRef.current = nearBottom
    setShowScrollJump(!nearBottom && turns.length > 0)
  }

  const scrollToLatest = () => {
    autoFollowRef.current = true
    setShowScrollJump(false)
    historyRef.current?.scrollTo?.({ top: historyRef.current.scrollHeight, behavior: 'smooth' })
  }

  const renderAnswer = (item: AcademicAssistantResponse, turnKey?: string, originalQuery?: string, isLatestTurn?: boolean) => {
    const copyId = turnKey ?? String(item.runId ?? item.generatedAt ?? 'latest')
    const currentRating = item.runId ? (feedbackRatings[item.runId] ?? item.feedbackRating ?? null) : null
    const followUps = isLatestTurn && !busy && item.followUpSuggestions?.length ? item.followUpSuggestions : []

    return (
      <div className="assistant-answer">
        <div className="assistant-answer-head">
          <p className="assistant-answer-label">
            <span className="assistant-answer-badge">
              <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
              {item.generationStatus === 'FALLBACK'
                ? (item.citations.length || item.projectEvidence.length ? 'Trích đoạn nguồn · fallback' : 'AI tạm thời không khả dụng')
                : item.draft?.kind === 'PROJECT_SETUP' || item.draft?.kind === 'RUBRIC_SETUP'
                ? 'Gói đề xuất thiết lập · chờ xác nhận'
                : item.draft
                ? 'Bản nháp cần kiểm tra'
                : item.insufficientEvidence
                ? 'Chưa đủ thông tin xác nhận'
                : item.answerType === 'GENERAL'
                ? 'Hỏi đáp chung'
                : item.answerType === 'ATTACHMENT'
                ? 'Dựa trên tệp bạn gửi'
                : 'Câu trả lời có nguồn'}
            </span>
            {formatMessageTime(item.generatedAt) && (
              <time className="assistant-answer-time" dateTime={item.generatedAt}>
                Trả lời lúc {formatMessageTime(item.generatedAt)}
              </time>
            )}
          </p>
        </div>

        <AssistantAnswerText
          text={item.answer}
          onCiteClick={(kind, index) => handleInlineCiteClick(item, kind, index)}
        />

        {item.structuredReport && item.structuredReport.items.length > 0 && (
          <AssistantStructuredReportView report={item.structuredReport} onOpenTarget={onOpenTarget} />
        )}

        {item.insufficientEvidence && (
          <p className="mt-3 text-sm text-status-warning-text">Chưa đủ căn cứ chính thức để kết luận.</p>
        )}
        {item.limitationNote && (
          <p className="assistant-limitation-note mt-3 text-xs text-ink-muted">{item.limitationNote}</p>
        )}
        {!!item.attachments?.length && (
          <p className="assistant-attach-ref mt-3 break-words text-xs text-ink-muted">
            <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
            Tệp tham chiếu: {item.attachments.map(file => file.fileName).join(', ')}
          </p>
        )}

        {item.draft && (
          <AssistantDraftCard
            draft={item.draft}
            projectId={projectId}
            runId={item.runId}
            canApplyProjectSetup={canApplyProjectSetup}
            canApplyRubricSetup={canApplyRubricSetup}
            academicSemesterId={academicSemesterId}
            onUse={item.draft.kind === 'WEEKLY_REPORT' && !allowReportForm ? undefined : onUseDraft}
            onNavigateTarget={onOpenTarget}
            onOpenRubrics={onOpenRubrics}
          />
        )}

        <div className="assistant-answer-footer">
          <button type="button" className="assistant-action-chip" onClick={() => void copyAnswerText(item.answer, copyId)}>
            <span className="material-symbols-outlined" aria-hidden="true">{copiedKey === copyId ? 'check' : 'content_copy'}</span>
            {copiedKey === copyId ? 'Đã sao chép' : 'Sao chép'}
          </button>

          {originalQuery && (dock || effectiveLayout === 'fullscreen') && (
            <button
              type="button"
              className="assistant-action-chip"
              disabled={busy}
              onClick={() => void ask(undefined, originalQuery)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
              Tạo lại
            </button>
          )}

          {ttsSupported && (
            <button
              type="button"
              className={`assistant-action-chip${speakingKey === copyId ? ' is-active' : ''}`}
              onClick={() => toggleSpeak(item.answer, copyId)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{speakingKey === copyId ? 'stop_circle' : 'volume_up'}</span>
              {speakingKey === copyId ? 'Dừng đọc' : 'Nghe'}
            </button>
          )}

          {!!item.runId && (
            <div className="assistant-feedback-group" role="group" aria-label="Đánh giá câu trả lời">
              <button
                type="button"
                className={`assistant-feedback-btn${currentRating === 1 ? ' is-up' : ''}`}
                disabled={feedbackBusyRunId === item.runId}
                aria-label="Câu trả lời hữu ích"
                aria-pressed={currentRating === 1}
                title="Hữu ích"
                onClick={() => void sendFeedback(item.runId!, 1)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">thumb_up</span>
              </button>
              <button
                type="button"
                className={`assistant-feedback-btn${currentRating === -1 ? ' is-down' : ''}`}
                disabled={feedbackBusyRunId === item.runId}
                aria-label="Câu trả lời chưa đạt"
                aria-pressed={currentRating === -1}
                title="Chưa đạt · góp ý"
                onClick={() => setFeedbackOpenRunId(curr => curr === item.runId ? null : item.runId!)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">thumb_down</span>
              </button>
            </div>
          )}

          {!!item.runId && (
            <details className="assistant-export">
              <summary>
                <span className="material-symbols-outlined" aria-hidden="true">download</span>
                {downloading ? 'Đang chuẩn bị tệp…' : 'Tải câu trả lời'}
              </summary>
              <div className="assistant-export-options">
                {([['docx', 'Word'], ['xlsx', 'Excel'], ['pdf', 'PDF'], ['txt', 'TXT'], ['md', 'Markdown']] as const).map(([format, label]) => (
                  <button key={format} type="button" disabled={downloading} onClick={() => void saveAnswer(format, item)}>
                    Tải {label}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>

        {!!item.runId && feedbackOpenRunId === item.runId && (
          <div className="assistant-feedback-popover" role="region" aria-label="Góp ý cải thiện câu trả lời">
            <p>Điểm nào chưa ổn để hệ thống cải thiện?</p>
            <div className="assistant-feedback-reasons">
              {FEEDBACK_REASONS.map(reason => (
                <button
                  key={reason}
                  type="button"
                  disabled={feedbackBusyRunId === item.runId}
                  onClick={() => void sendFeedback(item.runId!, -1, reason)}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="assistant-feedback-custom">
              <input
                aria-label="Ghi chú góp ý thêm"
                placeholder="Ghi chú thêm (không bắt buộc)…"
                maxLength={400}
                value={feedbackNote}
                onChange={e => setFeedbackNote(e.target.value)}
              />
              <button
                type="button"
                disabled={feedbackBusyRunId === item.runId}
                onClick={() => void sendFeedback(item.runId!, -1, feedbackNote)}
              >
                Gửi góp ý
              </button>
            </div>
          </div>
        )}

        {!['GENERAL', 'ATTACHMENT', 'INSUFFICIENT_EVIDENCE'].includes(item.answerType) && !item.insufficientEvidence && item.citations.length > 0 && (
          <details className="assistant-citations">
            <summary>Tài liệu tham chiếu ({item.citations.length})</summary>
            <ul className="mt-2 space-y-2">
              {item.citations.map((src, index) => (
                <li key={`${src.versionId}-${index}`} className="rounded-lg border border-hairline bg-card p-3">
                  <p className="text-sm font-semibold text-ink">
                    {item.runId ? (
                      <button type="button" className="underline underline-offset-4" onClick={() => void openDocSource(item.runId!, index)}>
                        {src.title} · v{src.version}
                      </button>
                    ) : (
                      <>{src.title} · v{src.version}</>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {src.documentType}{src.section ? ` · ${src.section}` : ''}{src.page ? ` · trang ${src.page}` : ''}{src.effectiveFrom ? ` · Hiệu lực từ ${new Date(src.effectiveFrom).toLocaleDateString('vi-VN')}` : ''}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{src.excerpt}</p>
                </li>
              ))}
            </ul>
          </details>
        )}

        {item.answerType === 'GROUNDED' && item.generationStatus === 'COMPLETED' && !item.insufficientEvidence && item.projectEvidence.length > 0 && (
          <details className="assistant-citations assistant-project-sources">
            <summary>Nguồn từ đồ án ({item.projectEvidence.length})</summary>
            <ul className="mt-2 space-y-2">
              {item.projectEvidence.map((ev, index) => (
                <li key={index} className="rounded-lg border border-hairline bg-card p-3 text-sm">
                  <p className="font-semibold">
                    {onOpenEvidence && ev.referenceUrl ? (
                      <button type="button" className="underline underline-offset-4" onClick={() => onOpenEvidence(ev)}>
                        {ev.title}
                      </button>
                    ) : (
                      <button type="button" className="underline underline-offset-4" onClick={() => updateInspected({ kind: 'PROJECT', data: ev, label: `PROJECT-${index + 1}` })}>
                        {ev.title}
                      </button>
                    )}
                  </p>
                  <p className="mt-1 text-ink-soft">{ev.excerpt}</p>
                </li>
              ))}
            </ul>
          </details>
        )}

        {followUps.length > 0 && (
          <div className="assistant-followups" aria-label="Gợi ý hỏi tiếp">
            <span className="assistant-followups-label">Hỏi tiếp:</span>
            <div className="assistant-followups-list">
              {followUps.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(undefined, suggestion)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">subdirectory_arrow_right</span>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const showOverlayInspector = inspected && effectiveLayout !== 'fullscreen'
  const showWelcome = !showHistory && !toolMode && (!(dock || effectiveLayout === 'fullscreen') || turns.length === 0)
  const useStreamLayout = dock || effectiveLayout === 'fullscreen'

  return (
    <section
      className={
        effectiveLayout === 'fullscreen'
          ? 'assistant-conversation is-fullscreen'
          : dock
          ? 'assistant-conversation'
          : 'relative rounded-xl border border-hairline bg-card p-5 shadow-xs'
      }
      aria-label="Trợ lý AI học vụ"
    >
      {pendingDelete && (
        <div onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation() }}>
          <Modal
            open
            title="Xóa hội thoại?"
            description="Hội thoại sẽ được xóa khỏi lịch sử của bạn."
            busy={historyBusy}
            initialFocusRef={cancelDelete}
            onClose={() => setPendingDelete(null)}
          >
            <p className="break-words rounded-xl border border-hairline bg-primary-subtle p-4 text-sm font-semibold text-ink">
              {pendingDelete.title}
            </p>
            {deleteError && <p role="alert" className="mt-3 text-sm text-status-error-text">{deleteError}</p>}
            <div className="app-modal__actions">
              <button ref={cancelDelete} type="button" className="app-modal__button" disabled={historyBusy} onClick={() => setPendingDelete(null)}>Hủy</button>
              <button type="button" className="app-modal__button app-modal__button--danger" disabled={historyBusy} onClick={() => void removeConversation(pendingDelete.id)}>
                {historyBusy ? 'Đang xóa…' : 'Xóa hội thoại'}
              </button>
            </div>
          </Modal>
        </div>
      )}

      {showBuiltInToolbar && (
        <div className="assistant-toolbar">
          <button type="button" disabled={busy || historyBusy} onClick={() => showHistory ? setShowHistory(false) : void loadHistory()}>
            <span className="material-symbols-outlined" aria-hidden="true">{showHistory ? 'arrow_back' : 'history'}</span>
            {showHistory ? 'Trở lại chat' : 'Lịch sử hội thoại'}
          </button>
          <span className="assistant-context">
            <span className="material-symbols-outlined" aria-hidden="true">{projectId ? 'folder_open' : 'chat_bubble_outline'}</span>
            {pageContext || 'Hỏi đáp chung'}
          </span>
        </div>
      )}

      {showHistory && (
        <div className="assistant-saved-history" aria-label="Lịch sử đã lưu">
          <div className="assistant-history-search">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="search"
              aria-label="Tìm lịch sử hội thoại"
              placeholder="Tìm tiêu đề hội thoại…"
              value={historySearch}
              onChange={e => {
                const next = e.target.value
                setHistorySearch(next)
                void loadHistory(false, next)
              }}
            />
          </div>
          {historyBusy && <p role="status">Đang tải…</p>}
          {!historyBusy && conversations.length === 0 && (
            <div className="assistant-history-empty">
              <span className="material-symbols-outlined" aria-hidden="true">forum</span>
              <strong>Câu chuyện bắt đầu từ đây</strong>
              <p>Chưa có hội thoại trong phạm vi này.</p>
            </div>
          )}
          {conversations.map(item => (
            <div key={item.id} className="assistant-saved-row">
              {editingConvId === item.id ? (
                <form className="assistant-conv-rename flex-1" onSubmit={e => { e.preventDefault(); void commitInlineRename(item) }}>
                  <input
                    aria-label="Đổi tên hội thoại"
                    value={editingTitle}
                    maxLength={120}
                    autoFocus
                    onChange={e => setEditingTitle(e.target.value)}
                    onBlur={() => void commitInlineRename(item)}
                  />
                </form>
              ) : (
                <button type="button" disabled={historyBusy} onClick={() => void openConversation(item.id)}>
                  <strong>{item.isPinned ? '📌 ' : ''}{item.title}</strong>
                  <small>{new Date(item.updatedAt).toLocaleString('vi-VN')}</small>
                </button>
              )}
              <div className="assistant-saved-row-actions">
                <button type="button" disabled={historyBusy} title={item.isPinned ? 'Bỏ ghim' : 'Ghim'} aria-label={item.isPinned ? `Bỏ ghim ${item.title}` : `Ghim ${item.title}`} onClick={() => void togglePinConversation(item)}>
                  <span className="material-symbols-outlined" aria-hidden="true">push_pin</span>
                </button>
                <button type="button" disabled={historyBusy} title="Đổi tên" aria-label={`Đổi tên ${item.title}`} onClick={() => { setEditingConvId(item.id); setEditingTitle(item.title) }}>
                  <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                </button>
                <button type="button" disabled={historyBusy || downloading} title="Tải Word" aria-label={`Tải hội thoại ${item.title}`} onClick={() => void exportFullConversation(item, 'docx')}>
                  <span className="material-symbols-outlined" aria-hidden="true">download</span>
                </button>
                <button type="button" disabled={historyBusy} aria-label={`Xóa hội thoại ${item.title}`} onClick={() => { setDeleteError(null); setPendingDelete(item) }}>
                  Xóa
                </button>
              </div>
            </div>
          ))}
          {moreHistory && (
            <button type="button" className="assistant-load-more-btn" disabled={historyBusy} onClick={() => void loadHistory(true)}>
              Xem thêm hội thoại
            </button>
          )}
        </div>
      )}

      {showOverlayInspector && (
        <AssistantSourceInspector
          inspected={inspected}
          mode="overlay"
          onClose={() => updateInspected(null)}
          onOpenEvidence={onOpenEvidence}
        />
      )}

      {showWelcome && (
        <div className={useStreamLayout ? 'assistant-welcome' : undefined}>
          <div className="assistant-welcome-inner">
            {useStreamLayout && (
              <div className="assistant-welcome-mark" aria-hidden="true">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
            )}
            <p className="assistant-eyebrow font-mono text-xs font-semibold uppercase tracking-wide text-primary">
              Trợ lý AI-PMS{projectId ? ' · Ngữ cảnh đồ án' : ''}
            </p>
            <h2 className="mt-1 font-heading text-lg font-semibold text-ink">
              {userDisplayName ? `Xin chào ${userDisplayName.trim().slice(0, 36)}, mình hỗ trợ gì cho bạn?` : 'Mình có thể hỗ trợ gì cho bạn?'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">
              Hỏi đáp quy định học vụ, rà soát tiến độ đồ án, đọc tài liệu đính kèm và tự động setup tiêu chí, công việc.
            </p>
            {useStreamLayout && (
              <div className="assistant-welcome-caps" aria-hidden="true">
                <span><span className="material-symbols-outlined">attach_file</span>PDF · DOCX · Ảnh</span>
                <span><span className="material-symbols-outlined">bolt</span>Gõ / lệnh nhanh</span>
                <span><span className="material-symbols-outlined">mic</span>Nhập giọng nói</span>
              </div>
            )}
            <div className={useStreamLayout ? 'assistant-quick-grid' : 'mt-3 flex flex-wrap gap-2'}>
              {quickCards.map(card => (
                <button
                  key={card.query}
                  type="button"
                  aria-label={card.query}
                  disabled={busy}
                  className="assistant-quick-card rounded-full border border-hairline px-3 py-2 text-xs text-ink-soft hover:border-primary hover:text-primary disabled:opacity-50"
                  onClick={() => void ask(undefined, card.query, card.mode)}
                >
                  {useStreamLayout ? (
                    <>
                      <div className="assistant-quick-card-head">
                        <span className="assistant-quick-card-icon" aria-hidden="true">
                          <span className="material-symbols-outlined">{card.icon}</span>
                        </span>
                        <span className="assistant-quick-card-arrow material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                      </div>
                      <strong>{card.title}</strong>
                      <small>{card.detail}</small>
                    </>
                  ) : card.query}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {useStreamLayout && !showHistory && !showWelcome && (
        <div
          ref={historyRef}
          onScroll={handleHistoryScroll}
          className="assistant-history"
          role="log"
          aria-label="Cuộc trò chuyện với trợ lý"
          aria-live="polite"
        >
          <div className="assistant-history-inner">
            {toolMode && turns.length === 0 && (
              <div className="assistant-tool-intro">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {toolMode === 'PROGRESS' ? 'event_note' : toolMode === 'REPORT_REVIEW' ? 'fact_check' : toolMode === 'PROJECT_SETUP' ? 'auto_fix_high' : toolMode === 'RUBRIC_SETUP' ? 'grading' : 'description'}
                </span>
                <h3>
                  {toolMode === 'PROGRESS' ? 'Nắm rõ bước tiếp theo' : toolMode === 'REPORT_REVIEW' ? 'Hoàn thiện báo cáo của bạn' : toolMode === 'PROJECT_SETUP' ? 'Tự động thiết lập đồ án' : toolMode === 'RUBRIC_SETUP' ? 'Thiết lập bộ tiêu chí Rubric' : 'Từ ý tưởng đến bản nháp'}
                </h3>
                <p>
                  {toolMode === 'PROGRESS'
                    ? 'Xem rõ tài liệu, chấm nguội, Review Gates và công việc cần chú ý trong đồ án.'
                    : toolMode === 'REPORT_REVIEW'
                    ? 'Đối chiếu nội dung với bộ tiêu chí đã công bố, kèm góp ý và nguồn tham chiếu.'
                    : toolMode === 'PROJECT_SETUP'
                    ? 'Mô tả giai đoạn hoặc mục tiêu cần làm (có thể đính kèm đề cương/SRS). AI sẽ đề xuất mốc, hạng mục tài liệu, tiêu chí nghiệm thu và công việc để bạn chỉnh nhanh rồi áp dụng 1 chạm.'
                    : toolMode === 'RUBRIC_SETUP'
                    ? 'Mô tả chuyên ngành, giai đoạn và trọng số mong muốn. AI tạo khung Rubric tổng 100% để bạn kiểm tra và lưu ở trạng thái DRAFT.'
                    : 'Bổ sung nội dung thực tế vào câu hỏi. Trợ lý giúp sắp xếp thành tài liệu để bạn chỉnh sửa và tải về.'}
                </p>
              </div>
            )}

            {moreTurns && conversation && (
              <button type="button" className="assistant-load-more-btn" disabled={busy || historyBusy} onClick={() => void openConversation(conversation.id, true)}>
                Xem tin nhắn trước
              </button>
            )}

            {turns.map((turn, idx) => (
              <div key={turn.id} className="assistant-turn">
                <div className="assistant-user-row">
                  {!busy && (
                    <button
                      type="button"
                      className="assistant-edit-query-btn"
                      title="Sửa câu hỏi & gửi lại"
                      aria-label="Sửa câu hỏi này"
                      onClick={() => setQuery(turn.query)}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                    </button>
                  )}
                  <div className="assistant-user-bubble">
                    <p>{turn.query}</p>
                    {turn.fileNames.length > 0 && (
                      <div className="assistant-user-files">
                        {turn.fileNames.map((name, i) => (
                          <small key={i}><span className="material-symbols-outlined" aria-hidden="true">attach_file</span>{name}</small>
                        ))}
                      </div>
                    )}
                    {formatMessageTime(turn.sentAt) && <time dateTime={turn.sentAt}>Gửi lúc {formatMessageTime(turn.sentAt)}</time>}
                  </div>
                </div>
                {turn.response
                  ? renderAnswer(turn.response, `turn-${turn.id}`, turn.query, idx === turns.length - 1)
                  : turn.error
                  ? (
                    <div className="assistant-turn-error">
                      <p>{turn.error}</p>
                      <button type="button" className="assistant-action-chip" disabled={busy} onClick={() => void ask(undefined, turn.query)}>
                        <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                        Thử lại
                      </button>
                    </div>
                  )
                  : <AssistantTyping preview={turn.preview} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {showScrollJump && useStreamLayout && !showHistory && (
        <button type="button" className="assistant-scroll-jump" onClick={scrollToLatest} aria-label="Cuộn xuống tin nhắn mới nhất">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_downward</span>
          Tin mới nhất
        </button>
      )}

      <AssistantComposer
        query={query}
        onQueryChange={setQuery}
        files={files}
        onChooseFiles={chooseFiles}
        onRemoveFile={index => setFiles(current => current.filter((_, i) => i !== index))}
        busy={busy}
        hidden={showHistory}
        dock={useStreamLayout}
        projectId={projectId}
        canApplyRubricSetup={canApplyRubricSetup}
        toolMode={toolMode}
        draftKind={draftKind}
        onApplyMode={applyMode}
        rubrics={rubrics}
        rubricId={rubricId}
        onRubricChange={setRubricId}
        rubricLoading={rubricLoading}
        rubricError={rubricError}
        onRubricRetry={() => setRubricRetry(v => v + 1)}
        onSubmit={event => void ask(event)}
        onStop={stop}
      />

      {error && <p role="alert" className="assistant-inline-error">{error}</p>}
      {!useStreamLayout && busy && <AssistantTyping />}
      {!useStreamLayout && answer && renderAnswer(answer, 'standalone', query, true)}
    </section>
  )
}
