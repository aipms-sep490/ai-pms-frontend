import { Fragment, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../../../components/ui/Table'

export type CitationKind = 'DOC' | 'PROJECT' | 'FILE'
export type CiteClickHandler = (kind: CitationKind, index: number) => void

type ParsedSegment =
  | { type: 'code'; language: string; content: string }
  | { type: 'markdown'; content: string }

function splitCodeFences(raw: string): ParsedSegment[] {
  const normalized = raw.replace(/\r\n?/g, '\n')
  const segments: ParsedSegment[] = []
  const fenceRegex = /```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = fenceRegex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'markdown', content: normalized.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'code', language: (match[1] || 'text').trim(), content: match[2].replace(/\n$/, '') })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < normalized.length) {
    segments.push({ type: 'markdown', content: normalized.slice(lastIndex) })
  }
  return segments
}

function CodeBlock({ language, content }: { language: string; content: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable */ }
  }
  return (
    <div className="assistant-code-block">
      <div className="assistant-code-head">
        <span className="assistant-code-lang">{language || 'code'}</span>
        <button type="button" className="assistant-code-copy" onClick={() => void copy()}>
          <span className="material-symbols-outlined" aria-hidden="true">{copied ? 'check' : 'content_copy'}</span>
          {copied ? 'Đã sao chép' : 'Sao chép mã'}
        </button>
      </div>
      <pre><code>{content}</code></pre>
    </div>
  )
}

// Render a safe React-only Markdown subset (code blocks, tables, blockquotes, emphasis, clickable citation chips);
// model output never becomes raw HTML.
function renderInline(text: string, onCiteClick?: CiteClickHandler) {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[(?:DOC|PROJECT|FILE)-\d+\])/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={index}>{part.slice(1, -1)}</code>
    }
    const citeMatch = part.match(/^\[(DOC|PROJECT|FILE)-(\d+)\]$/)
    if (citeMatch) {
      const kind = citeMatch[1] as CitationKind
      const num = Number.parseInt(citeMatch[2], 10)
      const label = `${kind}-${num}`
      if (onCiteClick && (kind === 'DOC' || kind === 'PROJECT') && num > 0) {
        return (
          <button
            key={index}
            type="button"
            className="assistant-inline-cite is-clickable"
            title={kind === 'DOC' ? `Xem tài liệu trích dẫn ${label}` : `Xem chứng cứ đồ án ${label}`}
            onClick={() => onCiteClick(kind, num - 1)}
          >
            {label}
          </button>
        )
      }
      return <span key={index} className="assistant-inline-cite">{label}</span>
    }
    return <Fragment key={index}>{part}</Fragment>
  })
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

function renderMarkdownBlocks(content: string, keyPrefix: string, onCiteClick?: CiteClickHandler) {
  const prepared = content
    .replace(/^(#{1,6} .+)$/gm, '\n\n$1\n\n')
    .replace(/^([-*_]{3,})\s*$/gm, '\n\n---\n\n')
  const blocks = prepared.split(/\n\s*\n/).filter(block => block.trim())

  return blocks.map((block, index) => {
    const key = `${keyPrefix}-${index}`
    const trimmed = block.trim()
    if (trimmed === '---') {
      return <hr key={key} className="assistant-hr" />
    }
    const lines = block.split('\n').filter(line => line.trim().length > 0)
    const table = parseTable(lines)
    if (table) {
      return (
        <div key={key} className="assistant-table-wrap">
          <Table className="text-xs">
            <TableHead>
              <TableRow head>{table.headers.map((h, i) => <TableHeaderCell key={i}>{renderInline(h, onCiteClick)}</TableHeaderCell>)}</TableRow>
            </TableHead>
            <TableBody>
              {table.rows.map((row, ri) => (
                <TableRow key={ri}>
                  {table.headers.map((header, ci) => <TableCell key={ci} label={header}>{renderInline(row[ci] ?? '', onCiteClick)}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    }
    if (lines.every(line => /^\s*>\s?/.test(line))) {
      const quoteText = lines.map(line => line.replace(/^\s*>\s?/, '')).join('\n')
      return <blockquote key={key} className="assistant-blockquote">{renderInline(quoteText, onCiteClick)}</blockquote>
    }
    if (lines.every(line => /^\s*[-*•] /.test(line))) {
      return <ul key={key}>{lines.map((line, i) => <li key={i}>{renderInline(line.replace(/^\s*[-*•] /, ''), onCiteClick)}</li>)}</ul>
    }
    if (lines.every(line => /^\s*\d+[.)] /.test(line))) {
      return <ol key={key} start={Number.parseInt(lines[0], 10)}>{lines.map((line, i) => <li key={i}>{renderInline(line.replace(/^\s*\d+[.)] /, ''), onCiteClick)}</li>)}</ol>
    }
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch && lines.length === 1) {
      const level = headingMatch[1].length
      const headingText = renderInline(headingMatch[2], onCiteClick)
      return level <= 2
        ? <h3 key={key} className="assistant-md-h3">{headingText}</h3>
        : <h4 key={key} className="assistant-md-h4">{headingText}</h4>
    }
    return <p key={key}>{renderInline(block.trim(), onCiteClick)}</p>
  })
}

export function AssistantAnswerText({
  text,
  onCiteClick,
  streaming = false,
}: {
  text: string
  onCiteClick?: CiteClickHandler
  streaming?: boolean
}) {
  const segments = splitCodeFences(text)
  return (
    <div className="assistant-answer-body">
      {segments.map((seg, idx) =>
        seg.type === 'code'
          ? <CodeBlock key={`code-${idx}`} language={seg.language} content={seg.content} />
          : <Fragment key={`md-${idx}`}>{renderMarkdownBlocks(seg.content, `md-${idx}`, onCiteClick)}</Fragment>
      )}
      {streaming && <span className="assistant-stream-cursor" aria-hidden="true" />}
    </div>
  )
}
