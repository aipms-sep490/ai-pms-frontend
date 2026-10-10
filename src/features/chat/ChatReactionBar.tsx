import { useState } from 'react'
import type { ChatReaction } from './chat-api'
import { CHAT_EMOJIS } from './chat-attachments'

interface ChatReactionBarProps {
  reactions: ChatReaction[]
  /** When false, existing reactions still render but the user cannot add/remove them. */
  canReact: boolean
  onToggle: (emoji: string) => void
}

/** Messenger-style reaction row: existing counts plus a quick-pick popover gated by `canReact`. */
export function ChatReactionBar({ reactions, canReact, onToggle }: ChatReactionBarProps) {
  const [picking, setPicking] = useState(false)
  const active = reactions.filter(reaction => reaction.count > 0)
  if (!active.length && !canReact) return null

  return (
    <div className="chat-reactions">
      {active.map(reaction => (
        <button
          key={reaction.emoji}
          type="button"
          className={reaction.mine ? 'chat-reaction chat-reaction--mine' : 'chat-reaction'}
          disabled={!canReact}
          aria-pressed={reaction.mine}
          aria-label={`${reaction.emoji} ${reaction.count}${reaction.mine ? ', bạn đã thả' : ''}`}
          onClick={() => canReact && onToggle(reaction.emoji)}
        >
          {reaction.emoji} {reaction.count}
        </button>
      ))}
      {canReact && (
        <span className="chat-reaction-add">
          <button type="button" aria-label="Thả cảm xúc" aria-expanded={picking} onClick={() => setPicking(value => !value)}>
            <span className="material-symbols-outlined" aria-hidden="true">add_reaction</span>
          </button>
          {picking && (
            <span className="chat-reaction-picker" role="group" aria-label="Chọn cảm xúc">
              {CHAT_EMOJIS.map(emoji => (
                <button key={emoji} type="button" aria-label={`Thả ${emoji}`} onClick={() => { onToggle(emoji); setPicking(false) }}>{emoji}</button>
              ))}
            </span>
          )}
        </span>
      )}
    </div>
  )
}
