import { useContext, useEffect, useMemo, useState } from 'react'
import { AcademicWorkflowContext } from '../../../app/context/academic-workflow-context'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import { WorkspaceTabs } from '../../../components/ui/WorkspaceTabs'
import { readAllPages } from '../../../services/api/paged-read'
import { httpGet } from '../../../services/http/http-client'
import { useAuthSession } from '../../auth/context/useAuthSession'
import { PeriodCalendarPanel } from '../../defense/PeriodCalendarPanel'
import { getProjectPeriods, getSemesters } from '../api/governance-api'
import { AcademicBlueprintPanel } from '../components/AcademicBlueprintPanel'
import type { PagedResult, ProjectPeriod, Semester } from '../types/governance.types'

type BlueprintTab = 'blueprints' | 'calendar'

interface DepartmentItem {
  id: number
  code: string
  name: string
}

export function AcademicBlueprintManagementPage() {
  const { session } = useAuthSession()
  const workflow = useContext(AcademicWorkflowContext)
  const [activeTab, setActiveTab] = useState<BlueprintTab>('blueprints')
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [selectedSemesterId, setSelectedSemesterId] = useState<number>(workflow?.academic?.selectedSemester?.id ?? 0)
  const [periods, setPeriods] = useState<ProjectPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<number>(0)
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)

  useEffect(() => {
    if (!session?.accessToken) return
    let active = true
    void readAllPages(page => getSemesters(session.accessToken, { search: '' }, undefined, page))
      .then(list => {
        if (!active) return
        setSemesters(list)
        setSelectedSemesterId(prev => prev > 0 ? prev : (list[0]?.id ?? 0))
      })
      .catch(() => { /* keep workflow context */ })

    void httpGet<PagedResult<DepartmentItem>>('/academic/departments?page=1&pageSize=100', { accessToken: session.accessToken })
      .then(res => { if (active) setDepartments(res.items ?? []) })
      .catch(() => { /* optional lookup */ })
    return () => { active = false }
  }, [session?.accessToken])

  useEffect(() => {
    if (!session?.accessToken || !selectedSemesterId) return
    let active = true
    void readAllPages(page => getProjectPeriods(session.accessToken, { semesterId: selectedSemesterId, search: '' }, undefined, page))
      .then(list => {
        if (!active) return
        setPeriods(list)
        const execPeriod = list.find(p => p.periodType === 'EXECUTION' && p.status !== 'ARCHIVED') ?? list[0]
        setSelectedPeriodId(execPeriod?.id ?? 0)
      })
      .catch(() => { if (active) { setPeriods([]); setSelectedPeriodId(0) } })
    return () => { active = false }
  }, [session?.accessToken, selectedSemesterId])

  const actorDepartmentId = workflow?.academic?.departments?.[0]?.id ?? undefined
  const selectedSemester = useMemo(
    () => semesters.find(s => s.id === selectedSemesterId),
    [semesters, selectedSemesterId],
  )

  return (
    <WorkspacePage
      size="wide"
      eyebrow="Cấu hình học vụ · QD-01"
      title="Khung kế hoạch học vụ (AcademicBlueprint)"
      description="Thiết lập khung lộ trình 4 tháng theo từng đường chạy (IT_ONLY, MKT_ONLY, IT_MKT), đồng duyệt liên khoa và cấu hình lịch ngày nghỉ lễ độc lập với lịch bảo vệ."
    >
      <div className="space-y-5">
        <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-hairline bg-card p-4 shadow-xs">
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Học kỳ cấu hình</span>
            <select
              aria-label="Chọn học kỳ cấu hình Blueprint"
              className="block min-h-11 min-w-64 rounded-lg border border-hairline bg-canvas px-3 text-sm font-semibold text-ink"
              value={selectedSemesterId || ''}
              onChange={e => setSelectedSemesterId(Number(e.target.value))}
            >
              {semesters.length === 0 && <option value="">Đang tải học kỳ…</option>}
              {semesters.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) · {s.status}
                </option>
              ))}
            </select>
          </label>
          {selectedSemester && (
            <p className="text-xs text-ink-muted">
              Hiệu lực học kỳ: <strong className="text-ink">{selectedSemester.startDate} → {selectedSemester.endDate}</strong>
            </p>
          )}
        </section>

        <WorkspaceTabs
          ariaLabel="Chế độ cấu hình Blueprint và Lịch làm việc"
          activeId={activeTab}
          onChange={id => setActiveTab(id)}
          tabs={[
            { id: 'blueprints' as const, label: 'AcademicBlueprint theo Track', icon: 'architecture' },
            { id: 'calendar' as const, label: 'Lịch làm việc & Ngày lễ', icon: 'calendar_month' },
          ]}
        />

        {activeTab === 'blueprints' && selectedSemesterId > 0 && (
          <AcademicBlueprintPanel
            key={`${selectedSemesterId}-${calendarRefreshKey}`}
            semesterId={selectedSemesterId}
            actorDepartmentId={actorDepartmentId}
            departments={departments}
          />
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-hairline bg-card p-4">
              <label className="space-y-1 text-sm">
                <span className="font-semibold text-ink">Kỳ đồ án áp dụng lịch ngày làm việc / ngày lễ</span>
                <select
                  aria-label="Chọn kỳ đồ án cấu hình lịch ngày nghỉ"
                  className="mt-1 block min-h-10 min-w-64 rounded-lg border border-hairline bg-canvas px-3 text-sm"
                  value={selectedPeriodId || ''}
                  onChange={e => setSelectedPeriodId(Number(e.target.value))}
                >
                  {periods.length === 0 && <option value="">Chưa có kỳ đồ án nào trong học kỳ này</option>}
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.periodType} · {p.status})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {selectedPeriodId > 0 ? (
              <PeriodCalendarPanel
                key={selectedPeriodId}
                periodId={selectedPeriodId}
                onChanged={() => setCalendarRefreshKey(v => v + 1)}
              />
            ) : (
              <p className="rounded-xl border border-hairline bg-card p-4 text-sm text-ink-muted">
                Hãy tạo ít nhất một kỳ đồ án (ưu tiên kỳ EXECUTION) trong học kỳ để nạp lịch ngày nghỉ lễ Việt Nam 2025–2030.
              </p>
            )}
          </div>
        )}
      </div>
    </WorkspacePage>
  )
}
