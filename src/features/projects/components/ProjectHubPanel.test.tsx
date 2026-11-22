import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProjectHubPanel } from './ProjectHubPanel'

afterEach(cleanup)

it('renders Health Pulse, Spec Vault pinned resources, CRITICAL anchored comment lock, and Silent Member alert', async () => {
  const onPin = vi.fn().mockResolvedValue(undefined)
  const onResolve = vi.fn().mockResolvedValue(undefined)
  render(
    <ProjectHubPanel
      pinnedResources={[{ id: 1, projectId: 5, resourceType: 'FIGMA', title: 'Design Kit', url: 'https://figma.com/1', createdBy: 1, createdAt: '2026-11-20T00:00:00Z' }]}
      anchoredComments={[{ id: 9, projectId: 5, gateInstanceId: 2, evidenceId: 3, anchorRef: 'Trang 4', severity: 'CRITICAL', status: 'OPEN', content: 'Thiếu biểu đồ tuần tự', createdBy: 2, resolvedBy: null, createdAt: '2026-11-20T00:00:00Z', resolvedAt: null }]}
      heatmap={{
        projectId: 5,
        weeks: 4,
        generatedAtUtc: '2026-11-20T00:00:00Z',
        members: [
          { userId: 10, fullName: 'Nguyễn Minh An', majorId: 1, weeklyCounts: [2, 3, 4, 5], totalActions: 14, lastActivityAt: '2026-11-19T00:00:00Z', daysSinceLastActivity: 1, isSilentMember: false },
          { userId: 11, fullName: 'Trần Văn Im Lặng', majorId: 2, weeklyCounts: [0, 0, 0, 0], totalActions: 0, lastActivityAt: null, daysSinceLastActivity: null, isSilentMember: true },
        ],
        silentMemberIds: [11],
      }}
      healthPulse={{
        projectId: 5,
        status: 'INSUFFICIENT_DATA',
        summary: 'Chưa đủ tín hiệu vận hành.',
        signals: { evidenceReadyPercent: null, totalMandatoryGateRequirements: 0, blockedOver48hCount: 0, weeklyReportsLast14Days: 0, interdisciplinaryBalanceRatio: null },
        evaluatedAtUtc: '2026-11-20T00:00:00Z',
      }}
      onAddPinnedResource={onPin}
      onResolveComment={onResolve}
    />,
  )

  expect(screen.getByText(/Chưa đủ dữ liệu/)).toBeTruthy()
  expect(screen.getByText(/1 CRITICAL chưa giải quyết/)).toBeTruthy()
  expect(screen.getByText(/Silent Member > 10d/)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu đã xử lý' }))
  await waitFor(() => expect(onResolve).toHaveBeenCalledWith(9))

  fireEvent.change(screen.getByLabelText('Tiêu đề tài nguyên ghim'), { target: { value: 'Drive Spec' } })
  fireEvent.change(screen.getByLabelText('URL tài nguyên ghim'), { target: { value: 'https://drive.google.com/spec' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ghim tài nguyên' }))
  await waitFor(() => expect(onPin).toHaveBeenCalledWith({
    resourceType: 'FIGMA',
    title: 'Drive Spec',
    url: 'https://drive.google.com/spec',
  }))
})
