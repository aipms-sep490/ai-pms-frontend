import { Badge } from '../../components/ui/Badge'
import type { EvaluationScheme } from './evaluation-types'

const labels: Record<string, string> = {
  COMPONENT_WEIGHTS: 'Theo trọng số thành phần',
  DEMO_50_30_20: 'Tỷ lệ 50/30/20 — chỉ minh họa',
  DECIMAL_V2: 'Decimal v2', LEGACY_V1: 'Legacy v1 — giữ cách tính đã ghi nhận',
  AWAY_FROM_ZERO: 'Điểm giữa làm tròn ra xa 0', TO_EVEN: 'Điểm giữa làm tròn đến số chẵn',
  ON_GOING: 'Trong quá trình thực hiện', COLD: 'Đánh giá COLD', DEFENSE: 'Bảo vệ',
  APPROVED: 'Đã chấp thuận', DEMO: 'Minh họa',
}
const label = (value: string | null | undefined) => value ? labels[value] ?? value : 'Chưa xác định'

/** Read-only BE metadata. This does not grant authority or determine result readiness. */
export function EvaluationSchemePolicySummary({ scheme }: { scheme: EvaluationScheme }) {
  const policy = scheme.policy
  const approved = policy?.isDemo === false && policy.approvalStatus === 'APPROVED' && Boolean(policy.approvalReference?.trim())
  const demo = policy?.isDemo === true
  const lockedDate = scheme.lockedAt ? new Date(scheme.lockedAt) : null
  const lockedTime = lockedDate && Number.isFinite(lockedDate.getTime()) ? lockedDate.toLocaleString('vi-VN') : 'Chưa ghi nhận'
  return <section aria-label="Thông tin chính sách đánh giá" className="space-y-4 rounded-lg border border-hairline bg-canvas p-4 text-sm text-ink-soft">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold text-ink">Phê duyệt và cách tính</h3>
      <Badge variant={approved ? 'success' : 'warning'} className="max-w-full whitespace-normal">
        {demo ? 'Minh họa — chưa dùng chính thức' : approved ? 'Đã ghi nhận phê duyệt' : 'Chưa xác định phê duyệt'}
      </Badge>
    </div>
    <p>{scheme.status === 'PUBLISHED' || scheme.status === 'FROZEN' ? 'Cấu hình đã khóa để chấm. ' : scheme.status === 'DRAFT' || scheme.status === 'PROPOSED' ? 'Cấu hình chưa khóa để chấm. ' : 'Chưa xác định trạng thái khóa cấu hình. '}
      {demo ? 'Khóa cấu hình minh họa không cho phép công bố điểm chính thức.' : approved ? 'Tham chiếu phê duyệt do hệ thống cung cấp; quyền và điều kiện công bố kết quả được kiểm tra riêng.' : 'Chưa có thông tin phê duyệt đầy đủ; không suy ra chính sách chính thức từ trạng thái phiên bản.'}
    </p>
    <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div className="min-w-0"><dt className="text-xs text-ink-muted">Trạng thái phê duyệt trên hệ thống</dt><dd className="mt-1 break-all">{label(policy?.approvalStatus)}</dd></div>
      <div className="min-w-0"><dt className="text-xs text-ink-muted">Tham chiếu phê duyệt</dt><dd className="mt-1 whitespace-pre-wrap break-all">{policy?.approvalReference?.trim() || 'Chưa có tham chiếu'}</dd></div>
      <div><dt className="text-xs text-ink-muted">Thời điểm khóa</dt><dd className="mt-1">{lockedTime}</dd></div>
      <div className="min-w-0"><dt className="text-xs text-ink-muted">Công thức</dt><dd className="mt-1 break-all">{label(policy?.formula)}</dd></div>
      <div className="min-w-0"><dt className="text-xs text-ink-muted">Phiên bản tính điểm</dt><dd className="mt-1 break-all">{label(policy?.calculationVersion)}</dd></div>
      <div className="min-w-0"><dt className="text-xs text-ink-muted">Làm tròn</dt><dd className="mt-1 break-all">{label(policy?.roundingMode)}</dd></div>
      <div><dt className="text-xs text-ink-muted">Số chữ số thập phân</dt><dd className="mt-1">{Number.isInteger(policy?.decimalPlaces) ? policy?.decimalPlaces : 'Chưa xác định'}</dd></div>
    </dl>
    {!policy && <p>Phiên bản cũ thiếu nguồn chính sách. Giữ dữ liệu lịch sử; không tự gán công thức hoặc tính lại điểm.</p>}
    <div className="space-y-2 border-t border-hairline pt-3">
      <h4 className="font-semibold text-ink">Giai đoạn và trọng số người chấm đã lưu</h4>
      <ul className="space-y-3">{scheme.components.map(item => <li key={item.id} className="min-w-0 break-words">
        <strong>{item.name}</strong><p className="mt-1">Giai đoạn: {label(item.stage)}</p>
        {item.evaluatorWeights == null ? <p>Trung bình đều theo hệ thống · {item.requiredEvaluators} người chấm bắt buộc.</p> : item.evaluatorWeights.length === 0 ? <p>Danh sách trọng số rỗng — cần kiểm tra cấu hình trên hệ thống.</p> : <>
          <p>{item.requiredEvaluators} người chấm bắt buộc; thiếu điểm không tự chia lại trọng số.</p>
          <ul className="mt-1 space-y-1">{item.evaluatorWeights.map((weight, index) => <li key={`${weight.evaluatorId}-${index}`}>Người chấm #{weight.evaluatorId}: {weight.weightPercent}%</li>)}</ul>
        </>}
      </li>)}</ul>
    </div>
  </section>
}
