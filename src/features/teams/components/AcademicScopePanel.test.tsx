import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AcademicScopePanel } from './AcademicScopePanel'
import { HttpError } from '../../../services/http/http-client'

const api = vi.hoisted(() => ({ getMajors: vi.fn(), setAcademicScope: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({
  services: {
    academic: { getMajors: api.getMajors },
    team: { setAcademicScope: api.setAcademicScope },
  },
}))

afterEach(() => { cleanup(); vi.resetAllMocks() })

const majors = [
  { id: 1, code: 'SE', name: 'Kỹ thuật phần mềm', departmentId: 10 },
  { id: 2, code: 'MKT', name: 'Marketing', departmentId: 20 },
  { id: 3, code: 'GD', name: 'Thiết kế đồ họa', departmentId: 30 },
]

describe('AcademicScopePanel', () => {
  it('blocks saving INTERDISCIPLINARY scope when creator omits their own major', async () => {
    api.getMajors.mockResolvedValue(majors)
    render(
      <AcademicScopePanel
        teamId={5}
        period={null}
        workflowContext={null}
        canConfigure
        fallbackOrganizationId={1}
        fallbackMajorId={1}
        onSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(await screen.findByText('Ngành của bạn')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Liên ngành' }))
    fireEvent.click(screen.getByLabelText(/SE — Kỹ thuật phần mềm/))
    fireEvent.click(screen.getByLabelText(/MKT — Marketing/))
    fireEvent.click(screen.getByLabelText(/GD — Thiết kế đồ họa/))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phạm vi ngành' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Nhóm Liên ngành bắt buộc phải bao gồm chuyên ngành của bạn (Kỹ thuật phần mềm)')
    expect(api.setAcademicScope).not.toHaveBeenCalled()
  })

  it('translates backend MEMBER_MAJOR_NOT_ALLOWED conflict into Vietnamese instead of raw code', async () => {
    api.getMajors.mockResolvedValue(majors)
    api.setAcademicScope.mockRejectedValue(new HttpError('MEMBER_MAJOR_NOT_ALLOWED', 409, { code: 'MEMBER_MAJOR_NOT_ALLOWED', detail: 'MEMBER_MAJOR_NOT_ALLOWED' }))
    render(
      <AcademicScopePanel
        teamId={5}
        period={null}
        workflowContext={null}
        canConfigure
        fallbackOrganizationId={1}
        fallbackMajorId={1}
        onSaved={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    await screen.findByText('Ngành của bạn')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phạm vi ngành' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Chuyên ngành của bạn không nằm trong danh sách chuyên ngành đã chọn')
    expect(alert.textContent).not.toContain('MEMBER_MAJOR_NOT_ALLOWED')
  })
})
