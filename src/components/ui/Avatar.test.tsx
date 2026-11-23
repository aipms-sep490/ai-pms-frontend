import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders Vietnamese initials stripped of parenthetical suffixes', () => {
    render(<Avatar name="Lê Hoàng Long (Flow IT)" title="Lê Hoàng Long (Flow IT)" />)
    const avatar = screen.getByTitle('Lê Hoàng Long (Flow IT)')
    expect(avatar.textContent).toBe('LL')
    expect(avatar.className).toContain('app-avatar--md')
    expect(avatar.className).toContain('app-avatar--rounded')
  })

  it('falls back cleanly to initials when image fails to load', () => {
    render(<Avatar name="Phạm Thùy Linh (Flow MKT)" src="https://example.invalid/avatar.png" shape="circle" size="sm" />)
    const img = screen.getByRole('img', { name: /Phạm Thùy Linh/i })
    fireEvent.error(img)
    expect(screen.getByText('PL')).toBeTruthy()
  })
})
