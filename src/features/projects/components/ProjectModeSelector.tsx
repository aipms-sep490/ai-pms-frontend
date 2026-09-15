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
          Chế độ Đề tài Đồ án (Project Mode) *
        </label>
        <span className="text-[11px] text-slate-500 font-medium">
          {disabled ? 'Chế độ đã được cấu hình theo phạm vi học thuật của nhóm' : 'Chọn theo cơ cấu ngành của nhóm'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Single Major Option */}
        <div
          onClick={() => !disabled && onSelectMode('SINGLE_MAJOR')}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
            selectedMode === 'SINGLE_MAJOR'
              ? 'border-blue-600 bg-blue-50/40 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-blue-600">apartment</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Đơn ngành (Single Major)</h4>
                <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
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
              className="text-blue-600 focus:ring-blue-500 mt-1"
              disabled={disabled}
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Áp dụng cho các đề tài chuyên sâu theo 1 chuyên ngành duy nhất (100% thành viên cùng chuyên ngành đào tạo).
          </p>
          <div className="pt-2 border-t border-slate-100/80 flex items-center gap-1.5 text-[11px] font-semibold text-blue-800">
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            Phù hợp khi mọi thành viên thuộc cùng một ngành
          </div>
        </div>

        {/* Interdisciplinary Option */}
        <div
          onClick={() => !disabled && onSelectMode('INTERDISCIPLINARY')}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
            selectedMode === 'INTERDISCIPLINARY'
              ? 'border-purple-600 bg-purple-50/40 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-purple-600">hub</span>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Liên ngành (Interdisciplinary)</h4>
                <span className="inline-block mt-0.5 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
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
              className="text-purple-600 focus:ring-purple-500 mt-1"
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Áp dụng cho đề tài phối hợp nhiều ngành. Thành viên phải đáp ứng hạn mức ngành trong phạm vi học thuật của nhóm.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-purple-800">
            <span className="material-symbols-outlined text-[15px]">account_tree</span>
            Backend kiểm tra quota và trách nhiệm theo từng ngành
          </div>
        </div>
      </div>
    </div>
  )
}
