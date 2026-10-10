import { useEffect, useRef, useState } from 'react'
import { chatApi, type ChatAttachment } from './chat-api'
import { formatBytes, isImageAttachment } from './chat-attachments'

/** Renders a message's attachments: images inline (click to enlarge), other files as download cards. */
export function ChatAttachments({ attachments }: { attachments: ChatAttachment[] }) {
  if (!attachments.length) return null
  return (
    <ul className="chat-attachments">
      {attachments.map(file => (
        <li key={file.id}>{isImageAttachment(file) ? <ChatImage file={file} /> : <ChatFileCard file={file} />}</li>
      ))}
    </ul>
  )
}

function ChatImage({ file }: { file: ChatAttachment }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [zoom, setZoom] = useState(false)
  const objectUrl = useRef<string | null>(null)
  useEffect(() => {
    const abort = new AbortController()
    let alive = true
    chatApi.downloadAttachment(file.id, abort.signal)
      .then(blob => { if (!alive) return; const next = URL.createObjectURL(blob); objectUrl.current = next; setUrl(next) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false; abort.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }
  }, [file.id])

  if (failed) return <ChatFileCard file={file} />
  if (!url) return <div className="chat-image-skeleton" role="status" aria-label={`Đang tải ảnh ${file.fileName}`} />
  return (
    <>
      <button type="button" className="chat-image-thumb" onClick={() => setZoom(true)} aria-label={`Phóng to ảnh ${file.fileName}`}>
        <img src={url} alt={file.fileName} loading="lazy" />
      </button>
      {zoom && (
        <div className="chat-lightbox" role="dialog" aria-modal="true" aria-label={file.fileName} onClick={() => setZoom(false)}>
          <img src={url} alt={file.fileName} onClick={event => event.stopPropagation()} />
          <button type="button" className="chat-lightbox-close" aria-label="Đóng ảnh" onClick={() => setZoom(false)}>✕</button>
        </div>
      )}
    </>
  )
}

function ChatFileCard({ file }: { file: ChatAttachment }) {
  const [busy, setBusy] = useState(false)
  const download = async () => {
    setBusy(true)
    try {
      const blob = await chatApi.downloadAttachment(file.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.fileName; anchor.click()
      URL.revokeObjectURL(url)
    } finally { setBusy(false) }
  }
  return (
    <button type="button" className="chat-file-card" disabled={busy} onClick={() => void download()}>
      <span className="material-symbols-outlined" aria-hidden="true">description</span>
      <span className="chat-file-meta"><strong>{file.fileName}</strong><small>{formatBytes(file.sizeBytes)}{busy ? ' · đang tải…' : ''}</small></span>
    </button>
  )
}
