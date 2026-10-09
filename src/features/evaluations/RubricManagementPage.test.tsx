import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { RubricManagementPage } from './RubricManagementPage'
const mocks = vi.hoisted(() => ({ listRubrics: vi.fn(), getRubric: vi.fn(), createRubric: vi.fn(), publishRubric: vi.fn(), retireRubric: vi.fn(), cloneRubric: vi.fn(), deleteRubric: vi.fn(), updateRubric: vi.fn() }))
vi.mock('./rubrics-api', () => mocks)
vi.mock('../auth/context/useAuthSession', () => ({ useAuthSession: () => ({ session: null }) }))
const criterion = { id: 1, name: 'Chất lượng', description: 'Mô tả đầy đủ', weightPercent: 100, maxScore: 10, sortOrder: 0, isRequired: true, children: [] }
const published = { id: 2, departmentId: 1, academicSemesterId: 1, code: 'PUBLIC', name: 'Bộ đã công bố', description: null, status: 'PUBLISHED', version: 1, concurrencyToken: 'token', canEdit: false, criteria: [criterion] }
const draft = { ...published, id: 1, code: 'DRAFT', name: 'Bộ nháp', status: 'DRAFT', canEdit: true }
const page = () => render(<MemoryRouter><RubricManagementPage /></MemoryRouter>)
afterEach(cleanup)
beforeEach(() => { vi.clearAllMocks(); mocks.listRubrics.mockResolvedValue({ items: [draft, published], totalCount: 2 }); mocks.getRubric.mockImplementation(async (id: number) => id === 1 ? draft : published) })
describe('RubricManagementPage deep interactions', () => {
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
