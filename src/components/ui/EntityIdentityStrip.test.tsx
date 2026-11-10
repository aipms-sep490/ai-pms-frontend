import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { EntityIdentityStrip } from './EntityIdentityStrip'
import { WorkspacePage } from './WorkspacePage'

afterEach(cleanup)

describe('EntityIdentityStrip', () => {
  it('renders at most five identity chips', () => {
    render(<EntityIdentityStrip chips={Array.from({ length: 7 }, (_, index) => ({ icon: 'info', label: `N${index}`, value: `V${index}` }))} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
  })

  it('keeps a long Vietnamese value available through its title', () => {
    const value = 'Kỹ thuật phần mềm và Quản trị dịch vụ du lịch lữ hành liên ngành'
    render(<EntityIdentityStrip chips={[{ icon: 'school', label: 'Chế độ', value }]} />)
    expect(screen.getByTitle(value)).toBeTruthy()
  })

  it('marks icon glyphs as decorative', () => {
    const { container } = render(<EntityIdentityStrip chips={[{ icon: 'school', label: 'Chế độ', value: 'Liên ngành' }]} />)
    expect(container.querySelector('.material-symbols-outlined')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('places identity after the page heading and before page content', () => {
    const { container } = render(
      <WorkspacePage title="Đồ án" identity={<EntityIdentityStrip chips={[{ icon: 'school', label: 'Khoa', value: 'CNTT' }]} />}>
        <button type="button">Nội dung đầu tiên</button>
      </WorkspacePage>,
    )
    const page = container.querySelector('.workspace-page')
    expect(page?.children[0].className).toContain('workspace-heading')
    expect(page?.children[1].querySelector('li')?.textContent).toContain('CNTT')
    expect(page?.children[2].textContent).toBe('Nội dung đầu tiên')
  })
})
