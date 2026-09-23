import { describe, expect, it } from 'vitest'
import { createAcademicNameResolver } from './academic-name-resolver'

describe('createAcademicNameResolver', () => {
  it('uses the authoritative hierarchy name and falls back only for unknown records', () => {
    const names = createAcademicNameResolver([{ organization: {} as any, departments: [{
      department: { id: 4, name: 'Department of Computing', code: 'COMP' } as any,
      majors: [{ id: 7, name: 'Software Engineering', code: 'SE' } as any],
    }] }])
    expect(names.department(4)).toBe('Department of Computing (COMP)')
    expect(names.major(7)).toBe('Software Engineering (SE)')
    expect(names.department(99)).toBe('Department #99')
    expect(names.major(88)).toBe('Major #88')
  })
})
