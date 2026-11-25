import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ExecutionAccessProvider } from '../../execution/context/ExecutionAccessProvider'
import { GanttPage } from './GanttPage'
const api = vi.hoisted(() => ({
  getProjectTimeline: vi.fn(),
  getProjectProgressSummary: vi.fn(),
  getMilestone: vi.fn(),
  updateMilestone: vi.fn(),
}))
vi.mock('../../../services/service-gateway', () => ({
  services: {
    task: { getProjectTimeline: api.getProjectTimeline, getProjectProgressSummary: api.getProjectProgressSummary },
    milestone: { getMilestone: api.getMilestone, updateMilestone: api.updateMilestone },
  },
}))
const m = {id:3,title:'Khởi động',status:'IN_PROGRESS',sortOrder:0,progressPercentage:50,startDate:'2026-09-01',dueDate:'2026-09-30',tasks:[{id:8,title:'Phân tích yêu cầu',status:'TODO',startAt:null,dueAt:'2026-09-10T17:30:00',assignees:[],dependencies:[]}]}
function renderPage(canManageStructure = false) { return render(<MemoryRouter><ExecutionAccessProvider value={{project:{id:9} as never,actor:'student',currentUserId:2,canManageStructure,routeBase:'/project'}}><GanttPage /></ExecutionAccessProvider></MemoryRouter>) }
beforeEach(() => {api.getProjectTimeline.mockResolvedValue({projectId:9,milestones:[m]});api.getProjectProgressSummary.mockResolvedValue({projectId:9,progressPercentage:50,doneTasks:2,totalTasks:4,overdueTasks:1,blockedTasks:1})})
afterEach(() => {cleanup();vi.resetAllMocks()})
describe('GanttPage', () => {
  it('shows milestones by default and actual tasks on demand', async () => {
    renderPage(); await screen.findByRole('link', {name:'Khởi động'}); expect(screen.queryByText('Phân tích yêu cầu')).toBeNull()
    fireEvent.click(screen.getByRole('button', {name:'Cả công việc'}))
    expect(screen.getByRole('link', {name:'Phân tích yêu cầu'}).getAttribute('href')).toBe('/project/tasks/8')
    expect(screen.getByRole('img', {name:'Phân tích yêu cầu: Hạn: 11/09/2026'})).toBeTruthy()
    expect(screen.getByRole('img', {name:/Khởi động:.*50% hoàn thành/})).toBeTruthy()
  })
  it('keeps undated tasks accessible without inventing dates', async () => {
    api.getProjectTimeline.mockResolvedValue({projectId:9,milestones:[{...m,startDate:null,dueDate:null,tasks:[{...m.tasks[0],dueAt:null}]}]})
    renderPage(); await screen.findByRole('link', {name:'Khởi động'}); fireEvent.click(screen.getByRole('button', {name:'Cả công việc'}))
    expect(screen.getByText('Phân tích yêu cầu')).toBeTruthy(); expect(screen.queryByRole('img')).toBeNull()
  })
  it('keeps timeline when summary fails instead of manufacturing zero statistics', async () => {
    api.getProjectProgressSummary.mockRejectedValue(new Error('offline')); renderPage()
    await screen.findByRole('link', {name:'Khởi động'}); expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByText('tiến độ chung')).toBeNull()
  })
  it('supports day zoom, expand-all toggle, and interactive milestone quick-schedule drawer', async () => {
    api.getMilestone.mockResolvedValue({ ...m, description: null, concurrencyToken: 'tok-1' })
    api.updateMilestone.mockResolvedValue({ ...m, dueDate: '2026-10-03', concurrencyToken: 'tok-2' })
    renderPage(true)
    await screen.findByRole('link', { name: 'Khởi động' })
    fireEvent.click(screen.getByRole('button', { name: 'Theo ngày' }))
    expect(screen.getByRole('button', { name: 'Theo ngày' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng tất cả' }))
    expect(screen.getByRole('link', { name: 'Phân tích yêu cầu' })).toBeTruthy()
    fireEvent.click(screen.getByRole('img', { name: /Khởi động:.*50% hoàn thành/ }))
    expect(await screen.findByRole('heading', { name: 'Điều chỉnh lịch mốc nhanh' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '+3 ngày hạn' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch mốc' }))
    expect(await screen.findByText('Đã cập nhật lịch trình mốc đồ án.')).toBeTruthy()
    expect(api.updateMilestone).toHaveBeenCalledWith(3, expect.objectContaining({ dueDate: '2026-10-03', concurrencyToken: 'tok-1' }))
  })
})
