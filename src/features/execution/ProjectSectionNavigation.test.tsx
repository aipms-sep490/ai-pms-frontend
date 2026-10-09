import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ExecutionAccessProvider } from './context/ExecutionAccessProvider'
import { ProjectSectionNavigation } from './ProjectSectionNavigation'

afterEach(cleanup)
function page(actor: 'mentor' | 'supervisor', path: string) {
  const routeBase = actor === 'mentor' ? '/mentor/projects/2/majors/3' : '/supervisor/projects/2'
  render(<MemoryRouter initialEntries={[routeBase + path]}><ExecutionAccessProvider value={{ project: { id: 2, title: 'Đồ án', code: 'P2' } as never, supervisor: { majorId: 3 } as never, actor, canManageStructure: false, routeBase }}><ProjectSectionNavigation /></ExecutionAccessProvider></MemoryRouter>)
}
it('keeps navigation in the current project and highlights the parent of a detail page', () => {
  page('supervisor', '/meetings/4')
  expect(screen.getByRole('link', { name: 'Lịch họp' }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByRole('link', { name: 'Báo cáo' }).getAttribute('href')).toBe('/supervisor/projects/2/reports')
})
it('keeps the mentor major scope without exposing supervisor-only areas', () => {
  page('mentor', '/tasks/9')
  expect(screen.getByRole('link', { name: 'Báo cáo' }).getAttribute('href')).toBe('/mentor/projects/2/majors/3/reports')
  expect(screen.queryByRole('link', { name: 'Bàn giao' })).toBeNull()
})
it('does not crowd the video room with project navigation', () => {
  page('supervisor', '/meetings/4/video')
  expect(screen.queryByRole('navigation')).toBeNull()
})
it('selects the parent section of a detail route and switches inside the same mentor scope', () => {
  page('mentor', '/tasks/9')
  const selector = screen.getByRole('combobox', { name: 'Khu vực đồ án' }) as HTMLSelectElement
  expect(selector.value).toBe('tasks')
  fireEvent.change(selector, { target: { value: 'reports' } })
  expect(screen.getByRole('link', { name: 'Báo cáo' }).getAttribute('aria-current')).toBe('page')
  expect(selector.value).toBe('reports')
})
