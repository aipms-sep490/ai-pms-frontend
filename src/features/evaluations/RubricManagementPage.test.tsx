import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { RubricManagementPage } from './RubricManagementPage'
import { HttpError } from '../../services/http/http-client'
const mocks = vi.hoisted(() => ({ listRubrics: vi.fn(), getRubric: vi.fn(), createRubric: vi.fn(), publishRubric: vi.fn(), submitRubricForApproval: vi.fn(), approveRubric: vi.fn(), rejectRubric: vi.fn(), retireRubric: vi.fn(), cloneRubric: vi.fn(), deleteRubric: vi.fn(), updateRubric: vi.fn() }))
vi.mock('./rubrics-api', () => mocks)
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: null }) }))
const criterion = { id: 1, name: 'Chất lượng', description: 'Mô tả đầy đủ', weightPercent: 100, maxScore: 10, sortOrder: 0, isRequired: true, children: [] }
const published = { id: 2, departmentId: 1, academicSemesterId: 1, code: 'PUBLIC', name: 'Bộ đã công bố', description: null, status: 'PUBLISHED', version: 1, concurrencyToken: 'token', canEdit: false, criteria: [criterion] }
const draft = { ...published, id: 1, code: 'DRAFT', name: 'Bộ nháp', status: 'DRAFT', canEdit: true }
const page = () => render(<MemoryRouter><RubricManagementPage /></MemoryRouter>)
afterEach(cleanup)
beforeEach(() => { vi.clearAllMocks(); mocks.listRubrics.mockResolvedValue({ items: [draft, published], totalCount: 2 }); mocks.getRubric.mockImplementation(async (id: number) => id === 1 ? draft : published) })
describe('RubricManagementPage deep interactions', () => {
  it('shows BE effective weight separately for nested criteria and one value for flat data', async () => {
    const nested = { ...criterion, id: 11, name: 'Tích hợp', weightPercent: 50, effectiveWeightPercent: 25, parentId: 1, sortOrder: 0 }
    const sibling = { ...nested, id: 12, name: 'Kiểm thử', sortOrder: 1 }
    const parent = { ...criterion, id: 1, name: 'Chất lượng', weightPercent: 50, effectiveWeightPercent: 50, parentId: null, maxScore: null, isRequired: false, children: [nested, sibling] }
    const flat = { ...criterion, id: 2, name: 'Trình bày', weightPercent: 50, effectiveWeightPercent: 50, parentId: null, sortOrder: 1 }
    mocks.getRubric.mockResolvedValue({ ...published, criteria: [parent, flat] })
    page(); await screen.findByRole('heading', { name: 'Tích hợp' })
    expect(screen.getAllByText('Trong nhóm: 50%')).toHaveLength(2)
    expect(screen.getAllByText('Tỷ trọng hiệu lực trong bộ tiêu chí: 25%')).toHaveLength(2)
    expect(screen.getAllByText('Trọng số: 50%')).toHaveLength(2)
    expect(screen.queryByText('Điểm tối đa: —')).toBeNull()
  })

  it('shows a child group weight error beside its parent while root remains 100', async () => {
    const child = { ...criterion, id: 11, name: 'Con', weightPercent: 90, sortOrder: 0 }
    const root = { ...criterion, name: 'Tích hợp', maxScore: null, isRequired: false, children: [child] }
    const nestedDraft = { ...draft, criteria: [root] }
    mocks.getRubric.mockImplementation(async (id: number) => id === 1 ? nestedDraft : published)
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: /DRAFT · v1/ }))
    expect(await screen.findByText('Nhóm con của Tích hợp: 90.00% — còn thiếu 10.00%')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Tiêu chí 1: Tích hợp' }).className).toContain('border-status-error-border')
  })

  it('allows draft saving with missing levels while withholding submission for BE configured five levels', async () => {
    const fiveLevelDraft = { ...draft, requiredLevelCount: 5, criteria: [{ ...criterion, effectiveWeightPercent: 95, levels: [] }] }
    mocks.listRubrics.mockResolvedValue({ items: [fiveLevelDraft], totalCount: 1 })
    mocks.getRubric.mockResolvedValue(fiveLevelDraft)
    mocks.updateRubric.mockResolvedValue(fiveLevelDraft)
    page(); await screen.findByLabelText('Tên tiêu chí')
    expect((screen.getByRole('button', { name: 'Gửi duyệt' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Tiêu chí còn thiếu mức/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Tên bộ tiêu chí'), { target: { value: 'Bản soạn dở' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect(mocks.updateRubric).toHaveBeenCalled())
    expect(mocks.updateRubric.mock.calls[0][1].criteria[0]).not.toHaveProperty('effectiveWeightPercent')
    expect(mocks.submitRubricForApproval).not.toHaveBeenCalled()
  })
  it('renders five editable levels from BE count and enables submission only after a complete saved draft', async () => {
    let server = { ...draft, requiredLevelCount: 5, criteria: [{ ...criterion, levels: [] as Array<{ levelOrder: number; label: string; descriptor: string; scoreFrom: number | null; scoreTo: number | null }> }] }
    mocks.listRubrics.mockResolvedValue({ items: [server], totalCount: 1 })
    mocks.getRubric.mockImplementation(async () => server)
    mocks.updateRubric.mockImplementation(async (_id, body) => { server = { ...server, criteria: body.criteria }; return server })
    mocks.submitRubricForApproval.mockImplementation(async () => ({ ...server, status: 'PENDING_APPROVAL', canEdit: false }))
    page(); await screen.findByLabelText('Tên tiêu chí')
    for (let index = 0; index < 5; index++) fireEvent.click(screen.getByRole('button', { name: 'Thêm mức vào bản nháp' }))
    expect(screen.getAllByLabelText('Mô tả')).toHaveLength(7)
    screen.getAllByLabelText('Mô tả').slice(-5).forEach((field, index) => fireEvent.change(field, { target: { value: `Mức ${index + 1}` } }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Gửi duyệt' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Gửi duyệt' }))
    fireEvent.click(screen.getByRole('dialog').querySelector('button[type="submit"]')!)
    await waitFor(() => expect(mocks.submitRubricForApproval).toHaveBeenCalledWith(1, 'token'))
  })
  it('hides major for common scope and requires it for major specific scope', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: /DRAFT · v1/ }))
    await screen.findByLabelText('Phạm vi')
    fireEvent.change(screen.getByLabelText('Phạm vi'), { target: { value: 'COMMON' } })
    expect(screen.queryByLabelText('Ngành')).toBeNull()
    fireEvent.change(screen.getByLabelText('Phạm vi'), { target: { value: 'MAJOR_SPECIFIC' } })
    expect((screen.getByLabelText('Ngành') as HTMLSelectElement).required).toBe(true)
  })
  it('keeps pending approval readonly and only shows approval actions on server capability', async () => {
    const pending = { ...draft, status: 'PENDING_APPROVAL', canEdit: false, canApprove: false, canReject: false }
    mocks.listRubrics.mockResolvedValue({ items: [pending], totalCount: 1 })
    mocks.getRubric.mockResolvedValue(pending)
    page(); await screen.findByText(/Đang chờ phê duyệt/)
    expect(screen.queryByRole('button', { name: 'Phê duyệt' })).toBeNull()
    expect(screen.queryByLabelText('Tên tiêu chí')).toBeNull()
  })
  it('opens the published rubric as readable content, without disabled editing controls', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    expect(mocks.getRubric).toHaveBeenCalledWith(2)
    expect(screen.getByRole('heading', { name: 'Chất lượng' })).toBeDefined()
    expect(screen.queryByLabelText('Tên tiêu chí')).toBeNull()
  })
  it('cancels version creation without sending an API request', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phiên bản' }))
    expect(screen.getByLabelText('Mã phiên bản mới').tagName).toBe('INPUT')
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(mocks.cloneRubric).not.toHaveBeenCalled()
  })
  it('restores a valid maximum score when the final child is removed', async () => {
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo bộ tiêu chí' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm tiêu chí con' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Bỏ' })[1])
    expect((screen.getByLabelText('Điểm tối đa') as HTMLInputElement).value).toBe('10')
    expect(mocks.createRubric).not.toHaveBeenCalled()
  })
  it('ignores a late response after selecting a different rubric', async () => {
    let resolveFirst!: (value: typeof draft) => void
    mocks.getRubric.mockImplementation((id: number) => id === 1 ? new Promise(resolve => { resolveFirst = resolve }) : Promise.resolve(published))
    page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    fireEvent.click(screen.getByRole('button', { name: /DRAFT · v1/ }))
    fireEvent.click(screen.getByRole('button', { name: /PUBLIC · v1/ }))
    await screen.findByRole('heading', { name: 'Bộ đã công bố' })
    resolveFirst(draft)
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'DRAFT · v1' })).toBeNull())
  })
})

