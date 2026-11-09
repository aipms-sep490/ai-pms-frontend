import { Table, TableHead } from '../../../components/ui/Table'
import type { CriterionLevel } from '../evaluation-types'

export function CriterionLevelPanel({
  levels,
  currentScore,
  onSelectScore,
  disabled = false,
}: {
  levels: CriterionLevel[] | null | undefined
  currentScore?: string
  onSelectScore?: (score: number) => void
  disabled?: boolean
}) {
  if (!levels?.length) return null

  const sortedLevels = [...levels].sort((a, b) => a.levelOrder - b.levelOrder)
  const currentNum = currentScore != null && currentScore.trim() !== '' ? Number(currentScore) : null

  const isLevelActive = (level: CriterionLevel) => {
    if (currentNum == null || Number.isNaN(currentNum)) return false
    if (level.scoreFrom != null && level.scoreTo != null) {
      return currentNum >= level.scoreFrom && currentNum <= level.scoreTo
    }
    return false
  }

  return (
    <div className="mt-3 space-y-2">
      {onSelectScore && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Chọn nhanh mức chất lượng">
          <span className="text-xs font-semibold text-ink-muted mr-1">Gợi ý mức:</span>
          {sortedLevels.map((level) => {
            const active = isLevelActive(level)
            const suggestedScore = level.scoreTo ?? level.scoreFrom ?? 0
            return (
              <button
                key={level.levelOrder}
                type="button"
                disabled={disabled}
                onClick={() => onSelectScore(suggestedScore)}
                title={`${level.label}: ${level.descriptor || 'Không có mô tả'}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  active
                    ? 'bg-primary text-white shadow-xs border border-primary ring-1 ring-primary'
                    : 'bg-canvas text-ink-soft border border-hairline hover:border-primary/40 hover:bg-primary-subtle hover:text-primary'
                }`}
              >
                <span>{level.label}</span>
                {level.scoreFrom != null && level.scoreTo != null && (
                  <span className={`text-xs font-mono ${active ? 'text-white/90' : 'text-ink-muted'}`}>
                    ({level.scoreFrom}–{level.scoreTo}đ)
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <details className="rounded-lg border border-hairline p-3 text-sm bg-canvas/40">
        <summary className="min-h-11 cursor-pointer font-semibold flex items-center justify-between text-ink-soft select-none">
          <span>Mức chất lượng và dải điểm gợi ý</span>
          <span className="text-xs text-ink-muted font-normal">(Xem chi tiết tiêu chuẩn)</span>
        </summary>
        <p className="mt-2 text-ink-muted text-xs">
          Dải điểm chỉ để tham khảo, không giới hạn điểm giảng viên nhập.
        </p>
        <div className="mt-2 overflow-x-auto">
          <Table className="w-full min-w-[30rem] text-left">
            <TableHead>
              <tr>
                <th scope="col" className="p-2">Mức</th>
                <th scope="col" className="p-2">Mô tả</th>
                <th scope="col" className="p-2">Dải gợi ý</th>
                {onSelectScore && <th scope="col" className="p-2 text-right">Thao tác</th>}
              </tr>
            </TableHead>
            <tbody>
              {sortedLevels.map((level) => {
                const active = isLevelActive(level)
                const suggestedScore = level.scoreTo ?? level.scoreFrom ?? 0
                return (
                  <tr
                    key={level.levelOrder}
                    className={`border-t border-hairline transition-colors ${
                      active ? 'bg-primary-subtle/50 font-medium' : ''
                    }`}
                  >
                    <th scope="row" className="p-2 align-top text-ink">
                      <div className="flex items-center gap-1.5">
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
                        <span>{level.label}</span>
                      </div>
                    </th>
                    <td className="whitespace-pre-wrap p-2 align-top text-ink-soft text-xs leading-relaxed">
                      {level.descriptor || 'Chưa có mô tả cụ thể.'}
                    </td>
                    <td className="p-2 align-top font-mono text-xs text-ink-soft whitespace-nowrap">
                      {level.scoreFrom == null || level.scoreTo == null
                        ? 'Chưa có'
                        : `${level.scoreFrom}–${level.scoreTo}đ`}
                    </td>
                    {onSelectScore && (
                      <td className="p-2 align-top text-right">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onSelectScore(suggestedScore)}
                          className="px-2 py-0.5 rounded text-xs font-semibold text-primary hover:bg-primary-subtle border border-primary/30 disabled:opacity-40"
                        >
                          {active ? 'Đang chọn' : `Chọn ${suggestedScore}đ`}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      </details>
    </div>
  )
}
