import { Button } from '../../components/ui/Button'
import type { ProjectDto } from '../../types/backend'
import type { ProjectPeriod } from '../academic/types/governance.types'
import type { EvaluationSchemeComponentInput } from '../../services/api/evaluations.api'
import type { EvaluationScheme } from './evaluation-types'
import type { Rubric } from './rubrics-api'
import { displayLabel } from '../../components/ui/display-label'
import { EvaluationSchemePolicySummary } from './EvaluationSchemePolicySummary'

export interface SchemeConflict {
  schemeId: number | null; latest: EvaluationScheme | null; loaded: boolean
  draft: { name: string; periodId: number; threshold: number | ''; components: Array<EvaluationSchemeComponentInput & { key: string }> }
}

export function SchemeConflictReview({ conflict, periods, rubrics, project, busy, canManage, onReload, onUseServer, onKeepDraft }: {
  conflict: SchemeConflict; periods: ProjectPeriod[]; rubrics: Rubric[]; project: ProjectDto | null
  busy: boolean; canManage: boolean; onReload: () => void; onUseServer: () => void; onKeepDraft: () => void
}) {
  return <section aria-labelledby="scheme-conflict-title" className="space-y-3 rounded-xl border border-status-warning-border bg-status-warning-bg p-4 text-sm text-ink-soft">
    <h2 id="scheme-conflict-title" className="font-semibold">Kiểm tra thay đổi trước khi tiếp tục</h2>
    <p>Nội dung bạn nhập vẫn được giữ. Chưa có thao tác nào được gửi lại; hãy so sánh và chọn bản muốn dùng.</p>
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <details><summary className="min-h-11 cursor-pointer font-semibold">Nội dung bạn đang nhập</summary><DraftSummary draft={conflict.draft} periods={periods} rubrics={rubrics} project={project} /></details>
      <div className="min-w-0">{!conflict.loaded ? <p>Chưa xác minh được bản hiện tại. Tải lại để tiếp tục.</p> : conflict.latest ? <>
        <h3 className="font-semibold">{conflict.latest.name} · v{conflict.latest.version} · {displayLabel(conflict.latest.status)}</h3>
        <DraftSummary draft={{ name: conflict.latest.name, periodId: conflict.latest.projectPeriodId, threshold: conflict.latest.passThreshold, components: conflict.latest.components.map(item => ({ ...item, key: String(item.id) })) }} periods={periods} rubrics={rubrics} project={project} />
        <EvaluationSchemePolicySummary scheme={conflict.latest} />
      </> : <p>{conflict.schemeId === null ? 'Chọn một phiên bản trong danh sách để kiểm tra, hoặc bỏ nội dung tạo mới.' : 'Phương án này không còn trong danh sách trên hệ thống.'}</p>}</div>
    </div>
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" disabled={busy} onClick={onReload}>Tải lại bản hiện tại</Button>
      <Button variant="secondary" disabled={busy || !conflict.loaded} onClick={onUseServer}>{conflict.latest ? 'Dùng bản trên hệ thống' : 'Bỏ nội dung và về danh sách'}</Button>
      {canManage && conflict.latest?.status === 'DRAFT' && <Button variant="secondary" disabled={busy || !conflict.loaded || !project} onClick={onKeepDraft}>Giữ nội dung để tiếp tục sửa</Button>}
    </div>
  </section>
}

function DraftSummary({ draft, periods, rubrics, project }: { draft: SchemeConflict['draft']; periods: ProjectPeriod[]; rubrics: Rubric[]; project: ProjectDto | null }) {
  return <div className="my-2 space-y-2 break-words">
    <p><strong>Tên:</strong> {draft.name || 'Chưa nhập'} · <strong>Kỳ:</strong> {periods.find(item => item.id === draft.periodId)?.name ?? 'Chưa xác minh'} · <strong>Ngưỡng đạt:</strong> {draft.threshold === '' ? 'Chưa nhập' : draft.threshold}</p>
    <ul className="space-y-2">{draft.components.map(item => <li key={item.key}><strong>{item.name || 'Chưa đặt tên'}</strong> · {displayLabel(item.scope)} · {item.majorId ? project?.majors.find(major => major.majorId === item.majorId)?.majorName ?? 'Ngành chưa xác minh' : 'Toàn đồ án'} · Bộ tiêu chí {rubrics.find(rubric => rubric.id === item.rubricId)?.code ?? 'chưa xác minh'}<br />Điểm đồ án: {item.projectWeightPercent}% · Sinh viên: {item.studentWeightPercent}% · Người chấm: {item.requiredEvaluators}<br />Giai đoạn: {item.stage ?? 'Chưa xác định'}{item.evaluatorWeights?.map((weight, index) => <span key={index}> · #{weight.evaluatorId}: {weight.weightPercent}%</span>)}</li>)}</ul>
  </div>
}
