import { useEffect, useRef, useState } from 'react'
import {
  evaluateDefenseAnswer,
  formatAiSuiteError,
  generateDefenseMock,
  generateGateScriptDraft,
  getLatestDefenseMock,
} from './ai-suite-api'
import type {
  CommitteeRoleFocus,
  DefenseAnswerEvalDto,
  DefenseMockDto,
  DefenseMockQuestionDto,
  GateScriptDraftDto,
} from './ai-suite.types'
import { AiSuiteCardShell } from './AiSuiteCardShell'

interface BrowserSpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechCtor = new () => BrowserSpeechRecognition

function getSpeechRecognitionCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ROLE_LABELS: Record<string, string> = {
  ALL: 'Toàn hội đồng',
  CHAIR: 'Chủ tịch Hội đồng',
  REVIEWER: 'Phản biện',
  SECRETARY: 'Thư ký',
  INDUSTRY: 'Chuyên gia doanh nghiệp',
}

const DIFF_TONE: Record<string, string> = {
  HARD: 'ais-pill ais-pill--danger',
  MEDIUM: 'ais-pill ais-pill--warning',
  EASY: 'ais-pill ais-pill--success',
}

const DIFF_LABEL: Record<string, string> = {
  HARD: 'Khó',
  MEDIUM: 'Trung bình',
  EASY: 'Cơ bản',
}

const VERDICT_LABEL: Record<string, { text: string; cls: string }> = {
  STRONG: { text: 'Trả lời xuất sắc', cls: 'ais-pill ais-pill--success' },
  ADEQUATE: { text: 'Đạt yêu cầu', cls: 'ais-pill ais-pill--warning' },
  NEEDS_IMPROVEMENT: { text: 'Cần củng cố thêm', cls: 'ais-pill ais-pill--danger' },
}

