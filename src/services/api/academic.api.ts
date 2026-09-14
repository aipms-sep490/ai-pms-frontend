import { env } from '../../app/config/env'
import { httpGet } from '../http/http-client'
import type { SemesterDto, ProjectPeriodDto, PagedResult, MajorDto } from '../../types/backend'

const mockSemester: SemesterDto = {
  id: 1,
  organizationId: 1,
  organizationCode: 'FU',
  organizationName: 'FPT University',
  code: 'FA26',
  name: 'Fall 2026',
  startDate: '2026-09-01T00:00:00Z',
  endDate: '2026-12-31T23:59:59Z',
  status: 'ACTIVE',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

const mockPeriod: ProjectPeriodDto = {
  id: 10,
  academicSemesterId: 1,
  semesterCode: 'FA26',
  semesterName: 'Fall 2026',
  code: 'REG_FA26',
  name: 'Đợt Đăng ký Đề tài Học kỳ Fall 2026',
  periodType: 'REGISTRATION',
  startAt: '2026-09-01T00:00:00Z',
  endAt: '2026-09-30T23:59:59Z',
  status: 'OPEN',
  minTeamSize: 4,
  maxTeamSize: 5,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

export async function getActiveSemester(): Promise<SemesterDto | null> {
  if (env.isMockMode) {
    return mockSemester
  }
  const res = await httpGet<PagedResult<SemesterDto>>('/academic/semesters?status=ACTIVE&page=1&pageSize=1')
  return res.items?.[0] ?? null
}

export async function getRegistrationPeriod(semesterId: number): Promise<ProjectPeriodDto | null> {
  if (env.isMockMode) {
    return { ...mockPeriod, academicSemesterId: semesterId }
  }
  const res = await httpGet<PagedResult<ProjectPeriodDto>>(
    `/academic/project-periods?semesterId=${semesterId}&periodType=REGISTRATION&status=ACTIVE&page=1&pageSize=1`,
  )
  return res.items?.[0] ?? null
}

export async function getMajors(organizationId: number): Promise<MajorDto[]> {
  if (env.isMockMode) {
    return [
      { id: 101, departmentId: 10, departmentCode: 'CSE', departmentName: 'Computing', organizationId,
        organizationCode: 'FU', code: 'SE', name: 'Software Engineering', isActive: true,
        createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
      { id: 102, departmentId: 10, departmentCode: 'CSE', departmentName: 'Computing', organizationId,
        organizationCode: 'FU', code: 'AI', name: 'Artificial Intelligence', isActive: true,
        createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
    ]
  }
  const result = await httpGet<PagedResult<MajorDto>>(
    `/academic/majors?organizationId=${organizationId}&isActive=true&page=1&pageSize=100`,
  )
  return result.items
}
