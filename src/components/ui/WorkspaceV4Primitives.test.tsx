import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CommandPalette, ContextualBlockerBanner, ImpactDiffSheet } from './WorkspacePrimitives'
import { SlideOverTaskDrawer } from '../../features/tasks/components/SlideOverTaskDrawer'

describe('Workspace V4 Primitives & 2-Col SlideOverTaskDrawer (PR-P1-E)', () => {
  it('supports 2-column SlideOverTaskDrawer with Assign yourself, Gate Evidence push, and Label Picker', () => {
    const onAssign = vi.fn()
    const onPush = vi.fn()
    const onToggle = vi.fn()

    render(
      <SlideOverTaskDrawer
        open
        currentUserId={42}
        catalogLabels={[{ id: 1, slug: 'integration', name: 'Integration', colorHex: '#115E59', description: 'IT <-> MKT' }]}
        task={{
          id: 99,
          title: 'Connect Tracking Pixel',
          description: 'Wire MKT event spec to FE checkout',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          storyPoints: 5,
          taskCategory: 'Event & Tracking Spec',
          disciplineSubStatus: 'CODING',
          handoffFlag: 'WAITING_FOR_MKT',
          assigneeIds: [],
          labels: [],
          criteria: [{ id: 1, title: 'Event fires on submit', isCompleted: true }],
        }}
        onClose={vi.fn()}
        onAssignYourself={onAssign}
        onToggleLabel={onToggle}
        onPushToGateEvidence={onPush}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tự nhận việc (Assign yourself)' }))
    expect(onAssign).toHaveBeenCalledWith(99, 42)

    fireEvent.click(screen.getByRole('button', { name: 'Đẩy lên Minh chứng Gate' }))
    expect(onPush).toHaveBeenCalledWith(99)

    fireEvent.click(screen.getByRole('button', { name: 'Chọn' }))
    fireEvent.click(screen.getByLabelText(/Integration/))
    expect(onToggle).toHaveBeenCalledWith(99, 'integration')
  })

  it('opens CommandPalette on Ctrl+K and selects assignment target', () => {
    const onSelect = vi.fn()
    render(
      <CommandPalette
        items={[
          { id: 'a1', label: 'Chấm Cold IT×MKT #12', category: 'EVALUATION', targetPath: '/evaluator/assignments/12', meta: 'assignmentId=12' },
        ]}
        onSelect={onSelect}
      />,
    )

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByRole('dialog', { name: 'Chuyển nhanh Command Palette' })).toBeTruthy()
    fireEvent.click(screen.getByText('Chấm Cold IT×MKT #12'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ targetPath: '/evaluator/assignments/12' }))
  })

  it('renders ContextualBlockerBanner and ImpactDiffSheet cleanly', () => {
    const onConfirm = vi.fn()
    render(
      <>
        <ContextualBlockerBanner code="PROJECT_NOT_ACTIVE" title="Đồ án chưa kích hoạt" detail="Hoàn tất Cam kết nhóm trước khi tạo Task." />
        <ImpactDiffSheet
          open
          title="Xác nhận Công bố"
          summary="Kiểm tra khác biệt trước khi chốt."
          rows={[{ label: 'Trạng thái', before: 'DRAFT', after: 'PUBLISHED' }]}
          onConfirm={onConfirm}
          onClose={vi.fn()}
        />
      </>,
    )

    expect(screen.getByText('PROJECT_NOT_ACTIVE')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận áp dụng' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
