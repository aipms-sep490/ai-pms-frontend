import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { MilestoneDetailPage } from './MilestoneDetailPage'
const api = vi.hoisted(() => ({ getProjectMilestones: vi.fn(), getProjectMilestoneProgress: vi.fn(), createMilestone: vi.fn(), updateMilestone: vi.fn(), deleteMilestone: vi.fn(), reorderMilestones: vi.fn() }))
vi.mock('../../../services/service-gateway', () => ({ services: { milestone: api } }))
const m = { id:3,projectId:9,title:'Khởi động',status:'IN_PROGRESS',sortOrder:0 }
function renderPage(manage: boolean, path = '/project/milestones/3') {
  return render(<MemoryRouter initialEntries={[path]}><ExecutionAccessProvider value={{ project:{id:9} as never,actor:'student',currentUserId:2,canManageStructure:manage,routeBase:'/project' }}><Routes><Route path="/project/milestones/:milestoneId?" element={<MilestoneDetailPage />} /></Routes></ExecutionAccessProvider></MemoryRouter>)
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
  it('sends the complete changed ordering after moving a named milestone', async () => {
    api.getProjectMilestones.mockResolvedValue([m,{...m,id:4,title:'Nghiệm thu',sortOrder:1}]); api.reorderMilestones.mockResolvedValue(undefined)
    renderPage(true,'/project/milestones'); fireEvent.click(await screen.findByRole('button', {name:'Đổi thứ tự'}))
    fireEvent.click(screen.getByRole('button', {name:'Đưa Nghiệm thu lên'})); fireEvent.click(screen.getByRole('button', {name:'Lưu thứ tự'}))
    await vi.waitFor(() => expect(api.reorderMilestones).toHaveBeenCalledWith(9,[{milestoneId:4,sortOrder:0},{milestoneId:3,sortOrder:1}]))
  })
  it('does not manufacture milestones for an empty project', async () => {
    api.getProjectMilestones.mockResolvedValue([]); renderPage(false,'/project/milestones')
    await screen.findByText('Nhóm chưa có mốc đồ án'); expect(api.createMilestone).not.toHaveBeenCalled()
  })
})
