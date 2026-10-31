import type { CriterionInput } from '../rubrics-api'

export function RubricSheetPreview({ criteria }: { criteria: CriterionInput[] }) {
  const leaves = (items: CriterionInput[], path = ''): Array<{ number: string; item: CriterionInput }> =>
    items.flatMap((item, index) => item.children.length ? leaves(item.children, `${path}${index + 1}.`) : [{ number: `${path}${index + 1}`, item }])
  return <section aria-label="Phiếu chấm xem trước" className="mt-3 space-y-3 rounded-lg border border-hairline p-4">
    <h3 className="font-semibold">Phiếu chấm xem trước</h3>
    <p className="text-sm text-ink-muted">Tỷ trọng phiếu trong điểm sinh viên sẽ do BE gửi theo phân công. Điểm và kết quả chính thức do BE tính.</p>
    {leaves(criteria).map(({ number, item }) => <article key={number} className="rounded-lg border border-hairline p-3">
      <h4 className="font-semibold">{number}. {item.name || 'Tiêu chí chưa đặt tên'}</h4>
      <p className="mt-1 text-sm text-ink-muted">Trọng số trong bộ tiêu chí: {item.effectiveWeightPercent == null ? 'Chưa có dữ liệu BE' : `${item.effectiveWeightPercent}%`} · Tỷ trọng phiếu trong điểm sinh viên: Chưa có dữ liệu BE</p>
      {item.evidenceGuidance && <p className="mt-1 text-sm">Minh chứng: {item.evidenceGuidance}</p>}
      <label className="mt-2 block text-sm">Điểm<input disabled value="" readOnly className="mt-1 block w-32 rounded border p-2" /></label>
      {!!item.levels?.length && <details className="mt-2 rounded border p-2 text-sm"><summary className="cursor-pointer">Mức chất lượng</summary><ul className="mt-2 space-y-1">{item.levels.map(level => <li key={level.levelOrder}>{level.label}: {level.descriptor || 'Chưa có mô tả'}</li>)}</ul></details>}
    </article>)}
  </section>
}
