export type MajorType = 'SE' | 'UI/UX' | 'UIUX' | 'AI' | 'QA' | 'IS' | 'ALL'

export interface MultidisciplinaryTagProps {
  major: MajorType
  className?: string
}

export function MultidisciplinaryTag({ major, className = '' }: MultidisciplinaryTagProps) {
  const styles: Record<MajorType, string> = {
    SE: 'bg-[var(--color-tag-se-bg)] text-[var(--color-tag-se)] border-[var(--color-tag-se)]/20',
    'UI/UX': 'bg-[var(--color-tag-uiux-bg)] text-[var(--color-tag-uiux)] border-[var(--color-tag-uiux)]/20',
    UIUX: 'bg-[var(--color-tag-uiux-bg)] text-[var(--color-tag-uiux)] border-[var(--color-tag-uiux)]/20',
    AI: 'bg-[var(--color-tag-ai-bg)] text-[var(--color-tag-ai)] border-[var(--color-tag-ai)]/20',
    QA: 'bg-[var(--color-tag-qa-bg)] text-[var(--color-tag-qa)] border-[var(--color-tag-qa)]/20',
    IS: 'bg-[var(--color-tag-is-bg)] text-[var(--color-tag-is)] border-[var(--color-tag-is)]/20',
    ALL: 'bg-slate-100 text-slate-700 border-hairline',
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
