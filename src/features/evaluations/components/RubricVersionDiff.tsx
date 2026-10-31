import type { Rubric } from '../rubrics-api'

export function RubricVersionDiff({ current, previous }: { current: Rubric; previous: Rubric }) {
  const flatten = (items: Rubric['criteria'], path = ''): Array<[string, Rubric['criteria'][number]]> =>
    items.flatMap((item, index) => [[`${path}${index + 1}`, item] as [string, typeof item], ...flatten(item.children, `${path}${index + 1}.`)])
  const before = new Map(flatten(previous.criteria))
  const after = new Map(flatten(current.criteria))
  const changes = [...new Set([...before.keys(), ...after.keys()])].flatMap(key => {
    const old = before.get(key), next = after.get(key)
    if (!old) return [`${key}: thêm ${next?.name}`]
    if (!next) return [`${key}: bỏ ${old.name}`]
    const details = [old.weightPercent !== next.weightPercent ? `trọng số ${old.weightPercent}% → ${next.weightPercent}%` : '',
      JSON.stringify(old.levels ?? []) !== JSON.stringify(next.levels ?? []) ? 'mức chất lượng thay đổi' : ''].filter(Boolean)
    return details.length ? [`${key} ${next.name}: ${details.join(', ')}`] : []
  })
  return <details className="mt-3 rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-semibold">So sánh v{previous.version} và v{current.version}</summary>{changes.length ? <ul className="mt-2 list-disc pl-5">{changes.map(change => <li key={change}>{change}</li>)}</ul> : <p className="mt-2">Không có thay đổi tiêu chí, trọng số hoặc mức.</p>}</details>
}
