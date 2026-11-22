import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
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

it('renders streamed section headings without requiring surrounding blank lines', () => {
  const { container } = render(<AssistantAnswerText text={'## Tiến độ đồ án\r\nGiai đoạn: Đang thực hiện.\r\nĐã truy hồi 3/3 công việc.\r\n## Việc cần chú ý\r\n- Kiểm tra **deadline**\r\n- Giao `TASK-1`\r\n## Mốc tiến độ\r\nMốc đầu tiên'} />)
  expect(screen.getAllByRole('heading').map(item => item.textContent)).toEqual(['Tiến độ đồ án', 'Việc cần chú ý', 'Mốc tiến độ'])
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByText(/Giai đoạn: Đang thực hiện/)).toBeTruthy()
  expect(container.querySelector('strong')?.textContent).toBe('deadline')
  expect(container.querySelector('code')?.textContent).toBe('TASK-1')
  expect(container.textContent).not.toContain('##')
})

it('renders fenced code blocks with copy button, blockquotes, italic, hr and clickable inline citations', () => {
  const onCite = vi.fn()
  const md = [
    'Xem chi tiết tại [DOC-1] và [PROJECT-2] với *lưu ý quan trọng*.',
    '',
    '> Trích dẫn quy định học vụ.',
    '',
    '---',
    '',
    '```sql',
    'SELECT TOP 5 * FROM dbo.projects;',
    '```',
  ].join('\n')
  const { container } = render(<AssistantAnswerText text={md} onCiteClick={onCite} streaming />)
  expect(container.querySelector('em')?.textContent).toBe('lưu ý quan trọng')
  expect(container.querySelector('blockquote')?.textContent).toContain('Trích dẫn quy định học vụ.')
  expect(container.querySelector('hr')).toBeTruthy()
  expect(container.querySelector('pre code')?.textContent).toContain('SELECT TOP 5 * FROM dbo.projects;')
  expect(screen.getByRole('button', { name: /Sao chép mã/ })).toBeTruthy()
  expect(container.querySelector('.assistant-stream-cursor')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'DOC-1' }))
  fireEvent.click(screen.getByRole('button', { name: 'PROJECT-2' }))
  expect(onCite).toHaveBeenNthCalledWith(1, 'DOC', 0)
  expect(onCite).toHaveBeenNthCalledWith(2, 'PROJECT', 1)
})
