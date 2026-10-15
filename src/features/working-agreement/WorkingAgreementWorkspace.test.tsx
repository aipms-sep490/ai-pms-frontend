import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { WorkingAgreementWorkspace } from './WorkingAgreementWorkspace'
import { HttpError } from '../../services/http/http-client'

const api = vi.hoisted(() => ({ getWorkingAgreement: vi.fn(), getWorkingAgreementHistory: vi.fn(), saveWorkingAgreement: vi.fn(), publishWorkingAgreement: vi.fn(), acceptWorkingAgreement: vi.fn(), getMyCapabilities: vi.fn() }))
vi.mock('./working-agreement-api', async () => ({ ...await vi.importActual('./working-agreement-api'), ...api }))
vi.mock('../capabilities/capabilities-api', () => ({ getMyCapabilities: api.getMyCapabilities }))
const grants = ['manage_working_agreement', 'publish_working_agreement', 'accept_working_agreement'].map(code => ({ code, allowed: true, reasons: [] }))
const row = (status = 'DRAFT', version = 2) => ({ id: version, projectId: 9, version, status, contentJson: '{"sections":[{"title":"Họp","body":"Mỗi thứ hai"}]}', concurrencyToken: `token-${version}`, required: true, memberCount: 3, acceptances: [], acceptedByMe: false, readiness: { required: true, reasons: [] }, actions: grants, createdAt: '2026-10-15T00:00:00Z' })
const mount = (readOnly = false) => render(<MemoryRouter><WorkingAgreementWorkspace projectId={9} readOnly={readOnly} /></MemoryRouter>)
beforeEach(() => {
  vi.resetAllMocks(); api.getWorkingAgreement.mockResolvedValue(row()); api.getWorkingAgreementHistory.mockResolvedValue({ items: [], page: 1, pageSize: 10, totalCount: 0 })
  api.getMyCapabilities.mockResolvedValue({ actions: grants }); api.saveWorkingAgreement.mockResolvedValue(row()); api.publishWorkingAgreement.mockResolvedValue(row('ACTIVE'))
})
afterEach(cleanup)

describe('Agreement authoring and immutable versions', () => {
  it('creates a first draft using the authoritative empty-state capabilities', async () => {
    api.getWorkingAgreement.mockResolvedValue(null); mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Soạn cam kết đầu tiên' }))
    fireEvent.change(screen.getByLabelText('Tiêu đề mục 1'), { target: { value: ' Giao tiếp ' } })
    fireEvent.change(screen.getByLabelText('Nội dung mục 1'), { target: { value: ' Họp mỗi tuần ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(api.saveWorkingAgreement).toHaveBeenCalledWith(9, { expectedLatestVersion: 0, sections: [{ title: 'Giao tiếp', body: 'Họp mỗi tuần' }] }))
  })
  it('does not infer authoring rights from an empty agreement', async () => {
    api.getWorkingAgreement.mockResolvedValue(null); api.getMyCapabilities.mockResolvedValue({ actions: [] }); mount()
    await screen.findByText('Nhóm chưa có bản cam kết làm việc nào.')
    expect(screen.queryByRole('button', { name: 'Soạn cam kết đầu tiên' })).toBeNull()
  })
  it('saves an existing draft with its exact token', async () => {
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Sửa bản nháp' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(api.saveWorkingAgreement).toHaveBeenCalledWith(9, { expectedLatestVersion: 2, concurrencyToken: 'token-2', sections: [{ title: 'Họp', body: 'Mỗi thứ hai' }] }))
  })
  it('creates successors without recycling the published token', async () => {
    api.getWorkingAgreement.mockResolvedValue(row('ACTIVE')); mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo phiên bản kế tiếp' })); fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(api.saveWorkingAgreement).toHaveBeenCalledWith(9, { expectedLatestVersion: 2, sections: [{ title: 'Họp', body: 'Mỗi thứ hai' }] }))
  })
  it('requires confirmation and sends the exact draft version for publication', async () => {
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Công bố phiên bản' }))
    expect(api.publishWorkingAgreement).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Công bố cam kết' }))
    await waitFor(() => expect(api.publishWorkingAgreement).toHaveBeenCalledWith(9, 2, 'token-2'))
  })
  it('retains unsaved text on conflict and requires explicit reconciliation', async () => {
    api.saveWorkingAgreement.mockRejectedValue(new HttpError('stale', 409)); mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa bản nháp' }))
    fireEvent.change(screen.getByLabelText('Nội dung mục 1'), { target: { value: 'Bản tôi đang viết' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await screen.findByRole('button', { name: 'Dùng phiên bản mới làm nền' })
    expect((screen.getByRole('button', { name: 'Lưu bản nháp' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByDisplayValue('Bản tôi đang viết')).toBeTruthy()
    expect(api.saveWorkingAgreement).toHaveBeenCalledTimes(1)
  })
  it('keeps the active version actionable when a successor is still a draft', async () => {
    api.getWorkingAgreementHistory.mockResolvedValue({ items: [row(), row('ACTIVE', 1)], totalCount: 2 }); mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Tôi đồng ý với cam kết' }))
    await waitFor(() => expect(api.acceptWorkingAgreement).toHaveBeenCalledWith(9, 1, 'token-1'))
  })
  it('renders read-only readers without signing or editing controls', async () => {
    api.getWorkingAgreement.mockResolvedValue(row('ACTIVE')); mount(true); await screen.findByText('Họp')
    expect(screen.queryByRole('button', { name: 'Tôi đồng ý với cam kết' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tạo phiên bản kế tiếp' })).toBeNull()
  })
})
