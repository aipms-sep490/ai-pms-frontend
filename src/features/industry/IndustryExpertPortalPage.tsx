import { useCallback, useEffect, useState } from 'react'
import { WorkspacePage } from '../../components/ui/WorkspacePage'
import { HttpError } from '../../services/http/http-client'
import {
  downloadIndustrySharedFile,
  getIndustryFeedbackHistory,
  getIndustrySharedFiles,
  getMyIndustryAssignments,
  submitIndustryFeedback,
  type IndustryAssignment,
  type IndustryFeedback,
  type IndustryFile,
} from './industry-api'

export function IndustryExpertPortalPage() {
  const [assignments, setAssignments] = useState<IndustryAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null)

  const [files, setFiles] = useState<IndustryFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)

  const [feedbackList, setFeedbackList] = useState<IndustryFeedback[]>([])
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [feedbackSuccess, setFeedbackSuccess] = useState('')

  const loadAssignments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getMyIndustryAssignments(1, 50)
      setAssignments(res.items)
      if (res.items.length > 0 && selectedAssignmentId == null) {
        setSelectedAssignmentId(res.items[0].id)
      }
    } catch (err) {
      setError(err instanceof HttpError && err.status === 403
        ? 'Bạn chưa có quyền truy cập cổng chuyên gia doanh nghiệp.'
        : 'Không thể tải danh sách phân công cố vấn.')
    } finally {
      setLoading(false)
    }
  }, [selectedAssignmentId])

  useEffect(() => {
    void loadAssignments()
  }, [loadAssignments])

  const loadDetails = useCallback(async (assignmentId: number) => {
    setLoadingFiles(true)
    setLoadingFeedback(true)
    try {
      const [filesRes, feedbackRes] = await Promise.all([
        getIndustrySharedFiles(assignmentId),
        getIndustryFeedbackHistory(assignmentId),
      ])
      setFiles(filesRes.items)
      setFeedbackList(feedbackRes.items)
    } catch {
      // Ignored
    } finally {
      setLoadingFiles(false)
      setLoadingFeedback(false)
    }
  }, [])

  useEffect(() => {
    if (selectedAssignmentId != null) {
      void loadDetails(selectedAssignmentId)
    }
  }, [selectedAssignmentId, loadDetails])

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId)

  async function handleDownload(file: IndustryFile) {
    if (!selectedAssignment) return
    try {
      const blob = await downloadIndustrySharedFile(selectedAssignment.id, file.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // Handle download failure
    }
  }

  async function handleSubmitFeedback() {
    if (!selectedAssignment || !feedbackContent.trim()) return
    setSubmittingFeedback(true)
    setFeedbackError('')
    setFeedbackSuccess('')

    const latestVersion = feedbackList.length > 0 ? Math.max(...feedbackList.map((f) => f.version)) : 0

    try {
      await submitIndustryFeedback(selectedAssignment.id, {
        concurrencyToken: selectedAssignment.concurrencyToken,
        expectedVersion: latestVersion + 1,
        content: feedbackContent.trim(),
      })
      setFeedbackSuccess('Gửi ý kiến đóng góp chuyên môn thành công.')
      setFeedbackContent('')
      await loadDetails(selectedAssignment.id)
      await loadAssignments()
    } catch (err) {
      setFeedbackError(err instanceof HttpError ? err.message : 'Không thể gửi ý kiến nhận xét.')
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
      {error && <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{error}</p>}

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
                <li
                  key={a.id}
                  onClick={() => setSelectedAssignmentId(a.id)}
                  className={`cursor-pointer rounded-xl border p-4 shadow-xs transition-colors ${
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
                </li>
              ))}
            </ul>
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
                {loadingFiles && <p className="text-xs text-ink-muted">Đang tải tài liệu…</p>}
                {!loadingFiles && files.length === 0 && (
                  <p className="text-xs text-ink-muted">Bộ môn chưa chia sẻ file bản nộp nào cho phạm vi này.</p>
                )}
                {files.length > 0 && (
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
                          className="rounded-lg bg-card border border-hairline px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-subtle"
                          onClick={() => void handleDownload(f)}
                        >
                          Tải về xem
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
                      disabled={submittingFeedback}
                      onChange={(e) => setFeedbackContent(e.target.value)}
                    />
                  </label>
                  {feedbackError && <p role="alert" className="text-xs text-status-error-text">{feedbackError}</p>}
                  {feedbackSuccess && <p role="status" className="text-xs text-status-success-text">{feedbackSuccess}</p>}
                  <button
                    type="button"
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    disabled={submittingFeedback || !feedbackContent.trim()}
                    onClick={() => void handleSubmitFeedback()}
                  >
                    {submittingFeedback ? 'Đang gửi…' : 'Gửi nhận xét'}
                  </button>
                </div>

                <div className="border-t border-hairline pt-3 space-y-3">
                  <h5 className="text-xs font-semibold text-ink uppercase tracking-wide">Lịch sử các lần nhận xét</h5>
                  {loadingFeedback && <p className="text-xs text-ink-muted">Đang tải lịch sử…</p>}
                  {!loadingFeedback && feedbackList.length === 0 && (
                    <p className="text-xs text-ink-muted">Chưa có nhận xét nào được gửi.</p>
                  )}
                  {feedbackList.length > 0 && (
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
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </WorkspacePage>
  )
}
