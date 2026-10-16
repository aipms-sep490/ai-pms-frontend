import { useEffect, useRef, useState } from 'react'
import './document-preview-modal.css'

export interface DocumentPreviewModalProps {
  open: boolean
  onClose: () => void
  fileName: string
  fileSize?: number
  contentType?: string
  loadBlob: (signal?: AbortSignal) => Promise<Blob>
  onDownload?: () => Promise<void> | void
}

type PreviewCategory = 'pdf' | 'image' | 'code' | 'office' | 'archive' | 'other'

export function getFileCategory(fileName: string, contentType?: string): PreviewCategory {
  const mime = contentType?.toLowerCase() ?? ''
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() ?? '' : ''

  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return 'image'
  if (
    mime.startsWith('text/') ||
    ['txt', 'md', 'json', 'csv', 'ts', 'tsx', 'js', 'jsx', 'html', 'css', 'sql', 'xml', 'yaml', 'yml', 'env', 'log'].includes(ext)
  ) return 'code'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext) || mime.includes('word') || mime.includes('excel') || mime.includes('officedocument')) return 'office'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mime.includes('zip') || mime.includes('compressed')) return 'archive'
  return 'other'
}

function categoryLabel(cat: PreviewCategory): string {
  switch (cat) {
    case 'pdf': return 'Tài liệu PDF'
    case 'image': return 'Hình ảnh'
    case 'code': return 'Mã nguồn / Văn bản'
    case 'office': return 'Tài liệu Office'
    case 'archive': return 'Tệp nén'
    default: return 'Tệp đính kèm'
  }
}