it('preserves unsaved edits when cancelling a rubric switch, and discards only after confirmation', async () => {
  page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
  fireEvent.click(screen.getByRole('button', { name: /DRAFT · v1/ }))
  await screen.findByLabelText('Tên bộ tiêu chí')
  fireEvent.change(screen.getByLabelText('Tên bộ tiêu chí'), { target: { value: 'Nội dung chưa lưu' } })
  fireEvent.click(screen.getByRole('button', { name: /PUBLIC · v1/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
  expect((screen.getByLabelText('Tên bộ tiêu chí') as HTMLInputElement).value).toBe('Nội dung chưa lưu')
  fireEvent.click(screen.getByRole('button', { name: /PUBLIC · v1/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }))
  await screen.findByRole('heading', { name: 'Bộ đã công bố' })
  expect(mocks.updateRubric).not.toHaveBeenCalled()
})

it('keeps a draft on 409 and displays BE validation on 422', async () => {
  page(); await screen.findByRole('heading', { name: 'Bộ đã công bố' })
  fireEvent.click(screen.getByRole('button', { name: /DRAFT · v1/ }))
  await screen.findByLabelText('Tên bộ tiêu chí')
  fireEvent.change(screen.getByLabelText('Tên bộ tiêu chí'), { target: { value: 'Nội dung đang sửa' } })
  mocks.updateRubric.mockRejectedValueOnce(new HttpError('Conflict', 409))
    .mockRejectedValueOnce(new HttpError('Invalid', 422, { errors: { criteria: ['Nhóm con chưa đủ trọng số.'] } }))
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  await screen.findByText(/Bản nhập của bạn vẫn được giữ/)
  expect((screen.getByLabelText('Tên bộ tiêu chí') as HTMLInputElement).value).toBe('Nội dung đang sửa')
  fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }))
  await screen.findByText(/Nhóm con chưa đủ trọng số/)
  expect((screen.getByLabelText('Tên bộ tiêu chí') as HTMLInputElement).value).toBe('Nội dung đang sửa')
})
