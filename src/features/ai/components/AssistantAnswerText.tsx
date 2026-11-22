import { Fragment } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'

// Render a small text-only Markdown subset (including simple tables & citation chips); model output never becomes HTML.
function inline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`|\[(?:DOC|PROJECT|FILE)-\d+\])/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part.startsWith('`') && part.endsWith('`') ? <code key={index}>{part.slice(1, -1)}</code>
        : /^\[(?:DOC|PROJECT|FILE)-\d+\]$/.test(part) ? <span key={index} className="assistant-inline-cite">{part.slice(1, -1)}</span>
          : <Fragment key={index}>{part}</Fragment>)
}

function parseTable(lines: string[]) {
  if (lines.length < 2) return null
  if (!lines.every(line => line.trim().startsWith('|') && line.trim().endsWith('|'))) return null
  const splitRow = (line: string) => line.trim().slice(1, -1).split('|').map(cell => cell.trim())
  const separator = splitRow(lines[1])
  if (!separator.length || !separator.every(cell => /^:?-{2,}:?$/.test(cell))) return null
  const headers = splitRow(lines[0])
  const rows = lines.slice(2).map(splitRow)
  return { headers, rows }
}

export function AssistantAnswerText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n?/g, '\n').replace(/^(#{1,6} .+)$/gm, '\n\n$1\n\n').split(/\n\s*\n/).filter(block => block.trim())
  return <div className="assistant-answer-body">{blocks.map((block, index) => {
    const lines = block.split('\n').filter(line => line.trim().length > 0)
    const table = parseTable(lines)
    if (table) {
      return <div key={index} className="assistant-table-wrap">
        <Table className="text-xs">
          <TableHead>
            <TableRow head>{table.headers.map((h, i) => <TableHeaderCell key={i}>{inline(h)}</TableHeaderCell>)}</TableRow>
          </TableHead>
          <TableBody>
            {table.rows.map((row, ri) => (
              <TableRow key={ri}>{table.headers.map((header, ci) => <TableCell key={ci} label={header}>{inline(row[ci] ?? '')}</TableCell>)}</TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    }
    if (lines.every(line => /^\s*[-*] /.test(line))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\s*[-*] /, ''))}</li>)}</ul>
    if (lines.every(line => /^\s*\d+[.)] /.test(line))) return <ol key={index} start={Number.parseInt(lines[0], 10)}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\s*\d+[.)] /, ''))}</li>)}</ol>
    if (/^#{1,6} /.test(block.trim()) && lines.length === 1) return <h4 key={index}>{inline(block.trim().replace(/^#{1,6} /, ''))}</h4>
    return <p key={index}>{inline(block)}</p>
  })}</div>
}
