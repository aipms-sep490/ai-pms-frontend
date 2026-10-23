import { useState } from 'react'
import { env } from '../../../app/config/env'
import { downloadReviewGateEvidence } from '../api/review-gates-api'
import type { StudentGateRequirement } from '../types/review-gates.types'
import { evidenceLinkLabel, isLinkArtifact, safeEvidenceLink } from '../utils/evidence-link'

export function EvidenceDownloadButton({ projectId, gateCode, requirement }: {
  projectId: string; gateCode: string; requirement: StudentGateRequirement
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const artifact = requirement.latestArtifact
  if (!artifact) return null
  if (isLinkArtifact(artifact)) {
    const link = safeEvidenceLink(artifact.linkUrl ?? artifact.filename)
    return link ? <a href={link} target="_blank" rel="noopener noreferrer" title={link}
      aria-label={`Mở minh chứng ngoài hệ thống: ${link}`}
      className="mt-2 inline-flex min-h-11 max-w-full items-center break-all text-xs font-semibold text-primary underline">
      Mở minh chứng ngoài hệ thống · {evidenceLinkLabel(link)}
    </a> : <p role="alert" className="mt-2 text-xs text-rose-700">Liên kết minh chứng không hợp lệ; chỉ mở URL HTTPS an toàn.</p>
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

  return <div className="mt-2 space-y-1">
    <button type="button" disabled={busy || env.reviewGatesMockEnabled || !artifact.downloadUrl}
      onClick={() => void download()} className="min-h-11 text-xs font-semibold text-primary underline disabled:text-slate-400 disabled:no-underline">
      {busy ? 'Đang tải...' : `Tải tệp v${artifact.version}`}
    </button>
    {env.reviewGatesMockEnabled && <p className="text-xs text-slate-500">Mô phỏng: chưa có nội dung tệp thực tế.</p>}
    {!env.reviewGatesMockEnabled && !artifact.downloadUrl && <p className="text-xs text-slate-500">Chưa có tệp được lưu để tải.</p>}
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
  </div>
}
