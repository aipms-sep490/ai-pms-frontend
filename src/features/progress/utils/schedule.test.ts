import {describe,expect,it} from 'vitest'
import {calendarDay,dayLabel,scheduleInterval,scheduleRange,scheduleTicks} from './schedule'
describe('schedule calendar calculations', () => {
  it('preserves DateOnly and converts SQL UTC timestamps to Vietnam days', () => {
    expect(dayLabel(calendarDay('2026-09-10')!,true)).toBe('10/09/2026')
    expect(dayLabel(calendarDay('2026-09-10T17:30:00')!,true)).toBe('11/09/2026')
    expect(calendarDay('2026-09-11T00:30:00+07:00')).toBe(calendarDay('2026-09-10T17:30:00Z'))
    expect(calendarDay('bad')).toBeNull()
  })
  it('keeps absent and reversed dates distinct from valid intervals', () => {
    const range = {start:calendarDay('2026-09-01')!,days:30}
    expect(scheduleInterval(null,null,range).state).toBe('undated')
    expect(scheduleInterval('2026-09-12','2026-09-01',range).state).toBe('invalid')
    expect(scheduleInterval(null,'2026-09-10',range)).toMatchObject({state:'dated',point:true,label:'Hạn: 10/09/2026'})
    expect(scheduleInterval('2026-09-01','2026-09-03',range)).toMatchObject({state:'dated',point:false,left:0,width:10})
  })
  it('does not invent an epoch timeline for undated projects', () => {expect(scheduleRange([{tasks:[]} as never])).toBeNull()})
  it('includes tasks beyond the milestone and labels months across years', () => {
    const range = scheduleRange([{startDate:'2026-12-20',dueDate:'2026-12-30',tasks:[{dueAt:'2027-02-01T00:00:00Z'}]} as never])!
    expect(dayLabel(range.end,true)).toBe('04/02/2027')
    expect(scheduleTicks(range,'month').map(t=>t.label)).toEqual(['Tháng 12/2026','Tháng 1/2027','Tháng 2/2027'])
    for (const tick of scheduleTicks(range,'week')) expect(new Date(tick.day*86400000).getUTCDay()).toBe(1)
  })
})
