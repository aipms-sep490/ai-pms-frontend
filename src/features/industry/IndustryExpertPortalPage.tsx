import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { HttpError } from '../../services/http/http-client'
import {
  downloadIndustrySharedFile,
  getIndustryFeedbackHistory,
  getIndustryAssignment,
  getIndustrySharedFiles,
  getMyIndustryAssignments,
  submitIndustryFeedback,
  type IndustryAssignment,
  type IndustryFeedback,
  type IndustryFile,
} from './industry-api'

export function IndustryExpertPortalPage() {
  const routeAssignmentId = Number(useParams().assignmentId)
  const [assignments, setAssignments] = useState<IndustryAssignment[]>([])
  const [assignmentPage, setAssignmentPage] = useState(1)
  const [assignmentTotal, setAssignmentTotal] = useState(0)
  const [loadingMoreAssignments, setLoadingMoreAssignments] = useState(false)
  const [assignmentMoreError, setAssignmentMoreError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(Number.isSafeInteger(routeAssignmentId) && routeAssignmentId > 0 ? routeAssignmentId : null)

  const [files, setFiles] = useState<IndustryFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [filesError, setFilesError] = useState(false)
  const [filesMoreError, setFilesMoreError] = useState(false)
  const [filePage, setFilePage] = useState(1)
  const [fileTotal, setFileTotal] = useState(0)
  const [loadingMoreFiles, setLoadingMoreFiles] = useState(false)

  const [feedbackList, setFeedbackList] = useState<IndustryFeedback[]>([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [feedbackLoadError, setFeedbackLoadError] = useState(false)
  const [feedbackMoreError, setFeedbackMoreError] = useState(false)
  const [feedbackPage, setFeedbackPage] = useState(1)
  const [feedbackTotal, setFeedbackTotal] = useState(0)
  const [loadingMoreFeedback, setLoadingMoreFeedback] = useState(false)
  const [detailsForId, setDetailsForId] = useState<number | null>(null)
  const detailsRequest = useRef(0)
  const selectedAssignmentRef = useRef(selectedAssignmentId)
  const [downloadError, setDownloadError] = useState(false)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [assignmentRefreshError, setAssignmentRefreshError] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState('')

  const loadAssignments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getMyIndustryAssignments(1, 50)
      setAssignments(res.items)
      setAssignmentPage(1)
      setAssignmentTotal(res.totalCount)
      setAssignmentMoreError(false)
      setSelectedAssignmentId(current => {
        const next = current != null && res.items.some(item => item.id === current) ? current : res.items[0]?.id ?? null
        selectedAssignmentRef.current = next
        return next
      })
    } catch (err) {
      setError(err instanceof HttpError && err.status === 403
        ? 'Bạn chưa có quyền truy cập cổng chuyên gia doanh nghiệp.'
        : 'Không thể tải danh sách phân công cố vấn.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function loadMoreAssignments() {
    if (loadingMoreAssignments || assignments.length >= assignmentTotal) return
    setLoadingMoreAssignments(true)
    setAssignmentMoreError(false)
    try {
      const next = assignmentPage + 1
      const result = await getMyIndustryAssignments(next, 50)
      setAssignments(current => [...current, ...result.items.filter(item => !current.some(existing => existing.id === item.id))])
      setAssignmentPage(next)
      setAssignmentTotal(result.totalCount)
    } catch {
      setAssignmentMoreError(true)
    } finally {
      setLoadingMoreAssignments(false)
    }
  }

  useEffect(() => {
    void loadAssignments()
  }, [loadAssignments])

  useEffect(() => {
    if (Number.isSafeInteger(routeAssignmentId) && routeAssignmentId > 0) {
      selectedAssignmentRef.current = routeAssignmentId
      setSelectedAssignmentId(routeAssignmentId)
    }
  }, [routeAssignmentId])

  const loadDetails = useCallback(async (assignmentId: number) => {
    const currentRequest = ++detailsRequest.current
    selectedAssignmentRef.current = assignmentId
    setDetailsForId(assignmentId)
    setFiles([])
    setFeedbackList([])
    setFilesError(false)
    setFeedbackLoadError(false)
    setFilesMoreError(false)
    setFeedbackMoreError(false)
    setLoadingMoreFiles(false)
    setLoadingMoreFeedback(false)
    setFilePage(1)
    setFeedbackPage(1)
    setFileTotal(0)
    setFeedbackTotal(0)
    setLoadingFiles(true)
    setLoadingFeedback(true)
    const [filesResult, feedbackResult] = await Promise.allSettled([
      getIndustrySharedFiles(assignmentId),
      getIndustryFeedbackHistory(assignmentId),
    ])
    if (currentRequest !== detailsRequest.current || selectedAssignmentRef.current !== assignmentId) return
    if (filesResult.status === 'fulfilled') {
      setFiles(filesResult.value.items)
      setFileTotal(filesResult.value.totalCount)
    }
    else setFilesError(true)
    if (feedbackResult.status === 'fulfilled') {
      setFeedbackList(feedbackResult.value.items)
      setFeedbackTotal(feedbackResult.value.totalCount)
    }
    else setFeedbackLoadError(true)
    setLoadingFiles(false)
    setLoadingFeedback(false)
  }, [])

  async function loadMoreFiles(assignmentId: number) {
    if (loadingMoreFiles || files.length >= fileTotal) return
    setLoadingMoreFiles(true)
    setFilesMoreError(false)
    const version = detailsRequest.current
    try {
      const next = filePage + 1
      const result = await getIndustrySharedFiles(assignmentId, next)
      if (version !== detailsRequest.current || selectedAssignmentRef.current !== assignmentId) return
      setFiles(current => [...current, ...result.items.filter(item => !current.some(existing => existing.id === item.id))])
      setFilePage(next)
      setFileTotal(result.totalCount)
    } catch {
      if (version === detailsRequest.current) setFilesMoreError(true)
    } finally {
      if (version === detailsRequest.current) setLoadingMoreFiles(false)
    }
  }

  async function loadMoreFeedback(assignmentId: number) {
    if (loadingMoreFeedback || feedbackList.length >= feedbackTotal) return
    setLoadingMoreFeedback(true)
    setFeedbackMoreError(false)
    const version = detailsRequest.current
    try {
      const next = feedbackPage + 1
      const result = await getIndustryFeedbackHistory(assignmentId, next)
      if (version !== detailsRequest.current || selectedAssignmentRef.current !== assignmentId) return
      setFeedbackList(current => [...current, ...result.items.filter(item => !current.some(existing => existing.id === item.id))])
      setFeedbackPage(next)
      setFeedbackTotal(result.totalCount)
    } catch {
      if (version === detailsRequest.current) setFeedbackMoreError(true)
    } finally {
      if (version === detailsRequest.current) setLoadingMoreFeedback(false)
    }
  }

  useEffect(() => {
    if (selectedAssignmentId != null) {
      void loadDetails(selectedAssignmentId)
    }
  }, [selectedAssignmentId, loadDetails])

  useEffect(() => () => { detailsRequest.current++ }, [])

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId)
  const canFeedback = Boolean(selectedAssignment?.allowedActions.includes('SUBMIT_FEEDBACK')) && !assignmentRefreshError

  async function refreshSelectedAssignment(assignmentId: number) {
    const updated = await getIndustryAssignment(assignmentId)
    if (selectedAssignmentRef.current !== assignmentId) return
    setAssignments(current => current.map(item => item.id === assignmentId ? updated : item))
    setAssignmentRefreshError(false)
    setFeedbackError('')
  }

  function selectAssignment(id: number) {
    if (id === selectedAssignmentId) return
    selectedAssignmentRef.current = id
    detailsRequest.current++
    setSelectedAssignmentId(id)
    setFiles([])
    setFeedbackList([])
    setDetailsForId(null)
    setLoadingMoreFiles(false)
    setLoadingMoreFeedback(false)
    setFilesMoreError(false)
    setFeedbackMoreError(false)
    setFeedbackContent('')
    setFeedbackError('')
    setFeedbackSuccess('')
    setAssignmentRefreshError(false)
    setDownloadError(false)
  }

  async function handleDownload(file: IndustryFile) {
    if (!selectedAssignment) return
    setDownloadError(false)
    try {
      const blob = await downloadIndustrySharedFile(selectedAssignment.id, file.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setDownloadError(true)
    }
  }

  async function handleSubmitFeedback() {
    if (!selectedAssignment || !canFeedback || detailsForId !== selectedAssignment.id || loadingFeedback || feedbackLoadError || !feedbackContent.trim()) return
    setSubmittingFeedback(true)
    setFeedbackError('')
    setFeedbackSuccess('')

    const latestVersion = feedbackList.length > 0 ? Math.max(...feedbackList.map((f) => f.version)) : 0

    try {
      await submitIndustryFeedback(selectedAssignment.id, {
        concurrencyToken: selectedAssignment.concurrencyToken,
        expectedVersion: latestVersion,
        content: feedbackContent.trim(),
      })
      if (selectedAssignmentRef.current === selectedAssignment.id) {
        setFeedbackSuccess('Gửi ý kiến đóng góp chuyên môn thành công.')
        setFeedbackContent('')
        await loadDetails(selectedAssignment.id)
        try {
          await refreshSelectedAssignment(selectedAssignment.id)
        } catch {
          if (selectedAssignmentRef.current === selectedAssignment.id) {
            setAssignmentRefreshError(true)
            setFeedbackError('Đã gửi nhận xét nhưng chưa làm mới được phân công. Thử lại trước khi gửi tiếp.')
          }
        }
      }
    } catch (err) {
      if (selectedAssignmentRef.current === selectedAssignment.id) setFeedbackError(err instanceof HttpError ? err.message : 'Không thể gửi ý kiến nhận xét.')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  return (
    <WorkspacePage
      className="space-y-5"
      title="Cổng chuyên gia cố vấn doanh nghiệp"
      eyebrow="Cố vấn chuyên môn · Advisory Only"
      description="Xem tài liệu được chia sẻ và đóng góp ý kiến nhận xét chuyên môn cho đồ án. Ý kiến cố vấn mang tính chất tham khảo, không phải điểm đánh giá chính thức."
    >
      {loading && <p role="status" className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">Đang tải phân công…</p>}
      {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error} <button type="button" className="ml-2 min-h-11 font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => void loadAssignments()}>Thử lại</button></p>}

      {!loading && !error && assignments.length === 0 && (
        <p className="rounded-lg border border-hairline bg-card p-5 text-sm text-ink-muted">
          Bạn chưa được phân công cố vấn đồ án nào. Hãy liên hệ bộ môn nếu bạn đã nhận được thư mời.
        </p>
      )}

      {!loading && assignments.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Cột trái: Danh sách đồ án */}
          <div className="space-y-3 lg:col-span-1">
            <h2 className="text-sm font-bold text-ink">Đồ án được phân công</h2>
            <ul className="space-y-2">
              {assignments.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => selectAssignment(a.id)} aria-pressed={selectedAssignmentId === a.id}
                  className={`w-full min-h-11 text-left cursor-pointer rounded-xl border p-4 shadow-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selectedAssignmentId === a.id
                      ? 'border-primary bg-primary-subtle/40'
                      : 'border-hairline bg-card hover:bg-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink text-sm">{a.projectTitle}</h3>
                    <span className="shrink-0 rounded bg-subtle px-1.5 py-0.5 text-xs font-semibold text-ink-soft border border-hairline">
                      {a.scope}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">Mã đồ án: {a.projectCode}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {new Date(a.startsAt).toLocaleDateString('vi-VN')} – {new Date(a.endsAt).toLocaleDateString('vi-VN')}
                  </p>
                  </button>
                </li>
              ))}
            </ul>
            {assignments.length < assignmentTotal && <button type="button" disabled={loadingMoreAssignments} className="min-h-11 rounded-lg border border-hairline px-3 text-sm font-semibold text-primary disabled:opacity-50" onClick={() => void loadMoreAssignments()}>{loadingMoreAssignments ? 'Đang tải…' : `Xem thêm phân công (${assignments.length}/${assignmentTotal})`}</button>}
            {assignmentMoreError && <p role="alert" className="text-xs text-status-error-text">Chưa tải được trang phân công tiếp theo. Hãy thử lại.</p>}
          </div>

          {/* Cột phải: Chi tiết đồ án, File và Nhận xét */}
          {selectedAssignment && (
            <div className="space-y-5 lg:col-span-2">
              {/* Header chi tiết */}
              <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-ink">{selectedAssignment.projectTitle}</h3>
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    Ý kiến tư vấn (Advisory Only)
                  </span>
                </div>
                <p className="text-xs text-ink-muted">
                  Phạm vi cố vấn: <strong>{selectedAssignment.scope}</strong>
                  {selectedAssignment.majorId ? ` (Ngành #${selectedAssignment.majorId})` : ' (Chung)'} · Trạng thái: <strong>{selectedAssignment.status}</strong>
                </p>
              </section>

              {/* Danh sách file chia sẻ */}
              <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-ink">Tài liệu & Minh chứng đồ án được chia sẻ</h4>
                {loadingFiles && <p role="status" className="text-xs text-ink-muted">Đang tải tài liệu…</p>}
                {filesError && <p role="alert" aria-label="Lỗi tải tài liệu" className="text-xs text-status-error-text">Chưa tải được tài liệu của đồ án này. <button type="button" className="font-semibold underline" onClick={() => void loadDetails(selectedAssignment.id)}>Thử lại</button></p>}
                {!loadingFiles && !filesError && files.length === 0 && (
                  <p className="text-xs text-ink-muted">Bộ môn chưa chia sẻ file bản nộp nào cho phạm vi này.</p>
                )}
                {!loadingFiles && !filesError && detailsForId === selectedAssignment.id && files.length > 0 && (
                  <ul className="space-y-2">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center justify-between rounded-lg border border-hairline p-3 text-xs bg-subtle">
                        <div>
                          <p className="font-semibold text-ink">{f.fileName}</p>
                          <p className="text-ink-muted text-xs">
                            {f.contentType} · {(f.sizeBytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          className="min-h-11 rounded-lg bg-card border border-hairline px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          onClick={() => void handleDownload(f)}
                        >
                          Tải về xem
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {downloadError && <p role="alert" className="text-xs text-status-error-text">Chưa tải được tệp. Hãy thử lại.</p>}
                {filesMoreError && <p role="alert" className="text-xs text-status-error-text">Chưa tải được trang tài liệu tiếp theo. Hãy thử lại.</p>}
                {!filesError && !loadingFiles && detailsForId === selectedAssignment.id && files.length < fileTotal && <button type="button" disabled={loadingMoreFiles} className="min-h-11 rounded-lg border border-hairline px-3 text-xs font-semibold text-primary disabled:opacity-50" onClick={() => void loadMoreFiles(selectedAssignment.id)}>{loadingMoreFiles ? 'Đang tải…' : `Xem thêm tài liệu (${files.length}/${fileTotal})`}</button>}
              </section>

              {/* Gửi nhận xét và Lịch sử nhận xét */}
              <section className="rounded-xl border border-hairline bg-card p-5 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-ink">Đóng góp ý kiến chuyên môn</h4>
                <div className="space-y-2">
                  <label className="block text-xs text-ink-soft">
                    Nội dung nhận xét chuyên gia
                    <textarea
                      className="mt-1 w-full rounded-lg border border-hairline p-3 text-sm"
                      rows={4}
                      placeholder="Góp ý chuyên môn về nghiệp vụ, tính khả thi hoặc công nghệ của đồ án…"
                      value={feedbackContent}
                      disabled={submittingFeedback || !canFeedback || detailsForId !== selectedAssignment.id || loadingFeedback || feedbackLoadError}
                      onChange={(e) => setFeedbackContent(e.target.value)}
                    />
                  </label>
                  {feedbackError && <p role="alert" className="text-xs text-status-error-text">{feedbackError}</p>}
                  {assignmentRefreshError && <button type="button" className="min-h-11 text-xs font-semibold text-primary underline" onClick={() => void refreshSelectedAssignment(selectedAssignment.id).catch(() => setFeedbackError('Chưa làm mới được phân công. Hãy thử lại.'))}>Làm mới phân công</button>}
                  {feedbackSuccess && <p role="status" className="text-xs text-status-success-text">{feedbackSuccess}</p>}
                  <button
                    type="button"
                    className="min-h-11 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    disabled={submittingFeedback || !canFeedback || detailsForId !== selectedAssignment.id || loadingFeedback || feedbackLoadError || !feedbackContent.trim()}
                    onClick={() => void handleSubmitFeedback()}
                  >
                    {submittingFeedback ? 'Đang gửi…' : 'Gửi nhận xét'}
                  </button>
                  {!canFeedback && <p className="text-xs text-ink-muted">Phân công này hiện không cho phép gửi nhận xét.</p>}
                </div>

                <div className="border-t border-hairline pt-3 space-y-3">
                  <h5 className="text-xs font-semibold text-ink uppercase tracking-wide">Lịch sử các lần nhận xét</h5>
                  {loadingFeedback && <p role="status" className="text-xs text-ink-muted">Đang tải lịch sử…</p>}
                  {feedbackLoadError && <p role="alert" className="text-xs text-status-error-text">Chưa tải được lịch sử nhận xét. Hãy thử lại trước khi gửi phiên bản mới. <button type="button" className="min-h-11 font-semibold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => void loadDetails(selectedAssignment.id)}>Thử lại</button></p>}
                  {!loadingFeedback && !feedbackLoadError && feedbackList.length === 0 && (
                    <p className="text-xs text-ink-muted">Chưa có nhận xét nào được gửi.</p>
                  )}
                  {!loadingFeedback && !feedbackLoadError && detailsForId === selectedAssignment.id && feedbackList.length > 0 && (
                    <ul className="space-y-2">
                      {feedbackList.map((fb) => (
                        <li key={fb.id} className="rounded-lg border border-hairline p-3 text-xs bg-subtle space-y-1">
                          <div className="flex items-center justify-between text-ink-muted">
                            <span className="font-semibold text-ink">Phiên bản #{fb.version}</span>
                            <span>{new Date(fb.submittedAt).toLocaleString('vi-VN')}</span>
                          </div>
                          <p className="text-ink leading-relaxed whitespace-pre-wrap">{fb.content}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {feedbackMoreError && <p role="alert" className="text-xs text-status-error-text">Chưa tải được trang nhận xét tiếp theo. Hãy thử lại.</p>}
                  {!feedbackLoadError && !loadingFeedback && detailsForId === selectedAssignment.id && feedbackList.length < feedbackTotal && <button type="button" disabled={loadingMoreFeedback} className="min-h-11 rounded-lg border border-hairline px-3 text-xs font-semibold text-primary disabled:opacity-50" onClick={() => void loadMoreFeedback(selectedAssignment.id)}>{loadingMoreFeedback ? 'Đang tải…' : `Xem thêm nhận xét (${feedbackList.length}/${feedbackTotal})`}</button>}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </WorkspacePage>
  )
}
