import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { RegistrationReadinessChecklist } from './RegistrationReadinessChecklist'
import { MemoryRouter } from 'react-router-dom'

afterEach(() => { cleanup() })

describe('RegistrationReadinessChecklist', () => {
  it('renders nothing when there are no blocking reasons', () => {
    const { container } = render(<RegistrationReadinessChecklist reasons={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders one item per reason code, resolving dynamic codes', () => {
    render(<MemoryRouter><RegistrationReadinessChecklist reasons={['SUPERVISOR_NOT_CONFIRMED', 'MENTOR_NOT_CONFIRMED:9']}
      resolveMajorName={(majorId) => majorId === 9 ? 'Trí tuệ nhân tạo' : undefined} /></MemoryRouter>)
    expect(screen.getByText('Chưa có giảng viên hướng dẫn chính xác nhận lời mời.')).toBeTruthy()
    expect(screen.getByText('Chưa có Mentor xác nhận cho ngành Trí tuệ nhân tạo.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Mời giảng viên hướng dẫn/ }).getAttribute('href')).toBe('/project/supervisor')
  })

  it('exposes the checklist as a named status region for assistive tech', () => {
    render(<RegistrationReadinessChecklist reasons={['DUPLICATE_TOPIC_TITLE']} />)
    expect(screen.getByRole('status', { name: 'Cần hoàn tất trước khi nộp' })).toBeTruthy()
  })
})
