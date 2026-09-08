import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { MultidisciplinaryTag } from '../../../components/ui/MultidisciplinaryTag'
import { allMilestonesPreview } from '../fixtures/milestone-kanban-preview'
import { filterKanbanTasks, groupTasksByStatus } from '../utils/filter-kanban-tasks'
import { MilestoneHeader } from '../components/MilestoneHeader'
import { KanbanBoard } from '../components/KanbanBoard'
import type { KanbanMajorFilter } from '../types/milestone-kanban.types'

const majorFilters: { id: KanbanMajorFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả chuyên ngành' },
  { id: 'SE', label: 'Kỹ thuật Phần mềm [SE]' },
  { id: 'UIUX', label: 'Thiết kế Mỹ thuật số [UI/UX]' },
  { id: 'AI', label: 'Trí tuệ Nhân tạo [AI]' },
  { id: 'QA', label: 'Kiểm thử & Đảm bảo CL [QA]' },
]

export function MilestoneDetailPage() {
  const { milestoneId } = useParams<{ milestoneId: string }>()
  const navigate = useNavigate()

  // Default to M3 if param is missing or invalid
  const activeId = milestoneId && allMilestonesPreview[milestoneId] ? milestoneId : 'M3'
  const currentMilestone = allMilestonesPreview[activeId]

  const [selectedMajor, setSelectedMajor] = useState<KanbanMajorFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSelectMilestone = (id: string) => {
    navigate(`/project/milestones/${id}`)
  }

  // Filter tasks on active milestone
  const filteredTasks = filterKanbanTasks(
    currentMilestone.tasks,
    selectedMajor,
    searchQuery
  )
  const groupedTasks = groupTasksByStatus(filteredTasks)

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Simulation status banner */}
      <div
        role="status"
        aria-label="Thông báo chế độ xem trước bảng Kanban"
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-status-warning-bg border border-status-warning-border text-status-warning-text text-xs font-medium"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">
            info
          </span>
          <span>
            <strong>Chế độ xem trước Cột mốc & Bảng Kanban</strong> — Tương tác lọc và chuyển mốc hoạt động trên dữ liệu minh họa.
          </span>
        </div>
        <Badge variant="warning" size="sm" className="shrink-0">
          Mô phỏng
        </Badge>
      </div>

      {/* 1. Milestone Summary Header & Switcher */}
      <MilestoneHeader
        milestone={currentMilestone}
        activeMilestoneId={activeId}
        onSelectMilestone={handleSelectMilestone}
      />

      {/* 2. Filter Toolbar: Major Tabs & Search */}
      <div className="p-3.5 rounded-xl bg-white border border-hairline shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Major Filter Buttons */}
        <div
          role="group"
          aria-label="Lọc thẻ Kanban theo chuyên ngành"
          className="flex items-center gap-1 overflow-x-auto no-scrollbar"
        >
          {majorFilters.map((tab) => {
            const isSelected = selectedMajor === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedMajor(tab.id)}
                aria-label={tab.label}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-hairline'
                }`}
              >
                {tab.id !== 'all' && (
                  <MultidisciplinaryTag major={tab.id} className="text-[9px] px-1 py-0" />
                )}
                <span>{tab.id === 'all' ? tab.label : tab.id}</span>
              </button>
            )
          })}
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[240px]">
          <span className="absolute left-2.5 top-2 text-slate-400 material-symbols-outlined text-[16px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã hoặc tên công việc..."
            aria-label="Tìm kiếm công việc trong bảng Kanban"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-hairline bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-primary focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 3. 4-Column Kanban Board */}
      <KanbanBoard
        groupedTasks={groupedTasks}
        totalMilestoneTasks={currentMilestone.totalTasks}
        hasDetailTasks={currentMilestone.tasks.length > 0}
      />
    </div>
  )
}
