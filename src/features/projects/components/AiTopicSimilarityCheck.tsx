import { useEffect, useRef, useState, type ReactNode } from 'react'
import { services } from '../../../services/service-gateway'
import { HttpError } from '../../../services/http/http-client'
import type { AiTopicSimilarityRequest, AiTopicSimilarityResultDto } from '../../../types/backend'

const buttonClass = 'min-h-11 rounded-lg border border-hairline px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50'

/** Key this component by actor identity and academic scope (not every keystroke) so edits preserve readable results while flagging staleness. */
export function AiTopicSimilarityCheck({ input, children }: { input: AiTopicSimilarityRequest; children?: ReactNode }) {
  const pending = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [checked, setChecked] = useState<{ signature: string; result: AiTopicSimilarityResultDto } | null>(null)
  useEffect(() => () => { pending.current?.abort() }, [])

  const inputSignature = JSON.stringify({
    teamId: input.teamId,
    projectId: input.projectId ?? null,
    title: input.title.trim(),
    problemStatement: input.problemStatement ?? '',
    objectives: input.objectives ?? '',
    expectedOutput: input.expectedOutput ?? '',
    domain: input.domain ?? '',
    keywords: input.keywords ?? [],
  })

  const check = async () => {
    if (pending.current || !input.title.trim() || !input.teamId) return
    const controller = new AbortController()
    const runSignature = inputSignature
    pending.current = controller
    setBusy(true); setError('')
    try {
      const response = await services.topic.checkTopicSimilarityWithAi(input, controller.signal)
      if (!controller.signal.aborted) setChecked({ signature: runSignature, result: response })
    } catch (reason) {
      if (!controller.signal.aborted) setError(errorMessage(reason))
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(false) }
    }
  }

  const isStale = Boolean(checked && checked.signature !== inputSignature)

  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap gap-2">{children}<button type="button" className={buttonClass} disabled={busy || !input.title.trim() || !input.teamId} onClick={() => void check()}>{busy ? 'Đang đối chiếu ý tưởng…' : isStale ? 'Kiểm tra lại bằng AI' : 'Kiểm tra ý tưởng bằng AI'}</button></div>
    {!input.teamId && <p className="text-xs text-status-warning-text">Cần tạo nhóm đồ án với tư cách trưởng nhóm trước khi đối chiếu ý tưởng bằng AI.</p>}
    <p className="text-xs leading-relaxed text-ink-muted">AI đối chiếu tên, vấn đề, mục tiêu và sản phẩm kỳ vọng. Bổ sung nội dung đề cương để có căn cứ tốt hơn. Kết quả chỉ hỗ trợ rà soát, không quyết định việc nộp.</p>
    {busy && <p role="status" className="text-sm text-ink-muted">Đang đọc các đề tài trong phạm vi được phép và phân tích mức tương đồng…</p>}
    {error && <div role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error-text"><p>{error}</p><button type="button" className={`mt-2 ${buttonClass}`} onClick={() => void check()}>Thử lại kiểm tra AI</button></div>}
    {checked && <AiSimilarityResult result={checked.result} stale={isStale} />}
  </div>
}

