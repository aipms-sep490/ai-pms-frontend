import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { MeetingDetail } from '../../meeting-types'
import {
  appendMeetingTranscript,
  askMeetingAi,
  coachMeetingAi,
  deleteTranscriptSegment,
  generateMeetingAiSummary,
  getMeetingAiInsights,
  getMeetingAiWorkspace,
  toggleTranscriptHighlight,
} from './meeting-video-ai-api'
import type {
  LiveCaptionLine,
  MeetingAiActionItem,
  MeetingAiAnswer,
  MeetingAiCoachMode,
  MeetingAiCoachResult,
  MeetingAiInsight,
  MeetingTranscriptSegment,
} from './meeting-video-ai.types'
import type { TranscriptionState } from './useMeetingLiveTranscription'
import {
  agendaStatusLabel,
  buildTranscriptMarkdown,
  computeLocalSpeakerStats,
  downloadTextFile,
  formatVietnamClock,
  formatVietnamDateTime,
  meetingAiError,
  priorityLabel,
  severityLabel,
  speakerInitials,
} from './meeting-video-ai-utils'

export type CopilotTab = 'transcript' | 'summary' | 'ask' | 'coach'

export interface MeetingAiLiveControls {
  supported: boolean
  enabled: boolean
  onToggleEnabled: () => void
  language: string
  onLanguageChange: (language: string) => void
  captionsVisible: boolean
  onToggleCaptionsVisible: () => void
  status: TranscriptionState
  error: string
  onClearError: () => void
  liveCaptions: LiveCaptionLine[]
  activeSpeakers: string[]
  latestPersistedSegment: MeetingTranscriptSegment | null
  remoteRefreshNonce: number
  onBroadcastInsightUpdated?: (insightId: number, insightType: string) => void
  onBroadcastTranscriptSync?: (segmentId?: number) => void
}

export interface MeetingAiCopilotPanelProps {
  meeting: MeetingDetail
  variant: 'room' | 'detail'
  canManage: boolean
  isSupervisor?: boolean
  currentUserId?: number | null
  milestones?: Array<{ id: number; title: string }>
  liveControls?: MeetingAiLiveControls
  onClose?: () => void
  onApplyMinutesToNotes?: (minutes: string) => void
  onApplyDecision?: (decision: string) => Promise<void>
  onCreateActionItem?: (item: MeetingAiActionItem, milestoneId: number | null) => Promise<void>
  onApplySupervisorFeedback?: (draft: string) => void
}

const QUICK_ASK_PROMPTS = [
  'Tóm tắt nhanh 5 phút gần nhất của cuộc họp',
  'Nhóm đã chốt những công việc gì và ai phụ trách?',
  'Có vướng mắc kỹ thuật hay rủi ro nào vừa được nêu không?',
  'GVHD vừa góp ý hoặc yêu cầu sửa những điểm nào?',
  'Còn mục nào trong agenda chưa được thảo luận?',
]

const COACH_ACTIONS: Array<{
  mode: MeetingAiCoachMode
  label: string
  icon: string
  hint: string
  supervisorOnly?: boolean
}> = [
  {
    mode: 'CATCH_UP',
    label: 'Bắt kịp nhanh',
    icon: 'bolt',
    hint: 'Tóm tắt mạch nói gần nhất cho người vừa vào trễ',
  },
  {
    mode: 'AGENDA_CHECK',
    label: 'Soi Agenda',
    icon: 'fact_check',
    hint: 'Kiểm tra mục chưa bàn & gợi ý câu hỏi dẫn dắt',
  },
  {
    mode: 'TASK_AUDIT',
    label: 'Đối chiếu Task',
    icon: 'checklist',
    hint: 'So sánh lời nói với Task/Milestone thực tế của đồ án',
  },
  {
    mode: 'SUPERVISOR_FEEDBACK_DRAFT',
    label: 'Nháp nhận xét GVHD',
    icon: 'rate_review',
    hint: 'Soạn bản nháp nhận xét chuyên môn dựa trên buổi họp',
    supervisorOnly: true,
  },
]

const statusCopy: Record<TranscriptionState, string> = {
  idle: 'Chưa bật ghi lời nói',
  listening: 'Đang lắng nghe & đọc lời nói trực tiếp',
  'paused-muted': 'Tạm dừng (Micrô đang tắt)',
  unsupported: 'Trình duyệt không hỗ trợ Web Speech API (dùng Chrome/Edge hoặc ghi chú tay)',
  error: 'Gặp lỗi micrô / nhận diện giọng nói',
}

