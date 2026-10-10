import { useRef, useState } from 'react'
import { canDrop, countInColumn, moveTask, shiftStatus, type Movable } from './board-dnd'

export interface BoardCard extends Movable { id: number; status: string; title: string; assignee: string; due: string }

interface BoardFixtureProps {
  cards: BoardCard[]
  statuses: readonly string[]
  /** 0 disables the WIP limit. Applies to every column except the card's current one. */
  wipLimit?: number
  onMove: (id: number, status: string, note: string) => void
  onSelect: (id: number) => void
}

/**
 * Accessible task board for the fixture: native pointer drag for mouse users, and per-card
 * move controls plus arrow-key handling for keyboard users. All moves go through the pure
 * board-dnd helpers so the WIP limit and no-op rules are enforced in one place.
 */
export function BoardFixture({ cards, statuses, wipLimit = 0, onMove, onSelect }: BoardFixtureProps) {
  const [dragId, setDragId] = useState<number | null>(null)
  const [overStatus, setOverStatus] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const liveRef = useRef<HTMLParagraphElement>(null)

  const describe = (id: number, status: string) => {
    const card = cards.find(item => item.id === id)
    return card ? `Đã chuyển “${card.title}” sang cột ${status}.` : ''
  }

  const requestMove = (id: number, status: string) => {
    if (!canDrop(cards, id, status, wipLimit)) {
      setAnnounce(`Cột ${status} đã đạt giới hạn WIP (${wipLimit}); không thể nhận thêm thẻ.`)
      return
    }
    if (moveTask(cards, id, status, wipLimit) === cards) return
    onMove(id, status, describe(id, status))
    setAnnounce(describe(id, status))
  }

  const onArrow = (event: React.KeyboardEvent, card: BoardCard) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const target = shiftStatus(statuses, card.status, event.key === 'ArrowRight' ? 1 : -1)
    if (target !== card.status) requestMove(card.id, target)
  }

  return (
    <div>
      <div className="task-board-scroll" aria-label="Board kéo thả fixture" tabIndex={0}>
        {statuses.map(status => {
          const columnCards = cards.filter(card => card.status === status)
          const full = wipLimit > 0 && countInColumn(cards, status) >= wipLimit
          return (
            <section
              key={status}
              className={`task-board-column${overStatus === status ? ' task-board-column--over' : ''}`}
              aria-label={`Cột ${status}, ${columnCards.length} thẻ`}
              onDragOver={event => {
                if (dragId === null) return
                event.preventDefault()
                setOverStatus(status)
              }}
              onDragLeave={() => setOverStatus(current => (current === status ? null : current))}
              onDrop={event => {
                event.preventDefault()
                const id = Number(event.dataTransfer.getData('text/plain'))
                setOverStatus(null)
                setDragId(null)
                if (cards.some(card => card.id === id)) requestMove(id, status)
              }}
            >
              <h3>
                {status} <span>{wipLimit > 0 ? `${columnCards.length}/${wipLimit}` : columnCards.length}</span>
                {full && <small className="task-board-wip"> WIP đầy</small>}
              </h3>
              <ul>
                {columnCards.map(card => {
                  const prev = shiftStatus(statuses, card.status, -1)
                  const next = shiftStatus(statuses, card.status, 1)
                  return (
                    <li
                      key={card.id}
                      className={`task-board-item${dragId === card.id ? ' task-board-item--dragging' : ''}`}
                      draggable
                      onDragStart={event => {
                        event.dataTransfer.setData('text/plain', String(card.id))
                        event.dataTransfer.effectAllowed = 'move'
                        setDragId(card.id)
                      }}
                      onDragEnd={() => {
                        setDragId(null)
                        setOverStatus(null)
                      }}
                    >
                      <button
                        type="button"
                        className="task-board-card"
                        onClick={() => onSelect(card.id)}
                        onKeyDown={event => onArrow(event, card)}
                      >
                        #{card.id} · {card.title}
                        <small>{card.assignee} · {card.due || 'Chưa có hạn'}</small>
                      </button>
                      <div className="task-board-move" role="group" aria-label={`Di chuyển thẻ #${card.id}`}>
                        <button
                          type="button"
                          disabled={prev === card.status}
                          aria-label={`Chuyển “${card.title}” sang cột ${prev}`}
                          onClick={() => requestMove(card.id, prev)}
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          disabled={next === card.status || !canDrop(cards, card.id, next, wipLimit)}
                          aria-label={`Chuyển “${card.title}” sang cột ${next}`}
                          onClick={() => requestMove(card.id, next)}
                        >
                          ▶
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {!columnCards.length && <p className="task-board-empty">Trống</p>}
            </section>
          )
        })}
      </div>
      <p ref={liveRef} role="status" aria-live="polite" className="v5-visually-hidden">
        {announce}
      </p>
    </div>
  )
}
