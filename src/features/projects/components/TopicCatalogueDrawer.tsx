import type { TopicItem } from '../../../types/topic.types'
import { MultidisciplinaryTag } from '../../../components/ui/MultidisciplinaryTag'

interface TopicCatalogueDrawerProps {
  topic: TopicItem | null
  isOpen: boolean
  onClose: () => void
  onSelectTopic: (topic: TopicItem) => void
}

export function TopicCatalogueDrawer({
  topic,
  isOpen,
  onClose,
  onSelectTopic,
}: TopicCatalogueDrawerProps) {
  if (!isOpen || !topic) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {topic.code}
              </span>
              {topic.isInterdisciplinary ? (
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Liên ngành
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  Đơn ngành
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-snug">{topic.titleVi}</h3>
            <p className="text-xs text-slate-500 italic mt-0.5">{topic.titleEn}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-sm text-slate-700">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Mô tả Đề tài
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              {topic.description}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Mục tiêu Nghiên cứu
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">{topic.objectives}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Kết quả Kỳ vọng (Deliverables)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">{topic.expectedOutput}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Chuyên ngành Phù hợp
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {topic.suggestedMajors.map((m) => (
                <MultidisciplinaryTag key={m} major={m} />
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Công nghệ Đề xuất
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {topic.technologies.map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-mono font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTopic(topic)
              onClose()
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            Chọn đề tài này cho nhóm
          </button>
        </div>
      </div>
    </div>
  )
}
