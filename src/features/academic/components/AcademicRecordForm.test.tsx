import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../../../services/http/http-client'
import { AcademicRecordForm } from './AcademicRecordForm'

const hierarchy = [{ organization: { id: 1, code: 'FPTU', name: 'FPT University', description: null, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }, departments: [{ department: { id: 10, organizationId: 1, organizationCode: 'FPTU', organizationName: 'FPT University', code: 'SE', name: 'Software Engineering', description: null, isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }, majors: [] }] }]
afterEach(cleanup)

describe('AcademicRecordForm', () => {
  it('validates required fields before calling the backend adapter', () => {
    const onSubmit = vi.fn()
    render(<AcademicRecordForm kind="organization" hierarchy={hierarchy} isSubmitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(screen.getByRole('alert').textContent).toContain('Mã và tên là bắt buộc')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('preserves a major department ID rather than a parent display name', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<AcademicRecordForm kind="major" hierarchy={hierarchy} isSubmitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Mã'), { target: { value: 'SWE' } })
    fireEvent.change(screen.getByLabelText('Tên'), { target: { value: 'Software Engineering' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'major', departmentId: 10 })))
  })

  it('maps a backend business rule failure without showing a raw server message', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new HttpError('internal database exception', 409))
    render(<AcademicRecordForm kind="organization" hierarchy={hierarchy} isSubmitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Mã'), { target: { value: 'FPTU' } })
    fireEvent.change(screen.getByLabelText('Tên'), { target: { value: 'FPT University' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Dữ liệu trùng lặp'))
    expect(screen.queryByText('internal database exception')).toBeNull()
  })
})
