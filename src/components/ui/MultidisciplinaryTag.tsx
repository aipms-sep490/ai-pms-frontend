export type MajorType = 'SE' | 'UI/UX' | 'UIUX' | 'AI' | 'QA' | 'IS' | 'ALL'

export interface MultidisciplinaryTagProps {
  major: MajorType
  className?: string
}

export function MultidisciplinaryTag({ major, className = '' }: MultidisciplinaryTagProps) {
  const styles: Record<MajorType, string> = {
    SE: 'bg-blue-50 text-blue-700 border-blue-200',
    'UI/UX': 'bg-purple-50 text-purple-700 border-purple-200',
    UIUX: 'bg-purple-50 text-purple-700 border-purple-200',
    AI: 'bg-amber-50 text-amber-800 border-amber-200',
    QA: 'bg-teal-50 text-teal-700 border-teal-200',
    IS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ALL: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  const displayMajor = major === 'UIUX' ? 'UI/UX' : major

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-bold tracking-tight border whitespace-nowrap ${styles[major]} ${className}`.trim()}
    >
      [{displayMajor}]
    </span>
  )
}
