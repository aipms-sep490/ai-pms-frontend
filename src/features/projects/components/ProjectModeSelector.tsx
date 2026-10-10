import type { ProjectMode } from '../../registration/types/registration-source.types'

export type ProjectRegistrationMode = ProjectMode

interface ProjectModeSelectorProps {
  selectedMode: ProjectRegistrationMode
  onSelectMode: (mode: ProjectRegistrationMode) => void
  disabled?: boolean
}

export function ProjectModeSelector({
  selectedMode,
  onSelectMode,
  disabled = false,
}: ProjectModeSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Hình thức đồ án *
        </label>
        <span className="text-xs text-slate-500 font-medium">
          {disabled ? 'Hình thức đồ án của nhóm đã được chốt' : 'Chọn theo cơ cấu ngành của nhóm'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Single Major Option */}
        <label
          htmlFor="project-mode-single-major"
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
            selectedMode === 'SINGLE_MAJOR'
              ? 'border-primary/35 bg-primary-subtle/40 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-primary">apartment</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Một ngành</h4>
                <span className="inline-block mt-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                  MỘT CHUYÊN NGÀNH
                </span>
              </div>
            </div>
            <input
              id="project-mode-single-major"
              aria-label="Chọn chế độ đề tài đơn ngành"
              type="radio"
              name="projectMode"
              checked={selectedMode === 'SINGLE_MAJOR'}
              onChange={() => !disabled && onSelectMode('SINGLE_MAJOR')}
              className="text-primary focus:ring-primary mt-1"
              disabled={disabled}
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Dành cho nhóm có tất cả thành viên thuộc cùng một chuyên ngành.
          </p>
          <div className="pt-2 border-t border-slate-100/80 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            Phù hợp khi mọi thành viên thuộc cùng một ngành
          </div>
        </label>

        {/* Interdisciplinary Option */}
        <label
          htmlFor="project-mode-interdisciplinary"
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
            selectedMode === 'INTERDISCIPLINARY'
              ? 'border-primary/35 bg-primary-subtle/40 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-primary">hub</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Liên ngành</h4>
                <span className="inline-block mt-0.5 text-xs font-bold text-primary bg-primary-subtle border border-primary/35 px-1.5 py-0.2 rounded">
                  NHIỀU CHUYÊN NGÀNH
                </span>
              </div>
            </div>
            <input
              id="project-mode-interdisciplinary"
              aria-label="Chọn chế độ đề tài liên ngành"
              type="radio"
              name="projectMode"
              checked={selectedMode === 'INTERDISCIPLINARY'}
              onChange={() => !disabled && onSelectMode('INTERDISCIPLINARY')}
              disabled={disabled}
              className="text-primary focus:ring-primary mt-1"
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Dành cho nhóm phối hợp nhiều chuyên ngành, có phân công và số thành viên phù hợp cho từng ngành.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <span className="material-symbols-outlined text-[15px]">account_tree</span>
            Hệ thống kiểm tra số lượng thành viên và phân công theo từng ngành
          </div>
        </label>
      </div>
    </div>
  )
}
