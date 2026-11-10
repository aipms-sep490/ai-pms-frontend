import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataSourceStatus } from './DataSourceStatus'

describe('DataSourceStatus', () => {
  it('renders list of data sources with status messages and timestamp', () => {
    render(
      <DataSourceStatus
        title="Trạng thái nguồn dữ liệu"
        asOfUtc="2026-11-07T08:00:00Z"
        sources={[
          { id: 'tasks', label: 'Công việc', state: 'ready', message: 'Tất cả 15 công việc đã tải.' },
          { id: 'reports', label: 'Báo cáo', state: 'partial', message: 'API hiện trả kỳ báo cáo, không trả hạn nộp báo cáo' },
          { id: 'defense', label: 'Bảo vệ', state: 'unavailable', message: 'Chưa mở đợt bảo vệ.' },
        ]}
      />
    )

    expect(screen.getByRole('region', { name: 'Trạng thái nguồn dữ liệu' })).toBeDefined()
    expect(screen.getByText('Công việc')).toBeDefined()
    expect(screen.getByText('Tất cả 15 công việc đã tải.')).toBeDefined()
    expect(screen.getByText('Báo cáo')).toBeDefined()
    expect(screen.getByText('API hiện trả kỳ báo cáo, không trả hạn nộp báo cáo')).toBeDefined()
    expect(screen.getByText('Bảo vệ')).toBeDefined()
    expect(screen.getByText('Chưa mở đợt bảo vệ.')).toBeDefined()
  })

  it('renders nothing when sources array is empty', () => {
    const { container } = render(<DataSourceStatus sources={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
