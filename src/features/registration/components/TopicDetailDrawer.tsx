import type { Topic } from '../../topics/api/topic-api'
import { Modal } from '../../../components/ui/Modal'

interface TopicDetailDrawerProps {
  topic: Topic | null
  isLoading: boolean
  error: Error | null
  onClose: () => void
  canSelect: boolean
  isOneStepCreate?: boolean
  selecting: boolean
  onSelectTopic: (topic: Topic) => void
}

export function TopicDetailDrawer({ topic, isLoading, error, onClose, canSelect, isOneStepCreate = false, selecting, onSelectTopic }: TopicDetailDrawerProps) {
  if (!isLoading && !error && !topic) return null
  const maxTeams = topic?.maxTeams ?? 1
  const selectedCount = topic?.selectedTeamCount ?? 0
  const remaining = Math.max(0, maxTeams - selectedCount)
  const isFull = remaining <= 0
  return <Modal open drawer title={topic?.title ?? 'Chi tiết đề tài'} description={topic?.code} busy={selecting} onClose={onClose}>
    {isLoading && <p className="text-sm text-ink-muted" role="status">Đang tải chi tiết đề tài…</p>}
    {error && <p role="alert" className="text-sm text-status-error-text">Chưa tải được chi tiết đề tài. Hãy thử lại.</p>}
    {topic && <><TopicDetail topic={topic} /><footer className="app-modal__actions"><button type="button" disabled={selecting} onClick={onClose} className="app-modal__button">Đóng</button>{canSelect ? <button type="button" disabled={selecting || isFull} onClick={() => onSelectTopic(topic)} className="app-modal__button app-modal__button--primary">{selecting ? 'Đang xử lý…' : isFull ? 'Đã đủ suất' : isOneStepCreate ? 'Chọn đề tài & Tạo bản nháp' : 'Chọn đề tài này'}</button> : <p className="text-xs text-ink-muted">Cần bản nháp có thể chỉnh sửa (hoặc nhóm đủ điều kiện đăng ký) và quyền trưởng nhóm để chọn đề tài.</p>}</footer></>}
  </Modal>
}

function TopicDetail({ topic }: { topic: Topic }) {
  const maxTeams = topic.maxTeams ?? 1
  const selectedCount = topic.selectedTeamCount ?? 0
  const remaining = Math.max(0, maxTeams - selectedCount)
  return <div className="flex flex-col gap-5 text-sm text-ink-soft"><p>{topic.description ?? 'Chưa có mô tả.'}</p><Detail label="Chỉ tiêu suất đăng ký" value={remaining > 0 ? `Còn ${remaining}/${maxTeams} suất (đã chọn: ${selectedCount})` : `Đã đủ suất (${selectedCount}/${maxTeams})`} /><Detail label="Bộ môn chủ trì" value={topic.leadDepartmentName} /><Detail label="Chế độ đề tài" value={topic.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'} /><Detail label="Mục tiêu" value={topic.objectives ?? 'Chưa có nội dung.'} /><Detail label="Kết quả kỳ vọng" value={topic.expectedOutput ?? 'Chưa có nội dung.'} />{topic.requirements.length > 0 && <div><h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Yêu cầu chuyên ngành</h3><ul className="mt-2 divide-y divide-hairline">{topic.requirements.map((requirement) => <li key={requirement.majorId} className="py-3 text-xs"><strong className="text-ink">{requirement.majorCode} · {requirement.majorName}</strong><span className="block text-ink-muted">{requirement.departmentName}; tối thiểu {requirement.minMembers}, tối đa {requirement.maxMembers}; {requirement.responsibility}</span></li>)}</ul></div>}</div>
}

function Detail({ label, value }: { label: string; value: string }) { return <div><h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">{label}</h3><p className="mt-1 text-xs leading-relaxed text-ink-soft">{value}</p></div> }
