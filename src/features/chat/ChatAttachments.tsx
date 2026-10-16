import { useEffect, useRef, useState } from 'react'
import { chatApi, type ChatAttachment } from './chat-api'
import { formatBytes, isImageAttachment } from './chat-attachments'

/** Renders a message's attachments: images inline in a Messenger-style photo grid (click to enlarge), other files as download cards.
 * The download/view path is scoped to the conversation+message (recall revokes access server-side). */
export function ChatAttachments({ attachments, conversationId, messageId }: { attachments: ChatAttachment[]; conversationId: string; messageId: string }) {
  if (!attachments.length) return null

  const imageFiles = attachments.filter(isImageAttachment)

  return (
    <ul className="chat-attachments">
      {attachments.map((file) => (
        <li key={file.id} className={isImageAttachment(file) ? 'chat-attachment-item chat-attachment-item--image' : 'chat-attachment-item'}>
          {isImageAttachment(file) ? (
            <ChatImage
              file={file}
              conversationId={conversationId}
              messageId={messageId}
              totalImages={imageFiles.length}
              imageIndex={imageFiles.indexOf(file)}
            />
          ) : (
            <ChatFileCard file={file} conversationId={conversationId} messageId={messageId} />
          )}
        </li>
      ))}
    </ul>
  )
}

function ChatImage({
  file,
  conversationId,
  messageId,
  totalImages = 1,
  imageIndex = 0,
}: {
  file: ChatAttachment
  conversationId: string
  messageId: string
  totalImages?: number
  imageIndex?: number
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [zoom, setZoom] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const objectUrl = useRef<string | null>(null)

  useEffect(() => {
    const abort = new AbortController()
    let alive = true
    chatApi.downloadAttachment(conversationId, messageId, file.id, abort.signal)
      .then(blob => {
        if (!alive) return
        const next = URL.createObjectURL(blob)
        objectUrl.current = next
        setUrl(next)
      })
      .catch(() => { if (alive) setFailed(true) })
    return () => {
      alive = false
      abort.abort()
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    }
  }, [conversationId, messageId, file.id])

  useEffect(() => {
    if (!zoom) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setZoom(false)
        setScale(1)
        setRotation(0)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom])

  const downloadImage = () => {
    if (!url) return
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.fileName
    anchor.click()
  }

  if (failed) return <ChatFileCard file={file} conversationId={conversationId} messageId={messageId} />
  if (!url) return <div className="chat-image-skeleton" role="status" aria-label={`Đang tải ảnh ${file.fileName}`} />

  return (
    <>
      <button
        type="button"
        className={`chat-image-thumb ${totalImages > 1 ? `chat-image-thumb--grid chat-image-thumb--count-${Math.min(totalImages, 4)}` : ''}`}
        onClick={() => { setZoom(true); setScale(1); setRotation(0) }}
        aria-label={`Phóng to ảnh ${file.fileName}`}
      >
        <img src={url} alt={file.fileName} loading="lazy" />
        {totalImages > 4 && imageIndex === 3 && (
          <span className="chat-image-more-overlay">+{totalImages - 4}</span>
        )}
      </button>

      {zoom && (
        <div
          className="chat-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={file.fileName}
          onClick={() => { setZoom(false); setScale(1); setRotation(0) }}
        >
          {/* Lightbox Toolbar */}
          <div className="chat-lightbox-toolbar" onClick={event => event.stopPropagation()}>
            <span className="chat-lightbox-title" title={file.fileName}>
              {file.fileName} <small>({formatBytes(file.sizeBytes)})</small>
            </span>
            <div className="chat-lightbox-controls">
              <button
                type="button"
                className="chat-lightbox-btn"
                title="Thu nhỏ"
                onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                aria-label="Thu nhỏ"
              >
                <span className="material-symbols-outlined" aria-hidden="true">zoom_out</span>
              </button>
              <button
                type="button"
                className="chat-lightbox-btn"
                title="Khôi phục kích thước"
                onClick={() => { setScale(1); setRotation(0) }}
                aria-label="Khôi phục kích thước"
              >
                <span className="text-xs font-mono">{Math.round(scale * 100)}%</span>
              </button>
              <button
                type="button"
                className="chat-lightbox-btn"
                title="Phóng to"
                onClick={() => setScale(s => Math.min(3, s + 0.25))}
                aria-label="Phóng to"
              >
                <span className="material-symbols-outlined" aria-hidden="true">zoom_in</span>
              </button>
              <button
                type="button"
                className="chat-lightbox-btn"
                title="Xoay 90°"
                onClick={() => setRotation(r => (r + 90) % 360)}
                aria-label="Xoay ảnh"
              >
                <span className="material-symbols-outlined" aria-hidden="true">rotate_right</span>
              </button>
              <button
                type="button"
                className="chat-lightbox-btn chat-lightbox-btn--download"
                title="Tải ảnh về máy"
                onClick={downloadImage}
                aria-label="Tải ảnh"
              >
                <span className="material-symbols-outlined" aria-hidden="true">download</span>
                <span>Tải ảnh</span>
              </button>
              <button
                type="button"
                className="chat-lightbox-close"
                aria-label="Đóng ảnh"
                onClick={() => { setZoom(false); setScale(1); setRotation(0) }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Lightbox Image Container */}
          <div
            className="chat-lightbox-viewport"
            onClick={event => event.stopPropagation()}
          >
            <img
              src={url}
              alt={file.fileName}
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

function ChatFileCard({ file, conversationId, messageId }: { file: ChatAttachment; conversationId: string; messageId: string }) {
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true)
    try {
      const blob = await chatApi.downloadAttachment(conversationId, messageId, file.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } finally { setBusy(false) }
  }
  return (
    <button type="button" className="chat-file-card" disabled={busy} onClick={() => void download()}>
      <span className="material-symbols-outlined" aria-hidden="true">description</span>
      <span className="chat-file-meta">
        <strong>{file.fileName}</strong>
        <small>{formatBytes(file.sizeBytes)}{busy ? ' · đang tải…' : ''}</small>
      </span>
      <span className="chat-file-download-icon material-symbols-outlined" aria-hidden="true">
        {busy ? 'hourglass_top' : 'download'}
      </span>
    </button>
  )
}
