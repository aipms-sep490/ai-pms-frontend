import { useEffect, useRef, useState } from 'react'
import type { ChatReaction } from './chat-api'
import { CHAT_EMOJIS } from './chat-attachments'
import { useChatPopover } from './useChatPopover'

interface ChatReactionBarProps {
  reactions: ChatReaction[]
  /** When false, existing reactions still render but the user cannot add/remove them. */
  canReact: boolean
  onToggle: (emoji: string) => void
  /** Hide the quick reaction trigger when the parent exposes it in a message menu. */
  showPicker?: boolean
}

/** Messenger-style reaction row: existing counts plus a quick-pick popover gated by `canReact`. */
export function ChatReactionBar({ reactions, canReact, onToggle, showPicker = true }: ChatReactionBarProps) {
  const [picking, setPicking] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const picker = useRef<HTMLSpanElement>(null)
  useChatPopover(picking && canReact, trigger, picker)
  useEffect(() => {
    if (!picking || !canReact) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setPicking(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [picking, canReact])
  const active = reactions.filter(reaction => reaction.count > 0)
  if (!active.length && (!canReact || !showPicker)) return null

  return (
    <div ref={root} className="chat-reactions" onKeyDown={event => {
      if (event.key === 'Escape' && picking) { event.preventDefault(); event.stopPropagation(); setPicking(false); trigger.current?.focus() }
    }}>
      {canReact && showPicker && (
        <span className="chat-reaction-add">
          <button ref={trigger} type="button" aria-label="Thả cảm xúc" title="Thả cảm xúc" aria-expanded={picking} onClick={() => setPicking(value => !value)}>
            <span className="material-symbols-outlined" aria-hidden="true">add_reaction</span>
          </button>
          {picking && (
            <span ref={picker} className="chat-reaction-picker" role="group" aria-label="Chọn cảm xúc">
              {CHAT_EMOJIS.map(emoji => (
                <button key={emoji} type="button" aria-label={`Thả ${emoji}`} onClick={() => { onToggle(emoji); setPicking(false); trigger.current?.focus() }}>{emoji}</button>
              ))}
            </span>
          )}
        </span>
      )}
      {active.map(reaction => (
        <button
          key={reaction.emoji}
          type="button"
          className={reaction.reactedByMe ? 'chat-reaction chat-reaction--mine' : 'chat-reaction'}
          disabled={!canReact}
          aria-pressed={reaction.reactedByMe}
          aria-label={`${reaction.emoji} ${reaction.count}${reaction.reactedByMe ? ', bạn đã thả' : ''}`}
          onClick={() => canReact && onToggle(reaction.emoji)}
        >
          {reaction.emoji} {reaction.count}
        </button>
      ))}
    </div>
  )
}
