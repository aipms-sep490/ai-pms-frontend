import { useState, type ClipboardEvent } from 'react'
import { ProjectLabelPicker, type ProjectLabelItem } from './ProjectLabelPicker'

export interface SlideOverTaskData {
  id: number
  title: string
  description: string
  status: string
  priority: string
  storyPoints: number | null
  taskCategory: string
  disciplineSubStatus: string
  handoffFlag: string
  assigneeIds: number[]
  labels: string[]
  criteria: Array<{ id: number; title: string; isCompleted: boolean }>
}

interface SlideOverTaskDrawerProps {
  open: boolean
  task: SlideOverTaskData | null
  currentUserId: number
  catalogLabels: ProjectLabelItem[]
  canEditLabels?: boolean
  onClose: () => void
  onAssignYourself: (taskId: number, userId: number) => void
  onToggleLabel: (taskId: number, slug: string) => void
  onPasteImage?: (taskId: number, file: File) => void
  onPushToGateEvidence?: (taskId: number) => void
}

export function SlideOverTaskDrawer({
  open,
  task,
  currentUserId,
  catalogLabels,
  canEditLabels = false,
  onClose,
  onAssignYourself,
  onToggleLabel,
  onPasteImage,
  onPushToGateEvidence,
}: SlideOverTaskDrawerProps) {
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [pasteNotice, setPasteNotice] = useState<string | null>(null)

  if (!open || !task) return null

  const isAssignedToMe = task.assigneeIds.includes(currentUserId)

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items
    if (!items || !onPasteImage) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          onPasteImage(task.id, file)
          setPasteNotice(`Đã dán ảnh minh chứng: ${file.name || 'clipboard-image.png'}`)
        }
      }
    }
  }

  return (
    <aside
      role="dialog"
      aria-label={`Chi tiết công việc ${task.title}`}
      className="fixed inset-y-0 right-0 z-40 w-full max-w-[640px] border-l border-slate-200 bg-white shadow-2xl flex flex-col"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="min-w-0">
          <div className="text-xs font-mono text-slate-500">TASK-{task.id} · {task.status}</div>
          <h2 className="text-sm font-semibold text-slate-900 truncate">{task.title}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100">Đóng</button>
      </header>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12">
        {/* Left column (~65%): Description, Ctrl+V Paste, Criteria, Push to Gate Evidence */}
        <div className="md:col-span-8 p-5 space-y-4 border-b md:border-b-0 md:border-r border-slate-100">
          <div className="space-y-1">
            <label htmlFor="task-drawer-desc" className="text-xs font-semibold text-slate-700">Mô tả (hỗ trợ dán ảnh Ctrl+V)</label>
            <textarea
              id="task-drawer-desc"
              defaultValue={task.description}
              onPaste={handlePaste}
              rows={4}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900"
            />
            {pasteNotice && <div role="status" className="text-xs text-emerald-700">{pasteNotice}</div>}
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-700">Tiêu chí hoàn thành ({task.criteria.filter(c => c.isCompleted).length}/{task.criteria.length})</div>
            <ul className="space-y-1 text-xs">
              {task.criteria.map(c => (
                <li key={c.id} className="flex items-center gap-2 text-slate-800">
                  <input type="checkbox" checked={c.isCompleted} readOnly />
                  <span className={c.isCompleted ? 'line-through text-slate-400' : ''}>{c.title}</span>
                </li>
              ))}
            </ul>
          </div>

          {onPushToGateEvidence && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onPushToGateEvidence(task.id)}
                className="rounded-md border border-teal-600 px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50"
              >
                Đẩy lên Minh chứng Gate
              </button>
            </div>
          )}
        </div>

        {/* Right column (~35%): Sticky 5-Axis Inspector */}
        <div className="md:col-span-4 p-4 bg-slate-50 space-y-4 text-xs">
          <div className="space-y-1.5">
            <div className="font-semibold text-slate-700">Người phụ trách</div>
            <div className="text-slate-600">{task.assigneeIds.length ? `${task.assigneeIds.length} thành viên` : 'Chưa gán'}</div>
            {!isAssignedToMe && (
              <button
                type="button"
                onClick={() => onAssignYourself(task.id, currentUserId)}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Tự nhận việc (Assign yourself)
              </button>
            )}
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-slate-700">Ưu tiên &amp; Story Points</div>
            <div className="text-slate-800">{task.priority} · {task.storyPoints ?? '-'} SP</div>
          </div>

          <div className="space-y-1">
            <div className="font-semibold text-slate-700">Taxonomy &amp; Sub-status</div>
            <div className="text-slate-800">{task.taskCategory}</div>
            <div className="text-slate-600">{task.disciplineSubStatus || 'Chưa gắn'} · {task.handoffFlag}</div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Nhãn (Labels)</span>
              <button type="button" onClick={() => setShowLabelPicker(v => !v)} className="text-blue-700 hover:underline">
                {showLabelPicker ? 'Ẩn' : 'Chọn'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {task.labels.map(slug => (
                <span key={slug} className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-800">{slug}</span>
              ))}
            </div>
            {showLabelPicker && (
              <div className="pt-1">
                <ProjectLabelPicker
                  labels={catalogLabels}
                  selectedSlugs={task.labels}
                  canEditCatalog={canEditLabels}
                  onToggle={slug => onToggleLabel(task.id, slug)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
