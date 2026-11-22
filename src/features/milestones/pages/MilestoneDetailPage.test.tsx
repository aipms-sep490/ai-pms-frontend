import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { MilestoneDetailPage } from './MilestoneDetailPage'
import { HttpError } from '../../../services/http/http-client'

const api = vi.hoisted(() => ({
  getProjectMilestones: vi.fn(),
  getProjectMilestoneProgress: vi.fn(),
  createMilestone: vi.fn(),
  updateMilestone: vi.fn(),
  deleteMilestone: vi.fn(),
  reorderMilestones: vi.fn(),
  addMilestoneDependency: vi.fn(),
  removeMilestoneDependency: vi.fn(),
}))
vi.mock('../../../services/service-gateway', () => ({ services: { milestone: api } }))
vi.mock('../../execution/hooks/useMilestoneExecutionCapabilities', () => ({
  useMilestoneExecutionCapabilities: vi.fn(() => ({
    status: 'ready',
    data: null,
    get: () => ({
      state: 'allowed',
      allowed: true,
      reasons: [],
    }),
  })),
}))
const m = { id:3,projectId:9,title:'Khởi động',status:'IN_PROGRESS',sortOrder:0,concurrencyToken:'milestone-token' }
const capabilities = (allowed: boolean) => ({ status: 'ready' as const, get: () => ({ state: allowed ? 'allowed' as const : 'denied' as const, allowed, reasons: [] }) })
function renderPage(manage: boolean, path = '/project/milestones/3', allowed = manage) {
  return render(<MemoryRouter initialEntries={[path]}><ExecutionAccessProvider value={{ project:{id:9} as never,actor:'student',currentUserId:2,canManageStructure:manage,executionCapabilities:capabilities(allowed),routeBase:'/project' }}><Routes><Route path="/project/milestones/:milestoneId?" element={<MilestoneDetailPage />} /></Routes></ExecutionAccessProvider></MemoryRouter>)
}
beforeEach(() => { api.getProjectMilestones.mockResolvedValue([m]); api.getProjectMilestoneProgress.mockResolvedValue([{milestoneId:3,totalTasks:4,doneTasks:2,progressPercentage:50}]) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
describe('MilestoneDetailPage', () => {
  it('shows real progress without structural controls for ordinary members', async () => {
    renderPage(false); expect(await screen.findByText('2/4 việc hoàn thành · 50%')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('50')
    expect(screen.queryByRole('button', {name:'Chỉnh sửa'})).toBeNull()
  })
  it('does not turn unknown progress into zero', async () => {
    api.getProjectMilestoneProgress.mockRejectedValue(new Error('offline')); renderPage(true)
    expect(await screen.findByText('Chưa có số liệu tiến độ')).toBeTruthy()
    expect(screen.queryByRole('progressbar')).toBeNull(); expect(screen.queryByRole('button', {name:'Xóa mốc'})).toBeNull()
  })
  it('does not fall back to the first milestone for an invalid ID', async () => {
    renderPage(false,'/project/milestones/999'); expect(await screen.findByText('Không tìm thấy mốc đồ án')).toBeTruthy()
    expect(screen.queryByRole('heading', {name:'Khởi động'})).toBeNull()
  })
  it('retains the draft after failed creation', async () => {
    api.createMilestone.mockRejectedValue(new Error('offline')); renderPage(true,'/project/milestones')
    await screen.findByText('1 mốc đồ án'); fireEvent.click(screen.getByRole('button', {name:'Tạo mốc'}))
    fireEvent.change(screen.getByRole('textbox', {name:'Tên mốc'}), {target:{value:'Kiểm thử nghiệm thu'}})
    fireEvent.submit(screen.getByRole('textbox', {name:'Tên mốc'}).closest('form')!)
    await screen.findByRole('alert'); expect((screen.getByRole('textbox', {name:'Tên mốc'}) as HTMLInputElement).value).toBe('Kiểm thử nghiệm thu')
    expect(api.createMilestone).toHaveBeenCalledWith(expect.objectContaining({projectId:9,title:'Kiểm thử nghiệm thu',sortOrder:1}))
  })
  it('keeps the create CTA fail-closed when the backend denies a leader', async () => {
    renderPage(true, '/project/milestones', false); await screen.findByText('1 mốc đồ án')
    expect(screen.queryByRole('button', { name: 'Tạo mốc' })).toBeNull()
  })
  it('sends the complete changed ordering after moving a named milestone', async () => {
    api.getProjectMilestones.mockResolvedValue([m,{...m,id:4,title:'Nghiệm thu',sortOrder:1}]); api.reorderMilestones.mockResolvedValue(undefined)
    renderPage(true,'/project/milestones'); fireEvent.click(await screen.findByRole('button', {name:'Đổi thứ tự'}))
    fireEvent.click(screen.getByRole('button', {name:'Đưa Nghiệm thu lên'})); fireEvent.click(screen.getByRole('button', {name:'Lưu thứ tự'}))
    await vi.waitFor(() => expect(api.reorderMilestones).toHaveBeenCalledWith(9,[{milestoneId:4,sortOrder:0,concurrencyToken:'milestone-token'},{milestoneId:3,sortOrder:1,concurrencyToken:'milestone-token'}]))
  })
  it('does not manufacture milestones for an empty project', async () => {
    api.getProjectMilestones.mockResolvedValue([]); renderPage(false,'/project/milestones')
    await screen.findByText('Nhóm chưa có mốc đồ án'); expect(api.createMilestone).not.toHaveBeenCalled()
  })

  it('displays parallel execution notice when milestone has no dependencies', async () => {
    renderPage(true)
    expect(await screen.findByText('Mốc này không phụ thuộc mốc nào khác, có thể thực hiện song song với các mốc khác.')).toBeTruthy()
  })

  it('displays existing dependencies with predecessor title and Finish-to-Start label', async () => {
    const mWithDep = {
      ...m,
      dependencies: [
        { milestoneId: 3, dependsOnMilestoneId: 2, dependencyType: 'FINISH_TO_START', dependsOnTitle: 'Mốc khảo sát' },
      ],
    }
    api.getProjectMilestones.mockResolvedValue([mWithDep])
    renderPage(true)
    expect(await screen.findByText('Mốc khảo sát')).toBeTruthy()
    expect(screen.getByText(/Hoàn thành mốc tiền nhiệm → Bắt đầu mốc này \(Finish-to-Start\)/)).toBeTruthy()
  })

  it('allows adding a Finish-to-Start predecessor dependency', async () => {
    const m2 = { id: 2, projectId: 9, title: 'Mốc nghiên cứu', status: 'COMPLETED', sortOrder: 0, dueDate: '2026-11-20' }
    api.getProjectMilestones.mockResolvedValue([m2, m])
    api.addMilestoneDependency.mockResolvedValue({ ...m, dependencies: [{ milestoneId: 3, dependsOnMilestoneId: 2, dependencyType: 'FINISH_TO_START' }] })
    renderPage(true)
    await screen.findByText('Mốc này không phụ thuộc mốc nào khác, có thể thực hiện song song với các mốc khác.')
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mốc tiền nhiệm' }))
    const select = screen.getByRole('combobox', { name: 'Chọn mốc tiền nhiệm' })
    fireEvent.change(select, { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm liên kết' }))
    await vi.waitFor(() => {
      expect(api.addMilestoneDependency).toHaveBeenCalledWith({
        milestoneId: 3,
        dependsOnMilestoneId: 2,
        dependencyType: 'FINISH_TO_START',
        concurrencyToken: 'milestone-token',
      })
    })
  })

  it('allows deleting an existing milestone dependency', async () => {
    const mWithDep = {
      ...m,
      dependencies: [
        { milestoneId: 3, dependsOnMilestoneId: 2, dependencyType: 'FINISH_TO_START', dependsOnTitle: 'Mốc khảo sát' },
      ],
    }
    api.getProjectMilestones.mockResolvedValue([mWithDep])
    api.removeMilestoneDependency.mockResolvedValue(undefined)
    renderPage(true)
    expect(await screen.findByText('Mốc khảo sát')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Xóa liên kết' }))
    await vi.waitFor(() => {
      expect(api.removeMilestoneDependency).toHaveBeenCalledWith(3, 2, 'milestone-token')
    })
  })

  it('displays cycle error feedback when backend detects dependency cycle', async () => {
    const m2 = { id: 2, projectId: 9, title: 'Mốc B', status: 'IN_PROGRESS', sortOrder: 1 }
    api.getProjectMilestones.mockResolvedValue([m2, m])
    api.addMilestoneDependency.mockRejectedValue(
      new HttpError('Cycle', 409, { code: 'MILESTONE_DEPENDENCY_CYCLE', title: 'Cycle', status: 409 })
    )
    renderPage(true)
    await screen.findByText('Mốc này không phụ thuộc mốc nào khác, có thể thực hiện song song với các mốc khác.')
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mốc tiền nhiệm' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Chọn mốc tiền nhiệm' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm liên kết' }))
    expect(await screen.findByText('Phát hiện vòng lặp phụ thuộc mốc tiến độ (Dependency Cycle). Không thể thiết lập quan hệ này.')).toBeTruthy()
  })

  it('displays order violation error when predecessor due date is after successor start date', async () => {
    const m2 = { id: 2, projectId: 9, title: 'Mốc B', status: 'IN_PROGRESS', sortOrder: 1 }
    api.getProjectMilestones.mockResolvedValue([m2, m])
    api.addMilestoneDependency.mockRejectedValue(
      new HttpError('Order violation', 409, { code: 'MILESTONE_DEPENDENCY_ORDER_VIOLATION', title: 'Order', status: 409 })
    )
    renderPage(true)
    await screen.findByText('Mốc này không phụ thuộc mốc nào khác, có thể thực hiện song song với các mốc khác.')
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mốc tiền nhiệm' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Chọn mốc tiền nhiệm' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm liên kết' }))
    expect(await screen.findByText('Mốc tiến độ phụ thuộc (Finish-to-Start) không được bắt đầu trước khi mốc tiền nhiệm kết thúc.')).toBeTruthy()
  })

  it('displays parallel execution status in milestones list view', async () => {
    const m2 = { id: 2, projectId: 9, title: 'Mốc song song', status: 'PLANNED', sortOrder: 1, dependencies: [] }
    const mWithDep = { id: 3, projectId: 9, title: 'Mốc phụ thuộc', status: 'PLANNED', sortOrder: 2, dependencies: [{ milestoneId: 3, dependsOnMilestoneId: 2, dependencyType: 'FINISH_TO_START' }] }
    api.getProjectMilestones.mockResolvedValue([m2, mWithDep])
    renderPage(true, '/project/milestones')
    expect(await screen.findByText(/Chạy song song/)).toBeTruthy()
    expect(screen.getByText(/Phụ thuộc: 1 mốc/)).toBeTruthy()
  })
})
