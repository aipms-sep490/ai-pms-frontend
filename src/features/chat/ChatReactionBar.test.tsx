import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ChatReactionBar } from './ChatReactionBar'
import type { ChatReaction } from './chat-api'
afterEach(cleanup)

const reactions: ChatReaction[] = [{ emoji: '👍', count: 2, reactedByMe: true }]

describe('ChatReactionBar', () => {
  it('renders existing counts read-only when reacting is disabled', () => {
    render(<ChatReactionBar reactions={reactions} canReact={false} onToggle={() => {}} />)
    const chip = screen.getByRole('button', { name: /👍 2/ })
    expect((chip as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Thả cảm xúc' })).toBeNull()
  })

  it('renders nothing when there are no reactions and reacting is disabled', () => {
    const { container } = render(<ChatReactionBar reactions={[]} canReact={false} onToggle={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('toggles an existing reaction when enabled', () => {
    const onToggle = vi.fn()
    render(<ChatReactionBar reactions={reactions} canReact onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button', { name: /👍 2/ }))
    expect(onToggle).toHaveBeenCalledWith('👍')
  })

  it('opens the quick picker and reports the chosen emoji', () => {
    const onToggle = vi.fn()
    render(<ChatReactionBar reactions={[]} canReact onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Thả cảm xúc' }))
    fireEvent.click(screen.getByRole('button', { name: 'Thả ❤️' }))
    expect(onToggle).toHaveBeenCalledWith('❤️')
  })

  it('dismisses the picker with Escape before the surrounding dock and restores focus', () => {
    const closeDock = vi.fn()
    render(<div onKeyDown={closeDock}><ChatReactionBar reactions={[]} canReact onToggle={() => {}} /></div>)
    const trigger = screen.getByRole('button', { name: 'Thả cảm xúc' })
    fireEvent.click(trigger)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Thả ❤️' }), { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Chọn cảm xúc' })).toBeNull()
    expect(closeDock).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(trigger)
  })

  it('closes the picker on an outside click without changing a reaction', () => {
    const onToggle = vi.fn()
    render(<><ChatReactionBar reactions={[]} canReact onToggle={onToggle} /><button>Ở ngoài</button></>)
    fireEvent.click(screen.getByRole('button', { name: 'Thả cảm xúc' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Ở ngoài' }))
    expect(screen.queryByRole('group', { name: 'Chọn cảm xúc' })).toBeNull()
    expect(onToggle).not.toHaveBeenCalled()
  })
})
