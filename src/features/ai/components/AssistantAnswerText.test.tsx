import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { AssistantAnswerText } from './AssistantAnswerText'

afterEach(cleanup)
it('renders readable emphasis and lists without interpreting model HTML', () => {
  const { container } = render(<AssistantAnswerText text={'## Bước tiếp theo\n\n- Đọc **rubric**\n- Kiểm tra `DONE`\n\n<img src=x onerror=alert(1)>'} />)
  expect(screen.getByRole('heading', { name: 'Bước tiếp theo' })).toBeTruthy()
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(container.querySelector('strong')?.textContent).toBe('rubric')
  expect(container.querySelector('code')?.textContent).toBe('DONE')
  expect(container.querySelector('img')).toBeNull()
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
})
