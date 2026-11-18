import { useEffect, useRef, useState } from 'react'
import { useChatPopover } from './useChatPopover'

export function ChatMessageMenu({ onEdit, onRecall }: { onEdit?: () => void; onRecall?: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const close = () => { if (root.current) root.current.open = false; setOpen(false) }
  useChatPopover(open, trigger, menu)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close() }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  return <details ref={root} className="chat-message-more" onToggle={event => setOpen(event.currentTarget.open)} onKeyDown={event => {
    if (event.key === 'Escape' && event.currentTarget.open) { event.preventDefault(); event.stopPropagation(); close(); trigger.current?.focus() }
  }}>
    <summary ref={trigger} aria-label="Thêm thao tác với tin nhắn" title="Thêm thao tác"><span className="material-symbols-outlined" aria-hidden="true">more_horiz</span></summary>
    <div ref={menu} className="chat-message-menu">
      {onEdit && <button type="button" onClick={() => { close(); onEdit() }}>Sửa tin nhắn</button>}
      {onRecall && <button type="button" onClick={() => { close(); onRecall() }}>Thu hồi tin nhắn</button>}
    </div>
  </details>
}
