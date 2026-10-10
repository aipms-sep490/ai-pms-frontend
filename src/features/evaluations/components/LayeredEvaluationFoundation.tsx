import { displayLabel } from '../../../components/ui/display-label'
import { useLayeredEvaluationAvailability } from '../hooks/useLayeredEvaluationAvailability'

/** Displays the integration boundary; it deliberately has no score inputs or mutations. */
export function LayeredEvaluationFoundation() {
  const availability = useLayeredEvaluationAvailability()
  return (
    <section aria-labelledby="layered-evaluation-heading" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="text-xs font-bold uppercase tracking-wider">Đánh giá theo phạm vi</p>
      <h2 id="layered-evaluation-heading" className="mt-1 font-bold">Chưa thể mở đánh giá theo phạm vi</h2>
      <p className="mt-2">Chức năng này chưa sẵn sàng. Bạn vẫn có thể xem các phân công đánh giá đã được cấp.</p>
      <ul className="mt-3 list-disc pl-5">{availability.capabilities.map((capability) => <li key={capability.scope}>{displayLabel(capability.scope)} · Chưa hỗ trợ chấm điểm</li>)}</ul>
    </section>
  )
}
