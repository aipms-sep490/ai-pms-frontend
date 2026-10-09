import {useState} from 'react'
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
const api=vi.hoisted(()=>({getAcademicHierarchy:vi.fn()}))
const session={accessToken:'test'}
vi.mock('../api/academic-api',()=>api)
vi.mock('../../auth/context/useAuthSession',()=>({useAuthSession:()=>({session})}))
import {AcademicScopeFields} from './AcademicScopeFields'
const hierarchy=[{departments:[{department:{id:2,name:'Công nghệ',isActive:true},majors:[{id:12,code:'SE',name:'Phần mềm',isActive:true}]},{department:{id:3,name:'Kinh tế',isActive:true},majors:[{id:14,code:'MKT',name:'Marketing',isActive:true}]}]}]
function Fields(){const [scope,setScope]=useState({departmentId:'2',majorId:'12'});return <AcademicScopeFields {...scope} onChange={setScope}/>}
beforeEach(()=>{vi.clearAllMocks();api.getAcademicHierarchy.mockResolvedValue(hierarchy)})
afterEach(cleanup)
describe('Academic scope selection',()=>{
 it('clears the selected major and shows only majors in the new department',async()=>{render(<Fields/>);await waitFor(()=>expect((screen.getByLabelText('Bộ môn') as HTMLSelectElement).disabled).toBe(false));fireEvent.change(screen.getByLabelText('Bộ môn'),{target:{value:'3'}});expect((screen.getByLabelText('Chuyên ngành') as HTMLSelectElement).value).toBe('');expect(screen.getByRole('option',{name:/Marketing/})).toBeTruthy();expect(screen.queryByRole('option',{name:/Phần mềm/})).toBeNull()})
 it('recovers from a failed hierarchy request without discarding the current reference',async()=>{api.getAcademicHierarchy.mockRejectedValueOnce(new Error('offline'));render(<Fields/>);await screen.findByRole('alert');expect((screen.getByLabelText('Chuyên ngành') as HTMLSelectElement).value).toBe('12');fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await waitFor(()=>expect((screen.getByLabelText('Bộ môn') as HTMLSelectElement).disabled).toBe(false));expect((screen.getByLabelText('Chuyên ngành') as HTMLSelectElement).value).toBe('12')})
})
