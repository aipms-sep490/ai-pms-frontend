import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HealthPulseBadge } from './HealthPulseBadge'

afterEach(() => { cleanup() })

describe('HealthPulseBadge (TK-W2-13)', () => {
  it('renders GREEN, YELLOW, RED, and INSUFFICIENT_DATA from healthPulseStatus', () => {
    const { rerender } = render(<HealthPulseBadge healthPulseStatus="GREEN" />)
    expect(screen.getByText('Sức khỏe: Ổn định (Thấp)')).toBeTruthy()

    rerender(<HealthPulseBadge healthPulseStatus="YELLOW" />)
    expect(screen.getByText('Sức khỏe: Cần theo dõi (Trung bình)')).toBeTruthy()

    rerender(<HealthPulseBadge healthPulseStatus="RED" />)
    expect(screen.getByText('Sức khỏe: Nguy cơ cao (Cao)')).toBeTruthy()

    rerender(<HealthPulseBadge healthPulseStatus="INSUFFICIENT_DATA" />)
    expect(screen.getByText('Sức khỏe: Chưa đủ dữ liệu')).toBeTruthy()
  })

  it('maps legacy riskLevel fallback and exposes 4-signal tooltip', () => {
    render(
      <HealthPulseBadge
        riskLevel="CRITICAL"
        signals={{
          evidenceReadyPercent: 60,
          totalMandatoryGateRequirements: 5,
          blockedOver48hCount: 2,
          weeklyReportsLast14Days: 0,
          interdisciplinaryBalanceRatio: 0.25,
        }}
      />,
    )
    const badge = screen.getByText('Sức khỏe: Nguy cơ cao (Cao)')
    const wrapper = badge.closest('span[title]')
    expect(wrapper?.getAttribute('title')).toContain('Minh chứng Gate READY: 60% (5 bắt buộc)')
    expect(wrapper?.getAttribute('title')).toContain('Task BLOCKED > 48h: 2')
    expect(wrapper?.getAttribute('title')).toContain('Báo cáo tuần (14 ngày): 0')
    expect(wrapper?.getAttribute('title')).toContain('Cân bằng IT/MKT: 0.25')
  })
})
