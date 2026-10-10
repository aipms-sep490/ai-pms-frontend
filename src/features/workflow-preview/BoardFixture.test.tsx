import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BoardFixture, type BoardCard } from './BoardFixture'

const statuses = ['TODO', 'IN_PROGRESS', 'DONE'] as const
const cards: BoardCard[] = [
  { id: 1, status: 'TODO', title: 'Alpha', assignee: 'An', due: '2026-10-15' },
  { id: 2, status: 'IN_PROGRESS', title: 'Beta', assignee: 'Bình', due: '' },
]
afterEach(cleanup)

describe('BoardFixture', () => {
  it('moves a card to the next column via the keyboard-accessible control', () => {
    const onMove = vi.fn()
    render(<BoardFixture cards={cards} statuses={statuses} onSelect={() => {}} onMove={onMove} />)
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển “Alpha” sang cột IN_PROGRESS' }))
    expect(onMove).toHaveBeenCalledWith(1, 'IN_PROGRESS', expect.stringContaining('Alpha'))
  })

  it('opens the detail when the card button is clicked', () => {
    const onSelect = vi.fn()
    render(<BoardFixture cards={cards} statuses={statuses} onSelect={onSelect} onMove={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /#1 · Alpha/ }))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('blocks a move into a column that is at its WIP limit', () => {
    const onMove = vi.fn()
    render(<BoardFixture cards={cards} statuses={statuses} wipLimit={1} onSelect={() => {}} onMove={onMove} />)
    const control = screen.getByRole('button', { name: 'Chuyển “Alpha” sang cột IN_PROGRESS' })
    expect((control as HTMLButtonElement).disabled).toBe(true)
    expect(onMove).not.toHaveBeenCalled()
  })

  it('moves via arrow keys on a focused card', () => {
    const onMove = vi.fn()
    render(<BoardFixture cards={cards} statuses={statuses} onSelect={() => {}} onMove={onMove} />)
    fireEvent.keyDown(screen.getByRole('button', { name: /#2 · Beta/ }), { key: 'ArrowRight' })
    expect(onMove).toHaveBeenCalledWith(2, 'DONE', expect.any(String))
  })
})
