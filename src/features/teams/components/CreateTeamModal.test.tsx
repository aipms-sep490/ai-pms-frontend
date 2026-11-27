import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CreateTeamModal } from './CreateTeamModal'

afterEach(cleanup)

const majors = [
  { id: 1, name: '[TEST] Kỹ thuật phần mềm', departmentId: 10 },
  { id: 2, name: '[TEST] Marketing', departmentId: 20 },
  { id: 3, name: '[TEST] Thiết kế đồ họa', departmentId: 30 },
]

describe('CreateTeamModal', () => {
  it('explains clearly when a student omits their own major in INTERDISCIPLINARY mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <CreateTeamModal
        isOpen
        semesterName="DST-20261024"
        majors={majors}
        defaultMajorId={1}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Mã Nhóm/i), { target: { value: 'SE99' } })
    fireEvent.change(screen.getByLabelText(/Tên Nhóm/i), { target: { value: 'Nhóm liên ngành 99' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'INTERDISCIPLINARY' } })

    // Uncheck own major (SE), check Marketing and Design
    fireEvent.click(screen.getByLabelText(/\[TEST\] Kỹ thuật phần mềm/))
    fireEvent.click(screen.getByLabelText(/\[TEST\] Marketing/))
    fireEvent.click(screen.getByLabelText(/\[TEST\] Thiết kế đồ họa/))

    fireEvent.click(screen.getByRole('button', { name: 'Khởi tạo nhóm' }))
    expect(await screen.findByText(/Nhóm Liên ngành bắt buộc phải bao gồm chuyên ngành của bạn \(\[TEST\] Kỹ thuật phần mềm\)/)).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('explains clearly when a student picks a different major in SINGLE_MAJOR mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <CreateTeamModal
        isOpen
        semesterName="DST-20261024"
        majors={majors}
        defaultMajorId={1}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Mã Nhóm/i), { target: { value: 'SE98' } })
    fireEvent.change(screen.getByLabelText(/Tên Nhóm/i), { target: { value: 'Nhóm đơn ngành 98' } })
    fireEvent.click(screen.getByLabelText(/\[TEST\] Marketing/))

    fireEvent.click(screen.getByRole('button', { name: 'Khởi tạo nhóm' }))
    expect(await screen.findByText(/Nhóm Đơn ngành phải thuộc đúng chuyên ngành của bạn \(\[TEST\] Kỹ thuật phần mềm\)/)).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