export function MeetingAiCopilotPanel({
  meeting,
  variant,
  canManage,
  isSupervisor = false,
  currentUserId = null,
  milestones = [],
  liveControls,
  onClose,
  onApplyMinutesToNotes,
  onApplyDecision,
  onCreateActionItem,
  onApplySupervisorFeedback,
}: MeetingAiCopilotPanelProps) {
  const [tab, setTab] = useState<CopilotTab>('transcript')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [segments, setSegments] = useState<MeetingTranscriptSegment[]>([])
  const [insights, setInsights] = useState<MeetingAiInsight[]>([])
  const [selectedInsightId, setSelectedInsightId] = useState<number | null>(null)
  const [aiAvailable, setAiAvailable] = useState(true)

  // Transcript filters & quick manual note
  const [searchText, setSearchText] = useState('')
  const [speakerFilter, setSpeakerFilter] = useState('')
  const [highlightOnly, setHighlightOnly] = useState(false)
  const [manualText, setManualText] = useState('')
  const [manualImportant, setManualImportant] = useState(false)
  const [manualBusy, setManualBusy] = useState(false)
  const [focusedSegmentId, setFocusedSegmentId] = useState<number | null>(null)

  // Summary & Auto-pulse state
  const [summaryBusy, setSummaryBusy] = useState<'LIVE_PULSE' | 'FULL_MINUTES' | null>(null)
  const [autoPulse, setAutoPulse] = useState(false)
  const [milestoneChoice, setMilestoneChoice] = useState<string | null>(null)
  const selectedMilestoneId = milestoneChoice ?? (milestones[0] ? String(milestones[0].id) : '')
  const [appliedActionKeys, setAppliedActionKeys] = useState<Record<string, boolean>>({})
  const [appliedDecisions, setAppliedDecisions] = useState<Record<number, boolean>>({})
  const [bridgeBusyKey, setBridgeBusyKey] = useState<string | null>(null)

  // Ask AI state
  const [question, setQuestion] = useState('')
  const [askBusy, setAskBusy] = useState(false)
  const [qaHistory, setQaHistory] = useState<MeetingAiAnswer[]>([])

  // Coach AI state
  const [coachBusy, setCoachBusy] = useState<MeetingAiCoachMode | null>(null)
  const [coachResult, setCoachResult] = useState<MeetingAiCoachResult | null>(null)

  const lastSegmentIdRef = useRef<number | null>(null)
  const lastAutoPulseCountRef = useRef<number>(0)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const segmentElementMap = useRef<Map<number, HTMLLIElement>>(new Map())

  const mergeSegments = useCallback((incoming: MeetingTranscriptSegment[]) => {
    if (incoming.length === 0) return
    setSegments((prev) => {
      const byId = new Map<number, MeetingTranscriptSegment>()
      for (const s of prev) byId.set(s.id, s)
      for (const s of incoming) byId.set(s.id, s)
      const merged = [...byId.values()].sort(
        (a, b) => new Date(a.spokenAt).getTime() - new Date(b.spokenAt).getTime() || a.id - b.id,
      )
      lastSegmentIdRef.current = merged.length > 0 ? merged[merged.length - 1].id : null
      return merged
    })
  }, [])

  const loadWorkspace = useCallback(
    async (incremental: boolean, signal?: AbortSignal) => {
      try {
        if (!incremental) {
          setLoading(true)
          setError('')
        }
        const [feed, history] = await Promise.all([
          getMeetingAiWorkspace(meeting.id, incremental ? lastSegmentIdRef.current : null, signal),
          incremental ? Promise.resolve(null) : getMeetingAiInsights(meeting.id, 10, signal).catch(() => []),
        ])
        if (signal?.aborted) return
        setAiAvailable(feed.aiAvailable)
        if (incremental) {
          mergeSegments(feed.segments)
        } else {
          setSegments(feed.segments)
          lastSegmentIdRef.current = feed.lastSegmentId
        }
        if (history && history.length > 0) {
          setInsights(history)
          setSelectedInsightId((curr) => curr ?? history[0].id)
        } else if (feed.latestInsight) {
          setInsights((prev) => {
            if (prev.some((x) => x.id === feed.latestInsight!.id)) return prev
            return [feed.latestInsight!, ...prev].slice(0, 10)
          })
          setSelectedInsightId((curr) => curr ?? feed.latestInsight!.id)
        }
      } catch (reason) {
        if (!signal?.aborted && !incremental) {
          setError(meetingAiError(reason))
        }
      } finally {
        if (!signal?.aborted && !incremental) setLoading(false)
      }
    },
    [meeting.id, mergeSegments],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadWorkspace(false, controller.signal)
    return () => controller.abort()
  }, [loadWorkspace])

  // Merge locally persisted segments immediately when Web Speech saves them.
  const persistedSeg = liveControls?.latestPersistedSegment
  useEffect(() => {
    if (persistedSeg) {
      mergeSegments([persistedSeg])
    }
  }, [persistedSeg, mergeSegments])

  // Sync incremental transcript & latest insight whenever remote peers signal an update.
  const remoteNonce = liveControls?.remoteRefreshNonce ?? 0
  useEffect(() => {
    if (remoteNonce === 0) return
    const controller = new AbortController()
    void loadWorkspace(true, controller.signal)
    void getMeetingAiInsights(meeting.id, 10, controller.signal)
      .then((list) => {
        if (!controller.signal.aborted && list.length > 0) {
          setInsights(list)
          setSelectedInsightId(list[0].id)
        }
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [remoteNonce, meeting.id, loadWorkspace])

  // Periodic light sync while in live video room to catch anything missed over unreliable networks.
  useEffect(() => {
    if (variant !== 'room') return
    const timer = window.setInterval(() => {
      void loadWorkspace(true)
    }, 12_000)
    return () => window.clearInterval(timer)
  }, [variant, loadWorkspace])

  const speakerStats = useMemo(() => computeLocalSpeakerStats(segments), [segments])

  const activeInsight = useMemo(() => {
    if (insights.length === 0) return null
    return insights.find((x) => x.id === selectedInsightId) ?? insights[0]
  }, [insights, selectedInsightId])

  const interimCaptions = useMemo(
    () => (liveControls?.liveCaptions ?? []).filter((c) => !c.isFinal),
    [liveControls?.liveCaptions],
  )

  const filteredSegments = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return segments.filter((seg) => {
      if (highlightOnly && !seg.isHighlighted) return false
      if (speakerFilter && seg.speakerName !== speakerFilter) return false
      if (q && !seg.content.toLowerCase().includes(q) && !seg.speakerName.toLowerCase().includes(q)) return false
      return true
    })
  }, [segments, highlightOnly, speakerFilter, searchText])

  const handleGenerateSummary = useCallback(
    async (mode: 'LIVE_PULSE' | 'FULL_MINUTES', silent = false) => {
      if (summaryBusy) return
      setSummaryBusy(mode)
      if (!silent) {
        setError('')
        setNotice('')
      }
      try {
        const result = await generateMeetingAiSummary(meeting.id, {
          mode,
          recentMinutes: mode === 'LIVE_PULSE' ? 12 : null,
        })
        setInsights((prev) => [result, ...prev.filter((item) => item.id !== result.id)].slice(0, 10))
        setSelectedInsightId(result.id)
        lastAutoPulseCountRef.current = result.transcriptSegmentCount
        setTab('summary')
        if (!silent) {
          setNotice(
            mode === 'LIVE_PULSE'
              ? 'Đã cập nhật bản tóm tắt nhanh trực tiếp.'
              : 'Đã tạo Biên bản & Phân tích AI toàn diện.',
          )
        }
        liveControls?.onBroadcastInsightUpdated?.(result.id, result.insightType)
      } catch (reason) {
        if (!silent) setError(meetingAiError(reason))
      } finally {
        setSummaryBusy(null)
      }
    },
    [liveControls, meeting.id, summaryBusy],
  )

  // Optional Auto-Pulse every 3 minutes when >= 4 new segments arrived during live video call.
  useEffect(() => {
    if (variant !== 'room' || !autoPulse) return
    const timer = window.setInterval(() => {
      if (segments.length - lastAutoPulseCountRef.current >= 4 && !summaryBusy) {
        void handleGenerateSummary('LIVE_PULSE', true)
      }
    }, 180_000)
    return () => window.clearInterval(timer)
  }, [variant, autoPulse, segments.length, summaryBusy, handleGenerateSummary])

  async function submitManualNote(event: FormEvent) {
    event.preventDefault()
    const clean = manualText.trim()
    if (!clean || manualBusy) return
    setManualBusy(true)
    setError('')
    try {
      const created = await appendMeetingTranscript(meeting.id, {
        content: clean,
        language: liveControls?.language ?? 'vi-VN',
        source: 'MANUAL_NOTE',
        isHighlighted: manualImportant,
      })
      mergeSegments([created])
      setManualText('')
      setManualImportant(false)
      liveControls?.onBroadcastTranscriptSync?.(created.id)
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } catch (reason) {
      setError(meetingAiError(reason))
    } finally {
      setManualBusy(false)
    }
  }

  async function handleToggleHighlight(seg: MeetingTranscriptSegment) {
    try {
      const updated = await toggleTranscriptHighlight(meeting.id, seg.id, !seg.isHighlighted)
      mergeSegments([updated])
      liveControls?.onBroadcastTranscriptSync?.(updated.id)
    } catch (reason) {
      setError(meetingAiError(reason))
    }
  }

  async function handleDeleteSegment(seg: MeetingTranscriptSegment) {
    try {
      await deleteTranscriptSegment(meeting.id, seg.id)
      setSegments((prev) => prev.filter((item) => item.id !== seg.id))
      liveControls?.onBroadcastTranscriptSync?.(seg.id)
    } catch (reason) {
      setError(meetingAiError(reason))
    }
  }

  async function handleAsk(promptText?: string) {
    const q = (promptText ?? question).trim()
    if (!q || askBusy) return
    setAskBusy(true)
    setError('')
    try {
      const answer = await askMeetingAi(meeting.id, q)
      setQaHistory((prev) => [answer, ...prev].slice(0, 12))
      if (!promptText) setQuestion('')
    } catch (reason) {
      setError(meetingAiError(reason))
    } finally {
      setAskBusy(false)
    }
  }

  async function handleCoach(mode: MeetingAiCoachMode) {
    if (coachBusy) return
    setCoachBusy(mode)
    setError('')
    try {
      const result = await coachMeetingAi(meeting.id, mode, mode === 'CATCH_UP' ? 12 : null)
      setCoachResult(result)
      setTab('coach')
    } catch (reason) {
      setError(meetingAiError(reason))
    } finally {
      setCoachBusy(null)
    }
  }

  function jumpToSegment(segmentId: number) {
    setSearchText('')
    setSpeakerFilter('')
    setHighlightOnly(false)
    setTab('transcript')
    setFocusedSegmentId(segmentId)
    window.setTimeout(() => {
      const el = segmentElementMap.current.get(segmentId)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text)
      setNotice(successMessage)
    } catch {
      setError('Không thể sao chép vào bộ nhớ tạm trên trình duyệt này.')
    }
  }

  async function handleBridgeActionItem(item: MeetingAiActionItem, index: number) {
    if (!onCreateActionItem) return
    const key = `${activeInsight?.id ?? 0}:${index}`
    setBridgeBusyKey(key)
    setError('')
    setNotice('')
    try {
      await onCreateActionItem(item, selectedMilestoneId ? Number(selectedMilestoneId) : null)
      setAppliedActionKeys((prev) => ({ ...prev, [key]: true }))
      setNotice(`Đã lưu công việc "${item.title}" vào cuộc họp.`)
    } catch (reason) {
      setError(meetingAiError(reason))
    } finally {
      setBridgeBusyKey(null)
    }
  }

  async function handleBridgeDecision(text: string, index: number) {
    if (!onApplyDecision) return
    const key = `dec:${index}`
    setBridgeBusyKey(key)
    setError('')
    setNotice('')
    try {
      await onApplyDecision(text)
      setAppliedDecisions((prev) => ({ ...prev, [index]: true }))
      setNotice('Đã lưu kết luận vào quản trị cuộc họp.')
    } catch (reason) {
      setError(meetingAiError(reason))
    } finally {
      setBridgeBusyKey(null)
    }
  }

  const canWriteTranscript = meeting.status !== 'CANCELLED'
  const canRecordDecisionNow = canManage && meeting.status === 'COMPLETED' && Boolean(onApplyDecision)
  const canCreateActionNow = canManage && meeting.status !== 'CANCELLED' && Boolean(onCreateActionItem)

  return (
    <aside
      className={`mtg-ai-panel mtg-ai-panel--${variant}`}
      aria-label="Trợ lý AI Cuộc họp"
    >
      <div className="mtg-ai-head">
        <div className="mtg-ai-title-row">
          <div className="mtg-ai-brand">
            <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
            <div>
              <h2>Trợ lý AI Cuộc họp</h2>
              <p>
                {segments.length} lượt nói
                {speakerStats.length > 0 ? ` · ${speakerStats.length} người phát biểu` : ''}
                {liveControls?.status === 'listening' ? ' · Đang ghi nhận' : ''}
              </p>
            </div>
          </div>
          <div className="mtg-ai-head-actions">
            <button
              type="button"
              className="mtg-ai-icon-btn"
              title="Tải mới dữ liệu lời nói & phân tích"
              aria-label="Tải mới dữ liệu AI"
              onClick={() => void loadWorkspace(false)}
              disabled={loading}
            >
              <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            </button>
            {segments.length > 0 && (
              <button
                type="button"
                className="mtg-ai-icon-btn"
                title="Xuất bản ghi & tóm tắt AI (.md)"
                aria-label="Xuất biên bản Markdown"
                onClick={() =>
                  downloadTextFile(
                    `ai-meeting-${meeting.id}.md`,
                    buildTranscriptMarkdown(meeting.title, segments, activeInsight),
                  )
                }
              >
                <span className="material-symbols-outlined" aria-hidden="true">download</span>
              </button>
            )}
            {onClose && (
              <button
                type="button"
                className="mtg-ai-icon-btn"
                onClick={onClose}
                aria-label="Đóng Trợ lý AI"
                title="Đóng Trợ lý AI"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Live STT toolbar inside video room */}
        {liveControls && (
          <div className="mtg-ai-live-strip">
            <button
              type="button"
              className={`mtg-ai-live-toggle ${liveControls.enabled ? 'is-on' : ''}`}
              aria-pressed={liveControls.enabled}
              disabled={!liveControls.supported || !canWriteTranscript}
              onClick={liveControls.onToggleEnabled}
            >
              <span
                className={`mtg-ai-live-dot ${liveControls.status === 'listening' ? 'is-active' : ''}`}
                aria-hidden="true"
              />
              <span>{liveControls.enabled ? 'Đang đọc lời nói' : 'Bật đọc lời nói AI'}</span>
            </button>

            <select
              className="mtg-ai-lang-select"
              aria-label="Ngôn ngữ nhận diện giọng nói"
              value={liveControls.language}
              onChange={(event) => liveControls.onLanguageChange(event.target.value)}
            >
              <option value="vi-VN">Tiếng Việt</option>
              <option value="en-US">English</option>
            </select>

            <button
              type="button"
              className={`mtg-ai-pill-btn ${liveControls.captionsVisible ? 'is-active' : ''}`}
              aria-pressed={liveControls.captionsVisible}
              onClick={liveControls.onToggleCaptionsVisible}
              title="Hiện hoặc ẩn thanh phụ đề nổi trên khung video"
            >
              <span className="material-symbols-outlined" aria-hidden="true">closed_caption</span>
              <span>Phụ đề</span>
            </button>
          </div>
        )}

        {liveControls && (
          <p className="mtg-ai-status-line" role="status">
            {statusCopy[liveControls.status]}
            {liveControls.activeSpeakers.length > 0 && (
              <> · Đang nói: <strong>{liveControls.activeSpeakers.join(', ')}</strong></>
            )}
          </p>
        )}

        {/* 4 Studio Tabs */}
        <div className="mtg-ai-tabs" role="tablist" aria-label="Chức năng Trợ lý AI Cuộc họp">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'transcript'}
            onClick={() => setTab('transcript')}
          >
            Lời nói ({segments.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'summary'}
            onClick={() => setTab('summary')}
          >
            Tóm tắt & Biên bản
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ask'}
            onClick={() => setTab('ask')}
          >
            Hỏi AI
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'coach'}
            onClick={() => setTab('coach')}
          >
            Điều phối AI
          </button>
        </div>
      </div>

      {/* Notices & Errors */}
      <div className="mtg-ai-body">
        {liveControls?.error && (
          <div className="mtg-ai-alert mtg-ai-alert--warning" role="alert">
            <span>{liveControls.error}</span>
            <button type="button" onClick={liveControls.onClearError} aria-label="Đóng cảnh báo">✕</button>
          </div>
        )}
        {error && (
          <div className="mtg-ai-alert mtg-ai-alert--error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Đóng lỗi">✕</button>
          </div>
        )}
        {notice && (
          <div className="mtg-ai-alert mtg-ai-alert--success" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo">✕</button>
          </div>
        )}

        {loading ? (
          <p className="mtg-ai-muted" role="status">Đang tải dữ liệu Trợ lý AI cuộc họp…</p>
        ) : null}

        {/* TAB 1: LIVE TRANSCRIPT & SPEAKER STATS */}
        {!loading && tab === 'transcript' && (
          <div className="mtg-ai-tab-content">
            {speakerStats.length > 0 && (
              <div className="mtg-ai-speaker-bars" aria-label="Phân bố thời lượng phát biểu">
                <div className="mtg-ai-block-head">
                  <h3>Phân bố phát biểu</h3>
                  <small>{speakerStats.length} thành viên</small>
                </div>
                <div className="mtg-ai-speaker-chips">
                  {speakerStats.map((stat) => (
                    <button
                      key={`${stat.speakerUserId ?? stat.speakerName}`}
                      type="button"
                      className={`mtg-ai-speaker-chip ${speakerFilter === stat.speakerName ? 'is-selected' : ''}`}
                      onClick={() =>
                        setSpeakerFilter((curr) => (curr === stat.speakerName ? '' : stat.speakerName))
                      }
                      title={`${stat.segmentCount} lượt · ${stat.wordCount} từ${stat.highlightCount > 0 ? ` · ${stat.highlightCount} ý quan trọng` : ''}`}
                    >
                      <span className="mtg-ai-chip-name">{stat.speakerName}</span>
                      <span className="mtg-ai-chip-pct">{stat.sharePercent}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mtg-ai-filter-row">
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Tìm từ khóa hoặc người nói…"
                aria-label="Tìm trong nội dung lời nói"
              />
              <button
                type="button"
                className={`mtg-ai-pill-btn ${highlightOnly ? 'is-active' : ''}`}
                aria-pressed={highlightOnly}
                onClick={() => setHighlightOnly((v) => !v)}
                title="Chỉ hiện các ý đã đánh dấu quan trọng"
              >
                ★ Quan trọng
              </button>
            </div>

            {filteredSegments.length === 0 && interimCaptions.length === 0 ? (
              <div className="mtg-ai-empty">
                <span className="material-symbols-outlined" aria-hidden="true">graphic_eq</span>
                <strong>Chưa có nội dung lời nói được ghi nhận</strong>
                <p>
                  {variant === 'room'
                    ? 'Bấm "Bật đọc lời nói AI" ở trên để AI tự động chuyển giọng nói thành văn bản và hiện phụ đề cho cả phòng, hoặc nhập nhanh ghi chú lời nói bên dưới.'
                    : 'Bật Phụ đề AI trong phòng họp video hoặc nhập ghi chú trao đổi bên dưới để AI tạo biên bản & phân tích.'}
                </p>
              </div>
            ) : (
              <ol className="mtg-ai-transcript-list">
                {filteredSegments.map((seg) => {
                  const canDelete = canManage || (currentUserId !== null && seg.createdBy === currentUserId)
                  return (
                    <li
                      key={seg.id}
                      ref={(el) => {
                        if (el) segmentElementMap.current.set(seg.id, el)
                        else segmentElementMap.current.delete(seg.id)
                      }}
                      className={`mtg-ai-seg ${seg.isHighlighted ? 'is-highlighted' : ''} ${focusedSegmentId === seg.id ? 'is-focused' : ''}`}
                    >
                      <div className="mtg-ai-seg-meta">
                        <span className="mtg-ai-seg-avatar" aria-hidden="true">
                          {speakerInitials(seg.speakerName)}
                        </span>
                        <strong>{seg.speakerName}</strong>
                        <time dateTime={seg.spokenAt}>{formatVietnamClock(seg.spokenAt)}</time>
                        {seg.source === 'MANUAL_NOTE' && <span className="mtg-ai-tag">Ghi chú</span>}
                        <div className="mtg-ai-seg-actions">
                          {canWriteTranscript && (
                            <button
                              type="button"
                              className={`mtg-ai-star-btn ${seg.isHighlighted ? 'is-starred' : ''}`}
                              onClick={() => void handleToggleHighlight(seg)}
                              title={seg.isHighlighted ? 'Bỏ đánh dấu quan trọng' : 'Đánh dấu ý quan trọng'}
                              aria-label={seg.isHighlighted ? 'Bỏ đánh dấu quan trọng' : 'Đánh dấu ý quan trọng'}
                            >
                              {seg.isHighlighted ? '★' : '☆'}
                            </button>
                          )}
                          {canWriteTranscript && canDelete && (
                            <button
                              type="button"
                              className="mtg-ai-del-btn"
                              onClick={() => void handleDeleteSegment(seg)}
                              title="Xóa đoạn lời nói này"
                              aria-label="Xóa đoạn lời nói"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mtg-ai-seg-text">{seg.content}</p>
                    </li>
                  )
                })}

                {interimCaptions.map((cap) => (
                  <li key={cap.key} className="mtg-ai-seg is-interim">
                    <div className="mtg-ai-seg-meta">
                      <span className="mtg-ai-seg-avatar" aria-hidden="true">
                        {speakerInitials(cap.speakerName)}
                      </span>
                      <strong>{cap.speakerName}</strong>
                      <span className="mtg-ai-tag mtg-ai-tag--live">Đang nói…</span>
                    </div>
                    <p className="mtg-ai-seg-text">{cap.text}</p>
                  </li>
                ))}
              </ol>
            )}
            <div ref={transcriptEndRef} />

            {canWriteTranscript && (
              <form className="mtg-ai-manual-form" onSubmit={submitManualNote}>
                <input
                  type="text"
                  maxLength={2000}
                  value={manualText}
                  disabled={manualBusy}
                  onChange={(event) => setManualText(event.target.value)}
                  placeholder="Ghi nhanh ý vừa trao đổi hoặc bổ sung nội dung…"
                  aria-label="Ghi nhanh nội dung lời nói"
                />
                <button
                  type="button"
                  className={`mtg-ai-pill-btn ${manualImportant ? 'is-active' : ''}`}
                  aria-pressed={manualImportant}
                  onClick={() => setManualImportant((v) => !v)}
                  title="Đánh dấu là ý quan trọng"
                >
                  ★
                </button>
                <button
                  type="submit"
                  className="mtg-ai-primary-btn"
                  disabled={manualBusy || !manualText.trim()}
                >
                  {manualBusy ? 'Đang lưu…' : 'Ghi'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: AI SUMMARY & FULL MINUTES */}
        {!loading && tab === 'summary' && (
          <div className="mtg-ai-tab-content">
            <div className="mtg-ai-summary-actions">
              <button
                type="button"
                className="mtg-ai-secondary-btn"
                disabled={!aiAvailable || summaryBusy !== null}
                onClick={() => void handleGenerateSummary('LIVE_PULSE')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">bolt</span>
                <span>{summaryBusy === 'LIVE_PULSE' ? 'Đang cập nhật…' : 'Bắt kịp nhanh'}</span>
              </button>
              <button
                type="button"
                className="mtg-ai-primary-btn"
                disabled={!aiAvailable || summaryBusy !== null}
                onClick={() => void handleGenerateSummary('FULL_MINUTES')}
              >
                <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
                <span>{summaryBusy === 'FULL_MINUTES' ? 'Đang tạo biên bản…' : 'Tạo Biên bản AI'}</span>
              </button>
            </div>

            {variant === 'room' && (
              <label className="mtg-ai-autopulse">
                <input
                  type="checkbox"
                  checked={autoPulse}
                  onChange={(event) => setAutoPulse(event.target.checked)}
                />
                <span>Tự động tóm tắt nhanh mỗi 3 phút khi có lời nói mới</span>
              </label>
            )}

            {insights.length > 1 && (
              <label className="mtg-ai-history-select">
                <span>Phiên bản phân tích ({insights.length})</span>
                <select
                  value={activeInsight?.id ?? ''}
                  onChange={(event) => setSelectedInsightId(Number(event.target.value))}
                >
                  {insights.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.insightType === 'LIVE_PULSE' ? '⚡ Bắt kịp nhanh' : '✨ Biên bản đầy đủ'} ·{' '}
                      {formatVietnamDateTime(ins.createdAt)} ({ins.transcriptSegmentCount} lượt)
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!activeInsight ? (
              <div className="mtg-ai-empty">
                <span className="material-symbols-outlined" aria-hidden="true">summarize</span>
                <strong>Chưa có bản tóm tắt AI nào</strong>
                <p>
                  Bấm <strong>Bắt kịp nhanh</strong> để nắm diễn biến giữa buổi, hoặc{' '}
                  <strong>Tạo Biên bản AI</strong> để AI tổng hợp biên bản, kết luận, đầu việc, rủi ro và đối chiếu Agenda.
                </p>
              </div>
            ) : (
              <div className="mtg-ai-insight-view">
                <div className="mtg-ai-insight-meta">
                  <span className={`mtg-ai-badge mtg-ai-badge--${activeInsight.status === 'COMPLETED' ? 'primary' : 'warning'}`}>
                    {activeInsight.insightType === 'LIVE_PULSE' ? 'Tóm tắt trực tiếp' : 'Biên bản AI toàn diện'}
                  </span>
                  <small>
                    {formatVietnamDateTime(activeInsight.createdAt)} · {activeInsight.transcriptSegmentCount} lượt nói
                  </small>
                </div>

                {activeInsight.currentTopic && (
                  <p className="mtg-ai-current-topic">
                    <strong>Trọng tâm:</strong> {activeInsight.currentTopic}
                  </p>
                )}

                <section className="mtg-ai-card">
                  <h3>Tóm tắt điều hành</h3>
                  <p className="mtg-ai-prose">{activeInsight.executiveSummary}</p>
                  <div className="mtg-ai-card-actions">
                    {canManage && onApplyMinutesToNotes && meeting.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        className="mtg-ai-primary-btn"
                        onClick={() => onApplyMinutesToNotes(activeInsight.formattedMinutes)}
                      >
                        Điền vào Biên bản cuộc họp
                      </button>
                    )}
                    <button
                      type="button"
                      className="mtg-ai-mini-btn"
                      onClick={() => void copyText(activeInsight.formattedMinutes, 'Đã sao chép biên bản AI.')}
                    >
                      Sao chép biên bản
                    </button>
                  </div>
                </section>

                {activeInsight.keyTopics.length > 0 && (
                  <section className="mtg-ai-card">
                    <h3>Chủ đề thảo luận chính ({activeInsight.keyTopics.length})</h3>
                    <ul className="mtg-ai-list">
                      {activeInsight.keyTopics.map((topic, idx) => (
                        <li key={idx}>
                          <strong>{topic.title}</strong>
                          <p>{topic.summary}</p>
                          {topic.speakers.length > 0 && (
                            <small>Tham gia: {topic.speakers.join(', ')}</small>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {activeInsight.decisions.length > 0 && (
                  <section className="mtg-ai-card">
                    <h3>Kết luận & Thống nhất ({activeInsight.decisions.length})</h3>
                    <ul className="mtg-ai-list">
                      {activeInsight.decisions.map((decision, idx) => (
                        <li key={idx} className="mtg-ai-action-row">
                          <span>{decision}</span>
                          <div className="mtg-ai-row-btns">
                            {canRecordDecisionNow ? (
                              <button
                                type="button"
                                className="mtg-ai-mini-btn"
                                disabled={Boolean(appliedDecisions[idx]) || bridgeBusyKey === `dec:${idx}`}
                                onClick={() => void handleBridgeDecision(decision, idx)}
                              >
                                {appliedDecisions[idx]
                                  ? '✓ Đã lưu'
                                  : bridgeBusyKey === `dec:${idx}`
                                  ? 'Đang lưu…'
                                  : '+ Lưu kết luận'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="mtg-ai-mini-btn"
                                onClick={() => void copyText(decision, 'Đã sao chép kết luận.')}
                              >
                                Sao chép
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {activeInsight.actionItems.length > 0 && (
                  <section className="mtg-ai-card">
                    <div className="mtg-ai-block-head">
                      <h3>Công việc phát sinh ({activeInsight.actionItems.length})</h3>
                      {canCreateActionNow && milestones.length > 0 && (
                        <select
                          className="mtg-ai-inline-select"
                          aria-label="Mốc đồ án để đồng thời tạo Task"
                          value={selectedMilestoneId}
                          onChange={(event) => setMilestoneChoice(event.target.value)}
                        >
                          <option value="">Chỉ lưu Action Item</option>
                          {milestones.map((m) => (
                            <option key={m.id} value={m.id}>
                              + Tạo Task ở mốc: {m.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <ul className="mtg-ai-list">
                      {activeInsight.actionItems.map((item, idx) => {
                        const key = `${activeInsight.id}:${idx}`
                        const applied = Boolean(appliedActionKeys[key])
                        return (
                          <li key={idx} className="mtg-ai-action-card">
                            <div className="mtg-ai-action-top">
                              <strong>{item.title}</strong>
                              <span className={`mtg-ai-prio mtg-ai-prio--${item.priority.toLowerCase()}`}>
                                {priorityLabel(item.priority)}
                              </span>
                            </div>
                            {item.description && <p>{item.description}</p>}
                            <small className="mtg-ai-action-meta">
                              Phụ trách: <strong>{item.ownerName || 'Chưa xác định'}</strong>
                              {item.dueAt ? ` · Hạn: ${formatVietnamDateTime(item.dueAt)}` : ''}
                            </small>
                            {item.evidenceQuote && (
                              <blockquote className="mtg-ai-quote">
                                “{item.evidenceQuote}”
                                {item.sourceSegmentId && (
                                  <button
                                    type="button"
                                    className="mtg-ai-link-btn"
                                    onClick={() => jumpToSegment(item.sourceSegmentId!)}
                                  >
                                    Xem câu gốc ↗
                                  </button>
                                )}
                              </blockquote>
                            )}
                            {canCreateActionNow && (
                              <div className="mtg-ai-card-actions">
                                <button
                                  type="button"
                                  className="mtg-ai-mini-btn"
                                  disabled={applied || bridgeBusyKey === key}
                                  onClick={() => void handleBridgeActionItem(item, idx)}
                                >
                                  {applied
                                    ? '✓ Đã tạo công việc'
                                    : bridgeBusyKey === key
                                    ? 'Đang tạo…'
                                    : selectedMilestoneId
                                    ? '+ Lưu việc & tạo Task'
                                    : '+ Lưu Công việc sau họp'}
                                </button>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}

                {activeInsight.blockersAndRisks.length > 0 && (
                  <section className="mtg-ai-card mtg-ai-card--warning">
                    <h3>Vướng mắc & Rủi ro ({activeInsight.blockersAndRisks.length})</h3>
                    <ul className="mtg-ai-bullets">
                      {activeInsight.blockersAndRisks.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {activeInsight.agendaCoverage.length > 0 && (
                  <section className="mtg-ai-card">
                    <h3>Đối chiếu Agenda dự kiến</h3>
                    <ul className="mtg-ai-list">
                      {activeInsight.agendaCoverage.map((ag, idx) => {
                        const badge = agendaStatusLabel(ag.status)
                        return (
                          <li key={idx}>
                            <div className="mtg-ai-action-top">
                              <strong>{ag.item}</strong>
                              <span className={`mtg-ai-badge mtg-ai-badge--${badge.tone}`}>{badge.text}</span>
                            </div>
                            {ag.note && <small>{ag.note}</small>}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}

                {activeInsight.openQuestions.length > 0 && (
                  <section className="mtg-ai-card">
                    <h3>Câu hỏi còn bỏ ngỏ ({activeInsight.openQuestions.length})</h3>
                    <ul className="mtg-ai-bullets">
                      {activeInsight.openQuestions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {activeInsight.speakerInsights.length > 0 && (
                  <section className="mtg-ai-card">
                    <h3>Đóng góp nổi bật từng thành viên</h3>
                    <ul className="mtg-ai-list">
                      {activeInsight.speakerInsights.map((sp, idx) => (
                        <li key={idx}>
                          <strong>{sp.speakerName}</strong>
                          <p>{sp.summary}</p>
                          {sp.keyContributions.length > 0 && (
                            <ul className="mtg-ai-bullets">
                              {sp.keyContributions.map((c, ci) => (
                                <li key={ci}>{c}</li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {activeInsight.suggestedNextQuestions.length > 0 && (
                  <section className="mtg-ai-card">
                    <h3>Gợi ý câu hỏi thảo luận tiếp</h3>
                    <div className="mtg-ai-chips">
                      {activeInsight.suggestedNextQuestions.map((sq, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setTab('ask')
                            void handleAsk(sq)
                          }}
                        >
                          {sq}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {activeInsight.nextMeetingSuggestion && (
                  <section className="mtg-ai-card mtg-ai-card--accent">
                    <h3>Đề xuất cuộc họp tiếp theo</h3>
                    <strong>{activeInsight.nextMeetingSuggestion.title}</strong>
                    {activeInsight.nextMeetingSuggestion.purpose && (
                      <p>{activeInsight.nextMeetingSuggestion.purpose}</p>
                    )}
                    {activeInsight.nextMeetingSuggestion.suggestedTimeNote && (
                      <small>Thời gian gợi ý: {activeInsight.nextMeetingSuggestion.suggestedTimeNote}</small>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASK AI ABOUT THE MEETING */}
        {!loading && tab === 'ask' && (
          <div className="mtg-ai-tab-content">
            <div className="mtg-ai-chips" aria-label="Câu hỏi gợi ý nhanh">
              {QUICK_ASK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={!aiAvailable || askBusy}
                  onClick={() => void handleAsk(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              className="mtg-ai-ask-form"
              onSubmit={(event) => {
                event.preventDefault()
                void handleAsk()
              }}
            >
              <input
                type="text"
                maxLength={600}
                value={question}
                disabled={!aiAvailable || askBusy}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Hỏi AI về bất kỳ nội dung nào vừa nói trong cuộc họp…"
                aria-label="Câu hỏi cho Trợ lý AI cuộc họp"
              />
              <button
                type="submit"
                className="mtg-ai-primary-btn"
                disabled={!aiAvailable || askBusy || question.trim().length < 2}
              >
                {askBusy ? 'Đang trả lời…' : 'Hỏi AI'}
              </button>
            </form>

            {qaHistory.length === 0 ? (
              <div className="mtg-ai-empty">
                <span className="material-symbols-outlined" aria-hidden="true">forum</span>
                <strong>Hỏi đáp trực tiếp trên nội dung cuộc họp</strong>
                <p>
                  Chọn một gợi ý nhanh ở trên hoặc đặt câu hỏi bất kỳ. AI trả lời kèm trích dẫn chính xác đoạn lời nói gốc.
                </p>
              </div>
            ) : (
              <div className="mtg-ai-qa-list">
                {qaHistory.map((qa, idx) => (
                  <article key={`${qa.generatedAt}-${idx}`} className="mtg-ai-card">
                    <p className="mtg-ai-qa-q">
                      <strong>Hỏi:</strong> {qa.question}
                    </p>
                    <p className="mtg-ai-prose">{qa.answer}</p>
                    {qa.citations.length > 0 && (
                      <div className="mtg-ai-citations">
                        <small>Trích dẫn từ lời nói:</small>
                        <ul>
                          {qa.citations.map((cit) => (
                            <li key={cit.segmentId}>
                              <button
                                type="button"
                                className="mtg-ai-citation-btn"
                                onClick={() => jumpToSegment(cit.segmentId)}
                              >
                                <strong>{cit.speakerName}</strong> ({formatVietnamClock(cit.spokenAt)}): “{cit.excerpt}”
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {qa.followUpQuestions.length > 0 && (
                      <div className="mtg-ai-chips">
                        {qa.followUpQuestions.map((fq, fi) => (
                          <button
                            key={fi}
                            type="button"
                            disabled={askBusy}
                            onClick={() => void handleAsk(fq)}
                          >
                            {fq}
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AI MEETING COACH & PROJECT TASK AUDIT */}
        {!loading && tab === 'coach' && (
          <div className="mtg-ai-tab-content">
            <div className="mtg-ai-coach-grid">
              {COACH_ACTIONS.filter((a) => !a.supervisorOnly || isSupervisor || canManage).map((action) => (
                <button
                  key={action.mode}
                  type="button"
                  className={`mtg-ai-coach-btn ${coachResult?.mode === action.mode ? 'is-active' : ''}`}
                  disabled={!aiAvailable || coachBusy !== null}
                  onClick={() => void handleCoach(action.mode)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">{action.icon}</span>
                  <div>
                    <strong>{coachBusy === action.mode ? 'Đang phân tích…' : action.label}</strong>
                    <small>{action.hint}</small>
                  </div>
                </button>
              ))}
            </div>

            {!coachResult ? (
              <div className="mtg-ai-empty">
                <span className="material-symbols-outlined" aria-hidden="true">psychology</span>
                <strong>Trợ lý Điều phối & Đối chiếu Đồ án</strong>
                <p>
                  AI đọc song song nội dung cuộc họp với <strong>Agenda, Milestone và danh sách Task thật</strong> của đồ án để cảnh báo task quá hạn/bị chặn chưa được nhắc tới.
                </p>
              </div>
            ) : (
              <div className="mtg-ai-insight-view">
                <section className="mtg-ai-card mtg-ai-card--accent">
                  <h3>{coachResult.headline}</h3>
                  <p className="mtg-ai-prose">{coachResult.summary}</p>
                </section>

                {coachResult.findings.length > 0 && (
                  <section className="mtg-ai-card">
                    <h3>Phát hiện & Lưu ý ({coachResult.findings.length})</h3>
                    <ul className="mtg-ai-list">
                      {coachResult.findings.map((finding, idx) => (
                        <li
                          key={idx}
                          className={`mtg-ai-finding mtg-ai-finding--${finding.severity.toLowerCase()}`}
                        >
                          <div className="mtg-ai-action-top">
                            <strong>{finding.title}</strong>
                            <span className={`mtg-ai-sev mtg-ai-sev--${finding.severity.toLowerCase()}`}>
                              {severityLabel(finding.severity)}
                            </span>
                          </div>
                          <p>{finding.detail}</p>
                          {finding.relatedEntity && <small>Liên quan: {finding.relatedEntity}</small>}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {coachResult.draftText && (
                  <section className="mtg-ai-card">
                    <h3>Bản nháp nhận xét đề xuất</h3>
                    <p className="mtg-ai-prose">{coachResult.draftText}</p>
                    <div className="mtg-ai-card-actions">
                      {isSupervisor && onApplySupervisorFeedback && meeting.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          className="mtg-ai-primary-btn"
                          onClick={() => onApplySupervisorFeedback(coachResult.draftText!)}
                        >
                          Điền vào khung Nhận xét GVHD
                        </button>
                      )}
                      <button
                        type="button"
                        className="mtg-ai-mini-btn"
                        onClick={() => void copyText(coachResult.draftText!, 'Đã sao chép bản nháp nhận xét.')}
                      >
                        Sao chép nháp
                      </button>
                    </div>
                  </section>
                )}

                {coachResult.suggestedPrompts.length > 0 && (
                  <section className="mtg-ai-card">
                    <h3>Câu hỏi điều phối gợi ý cho cuộc họp</h3>
                    <ul className="mtg-ai-bullets">
                      {coachResult.suggestedPrompts.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