function AiSimilarityResult({ result, stale }: { result: AiTopicSimilarityResultDto; stale: boolean }) {
  const completed = result.generationStatus === 'COMPLETED'
  const label = completed ? 'Đã đối chiếu bằng AI' : result.generationStatus === 'FALLBACK' ? 'Chưa hoàn tất phân tích AI' : 'Chưa đủ dữ liệu để đối chiếu ý tưởng'
  return <section aria-label="Kết quả đối chiếu ý tưởng" className="space-y-3 rounded-xl border border-hairline bg-canvas p-4 text-sm text-ink">
    {stale && <p role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-xs font-medium text-status-warning-text">Nội dung đề cương đã thay đổi sau lần kiểm tra gần nhất — bấm kiểm tra lại để cập nhật kết quả mới.</p>}
    <h2 className="font-semibold" role="status">{label}</h2>
    <p>{result.summary}</p>
    {!completed && <p className="text-status-warning-text">Không thể kết luận ý tưởng không trùng. Bạn vẫn có thể dùng kiểm tra tên đề tài và rà soát cùng giảng viên.</p>}
    {result.exactMatch && <p className="rounded-lg border border-status-error-border bg-status-error-bg p-3 text-status-error-text">Tên đề tài trùng với đề tài đã có: <strong>{result.exactMatch.title}</strong>. Cần xử lý theo kiểm tra đăng ký chính thức.</p>}
    {result.similar.length > 0 && <div><h3 className="font-semibold">Tương đồng theo từ khóa</h3><ul className="list-disc pl-5">{result.similar.map((item, index) => <li key={`${item.id}:${index}`}>{item.title} · kỳ {item.semesterCode} · điểm từ khóa {Math.round(item.score * 100)}%</li>)}</ul></div>}
    <p className="text-ink-muted">Đã đối chiếu {result.reviewedCount}/{result.candidateCount} đề tài trong tập dữ liệu được chọn.{result.truncated ? ' Danh sách đã được giới hạn; chưa bao phủ toàn bộ kết quả trong phạm vi.' : ''}</p>
    {completed && result.matches.length === 0 && <p>Chưa phát hiện ý tưởng tương đồng trong các đề tài đã đối chiếu. Đây không phải xác nhận đề tài hoàn toàn mới.</p>}
    {completed && result.matches.map(match => <article key={`${match.sourceType}:${match.id}`} className="space-y-2 rounded-lg border border-hairline bg-card p-3 break-words">
      <h3 className="font-semibold">{match.title}</h3>
      <p className="text-ink-muted">{match.sourceType === 'TOPIC' ? 'Đề tài' : 'Đồ án'} · kỳ {match.semesterCode} · tương đồng {({ HIGH: 'cao', MEDIUM: 'trung bình', LOW: 'thấp' })[match.similarityLevel]}</p>
      <p>{match.reason}</p>
      <h4 className="font-semibold">Điểm giống</h4><ul className="list-disc pl-5">{match.sharedAspects.map((value, index) => <li key={index}>{value}</li>)}</ul>
      <h4 className="font-semibold">Điểm khác</h4><ul className="list-disc pl-5">{match.differences.map((value, index) => <li key={index}>{value}</li>)}</ul>
      <details><summary className="min-h-11 cursor-pointer py-3 font-semibold text-primary">Xem đoạn đối chiếu</summary><p className="font-semibold">Đề cương đang nhập</p><blockquote className="my-2 whitespace-pre-wrap border-l-2 border-hairline pl-3">{match.proposalExcerpt}</blockquote><p className="font-semibold">Đề tài được đối chiếu</p><blockquote className="my-2 whitespace-pre-wrap border-l-2 border-hairline pl-3">{match.candidateExcerpt}</blockquote></details>
    </article>)}
    <p className="text-xs text-ink-muted">{result.limitationNote}</p>
    <p className="text-xs text-ink-muted">Kiểm tra lúc {formatDate(result.generatedAt)} · giờ Việt Nam</p>
  </section>
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Chưa xác định' : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) }
function errorMessage(reason: unknown) {
  if (reason instanceof HttpError) {
    if (reason.status === 401) return 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để kiểm tra.'
    if (reason.status === 403) return reason.message?.trim() || 'Bạn chưa có quyền kiểm tra đề tài cho nhóm này.'
    if (reason.status === 404) return 'Chưa tìm thấy nhóm hoặc đồ án trong phạm vi hiện tại.'
    if (reason.status === 429) return 'Đã vượt giới hạn kiểm tra AI. Hãy chờ một lúc rồi thử lại.'
    if ([400, 409, 422].includes(reason.status)) return reason.message?.trim() || 'Chưa thể kiểm tra với nội dung hoặc trạng thái hiện tại. Kiểm tra thông tin nhóm và đề cương rồi thử lại.'
  }
  return 'Chưa kiểm tra được ý tưởng bằng AI. Nội dung đề cương được giữ nguyên; hãy thử lại.'
}
