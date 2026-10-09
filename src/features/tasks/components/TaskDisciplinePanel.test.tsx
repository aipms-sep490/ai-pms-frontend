import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
const api=vi.hoisted(()=>({getTaskDisciplines:vi.fn(),replaceTaskDisciplines:vi.fn()}))
vi.mock('../../projects/api/discipline-governance-api',()=>api)
import {TaskDisciplinePanel} from './TaskDisciplinePanel'
const data={concurrencyToken:'token',classification:'CLASSIFIED',items:[{majorId:12,role:'PRIMARY'}]}
const majors=[{majorId:12,majorCode:'SE',majorName:'Phần mềm'}]
beforeEach(()=>{vi.clearAllMocks();api.getTaskDisciplines.mockResolvedValue(data);api.replaceTaskDisciplines.mockResolvedValue(data)})
afterEach(cleanup)
describe('Task discipline editor',()=>{
 it('shows a retry action after load failure instead of remaining in loading',async()=>{api.getTaskDisciplines.mockRejectedValueOnce(new Error('offline'));render(<TaskDisciplinePanel taskId={9} majors={majors} canManage/>);await screen.findByRole('alert');expect(screen.queryByText('Đang tải…')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByLabelText('Chuyên ngành phụ trách 1');expect(api.getTaskDisciplines).toHaveBeenCalledTimes(2)})
 it('keeps API role values when showing Vietnamese options',async()=>{render(<TaskDisciplinePanel taskId={9} majors={majors} canManage/>);fireEvent.change(await screen.findByLabelText('Vai trò chuyên ngành 1'),{target:{value:'SUPPORTING'}});fireEvent.click(screen.getByRole('button',{name:'Lưu phân loại'}));await waitFor(()=>expect(api.replaceTaskDisciplines).toHaveBeenCalledWith(9,'token',[{majorId:12,role:'SUPPORTING'}]))})
})