export function DefenseMockPanel({ projectId }: { projectId: number }) {
  const [roleFocus, setRoleFocus] = useState<CommitteeRoleFocus>('ALL')
  const [questionCount, setQuestionCount] = useState(6)
  const [focusTopic, setFocusTopic] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  const [data, setData] = useState<DefenseMockDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingLatest, setLoadingLatest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [activePracticeId, setActivePracticeId] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const res = await generateDefenseMock(projectId, {
        roleFocus,
        questionCount,
        focusTopic: focusTopic.trim() || null,
      })
      setData(res)
      setActivePracticeId(res.questions[0]?.id ?? null)
    } catch (err) {
      setError(formatAiSuiteError(err, 'Không thể tạo bộ câu hỏi luyện bảo vệ lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  const handleLoadLatest = async () => {
    setLoadingLatest(true)
    setError(null)
    setNotice(null)
    try {
      const res = await getLatestDefenseMock(projectId)
      if (!res) {
        setNotice('Chưa có phiên luyện bảo vệ nào được lưu cho đồ án này. Hãy bấm "Tạo bộ câu hỏi phản biện".')
      } else {
        setData(res)
        setActivePracticeId(res.questions[0]?.id ?? null)
      }
    } catch (err) {
      setError(formatAiSuiteError(err))
    } finally {
      setLoadingLatest(false)
    }
  }

  const markdown = data
    ? [
        `# ${data.headline}`,
        '',
        data.readinessAssessment,
        '',
        '## Điểm yếu cần gia cố',
        ...data.weakSpots.map((w) => `- ${w}`),
        '',
        '## Bộ câu hỏi luyện bảo vệ',
        ...data.questions.map(
          (q, idx) =>
            `${idx + 1}. **[${ROLE_LABELS[q.committeeRole] ?? q.committeeRole} · ${DIFF_LABEL[q.difficulty] ?? q.difficulty}]** ${q.question}\n   - Gợi ý trả lời: ${q.suggestedAnswerOutline}`,
        ),
      ].join('\n')
    : undefined

  return (
    <AiSuiteCardShell
      icon="record_voice_over"
      title="AI Luyện Bảo vệ & Chấm thử Câu trả lời (Voice / Text)"
      badge="Mục #1 · Hội đồng giả lập"
      subtitle="Sinh câu hỏi phản biện sát đồ án thực tế, luyện nói trực tiếp bằng micro (Web Speech API) và nhận chấm điểm 0–10 + câu vặn lại tức thì."
      meta={data?.meta}
      markdownText={markdown}
      error={error}
      notice={notice}
      actions={
        <>
          <button type="button" className="ais-btn" disabled={loading || loadingLatest} onClick={() => setShowOptions((v) => !v)}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">tune</span>
            {showOptions ? 'Ẩn tùy chỉnh' : 'Tùy chỉnh'}
          </button>
          <button type="button" className="ais-btn" disabled={loading || loadingLatest} onClick={() => void handleLoadLatest()}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">history</span>
            {loadingLatest ? 'Đang tải…' : 'Phiên gần nhất'}
          </button>
          <button type="button" className="ais-btn ais-btn--primary" disabled={loading || loadingLatest} onClick={() => void handleGenerate()}>
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
            {loading ? 'Đang mô phỏng hội đồng…' : data ? 'Tạo bộ câu hỏi mới' : 'Tạo bộ câu hỏi phản biện'}
          </button>
        </>
      }
    >
      {showOptions && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-ink-soft">
            Trọng tâm giả lập
            <select className="ais-select mt-1" value={roleFocus} disabled={loading} onChange={(e) => setRoleFocus(e.target.value as CommitteeRoleFocus)}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-soft">
            Số câu hỏi
            <select className="ais-select mt-1" value={questionCount} disabled={loading} onChange={(e) => setQuestionCount(Number(e.target.value))}>
              {[4, 6, 8, 10].map((n) => (
                <option key={n} value={n}>{n} câu hỏi</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-soft">
            Chủ đề muốn xoáy sâu (tùy chọn)
            <input
              className="ais-input mt-1"
              value={focusTopic}
              disabled={loading}
              placeholder="vd: kiến trúc DB, bảo mật, AI model…"
              onChange={(e) => setFocusTopic(e.target.value)}
            />
          </label>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="ais-subcard space-y-2">
            <h4 className="text-sm font-bold text-ink">{data.headline}</h4>
            <p className="text-xs leading-relaxed text-ink-soft">{data.readinessAssessment}</p>
            {data.weakSpots.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-bold text-status-warning-text">Điểm yếu dễ bị hội đồng xoáy sâu:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-ink-soft">
                  {data.weakSpots.map((spot, idx) => <li key={idx}>{spot}</li>)}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {data.questions.map((q, index) => (
              <DefenseQuestionCard
                key={q.id || index}
                projectId={projectId}
                index={index}
                question={q}
                expanded={activePracticeId === (q.id || String(index))}
                onToggle={() => setActivePracticeId((curr) => (curr === (q.id || String(index)) ? null : q.id || String(index)))}
              />
            ))}
          </div>
        </div>
      )}
    </AiSuiteCardShell>
  )
}

function DefenseQuestionCard({
  projectId,
  index,
  question,
  expanded,
  onToggle,
}: {
  projectId: number
  index: number
  question: DefenseMockQuestionDto
  expanded: boolean
  onToggle: () => void
}) {
  const [activePrompt, setActivePrompt] = useState(question.question)
  const [answer, setAnswer] = useState('')
  const [interimVoice, setInterimVoice] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState<DefenseAnswerEvalDto | null>(null)
  const [evalError, setEvalError] = useState<string | null>(null)
  const [showOutline, setShowOutline] = useState(false)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const speechSupported = Boolean(getSpeechRecognitionCtor())

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop()
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [])

  const toggleVoice = () => {
    setVoiceError(null)
    if (listening) {
      try {
        recognitionRef.current?.stop()
      } catch {
        // Ignore stop errors
      }
      setListening(false)
      setInterimVoice('')
      return
    }
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setVoiceError('Trình duyệt hiện tại không hỗ trợ nhận diện giọng nói Web Speech API. Bạn vẫn có thể gõ câu trả lời bên dưới.')
      return
    }
    try {
      const rec = new Ctor()
      rec.lang = 'vi-VN'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (event) => {
        let finalText = ''
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const seg = event.results[i]
          const transcript = seg[0]?.transcript ?? ''
          if (seg.isFinal) finalText += transcript + ' '
          else interim += transcript
        }
        if (finalText.trim()) {
          setAnswer((prev) => `${prev.trim() ? prev.trim() + ' ' : ''}${finalText.trim()}`)
        }
        setInterimVoice(interim)
      }
      rec.onerror = (ev) => {
        setVoiceError(ev.error === 'not-allowed' ? 'Chưa cấp quyền micro cho trình duyệt.' : 'Không thể ghi âm lúc này, hãy kiểm tra micro.')
        setListening(false)
        setInterimVoice('')
      }
      rec.onend = () => {
        setListening(false)
        setInterimVoice('')
      }
      recognitionRef.current = rec
      rec.start()
      setListening(true)
    } catch {
      setVoiceError('Không thể khởi chạy micro. Hãy thử lại hoặc nhập trực tiếp bằng bàn phím.')
      setListening(false)
    }
  }

  const handleEvaluate = async () => {
    const cleaned = `${answer} ${interimVoice}`.trim()
    if (cleaned.length < 5) {
      setEvalError('Hãy nói hoặc nhập câu trả lời tối thiểu 5 ký tự trước khi chấm.')
      return
    }
    if (listening) toggleVoice()
    setEvaluating(true)
    setEvalError(null)
    try {
      const res = await evaluateDefenseAnswer(projectId, {
        question: activePrompt,
        studentAnswer: cleaned,
        committeeRole: question.committeeRole,
        suggestedOutline: question.suggestedAnswerOutline,
      })
      setEvalResult(res)
    } catch (err) {
      setEvalError(formatAiSuiteError(err, 'Không thể chấm câu trả lời lúc này.'))
    } finally {
      setEvaluating(false)
    }
  }

  const verdictInfo = evalResult ? VERDICT_LABEL[evalResult.verdict] ?? VERDICT_LABEL.ADEQUATE : null

  return (
    <article className="rounded-xl border border-hairline bg-card p-4 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="ais-pill ais-pill--neutral">Câu {index + 1}</span>
            <span className="ais-pill ais-pill--ai">{ROLE_LABELS[question.committeeRole] ?? question.committeeRole}</span>
            <span className={DIFF_TONE[question.difficulty] ?? 'ais-pill ais-pill--neutral'}>{DIFF_LABEL[question.difficulty] ?? question.difficulty}</span>
            {question.category && <span className="ais-pill ais-pill--neutral">{question.category}</span>}
            {question.targetStudentName && <span className="ais-pill ais-pill--warning">Hướng tới: {question.targetStudentName}</span>}
          </div>
          <p className="text-sm font-bold leading-snug text-ink">{activePrompt}</p>
          <p className="text-xs text-ink-muted"><strong>Mục đích hỏi:</strong> {question.whyAsked}</p>
        </div>
        <button type="button" className="ais-btn" onClick={onToggle} aria-expanded={expanded}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{expanded ? 'expand_less' : 'mic'}</span>
          {expanded ? 'Thu gọn' : 'Luyện trả lời'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-hairline pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={listening ? 'ais-btn ais-btn--mic-active' : 'ais-btn'}
              onClick={toggleVoice}
              title={speechSupported ? 'Bấm để nói câu trả lời tiếng Việt' : 'Trình duyệt không hỗ trợ Web Speech API'}
            >
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">{listening ? 'stop_circle' : 'mic'}</span>
              {listening ? 'Đang nghe… (Bấm để dừng)' : 'Trả lời bằng giọng nói (vi-VN)'}
            </button>
            <button type="button" className="ais-btn" onClick={() => setShowOutline((v) => !v)}>
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">lightbulb</span>
              {showOutline ? 'Ẩn gợi ý trả lời' : 'Xem gợi ý trả lời'}
            </button>
            {activePrompt !== question.question && (
              <button
                type="button"
                className="ais-btn"
                onClick={() => {
                  setActivePrompt(question.question)
                  setEvalResult(null)
                }}
              >
                Về câu hỏi gốc
              </button>
            )}
          </div>

          {voiceError && <p role="alert" className="ais-error">{voiceError}</p>}

          {showOutline && (
            <div className="ais-subcard space-y-1.5 text-xs">
              <p className="font-bold text-primary">Hướng trả lời gợi ý:</p>
              <p className="text-ink-soft leading-relaxed">{question.suggestedAnswerOutline}</p>
              {question.keyPointsToMention.length > 0 && (
                <ul className="list-disc pl-5 text-ink-soft">
                  {question.keyPointsToMention.map((pt, i) => <li key={i}>{pt}</li>)}
                </ul>
              )}
            </div>
          )}

          <label className="block text-xs font-semibold text-ink-soft">
            Câu trả lời của bạn (có thể nói qua micro hoặc gõ chỉnh sửa):
            <textarea
              className="ais-textarea mt-1"
              rows={3}
              value={answer}
              disabled={evaluating}
              placeholder="Trình bày ngắn gọn, có số liệu và dẫn chứng từ kiến trúc/sản phẩm của nhóm…"
              onChange={(e) => setAnswer(e.target.value)}
            />
          </label>
          {interimVoice && (
            <p className="text-xs italic text-primary">Đang nhận dạng giọng nói: “{interimVoice}”</p>
          )}

          {evalError && <p role="alert" className="ais-error">{evalError}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="ais-btn ais-btn--primary" disabled={evaluating} onClick={() => void handleEvaluate()}>
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">fact_check</span>
              {evaluating ? 'AI đang chấm câu trả lời…' : 'AI Chấm điểm câu trả lời (0–10)'}
            </button>
          </div>

          {evalResult && (
            <div className="ais-subcard space-y-2.5 border-primary/25 bg-primary-subtle/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-primary">{evalResult.score.toFixed(1)}/10</span>
                  {verdictInfo && <span className={verdictInfo.cls}>{verdictInfo.text}</span>}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-ink">{evalResult.feedback}</p>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                {evalResult.strengths.length > 0 && (
                  <div>
                    <p className="font-bold text-status-success-text">Điểm mạnh:</p>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5 text-ink-soft">
                      {evalResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {evalResult.missingPoints.length > 0 && (
                  <div>
                    <p className="font-bold text-status-warning-text">Ý còn thiếu cần bổ sung:</p>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5 text-ink-soft">
                      {evalResult.missingPoints.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              {evalResult.improvedAnswerSample && (
                <div className="rounded-lg border border-hairline bg-card p-2.5 text-xs">
                  <p className="font-bold text-ink">Câu trả lời mẫu nâng cấp:</p>
                  <p className="mt-1 leading-relaxed text-ink-soft">{evalResult.improvedAnswerSample}</p>
                </div>
              )}
              {evalResult.followUpProbe && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-status-warning-border bg-status-warning-bg p-2.5 text-xs text-status-warning-text">
                  <div>
                    <strong>Câu hỏi vặn lại từ hội đồng:</strong> {evalResult.followUpProbe}
                  </div>
                  <button
                    type="button"
                    className="ais-btn"
                    onClick={() => {
                      setActivePrompt(evalResult.followUpProbe!)
                      setAnswer('')
                      setEvalResult(null)
                    }}
                  >
                    Luyện trả lời câu này
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export function GateScriptAiPanel({
  gateInstanceId,
  onApplyToScript,
}: {
  gateInstanceId: number
  onApplyToScript?: (draft: GateScriptDraftDto) => void
}) {
  const [focusNote, setFocusNote] = useState('')
  const [draft, setDraft] = useState<GateScriptDraftDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setApplied(false)
    try {
      const res = await generateGateScriptDraft(gateInstanceId, { focusNote: focusNote.trim() || null })
      setDraft(res)
    } catch (err) {
      setError(formatAiSuiteError(err, 'Không thể tạo kịch bản hỏi đáp cổng lúc này.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AiSuiteCardShell
      compact
      icon="script"
      title="AI Soạn Kịch bản Phiên Thẩm định & Câu hỏi Hội đồng"
      badge="Mục #1b · Hội đồng"
      subtitle="Tổng hợp hồ sơ cổng, task đang mở và yêu cầu chưa đạt để gợi ý kịch bản điều phối, câu hỏi xoáy sâu và danh mục cần chỉnh sửa."
      meta={draft?.meta}
      error={error}
      actions={
        <button type="button" className="ais-btn ais-btn--primary" disabled={loading} onClick={() => void handleGenerate()}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
          {loading ? 'Đang soạn kịch bản…' : draft ? 'Tạo lại kịch bản' : 'AI Gợi ý kịch bản phiên'}
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="ais-input flex-1"
          value={focusNote}
          disabled={loading}
          placeholder="Ghi chú trọng tâm thẩm định (tùy chọn, vd: kiểm tra demo thực tế & bảo mật)…"
          onChange={(e) => setFocusNote(e.target.value)}
        />
      </div>

      {draft && (
        <div className="space-y-3 text-xs">
          <div className="ais-subcard space-y-1.5">
            <p className="font-bold text-ink">Tóm tắt điều hành ({draft.gateCode}):</p>
            <p className="text-ink-soft leading-relaxed">{draft.executiveBrief}</p>
          </div>

          {draft.suggestedQuestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-bold text-ink">Câu hỏi hội đồng gợi ý ({draft.suggestedQuestions.length}):</p>
              <ul className="space-y-1.5">
                {draft.suggestedQuestions.map((q, idx) => (
                  <li key={idx} className="rounded-lg border border-hairline bg-card p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="ais-pill ais-pill--ai">{ROLE_LABELS[q.askerRole] ?? q.askerRole}</span>
                      {q.targetMemberName && <span className="ais-pill ais-pill--warning">Hỏi: {q.targetMemberName}</span>}
                    </div>
                    <p className="mt-1 font-semibold text-ink">{q.question}</p>
                    <p className="mt-0.5 text-ink-muted">Mục tiêu kiểm chứng: {q.verificationGoal}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {draft.remediationWatchlist.length > 0 && (
            <div className="ais-subcard">
              <p className="font-bold text-status-warning-text">Hạng mục cần theo dõi / yêu cầu sửa nếu chưa đạt:</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5 text-ink-soft">
                {draft.remediationWatchlist.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          )}

          {onApplyToScript && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ais-btn ais-btn--success"
                onClick={() => {
                  onApplyToScript(draft)
                  setApplied(true)
                }}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">playlist_add_check</span>
                {applied ? 'Đã chèn vào kịch bản phiên ✓' : 'Áp dụng vào kịch bản & câu hỏi phiên'}
              </button>
            </div>
          )}
        </div>
      )}
    </AiSuiteCardShell>
  )
}
