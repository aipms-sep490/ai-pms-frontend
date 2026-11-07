import { useState } from 'react'
import { env } from '../../../app/config/env'
import { downloadReviewGateEvidenceArchive } from '../api/review-gates-api'

export function GateEvidenceArchiveButton({ projectId, gateCode, disabled = false }: {
  projectId: string | number; gateCode: string; disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function downloadArchive() {
    setBusy(true)
    setError(null)
    try {
      const blob = await downloadReviewGateEvidenceArchive(projectId, gateCode)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${projectId}_${gateCode}_Evidence_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải gói minh chứng ZIP.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={busy || disabled || env.reviewGatesMockEnabled}
        onClick={() => void downloadArchive()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
      >
        <span aria-hidden="true">📦</span>
        {busy ? 'Đang nén & tải...' : 'Tải trọn bộ minh chứng (.ZIP)'}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-danger-text">{error}</p>}
    </div>
  )
}
