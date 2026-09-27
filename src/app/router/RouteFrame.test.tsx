import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RouteFrame } from './RouteFrame'
afterEach(() => { cleanup(); document.querySelectorAll('title').forEach(title => title.remove()) })
describe('Browser page title', () => {
  it.each([['/project/tasks/11', 'Chi tiết công việc'], ['/unknown/private-path', 'Trang không tồn tại']])('uses a readable title for %s', async (path, label) => {
    document.title = 'AI-PMS · Quản lý đồ án'
    render(<MemoryRouter initialEntries={[path]}><Routes><Route element={<RouteFrame />}><Route path="*" element={<p>page</p>} /></Route></Routes></MemoryRouter>)
    await waitFor(() => expect(document.title).toBe(`${label} · AI-PMS`))
    expect(document.title).not.toContain(path)
    expect(document.querySelectorAll('title')).toHaveLength(1)
  })
})
