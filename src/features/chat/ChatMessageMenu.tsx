import { useEffect, useRef, useState } from 'react'
import { useChatPopover } from './useChatPopover'
import { CHAT_EMOJIS } from './chat-attachments'

interface ChatMessageMenuProps {
  onReply?: () => void
  onReact?: (emoji: string) => void
  onEdit?: () => void
  onRecall?: () => void
}

export function ChatMessageMenu({ onReply, onReact, onEdit, onRecall }: ChatMessageMenuProps) {
  const [open, setOpen] = useState(false)
  const [reactionOpen, setReactionOpen] = useState(false)
  const root = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const close = () => { if (root.current) root.current.open = false; setOpen(false); setReactionOpen(false) }
  useChatPopover(open, trigger, menu, reactionOpen)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close() }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  return <details ref={root} className="chat-message-more" onToggle={event => { setOpen(event.currentTarget.open); if (!event.currentTarget.open) setReactionOpen(false) }} onKeyDown={event => {
    if (event.key === 'Escape' && event.currentTarget.open) { event.preventDefault(); event.stopPropagation(); close(); trigger.current?.focus() }
  }}>
    <summary ref={trigger} aria-label="Thêm thao tác với tin nhắn" title="Thêm thao tác"><span className="material-symbols-outlined" aria-hidden="true">more_horiz</span></summary>
    <div ref={menu} className="chat-message-menu">
      {onReply && <button type="button" onClick={() => { close(); onReply() }}>Trả lời</button>}
      {onReact && <div className="chat-message-react-action">
        <button type="button" aria-expanded={reactionOpen} onClick={() => setReactionOpen(value => !value)}>Thả cảm xúc<span className="material-symbols-outlined" aria-hidden="true">expand_more</span></button>
        {reactionOpen && <div className="chat-message-emoji-picker" role="group" aria-label="Chọn cảm xúc">
          {CHAT_EMOJIS.map(emoji => <button key={emoji} type="button" aria-label={`Thả ${emoji}`} onClick={() => { close(); trigger.current?.focus(); onReact(emoji) }}>{emoji}</button>)}
        </div>}
      </div>}
      {onEdit && <button type="button" onClick={() => { close(); onEdit() }}>Sửa tin nhắn</button>}
      {onRecall && <button type="button" onClick={() => { close(); onRecall() }}>Thu hồi tin nhắn</button>}
    </div>
  </details>
}
