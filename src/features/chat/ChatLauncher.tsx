import type { Ref } from 'react'
import { Button } from '../../components/ui/Button'
import { unreadLabel } from './chat-view'

export function ChatLauncher({ count, known, expanded, minimized, onClick, buttonRef }: {
  count: number; known: boolean; expanded: boolean; minimized: boolean; onClick: () => void; buttonRef: Ref<HTMLButtonElement>
}) {
  return <Button ref={buttonRef} className="chat-launcher" icon="chat_bubble" onClick={onClick}
    aria-label={`${minimized ? 'Mở lại tin nhắn' : 'Mở tin nhắn'}${known && count > 0 ? `, ${count} tin chưa đọc` : ''}${!known ? ', đang đồng bộ' : ''}`}
    aria-expanded={expanded} aria-controls="chat-dock-panel">
    {known && count > 0 && <span className="chat-launcher-badge" aria-hidden="true">{unreadLabel(count)}</span>}
  </Button>
}
