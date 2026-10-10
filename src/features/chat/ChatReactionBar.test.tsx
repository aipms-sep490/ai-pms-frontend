import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ChatReactionBar } from './ChatReactionBar'
import type { ChatReaction } from './chat-api'
afterEach(cleanup)

const reactions: ChatReaction[] = [{ emoji: '👍', count: 2, mine: true }]

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
})
