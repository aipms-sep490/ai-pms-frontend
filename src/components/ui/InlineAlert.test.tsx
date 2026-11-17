import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { InlineAlert } from './InlineAlert'

it('announces failures assertively and ordinary feedback politely', () => {
  const view = render(<InlineAlert tone="error">Không thể lưu</InlineAlert>)
  expect(screen.getByRole('alert').textContent).toBe('Không thể lưu')
  view.rerender(<InlineAlert tone="success">Đã lưu</InlineAlert>)
  expect(screen.getByRole('status').textContent).toBe('Đã lưu')
})
