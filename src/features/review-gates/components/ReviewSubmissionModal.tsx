import { useRef, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { env } from '../../../app/config/env'
import { HttpError } from '../../../services/http/http-client'
import type { StudentGateRequirement } from '../types/review-gates.types'
import { safeEvidenceLink } from '../utils/evidence-link'
import { requirementTypeLabel } from '../utils/review-gate-labels'
import { displayLabel } from '../../../components/ui/display-label'
import { reviewGateError } from '../utils/review-gate-error'

export interface ReviewSubmissionPayload {
  artifactName: string
  notes: string
  mode: 'file' | 'link'
  file?: File | null
  linkUrl?: string
}

interface ReviewSubmissionModalProps {
  open: boolean
  onClose: () => void
  requirement: StudentGateRequirement | null
  gateCode: string
  isLeader: boolean
  canSubmit?: boolean
  blockingMessage?: string
  onSubmit: (payload: ReviewSubmissionPayload) => Promise<void>
  onReload?: () => Promise<void>
  revisionRequired?: boolean
}

export function ReviewSubmissionModal({
  open,
  onClose,
  requirement,
  gateCode,
  isLeader,
  canSubmit,
  blockingMessage,
  onSubmit,
  onReload,
  revisionRequired = false,
}: ReviewSubmissionModalProps) {
  const isPermitted = canSubmit !== undefined ? canSubmit : isLeader
  const externalLinkRequired = requirement?.type === 'EXTERNAL_LINK'
  const [submissionMode, setSubmissionMode] = useState<'file' | 'link'>(externalLinkRequired ? 'link' : 'file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [artifactName, setArtifactName] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const sending = useRef(false)

  if (!requirement) return null

  const currentVer = requirement.latestArtifact?.version ?? 0
  const nextVer = currentVer + 1
  const isRevision = revisionRequired || requirement.verificationStatus === 'REJECTED'

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return 'picture_as_pdf'
    if (['zip', '7z', 'tar', 'gz'].includes(ext || '')) return 'folder_zip'
    if (['docx'].includes(ext || '')) return 'description'
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return 'image'
    if (['xls', 'xlsx'].includes(ext || '')) return 'table_chart'
    return 'draft'
  }

  const handleFileSelect = (file: File) => {
    const maxBytes = 20 * 1024 * 1024 // 20MB aligned with backend UploadValidator
    if (file.size > maxBytes) {
      setError(`Tệp vượt quá dung lượng tối đa cho phép (20MB). Dung lượng tệp hiện tại: ${formatFileSize(file.size)}`)
      return
    }
    setSelectedFile(file)
    setArtifactName(file.name)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending.current) return
    if (!isPermitted) {
      setError(blockingMessage || 'Bạn không có thẩm quyền nộp hồ sơ review hoặc yêu cầu này đang bị chặn.')
      return
    }
    if (submissionMode === 'link' && (!externalLinkRequired || !safeEvidenceLink(artifactName.trim()))) {
      setLinkError('Vui lòng nhập liên kết HTTPS tuyệt đối có tên miền hợp lệ, không chứa thông tin đăng nhập.')
      return
    }
    setLinkError(null)
    if (!artifactName.trim()) {
      setError('Vui lòng chọn tệp tải lên hoặc nhập tên/liên kết minh chứng.')
      return
    }
    if (!env.reviewGatesMockEnabled && submissionMode === 'file' && !selectedFile) {
      setError('Vui lòng chọn tệp minh chứng thực tế.')
      return
    }
    if (!notes.trim()) {
      setError('Vui lòng nhập ghi chú hoặc giải trình nội dung nộp.')
      return
    }

    try {
      sending.current = true
      setBusy(true)
      setError(null)
      await onSubmit({
        artifactName: artifactName.trim(),
        notes: notes.trim(),
        mode: submissionMode,
        file: selectedFile,
        linkUrl: submissionMode === 'link' ? artifactName.trim() : undefined,
      })
      setSelectedFile(null)
      setArtifactName('')
      setNotes('')
      onClose()
    } catch (err) {
      setConflict(err instanceof HttpError && err.status === 409)
      setError(reviewGateError(err))
    } finally {
      setBusy(false)
      sending.current = false
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${isRevision ? 'Nộp bản sửa đổi' : 'Nộp minh chứng'} · ${requirement.code}`}
      description={`Cập nhật minh chứng học thuật cho đợt thẩm định ${gateCode}`}
      busy={busy}
    >
      <form onSubmit={handleSubmit} noValidate className="review-submission-form space-y-4">
        {!isPermitted && (
          <div className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-xs font-semibold text-status-warning-text">
            ⚠️ <strong>Quyền hạn:</strong> {blockingMessage || 'Bạn đang xem với vai trò Thành viên (Student Member). Quyền nộp hồ sơ review và bản sửa đổi chính thức thuộc về Trưởng nhóm (Student Leader).'}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-1.5">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-600">Yêu cầu:</span>
            <span className="font-bold text-slate-900">{requirement.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-600">Loại minh chứng:</span>
            <span className="font-medium text-slate-800">{requirementTypeLabel(requirement.type)} · {displayLabel(requirement.scope)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-600">Phiên bản sẽ tạo:</span>
            <span className="font-bold text-primary">v{nextVer} (Bản mới)</span>
          </div>
          {requirement.reviewerFeedback && (
            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-rose-800">
              <strong>Phản hồi của Reviewer:</strong> {requirement.reviewerFeedback}
            </div>
          )}
        </div>

        {/* Tab switcher: File upload vs Link */}
        <div className="flex border-b border-slate-200 text-xs font-semibold">
          {!externalLinkRequired && <button
            type="button"
            onClick={() => setSubmissionMode('file')}
            disabled={busy}
            className={`flex min-h-11 items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              submissionMode === 'file'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">upload_file</span>
            Tải tệp lên (PDF, DOCX, ZIP)
          </button>}
          {externalLinkRequired && <button
            type="button"
            disabled={busy}
            onClick={() => setSubmissionMode('link')}
            className={`flex min-h-11 items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              submissionMode === 'link'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">link</span>
            Liên kết ngoài (Git PR / Cloud)
          </button>}
        </div>

        {submissionMode === 'file' ? (
          <div className="space-y-3">
            {!selectedFile ? (
              <div
                role="button"
                tabIndex={isPermitted && !busy ? 0 : -1}
                aria-label="Chọn tệp minh chứng"
                aria-disabled={!isPermitted || busy}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && isPermitted && !busy) {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget as Node)) return; setIsDragging(false) }}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  if (!isPermitted || busy) return
                  const dropped = e.dataTransfer.files?.[0]
                  if (dropped) handleFileSelect(dropped)
                }}
                onClick={() => {
                  if (isPermitted && !busy) fileInputRef.current?.click()
                }}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-slate-300 hover:border-primary/60 hover:bg-slate-50'
                } ${!isPermitted || busy ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  aria-label="Tệp minh chứng"
                  className="hidden"
                  disabled={!isPermitted || busy}
                  accept=".pdf,.docx,.zip,.png,.jpg,.jpeg,.xlsx,.pptx"
                  onChange={(e) => {
                    const picked = e.target.files?.[0]
                    if (picked) handleFileSelect(picked)
                  }}
                />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-primary mb-3">
                  <span className="material-symbols-outlined text-[28px]" aria-hidden="true">cloud_upload</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  Kéo thả tệp minh chứng vào đây, hoặc <span className="text-primary underline">chọn từ thiết bị</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Hỗ trợ định dạng PDF, DOCX, ZIP, PNG, JPG (Tối đa 20MB theo quy chuẩn hệ thống)
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-primary/20 text-primary shadow-xs">
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{getFileIcon(selectedFile.name)}</span>
                  </div>
                  <div className="min-w-0">
                    <strong className="block text-xs font-semibold text-slate-900 truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </strong>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                        <span className="material-symbols-outlined text-[12px]" aria-hidden="true">check</span> Sẵn sàng tải lên
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!isPermitted || busy}
                    onClick={() => { setSelectedFile(null); setArtifactName('') }}
                    className="text-xs font-medium text-primary hover:underline px-2 py-1 cursor-pointer"
                  >
                    Đổi tệp
                  </button>
                  <button
                    type="button"
                    disabled={!isPermitted || busy}
                    onClick={() => { setSelectedFile(null); setArtifactName('') }}
                    aria-label="Hủy chọn tệp"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="evidence-filename" className="block text-xs font-bold text-slate-700">
                Tên hiển thị tài liệu minh chứng <span className="text-rose-600">*</span>
              </label>
              <input
                id="evidence-filename"
                type="text"
                required
                aria-required="true"
                disabled={!isPermitted || busy}
                value={artifactName}
                onChange={(e) => setArtifactName(e.target.value)}
                placeholder="Ví dụ: SDD_v3.pdf hoặc https://github.com/.../pull/42"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-hidden disabled:bg-slate-100"
              />
              <p className="mt-1 text-xs text-slate-500">
                {env.reviewGatesMockEnabled ? 'Mô phỏng: có thể nhập tên minh chứng để thử giao diện.' : 'Chọn tệp ở trên. Tên file tải lên được lưu theo tệp đã chọn.'}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="external-evidence-url" className="block text-xs font-bold text-slate-700">
              Liên kết minh chứng ngoài (URL / Git PR / Google Drive) <span className="text-rose-600">*</span>
            </label>
            <input
              id="external-evidence-url"
              aria-invalid={Boolean(linkError)}
              aria-describedby={linkError ? 'external-evidence-url-error' : 'external-evidence-url-help'}
              type="text"
              required
              aria-required="true"
              disabled={!isPermitted || busy}
              value={artifactName}
              onChange={(e) => setArtifactName(e.target.value)}
              placeholder="Ví dụ: SDD_v3.pdf hoặc https://github.com/.../pull/42"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:bg-slate-100"
            />
            {linkError && <p id="external-evidence-url-error" role="alert" className="mt-1 text-xs text-rose-700">{linkError}</p>}
            <p id="external-evidence-url-help" className="mt-1 text-xs text-slate-500">
              Đảm bảo đường dẫn ở chế độ công khai hoặc đã cấp quyền truy cập cho Giảng viên / Hội đồng thẩm định.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="evidence-notes" className="block text-xs font-bold text-slate-700">
            Giải trình nội dung thay đổi / Ghi chú <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="evidence-notes"
            required
            aria-required="true"
            rows={3}
            disabled={!isPermitted || busy}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mô tả cụ thể những điểm đã chỉnh sửa theo phản hồi của reviewer..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-primary focus:outline-hidden disabled:bg-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            Nêu rõ các nội dung hoặc tài liệu đã cập nhật để Hội đồng dễ dàng đối chiếu và thẩm định lại.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
            {error}
            {conflict && onReload && <button type="button" disabled={busy} className="mt-2 block text-xs underline"
              onClick={async () => {
                setBusy(true)
                try { await onReload(); setError(null); setConflict(false) }
                catch (err) { setError(err instanceof Error ? err.message : 'Không thể tải lại dữ liệu.') }
                finally { setBusy(false) }
              }}>Tải lại dữ liệu, giữ tệp và ghi chú</button>}
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" className="min-h-11" variant="secondary" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" className="min-h-11" disabled={!isPermitted || busy}>
            {busy ? 'Đang gửi...' : isRevision ? 'Xác nhận nộp bản sửa' : 'Nộp minh chứng'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
