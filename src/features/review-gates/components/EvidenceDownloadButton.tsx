import { useState } from 'react'
import { DocumentPreviewModal } from '../../../components/ui/DocumentPreviewModal'
import { downloadReviewGateEvidence } from '../api/review-gates-api'
import type { StudentGateRequirement } from '../types/review-gates.types'
import { evidenceLinkLabel, isLinkArtifact, safeEvidenceLink } from '../utils/evidence-link'

export function EvidenceDownloadButton({ projectId, gateCode, requirement }: {
  projectId: string; gateCode: string; requirement: StudentGateRequirement
}) {
  const [busy, setBusy] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const artifact = requirement.latestArtifact
  if (!artifact) return null
  if (isLinkArtifact(artifact) || requirement.type === 'LINK') {
    const link = safeEvidenceLink(artifact.linkUrl ?? artifact.filename)
    return link ? <a href={link} target="_blank" rel="noopener noreferrer" title={link}
      aria-label={`Mở minh chứng ngoài hệ thống: ${link}`}
      className="mt-2 inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border border-primary/25 bg-primary-subtle/60 px-2.5 py-1.5 break-all text-xs font-semibold text-primary transition-colors hover:bg-primary-subtle hover:underline">
      <span className="material-symbols-outlined shrink-0 text-[15px]" aria-hidden="true">open_in_new</span>
      <span>Mở minh chứng ngoài hệ thống · {evidenceLinkLabel(link)}</span>
    </a> : requirement.verificationStatus === 'ACCEPTED' ? (
      <p className="mt-1.5 text-xs text-ink-muted italic">Tài liệu đã được hội đồng xác nhận trực tiếp (không đính kèm URL ngoài).</p>
    ) : <p role="alert" className="mt-2 text-xs text-status-error-text">Liên kết minh chứng không hợp lệ; chỉ mở URL HTTPS an toàn.</p>
  }

  async function download() {
    if (!artifact) return
    setBusy(true)
    setError(null)
    try {
      // Construct the protected route from resource IDs, never navigate to a storage URL.
      const blob = await downloadReviewGateEvidence(projectId, gateCode, requirement.id, artifact.version)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = artifact.filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải phiên bản minh chứng này.')
    } finally {
      setBusy(false)
    }
  }

  const canAccessFile = Boolean(artifact.downloadUrl)

  return <div className="mt-2 space-y-1.5">
    <div className="flex flex-wrap items-center gap-2">
      {canAccessFile && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setPreviewOpen(true)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[15px]" aria-hidden="true">visibility</span>
          <span>Xem trước</span>
        </button>
      )}
      <button
        type="button"
        disabled={busy || !canAccessFile}
        onClick={() => void download()}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-card px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:border-primary/35 hover:bg-primary-subtle disabled:border-transparent disabled:bg-transparent disabled:px-0 disabled:text-ink-muted"
      >
        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>
        <span>{busy ? 'Đang tải...' : `Tải tệp v${artifact.version}`}</span>
      </button>
    </div>
    {!artifact.downloadUrl && <p className="text-xs text-ink-muted">Chưa có tệp được lưu để tải.</p>}
    {error && <p role="alert" className="text-xs text-status-error-text">{error}</p>}
    {previewOpen && canAccessFile && (
      <DocumentPreviewModal
        open
        fileName={artifact.filename}
        fileSize={artifact.sizeBytes}
        contentType={artifact.contentType}
        loadBlob={() => downloadReviewGateEvidence(projectId, gateCode, requirement.id, artifact.version)}
        onDownload={() => void download()}
        onClose={() => setPreviewOpen(false)}
      />
    )}
  </div>
}
