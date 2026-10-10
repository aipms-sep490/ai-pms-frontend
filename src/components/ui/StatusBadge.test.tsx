import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'
import { schemeStatusTone } from './status-badge-tone'
afterEach(cleanup)

describe('StatusBadge', () => {
  it('maps statuses to tones with PROPOSED surfaced as a warning', () => {
    expect(schemeStatusTone('PUBLISHED')).toBe('success')
    expect(schemeStatusTone('PROPOSED')).toBe('warning')
    expect(schemeStatusTone('DRAFT')).toBe('neutral')
    expect(schemeStatusTone('FROZEN')).toBe('info')
    expect(schemeStatusTone(undefined)).toBe('neutral')
  })

  it('renders the Vietnamese label for a PROPOSED scheme', () => {
    render(<StatusBadge status="PROPOSED" />)
    expect(screen.getByText('Đề xuất — chưa duyệt')).toBeTruthy()
  })

  it('honours an explicit tone and label override', () => {
    render(<StatusBadge status="PUBLISHED" tone="danger" label="Tùy chỉnh" />)
    expect(screen.getByText('Tùy chỉnh')).toBeTruthy()
  })
})
