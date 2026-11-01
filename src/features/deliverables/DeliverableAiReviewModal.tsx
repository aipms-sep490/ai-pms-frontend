import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { HttpError } from '../../services/http/http-client'
import * as api from '../../services/api/deliverables.api'
import type { DeliverableReviewOptions, DeliverableReviewResponse } from './deliverable-types'

export function DeliverableAiReviewModal(props: { projectId: number; versionId: number; versionNumber: number; onClose: () => void }) {
  return <ReviewContent key={`${props.projectId}:${props.versionId}`} {...props} />
}

function ReviewContent({ projectId, versionId, versionNumber, onClose }: { projectId: number; versionId: number; versionNumber: number; onClose: () => void }) {
  const [options, setOptions] = useState<DeliverableReviewOptions | null>(null)
  const [rubricId, setRubricId] = useState('')
  const [checklistId, setChecklistId] = useState('')
  const [result, setResult] = useState<DeliverableReviewResponse | null>(null)
  const [history, setHistory] = useState<DeliverableReviewResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [revision, setRevision] = useState(0)
  const lock = useRef(false)
  const alive = useRef(false)
  useEffect(() => {
    alive.current = true
    const abort = new AbortController()
    setLoading(true); setError('')
    void api.getDeliverableReviewOptions(projectId, versionId, abort.signal).then(value => {
      if (abort.signal.aborted) return
      setOptions(value); setRubricId(String(value.rubrics.find(r => r.assignedToProject)?.id ?? value.rubrics[0]?.id ?? ''))
    }).catch(reason => { if (!abort.signal.aborted) setError(message(reason)) })
      .finally(() => { if (!abort.signal.aborted) setLoading(false) })
    void api.getDeliverableAiReviews(projectId, versionId, abort.signal).then(value => {
      if (!abort.signal.aborted) { setHistory(value.items); setHistoryError('') }
    }).catch(() => { if (!abort.signal.aborted) setHistoryError('Chưa tải được lịch sử. Bạn có thể tải lại.') })
    return () => { alive.current = false; abort.abort() }
  }, [projectId, versionId, revision])

  async function run() {
    if (lock.current || !options || !rubricId) return
    lock.current = true; setBusy(true); setError('')
    try {
      const value = await api.reviewDeliverableVersionWithAi(projectId, versionId,
        { rubricId: Number(rubricId), checklistId: checklistId ? Number(checklistId) : null, scope: options.scope })
      if (alive.current) { setResult(value); setHistory(old => [value, ...old].slice(0, 20)) }
    } catch (reason) { if (alive.current) setError(message(reason)) }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  return <Modal open drawer busy={busy} title={`Kiểm tra AI · phiên bản ${versionNumber}`}
    description="Đối chiếu đúng phiên bản đã nộp. Nhận xét tham khảo, không phải điểm chính thức." onClose={onClose}>
    <div className="space-y-5">
      {loading && <p role="status">Đang tải rubric và checklist phù hợp…</p>}
      {error && <p role="alert" className="ex-notice ex-notice-error">{error}</p>}
      {!loading && !options && <button className="ex-button" onClick={() => setRevision(v => v + 1)}>Tải lại</button>}
      {options && <fieldset disabled={busy} className="space-y-3">
        <label className="block text-sm font-semibold">Rubric đối chiếu
          <select className="mt-1 block w-full rounded-lg border border-hairline bg-card p-2" value={rubricId} onChange={e => setRubricId(e.target.value)}>
            <option value="">Chọn rubric đã công bố</option>
            {options.rubrics.map(r => <option key={r.id} value={r.id}>{r.title} · v{r.version}{r.assignedToProject ? ' · thuộc phương án đồ án' : ' · tham khảo'}</option>)}
          </select>
        </label>
        {options.rubrics.length === 0 && <p role="status">Chưa có rubric đã công bố đúng khoa và kỳ học. Liên hệ khoa để bổ sung.</p>}
        <label className="block text-sm font-semibold">Checklist COLD
          <select className="mt-1 block w-full rounded-lg border border-hairline bg-card p-2" value={checklistId} onChange={e => setChecklistId(e.target.value)}>
            <option value="">Không chọn thêm checklist</option>
            {options.checklists.map(c => <option key={c.id} value={c.id}>{c.title} · v{c.version}</option>)}
          </select>
        </label>
        <p className="text-xs text-ink-muted">Hỗ trợ PDF có lớp văn bản, DOCX, TXT và Markdown; tối đa 4 MB/tệp và 20.000 ký tự/tệp. PDF scan chưa hỗ trợ OCR.</p>
        <button className="ex-button ex-button-primary" type="button" disabled={!rubricId || busy} onClick={() => void run()}>
          {busy ? 'Đang phân tích…' : result ? 'Kiểm tra lại phiên bản này' : 'Bắt đầu kiểm tra'}
        </button>
      </fieldset>}
      {busy && <p role="status">Đang đọc báo cáo và đối chiếu các tiêu chí…</p>}
      {result && <DeliverableAiReviewResult result={result} />}
      <section aria-label="Lịch sử kiểm tra">
        <h3 className="font-semibold">Lịch sử kiểm tra phiên bản này</h3>
        {historyError && <p role="alert">{historyError} <button className="ex-text-button" onClick={() => setRevision(v => v + 1)}>Tải lại</button></p>}
        {!historyError && history.length === 0 && !loading && <p className="text-sm text-ink-muted">Chưa có lần kiểm tra nào.</p>}
        {history.map((h, i) => <button key={h.runId} type="button" disabled={busy} className="ex-text-button block" onClick={() => setResult(h)}>
          {i === 0 ? 'Lần gần nhất' : `Lần trước ${i}`} · {h.generationStatus === 'FALLBACK' ? 'Kiểm tra sơ bộ' : h.insufficientEvidence ? 'Chưa đủ căn cứ' : 'Đã phân tích'}
        </button>)}
        <p className="mt-2 text-xs text-ink-muted">Hiển thị tối đa 20 lần gần nhất. Để kiểm tra bản mới, nộp phiên bản mới rồi chọn Kiểm tra bằng AI ở phiên bản đó.</p>
      </section>
    </div>
  </Modal>
}

export function DeliverableAiReviewResult({ result }: { result: DeliverableReviewResponse }) {
  return <section className="space-y-4" aria-label="Kết quả kiểm tra">
    <div className="rounded-lg border border-hairline bg-canvas p-3">
      <h3 className="font-semibold">{result.insufficientEvidence ? 'Chưa đủ căn cứ' : result.generationStatus === 'FALLBACK' ? 'Kết quả sơ bộ (fallback)' : `Mức độ đáp ứng nội dung: ${result.readinessPercent}%`}</h3>
      <p className="mt-1 text-sm">{result.summary}</p>
    </div>
    {result.criteria.map(c => <article key={c.criterionId} className="rounded-lg border border-hairline p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{c.criterionName}</h4>
        <span className="ex-badge">{({ PASS: 'Đạt', PARTIAL: 'Một phần', MISSING: 'Thiếu' } as Record<string, string>)[c.status] ?? 'Chưa xác định'}</span></div>
      {c.findings.map((item, i) => <p key={i} className="mt-2 text-sm text-ink-soft">{item}</p>)}
      {c.missingEvidence.map((item, i) => <p key={i} className="mt-1 text-sm text-status-warning-text">Minh chứng: {item}</p>)}
      {c.suggestions.map((item, i) => <p key={i} className="mt-1 text-sm text-primary">Gợi ý: {item}</p>)}
    </article>)}
    {result.citations.length > 0 && <section><h4 className="font-semibold">Nguồn đối chiếu</h4>
      <ul className="mt-2 space-y-2 text-sm">{result.citations.map((c, i) => <li key={i}>{c.title} · {c.version} · {c.section}</li>)}</ul></section>}
    <p className="text-xs text-ink-muted">{result.limitationNote}</p>
  </section>
}

function message(reason: unknown) {
  if (reason instanceof HttpError) {
    if (reason.status === 403 || reason.status === 404) return 'Bạn không có quyền kiểm tra phiên bản này hoặc dữ liệu không còn khả dụng.'
    if (reason.status === 429) return 'Bạn gửi yêu cầu quá nhanh. Hãy chờ một chút rồi thử lại.'
    if (reason.status === 400 || reason.status === 409) return reason.message
  }
  return 'Chưa hoàn tất kiểm tra. Xem lịch sử trước khi thử lại để tránh tạo yêu cầu trùng.'
}
