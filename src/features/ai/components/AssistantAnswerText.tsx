import { Fragment } from 'react'

// Render a small text-only Markdown subset; model output never becomes HTML.
function inline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part.startsWith('`') && part.endsWith('`') ? <code key={index}>{part.slice(1, -1)}</code>
        : <Fragment key={index}>{part}</Fragment>)
}

export function AssistantAnswerText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n?/g, '\n').replace(/^(#{1,6} .+)$/gm, '\n\n$1\n\n').split(/\n\s*\n/).filter(block => block.trim())
  return <div className="assistant-answer-body">{blocks.map((block, index) => {
    const lines = block.split('\n')
    if (lines.every(line => /^\s*[-*] /.test(line))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\s*[-*] /, ''))}</li>)}</ul>
    if (lines.every(line => /^\s*\d+[.)] /.test(line))) return <ol key={index} start={Number.parseInt(lines[0], 10)}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\s*\d+[.)] /, ''))}</li>)}</ol>
    if (/^#{1,6} /.test(block) && lines.length === 1) return <h4 key={index}>{inline(block.replace(/^#{1,6} /, ''))}</h4>
    return <p key={index}>{inline(block)}</p>
  })}</div>
}
