import type { HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import './table.css'

type Align = 'left' | 'right' | 'center'
const alignClass: Record<Align, string> = { left: 'text-left', right: 'text-right', center: 'text-center' }

/**
 * Shared data-table primitive: hairline-bordered rows, uppercase header labels, tabular-nums
 * for numeric columns, horizontal scroll on overflow. Extracted from the hand-rolled
 * `<table>` markup duplicated across result/evaluation screens so every grading/score table
 * shares one look instead of each page re-deriving border/header/number styling.
 *
 * Pass `stack` to additionally collapse each row into a labelled card below 640px — give
 * every `TableCell` a `label` in that case, since the column header is hidden at that width.
 */
export function Table({ children, className = '', stack = false, ...props }: TableHTMLAttributes<HTMLTableElement> & { stack?: boolean }) {
  return (
    <div className="ai-table-wrap overflow-x-auto">
      <table className={`ai-table w-full border-collapse text-sm ${stack ? 'ai-table--stack' : ''} ${className}`.trim()} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children, className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props}>{children}</thead>
}

export function TableBody({ children, className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props}>{children}</tbody>
}

/** Pass `head` for the header row (full-opacity border); body rows default to a softer `/70` border. */
export function TableRow({ children, className = '', head = false, ...props }: HTMLAttributes<HTMLTableRowElement> & { head?: boolean }) {
  return <tr className={`${head ? 'border-b border-hairline text-left' : 'border-b border-hairline/70'} ${className}`.trim()} {...props}>{children}</tr>
}

export function TableHeaderCell({ children, className = '', align = 'left', numeric = false, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { align?: Align; numeric?: boolean }) {
  return (
    <th scope="col" className={`py-2 pr-4 last:pr-0 ${alignClass[numeric ? 'right' : align]} text-xs font-semibold uppercase tracking-wide text-ink-muted ${className}`.trim()} {...props}>
      {children}
    </th>
  )
}

/** `label` powers the stacked-card layout on narrow screens (`<Table stack>`) — it has no
 * effect above the stacking breakpoint, where the column header already provides it. */
export function TableCell({ children, className = '', align = 'left', numeric = false, label, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { align?: Align; numeric?: boolean; label?: string }) {
  return (
    <td
      data-label={label}
      className={`py-2.5 pr-4 last:pr-0 ${alignClass[numeric ? 'right' : align]} ${numeric ? 'font-mono tabular-nums text-ink' : 'text-ink-soft'} ${className}`.trim()}
      {...props}
    >
      {children}
    </td>
  )
}
