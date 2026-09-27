import type { Topic } from '../../topics/api/topic-api'
import { Modal } from '../../../components/ui/Modal'

interface TopicDetailDrawerProps {
  topic: Topic | null
  isLoading: boolean
  error: Error | null
  onClose: () => void
  canSelect: boolean
  selecting: boolean
  onSelectTopic: (topic: Topic) => void
}

export function TopicDetailDrawer({ topic, isLoading, error, onClose, canSelect, selecting, onSelectTopic }: TopicDetailDrawerProps) {
  if (!isLoading && !error && !topic) return null
  return <Modal open drawer title={topic?.title ?? 'Chi tiết đề tài'} description={topic?.code} busy={selecting} onClose={onClose}>
    {isLoading && <p className="text-sm text-slate-600" role="status">Đang tải chi tiết đề tài…</p>}
    {error && <p role="alert" className="text-sm text-rose-700">Chưa tải được chi tiết đề tài. Hãy thử lại.</p>}
    {topic && <><TopicDetail topic={topic} /><footer className="app-modal__actions"><button type="button" disabled={selecting} onClick={onClose} className="app-modal__button">Đóng</button>{canSelect ? <button type="button" disabled={selecting} onClick={() => onSelectTopic(topic)} className="app-modal__button app-modal__button--primary">{selecting ? 'Đang chọn…' : 'Chọn đề tài này'}</button> : <p className="text-xs text-slate-500">Cần bản nháp có thể chỉnh sửa và quyền trưởng nhóm để chọn đề tài.</p>}</footer></>}
  </Modal>
}

function TopicDetail({ topic }: { topic: Topic }) {
  return <div className="flex flex-col gap-5 text-sm text-slate-700"><p>{topic.description ?? 'Chưa có mô tả.'}</p><Detail label="Bộ môn chủ trì" value={topic.leadDepartmentName} /><Detail label="Chế độ đề tài" value={topic.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'} /><Detail label="Mục tiêu" value={topic.objectives ?? 'Chưa có nội dung.'} /><Detail label="Kết quả kỳ vọng" value={topic.expectedOutput ?? 'Chưa có nội dung.'} />{topic.requirements.length > 0 && <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Yêu cầu chuyên ngành</h3><ul className="mt-2 divide-y divide-slate-100">{topic.requirements.map((requirement) => <li key={requirement.majorId} className="py-3 text-xs"><strong>{requirement.majorCode} · {requirement.majorName}</strong><span className="block text-slate-600">{requirement.departmentName}; tối thiểu {requirement.minMembers}, tối đa {requirement.maxMembers}; {requirement.responsibility}</span></li>)}</ul></div>}</div>
}

function Detail({ label, value }: { label: string; value: string }) { return <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</h3><p className="mt-1 text-xs leading-relaxed text-slate-700">{value}</p></div> }
