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
    <div className="fixed inset-0 z-50 flex justify-end bg-[color-mix(in_oklab,var(--color-brand-navy)_45%,transparent)] backdrop-blur-xs">
      <div className="flex h-full w-full max-w-xl flex-col justify-between bg-card shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-hairline p-6">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="rounded border border-primary/20 bg-primary-subtle px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {topic.code}
              </span>
              {topic.isInterdisciplinary ? (
                <span className="rounded border border-tag-ai/20 bg-tag-ai-bg px-2 py-0.5 text-xs font-bold text-tag-ai">
                  Liên ngành
                </span>
              ) : (
                <span className="rounded border border-hairline bg-canvas px-2 py-0.5 text-xs font-bold text-ink-soft">
                  Đơn ngành
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold leading-snug text-ink">{topic.titleVi}</h3>
            <p className="mt-0.5 text-xs italic text-ink-muted">{topic.titleEn}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết đề tài"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5 overflow-y-auto p-6 text-sm text-ink-soft">
          <div>
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
              Mô tả Đề tài
            </h4>
            <p className="rounded-xl border border-hairline bg-canvas p-3.5 text-xs leading-relaxed text-ink-muted">
              {topic.description}
            </p>
          </div>

          <div>
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
              Mục tiêu Nghiên cứu
            </h4>
            <p className="text-xs leading-relaxed text-ink-muted">{topic.objectives}</p>
          </div>

          <div>
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
              Kết quả Kỳ vọng (Deliverables)
            </h4>
            <p className="text-xs leading-relaxed text-ink-muted">{topic.expectedOutput}</p>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
              Chuyên ngành Phù hợp
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {topic.suggestedMajors.map((m) => (
                <MultidisciplinaryTag key={m} major={m} />
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
              Công nghệ Đề xuất
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {topic.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-hairline bg-canvas px-2.5 py-1 font-mono text-xs font-medium text-ink-soft"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-hairline bg-canvas p-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-hairline bg-card px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTopic(topic)
              onClose()
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-primary-hover"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">assignment_turned_in</span>
            Chọn đề tài này cho nhóm
          </button>
        </div>
      </div>
    </div>
  )
}
