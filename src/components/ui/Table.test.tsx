import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './Table'

afterEach(cleanup)

function sample(stack = false) {
  return render(
    <Table stack={stack} aria-label="Điểm theo ngành">
      <TableHead>
        <TableRow head>
          <TableHeaderCell>Ngành</TableHeaderCell>
          <TableHeaderCell numeric>Điểm</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell label="Ngành">Công nghệ phần mềm</TableCell>
          <TableCell numeric label="Điểm">8.5</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  )
}

describe('Table', () => {
  it('renders a native table with the expected structure and content', () => {
    sample()
    const table = screen.getByRole('table', { name: 'Điểm theo ngành' })
    expect(within(table).getByRole('columnheader', { name: 'Ngành' })).toBeTruthy()
    expect(within(table).getByRole('cell', { name: 'Công nghệ phần mềm' })).toBeTruthy()
    expect(within(table).getByRole('cell', { name: '8.5' })).toBeTruthy()
  })

  it('right-aligns and mono-formats numeric cells/headers', () => {
    sample()
    const scoreHeader = screen.getByRole('columnheader', { name: 'Điểm' })
    const scoreCell = screen.getByRole('cell', { name: '8.5' })
    expect(scoreHeader.className).toContain('text-right')
    expect(scoreCell.className).toContain('text-right')
    expect(scoreCell.className).toContain('tabular-nums')
  })

  it('carries data-label on cells for the stacked mobile layout', () => {
    sample(true)
    const scoreCell = screen.getByRole('cell', { name: '8.5' })
    expect(scoreCell.getAttribute('data-label')).toBe('Điểm')
    expect(screen.getByRole('table').className).toContain('ai-table--stack')
  })

  it('does not add the stacking class when stack is omitted', () => {
    sample()
    expect(screen.getByRole('table').className).not.toContain('ai-table--stack')
  })
})
