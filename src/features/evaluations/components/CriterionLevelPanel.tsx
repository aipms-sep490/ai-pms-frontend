import { Table, TableHead } from '../../../components/ui/Table'
import type { CriterionLevel } from '../evaluation-types'

export function CriterionLevelPanel({ levels }: { levels: CriterionLevel[] | null | undefined }) {
  if (!levels?.length) return null
  return <details className="mt-3 rounded-lg border border-hairline p-3 text-sm">
    <summary className="min-h-11 cursor-pointer font-semibold">Mức chất lượng và dải điểm gợi ý</summary>
    <p className="mt-2 text-ink-muted">Dải điểm chỉ để tham khảo, không giới hạn điểm giảng viên nhập.</p>
    <div className="mt-2 overflow-x-auto"><Table className="w-full min-w-[30rem] text-left"><TableHead><tr><th scope="col" className="p-2">Mức</th><th scope="col" className="p-2">Mô tả</th><th scope="col" className="p-2">Dải gợi ý</th></tr></TableHead><tbody>{[...levels].sort((a, b) => a.levelOrder - b.levelOrder).map(level => <tr key={level.levelOrder} className="border-t border-hairline"><th scope="row" className="p-2 align-top">{level.label}</th><td className="whitespace-pre-wrap p-2 align-top">{level.descriptor}</td><td className="p-2 align-top">{level.scoreFrom == null || level.scoreTo == null ? 'Chưa có' : `${level.scoreFrom}–${level.scoreTo}`}</td></tr>)}</tbody></Table></div>
  </details>
}
