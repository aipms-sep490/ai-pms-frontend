export type MajorType = 'SE' | 'UI/UX' | 'UIUX' | 'AI' | 'QA' | 'IS' | 'ALL'

export interface MultidisciplinaryTagProps {
  major: MajorType
  className?: string
}

export function MultidisciplinaryTag({ major, className = '' }: MultidisciplinaryTagProps) {
  const styles: Record<MajorType, string> = {
    SE: 'bg-tag-se-bg text-tag-se border-tag-se/20',
    'UI/UX': 'bg-tag-uiux-bg text-tag-uiux border-tag-uiux/20',
    UIUX: 'bg-tag-uiux-bg text-tag-uiux border-tag-uiux/20',
    AI: 'bg-tag-ai-bg text-tag-ai border-tag-ai/20',
    QA: 'bg-tag-qa-bg text-tag-qa border-tag-qa/20',
    IS: 'bg-tag-is-bg text-tag-is border-tag-is/20',
    ALL: 'bg-canvas text-ink-soft border-hairline',
  }

  const displayMajor = major === 'UIUX' ? 'UI/UX' : major

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono text-xs font-bold tracking-tight border whitespace-nowrap ${styles[major]} ${className}`.trim()}
    >
      [{displayMajor}]
    </span>
  )
}