function formatBytes(bytes?: number): string {
  if (bytes == null || isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentPreviewModal({
  open,
  onClose,
  fileName,
  fileSize,
  contentType,
  loadBlob,
  onDownload,
}: DocumentPreviewModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const objectUrlRef = useRef<string | null>(null)

  const category = getFileCategory(fileName, contentType)

  // Dialog open/close lifecycle
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
      document.body.style.overflow = 'hidden'
    } else {
      if (dialog.open) dialog.close()
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Load blob on open
  useEffect(() => {
    if (!open) {
      setBlob(null)
      setUrl(null)
      setTextContent(null)
      setError(null)
      setScale(1)
      setRotation(0)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      return
    }

    const controller = new AbortController()
    let active = true
    setLoading(true)
    setError(null)

    loadBlob(controller.signal)
      .then(async (resultBlob) => {
        if (!active) return
        setBlob(resultBlob)
        const objectUrl = URL.createObjectURL(resultBlob)
        objectUrlRef.current = objectUrl
        setUrl(objectUrl)

        if (category === 'code') {
          try {
            const text = await resultBlob.text()
            if (active) setTextContent(text)
          } catch {
            if (active) setTextContent('Không thể giải mã văn bản dưới dạng UTF-8.')
          }
        }
      })
      .catch((err) => {
        if (!active || controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Không thể tải bản xem trước của tài liệu.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [open, loadBlob, category])

  // Handle direct download
  const handleDownload = async () => {
    setDownloading(true)
    try {
      if (onDownload) {
        await onDownload()
      } else if (url || blob) {
        const downloadUrl = url || (blob ? URL.createObjectURL(blob) : null)
        if (!downloadUrl) return
        const anchor = document.createElement('a')
        anchor.href = downloadUrl
        anchor.download = fileName
        anchor.click()
        if (!url && blob) URL.revokeObjectURL(downloadUrl)
      }
    } finally {
      setDownloading(false)
    }
  }

  // Open in new window
  const handleOpenExternal = () => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      className="doc-preview-dialog"
      aria-labelledby="doc-preview-title"
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }}
    >
      {/* Header bar */}
      <header className="doc-preview-header">
        <div className="doc-preview-meta">
          <div className="doc-preview-icon" aria-hidden="true">
            <span className="material-symbols-outlined">
              {category === 'pdf' ? 'picture_as_pdf' :
               category === 'image' ? 'image' :
               category === 'code' ? 'code' :
               category === 'office' ? 'article' :
               category === 'archive' ? 'folder_zip' : 'description'}
            </span>
          </div>
          <div className="doc-preview-title-box">
            <h2 id="doc-preview-title" className="doc-preview-title" title={fileName}>
              {fileName}
            </h2>
            <div className="doc-preview-tags">
              <span className={`doc-preview-tag doc-preview-tag--${category}`}>
                {categoryLabel(category)}
              </span>
              {fileSize != null && (
                <span className="font-mono text-xs">{formatBytes(fileSize)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="doc-preview-actions">
          {category === 'image' && !loading && !error && (
            <>
              <button
                type="button"
                className="doc-preview-btn"
                title="Thu nhỏ"
                onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              >
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <button
                type="button"
                className="doc-preview-btn"
                title="Khôi phục kích thước"
                onClick={() => { setScale(1); setRotation(0) }}
              >
                <span className="font-mono text-xs">{Math.round(scale * 100)}%</span>
              </button>
              <button
                type="button"
                className="doc-preview-btn"
                title="Phóng to"
                onClick={() => setScale(s => Math.min(3, s + 0.25))}
              >
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <button
                type="button"
                className="doc-preview-btn"
                title="Xoay 90°"
                onClick={() => setRotation(r => (r + 90) % 360)}
              >
                <span className="material-symbols-outlined text-[18px]">rotate_right</span>
              </button>
            </>
          )}

          {(category === 'pdf' || category === 'image') && url && (
            <button
              type="button"
              className="doc-preview-btn"
              title="Mở trong tab mới"
              onClick={handleOpenExternal}
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              <span className="hidden sm:inline">Mở tab mới</span>
            </button>
          )}

          <button
            type="button"
            className="doc-preview-btn doc-preview-btn--primary"
            disabled={downloading}
            onClick={() => void handleDownload()}
            title="Tải tệp về máy"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>{downloading ? 'Đang tải…' : 'Tải về'}</span>
          </button>

          <button
            type="button"
            className="doc-preview-btn doc-preview-btn--close"
            onClick={onClose}
            aria-label="Đóng bản xem trước"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main preview body */}
      <div className="doc-preview-body">
        {loading && (
          <div className="doc-preview-loading" role="status">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-3">
              progress_activity
            </span>
            <p className="text-sm font-semibold text-ink">Đang nạp tài liệu…</p>
            <p className="text-xs text-ink-muted mt-1">{fileName}</p>
          </div>
        )}

        {error && (
          <div className="doc-preview-error" role="alert">
            <span className="material-symbols-outlined text-4xl text-rose-600 mb-3">
              error_outline
            </span>
            <p className="text-sm font-semibold text-rose-800">{error}</p>
            <button
              type="button"
              className="doc-preview-btn doc-preview-btn--primary mt-4"
              onClick={() => void handleDownload()}
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Tải về để mở trực tiếp trên máy</span>
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {category === 'pdf' && url && (
              <iframe
                src={url}
                title={`Bản xem trước ${fileName}`}
                className="doc-preview-iframe"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            )}

            {category === 'image' && url && (
              <div className="doc-preview-image-stage">
                <img
                  src={url}
                  alt={fileName}
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                  }}
                />
              </div>
            )}

            {category === 'code' && (
              <div className="doc-preview-code-stage">
                <pre>
                  <code>{textContent ?? 'Đang hiển thị nội dung…'}</code>
                </pre>
              </div>
            )}

            {(category === 'office' || category === 'archive' || category === 'other') && (
              <div className="doc-preview-fallback">
                <div className="doc-preview-fallback-icon">
                  <span className="material-symbols-outlined">
                    {category === 'office' ? 'description' : category === 'archive' ? 'folder_zip' : 'draft'}
                  </span>
                </div>
                <h3>{fileName}</h3>
                <p>
                  Định dạng <strong>{categoryLabel(category)}</strong> ({formatBytes(fileSize)}) yêu cầu ứng dụng chuyên dụng tương thích để đọc chính xác bố cục và dữ liệu. Hãy tải về để mở trên máy của bạn.
                </p>
                <button
                  type="button"
                  className="doc-preview-btn doc-preview-btn--primary text-sm px-6 py-2.5"
                  onClick={() => void handleDownload()}
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  <span>Tải tệp về máy</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </dialog>
  )
}
