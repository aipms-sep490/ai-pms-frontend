import type { Topic } from '../../topics/api/topic-api'

interface TopicDetailDrawerProps {
  topic: Topic | null
  isLoading: boolean
  error: Error | null
  onClose: () => void
  onStartFromTopic: (topic: Topic) => void
}

export function TopicDetailDrawer({ topic, isLoading, error, onClose, onStartFromTopic }: TopicDetailDrawerProps) {
  if (!isLoading && !error && !topic) return null
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"><section className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" aria-label="Chi tiết đề tài"><header className="flex items-start justify-between gap-4 border-b border-slate-100 p-6"><div><p className="font-mono text-xs font-bold text-blue-700">{topic?.code ?? 'Đề tài'}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{topic?.title ?? 'Đang tải chi tiết đề tài'}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Đóng chi tiết đề tài"><span className="material-symbols-outlined" aria-hidden="true">close</span></button></header><div className="flex-1 overflow-y-auto p-6">{isLoading ? <p className="text-sm text-slate-600">Đang tải chi tiết đề tài…</p> : null}{error ? <p role="alert" className="text-sm text-rose-700">{error.message}</p> : null}{topic ? <TopicDetail topic={topic} /> : null}</div>{topic ? <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-6"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Đóng</button><button type="button" onClick={() => onStartFromTopic(topic)} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700">Bắt đầu từ đề tài này</button></footer> : null}</section></div>
}

function TopicDetail({ topic }: { topic: Topic }) {
  return <div className="flex flex-col gap-5 text-sm text-slate-700"><p>{topic.description ?? 'Backend chưa cung cấp mô tả.'}</p><Detail label="Bộ môn chủ trì" value={topic.leadDepartmentName} /><Detail label="Chế độ đề tài" value={topic.projectMode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'} /><Detail label="Mục tiêu" value={topic.objectives ?? 'Backend chưa cung cấp.'} /><Detail label="Kết quả kỳ vọng" value={topic.expectedOutput ?? 'Backend chưa cung cấp.'} /><div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Yêu cầu chuyên ngành</h3><ul className="mt-2 space-y-2">{topic.requirements.map((requirement) => <li key={requirement.majorId} className="rounded-lg bg-slate-50 p-3 text-xs"><strong>{requirement.majorCode} · {requirement.majorName}</strong><span className="block text-slate-600">{requirement.departmentName}; tối thiểu {requirement.minMembers}, tối đa {requirement.maxMembers}; {requirement.responsibility}</span></li>)}</ul></div></div>
}

function Detail({ label, value }: { label: string; value: string }) { return <div><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</h3><p className="mt-1 text-xs leading-relaxed text-slate-700">{value}</p></div> }
