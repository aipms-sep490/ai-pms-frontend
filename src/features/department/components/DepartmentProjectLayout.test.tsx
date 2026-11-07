import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { DepartmentProjectLayout } from './DepartmentProjectLayout'

afterEach(cleanup)

function page(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<DepartmentProjectLayout />}>
          <Route path="*" element={<p>Resource</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

it('connects a review dossier to all existing resource pages', () => {
  page('/department/projects/review/9')
  expect(screen.getByRole('link', { name: 'Phương án đánh giá' }).getAttribute('href')).toBe('/department/projects/9/evaluation-schemes')
  expect(screen.getByRole('link', { name: 'Thẩm định' }).getAttribute('aria-current')).toBe('page')
})

it.each(['/department/projects/archived', '/department/projects/review', '/department/projects/invalid/result'])('does not create a project scope for %s', path => {
  page(path); expect(screen.queryByRole('navigation')).toBeNull()
})

it('switches project pages through the compact selector and preserves browser back', () => {
  function Resource() { const location = useLocation(); const navigate = useNavigate(); return <><p>{location.pathname}</p><button onClick={() => navigate(-1)}>Back</button></> }
  render(<MemoryRouter initialEntries={['/department/projects/9/result']}><Routes><Route element={<DepartmentProjectLayout />}><Route path="*" element={<Resource />} /></Route></Routes></MemoryRouter>)
  const select = screen.getByRole('combobox', { name: 'Chọn nghiệp vụ của đồ án' }) as HTMLSelectElement
  expect(select.value).toBe('/department/projects/9/result')
  fireEvent.change(select, { target: { value: '/department/projects/9/final-submission' } })
  expect(screen.getByText('/department/projects/9/final-submission')).toBeDefined()
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText('/department/projects/9/result')).toBeDefined()
})

it('opens secondary operations dropdown and indicates active secondary tab', () => {
  page('/department/projects/9/files')
  const moreButton = screen.getByRole('button', { name: /Kho tệp/ })
  expect(moreButton).toBeDefined()
  expect(moreButton.getAttribute('aria-expanded')).toBe('false')

  fireEvent.click(moreButton)
  expect(moreButton.getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByRole('menu', { name: 'Thao tác khác của đồ án' })).toBeDefined()
  expect(screen.getByRole('menuitem', { name: 'Kho tệp' }).getAttribute('href')).toBe('/department/projects/9/files')
  expect(screen.getByRole('menuitem', { name: 'Đóng góp' }).getAttribute('href')).toBe('/department/projects/9/contributions')
})
