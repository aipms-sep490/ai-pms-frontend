import { useContext, useMemo, useRef, useState } from 'react'
import { AcademicWorkflowContext } from '../../../app/context/academic-workflow-context'
import {
  applyProjectAiSetup,
  applyRubricAiSetup,
  type ApplyProjectSetupResult,
  type ApplyRubricSetupResult,
  type AssistantProjectSetupPlan,
  type AssistantRubricCriterionDraft,
  type AssistantRubricLevelDraft,
  type AssistantRubricSetupPlan,
  type AssistantSetupDeliverable,
  type AssistantSetupMilestone,
  type AssistantSetupTask,
} from '../academic-ai-api'
import { displayLabel } from '../../../components/ui/display-label'
import { HttpError } from '../../../services/http/http-client'
import { humanizeHttpError } from '../../../services/http/humanize-http-error'

const makeUuid = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
      const r = (Math.random() * 16) | 0
      return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })

type Selectable<T> = T & { selected: boolean }

export function AssistantProjectSetupCard({
  projectId,
  runId,
  plan,
  canApply,
  onNavigateTarget,
}: {
  projectId?: number
  runId?: number | null
  plan: AssistantProjectSetupPlan
  canApply: boolean
  onNavigateTarget?: (target: string, resourceId?: number | null) => void
}) {
  const [tab, setTab] = useState<'milestones' | 'deliverables' | 'tasks'>(
    plan.tasks.length > 0 ? 'tasks' : plan.deliverables.length > 0 ? 'deliverables' : 'milestones',
  )
  const [milestones, setMilestones] = useState<Selectable<AssistantSetupMilestone>[]>(() =>
    plan.milestones.map(m => ({ ...m, selected: true })),
  )
  const [deliverables, setDeliverables] = useState<Selectable<AssistantSetupDeliverable>[]>(() =>
    plan.deliverables.map(d => ({ ...d, selected: true })),
  )
  const [tasks, setTasks] = useState<Selectable<AssistantSetupTask>[]>(() =>
    plan.tasks.map(t => ({ ...t, selected: true })),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState<ApplyProjectSetupResult | null>(null)
  const idempotencyKey = useRef(makeUuid())

  const resetIdempotency = () => {
    idempotencyKey.current = makeUuid()
  }

  const selectedMs = milestones.filter(m => m.selected)
  const selectedDel = deliverables.filter(d => d.selected)
  const selectedTasks = tasks.filter(t => t.selected)
  const selectedCriteriaCount = selectedTasks.reduce((sum, t) => sum + t.acceptanceCriteria.filter(c => c.trim()).length, 0)
  const totalSelected = selectedMs.length + selectedDel.length + selectedTasks.length

  const apply = async () => {
    if (!projectId || !canApply || busy || totalSelected === 0) return
    setBusy(true); setError('')
    try {
      const result = await applyProjectAiSetup(projectId, {
        idempotencyKey: idempotencyKey.current,
        runId: runId ?? null,
        milestones: selectedMs.map(({ selected: _s, ...rest }) => rest),
        deliverables: selectedDel.map(({ selected: _s, ...rest }) => ({
          ...rest,
          acceptanceCriteria: rest.acceptanceCriteria.map(c => c.trim()).filter(Boolean),
        })),
        tasks: selectedTasks.map(({ selected: _s, ...rest }) => ({
          ...rest,
          acceptanceCriteria: rest.acceptanceCriteria.map(c => c.trim()).filter(Boolean),
          assigneeNames: rest.assigneeNames.map(n => n.trim()).filter(Boolean),
        })),
      })
      setApplied(result)
    } catch (err) {
      if (err instanceof HttpError) {
        if (err.status === 403) setError(err.message || 'Chỉ trưởng nhóm hoặc giảng viên hướng dẫn được tự động áp dụng thiết lập.')
        else if (err.status === 409) setError(err.message || 'Trạng thái đồ án đã thay đổi. Kiểm tra lại trước khi áp dụng.')
        else if (err.status === 400) setError(err.message || 'Dữ liệu đề xuất chưa hợp lệ. Hãy chỉnh sửa mục bị lỗi rồi thử lại.')
        else setError('Chưa thể áp dụng lúc này. Các chỉnh sửa của bạn vẫn được giữ nguyên; thử lại sau.')
      } else {
        setError('Chưa thể kết nối máy chủ. Các chỉnh sửa của bạn vẫn được giữ nguyên.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (applied) {
    return (
      <section className="assistant-setup-card assistant-setup-done" aria-label="Kết quả áp dụng thiết lập AI">
        <div className="assistant-setup-done-head">
          <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <div>
            <h3>{applied.replay ? 'Thiết lập đã được áp dụng trước đó' : 'Đã thiết lập tự động vào đồ án'}</h3>
            <p>
              Tạo mới: <strong>{applied.milestonesCreated} mốc</strong> ·{' '}
              <strong>{applied.deliverablesCreated} hạng mục tài liệu</strong> ·{' '}
              <strong>{applied.tasksCreated} công việc</strong> ·{' '}
              <strong>{applied.taskCriteriaCreated} tiêu chí nghiệm thu</strong>
              {applied.dependenciesCreated > 0 ? ` · ${applied.dependenciesCreated} liên kết phụ thuộc` : ''}.
            </p>
          </div>
        </div>
        {applied.warnings.length > 0 && (
          <ul className="assistant-setup-warnings">
            {applied.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
        {onNavigateTarget && (
          <div className="assistant-setup-links">
            {applied.tasksCreated > 0 && <button type="button" onClick={() => onNavigateTarget('tasks')}>Mở bảng công việc</button>}
            {applied.deliverablesCreated > 0 && <button type="button" onClick={() => onNavigateTarget('deliverables')}>Mở hạng mục tài liệu</button>}
            {applied.milestonesCreated > 0 && <button type="button" onClick={() => onNavigateTarget('milestones')}>Mở mốc đồ án</button>}
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="assistant-setup-card" aria-label="Gói đề xuất tự động thiết lập đồ án">
      <header className="assistant-setup-head">
        <span className="assistant-structured-kicker">
          <span className="material-symbols-outlined" aria-hidden="true">auto_fix_high</span>
          Đề xuất thiết lập tự động · Xem trước & chỉnh nhanh
        </span>
        <p>{plan.summary}</p>
      </header>

      {plan.warnings.length > 0 && (
        <ul className="assistant-setup-warnings">
          {plan.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}

      <div className="assistant-setup-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'milestones'} onClick={() => setTab('milestones')}>
          Mốc ({selectedMs.length}/{milestones.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'deliverables'} onClick={() => setTab('deliverables')}>
          Tài liệu & Tiêu chí ({selectedDel.length}/{deliverables.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'tasks'} onClick={() => setTab('tasks')}>
          Công việc ({selectedTasks.length}/{tasks.length})
        </button>
      </div>

      {tab === 'milestones' && (
        <div className="assistant-setup-list">
          {milestones.length === 0 && <p className="assistant-setup-empty">Chưa có mốc mới; công việc sẽ gắn vào mốc sẵn có của đồ án.</p>}
          {milestones.map((ms, idx) => (
            <article key={ms.tempKey || idx} className={`assistant-setup-item ${ms.selected ? '' : 'is-muted'}`}>
              <label className="assistant-setup-check">
                <input type="checkbox" checked={ms.selected} disabled={busy} onChange={e => { resetIdempotency(); setMilestones(list => list.map((x, i) => i === idx ? { ...x, selected: e.target.checked } : x)) }} />
                <span>{ms.existingMilestoneId ? `Dùng mốc sẵn có (#${ms.existingMilestoneId})` : `Mốc mới (${ms.tempKey})`}</span>
              </label>
              <input aria-label={`Tên mốc ${idx + 1}`} value={ms.title} disabled={busy || !ms.selected || Boolean(ms.existingMilestoneId)} maxLength={255} onChange={e => { resetIdempotency(); setMilestones(list => list.map((x, i) => i === idx ? { ...x, title: e.target.value } : x)) }} />
              {ms.description && <p className="assistant-setup-note">{ms.description}</p>}
              {(ms.startDate || ms.dueDate) && <small>Thời gian: {ms.startDate ?? '—'} → {ms.dueDate ?? '—'}</small>}
            </article>
          ))}
        </div>
      )}

      {tab === 'deliverables' && (
        <div className="assistant-setup-list">
          {deliverables.length === 0 && <p className="assistant-setup-empty">Không có hạng mục tài liệu nào trong đề xuất này.</p>}
          {deliverables.map((del, idx) => (
            <article key={del.tempKey || idx} className={`assistant-setup-item ${del.selected ? '' : 'is-muted'}`}>
              <label className="assistant-setup-check">
                <input type="checkbox" checked={del.selected} disabled={busy} onChange={e => { resetIdempotency(); setDeliverables(list => list.map((x, i) => i === idx ? { ...x, selected: e.target.checked } : x)) }} />
                <span>{del.deliverableType} · {del.milestoneRef || 'Mốc mặc định'}</span>
              </label>
              <input aria-label={`Tên tài liệu ${idx + 1}`} value={del.title} disabled={busy || !del.selected} maxLength={255} onChange={e => { resetIdempotency(); setDeliverables(list => list.map((x, i) => i === idx ? { ...x, title: e.target.value } : x)) }} />
              <label className="assistant-setup-sublabel">
                Tiêu chí đạt yêu cầu (mỗi dòng 1 tiêu chí)
                <textarea
                  rows={3}
                  disabled={busy || !del.selected}
                  value={del.acceptanceCriteria.join('\n')}
                  onChange={e => {
                    resetIdempotency()
                    const lines = e.target.value.split('\n')
                    setDeliverables(list => list.map((x, i) => i === idx ? { ...x, acceptanceCriteria: lines } : x))
                  }}
                />
              </label>
            </article>
          ))}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="assistant-setup-list">
          {tasks.length === 0 && <p className="assistant-setup-empty">Chưa có công việc đề xuất.</p>}
          {tasks.map((task, idx) => (
            <article key={task.tempKey || idx} className={`assistant-setup-item ${task.selected ? '' : 'is-muted'}`}>
              <div className="assistant-setup-item-row">
                <label className="assistant-setup-check">
                  <input type="checkbox" checked={task.selected} disabled={busy} onChange={e => { resetIdempotency(); setTasks(list => list.map((x, i) => i === idx ? { ...x, selected: e.target.checked } : x)) }} />
                  <span>{task.tempKey} · {task.milestoneRef || 'Mốc mặc định'}</span>
                </label>
                <select aria-label={`Ưu tiên công việc ${idx + 1}`} value={task.priority} disabled={busy || !task.selected} onChange={e => { resetIdempotency(); setTasks(list => list.map((x, i) => i === idx ? { ...x, priority: e.target.value } : x)) }}>
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HIGH">Cao</option>
                  <option value="CRITICAL">Khẩn cấp</option>
                </select>
              </div>
              <input aria-label={`Tên công việc ${idx + 1}`} value={task.title} disabled={busy || !task.selected} maxLength={255} onChange={e => { resetIdempotency(); setTasks(list => list.map((x, i) => i === idx ? { ...x, title: e.target.value } : x)) }} />
              {task.description && <p className="assistant-setup-note">{task.description}</p>}
              <div className="assistant-setup-tags">
                {task.assigneeNames.length > 0 && <span>Phụ trách: {task.assigneeNames.join(', ')}</span>}
                {task.primaryMajorName && <span>Ngành: {task.primaryMajorName}</span>}
                {task.dependsOnRefs.length > 0 && <span>Sau: {task.dependsOnRefs.join(', ')}</span>}
              </div>
              <label className="assistant-setup-sublabel">
                Checklist tiêu chí nghiệm thu ({task.acceptanceCriteria.filter(c => c.trim()).length} mục)
                <textarea
                  rows={2}
                  disabled={busy || !task.selected}
                  value={task.acceptanceCriteria.join('\n')}
                  onChange={e => {
                    resetIdempotency()
                    const lines = e.target.value.split('\n')
                    setTasks(list => list.map((x, i) => i === idx ? { ...x, acceptanceCriteria: lines } : x))
                  }}
                />
              </label>
            </article>
          ))}
        </div>
      )}

      {error && <p role="alert" className="assistant-setup-error">{error}</p>}

      <footer className="assistant-setup-footer">
        <p>
          Đã chọn: <strong>{selectedMs.length} mốc</strong> · <strong>{selectedDel.length} tài liệu</strong> ·{' '}
          <strong>{selectedTasks.length} công việc</strong> ({selectedCriteriaCount} tiêu chí).
        </p>
        {canApply && projectId ? (
          <button type="button" className="assistant-setup-apply" disabled={busy || totalSelected === 0} onClick={() => void apply()}>
            {busy ? 'Đang áp dụng vào đồ án…' : 'Tự động áp dụng vào đồ án'}
          </button>
        ) : (
          <p className="assistant-setup-perm-note">
            Chỉ Trưởng nhóm hoặc GVHD trong đồ án đang hoạt động mới có quyền áp dụng trực tiếp. Bạn có thể tải bản kế hoạch này để gửi nhóm.
          </p>
        )}
      </footer>
    </section>
  )
}

const DEFAULT_RUBRIC_LEVELS: AssistantRubricLevelDraft[] = [
  { levelOrder: 1, label: 'Xuất sắc', descriptor: 'Đáp ứng vượt trội toàn bộ yêu cầu học thuật, minh chứng đầy đủ và có chiều sâu.', scoreFrom: 8.5, scoreTo: 10 },
  { levelOrder: 2, label: 'Khá / Tốt', descriptor: 'Đáp ứng đầy đủ các yêu cầu cốt lõi, minh chứng rõ ràng, còn vài điểm nhỏ cần tối ưu.', scoreFrom: 7.0, scoreTo: 8.4 },
  { levelOrder: 3, label: 'Đạt yêu cầu', descriptor: 'Đáp ứng mức tối thiểu theo quy định học vụ nhưng còn thiếu độ hoàn thiện hoặc chi tiết.', scoreFrom: 5.0, scoreTo: 6.9 },
  { levelOrder: 4, label: 'Chưa đạt', descriptor: 'Thiếu minh chứng quan trọng hoặc chưa đáp ứng yêu cầu tối thiểu của tiêu chí.', scoreFrom: 0, scoreTo: 4.9 },
]

export interface RubricScopeOption {
  id: number
  code?: string | null
  name: string
  departmentId?: number | null
}

export function AssistantRubricSetupCard({
  runId,
  plan,
  canApply,
  academicSemesterId,
  departments: propDepartments,
  semesters: propSemesters,
  majors: propMajors,
  defaultDepartmentId,
  onOpenRubrics,
  onApplied,
}: {
  runId?: number | null
  plan: AssistantRubricSetupPlan
  canApply: boolean
  academicSemesterId?: number
  departments?: readonly RubricScopeOption[]
  semesters?: readonly RubricScopeOption[]
  majors?: readonly RubricScopeOption[]
  defaultDepartmentId?: number | null
  onOpenRubrics?: () => void
  onApplied?: (result: ApplyRubricSetupResult) => void
}) {
  const workflow = useContext(AcademicWorkflowContext)
  const departments = useMemo<readonly RubricScopeOption[]>(
    () => propDepartments ?? workflow?.academic?.departments ?? [],
    [propDepartments, workflow?.academic?.departments],
  )
  const semesters = useMemo<readonly RubricScopeOption[]>(
    () => propSemesters ?? workflow?.academic?.currentSemesters ?? [],
    [propSemesters, workflow?.academic?.currentSemesters],
  )
  const allMajors = useMemo<readonly RubricScopeOption[]>(
    () => propMajors ?? workflow?.academic?.majors ?? [],
    [propMajors, workflow?.academic?.majors],
  )

  const initialSemesterId =
    academicSemesterId ||
    workflow?.academic?.selectedSemester?.id ||
    semesters[0]?.id ||
    0
  const initialDepartmentId = defaultDepartmentId ?? departments[0]?.id ?? null

  const [departmentId, setDepartmentId] = useState<number | null>(initialDepartmentId)
  const [semesterId, setSemesterId] = useState<number>(initialSemesterId)
  const [majorId, setMajorId] = useState<number | null>(null)
  const [code, setCode] = useState(plan.code)
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [projectMode, setProjectMode] = useState(plan.projectMode || 'SINGLE_MAJOR')
  const [evaluationStage, setEvaluationStage] = useState(plan.evaluationStage || 'DEFENSE')
  const [evaluationScope, setEvaluationScope] = useState(plan.evaluationScope || 'COMMON')
  const [criteria, setCriteria] = useState<AssistantRubricCriterionDraft[]>(() =>
    plan.criteria.map((c, idx) => ({
      ...c,
      tempKey: c.tempKey || `C${idx + 1}`,
      levels: (c.levels ?? []).map(l => ({ ...l })),
    })),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState<ApplyRubricSetupResult | null>(null)
  const idempotencyKey = useRef(makeUuid())

  const filteredMajors = useMemo(() => {
    if (!departmentId) return allMajors
    const scoped = allMajors.filter(m => !m.departmentId || m.departmentId === departmentId)
    return scoped.length > 0 ? scoped : allMajors
  }, [allMajors, departmentId])

  const parentKeys = useMemo(
    () => new Set(criteria.map(c => c.parentTempKey?.trim()).filter((k): k is string => Boolean(k))),
    [criteria],
  )

  const groupWeightErrors = useMemo(() => {
    const groups = new Map<string, number>()
    for (const c of criteria) {
      const parentKey = c.parentTempKey?.trim() || '__ROOT__'
      groups.set(parentKey, Math.round(((groups.get(parentKey) ?? 0) + (Number(c.weightPercent) || 0)) * 100) / 100)
    }
    const issues: string[] = []
    for (const [key, sum] of groups.entries()) {
      if (Math.abs(sum - 100) >= 0.01) {
        if (key === '__ROOT__') issues.push(`Nhóm tiêu chí gốc hiện là ${sum}% (cần đúng 100%)`)
        else {
          const parentName = criteria.find(c => c.tempKey === key)?.name || key
          issues.push(`Nhóm con của "${parentName}" hiện là ${sum}% (cần đúng 100%)`)
        }
      }
    }
    return issues
  }, [criteria])

  const rootWeightSum = useMemo(
    () => Math.round(criteria.filter(c => !c.parentTempKey?.trim()).reduce((s, c) => s + (Number(c.weightPercent) || 0), 0) * 100) / 100,
    [criteria],
  )
  const weightValid = criteria.length > 0 && groupWeightErrors.length === 0
  const needsMajor = evaluationScope === 'MAJOR_SPECIFIC'
  const majorValid = !needsMajor || Boolean(majorId && majorId > 0)

  const mutateCriteria = (updater: (list: AssistantRubricCriterionDraft[]) => AssistantRubricCriterionDraft[]) => {
    idempotencyKey.current = makeUuid()
    setCriteria(updater)
  }

  const addCriterion = (parentTempKey: string | null = null) => {
    mutateCriteria(list => {
      const nextNum = list.length + 1
      return [
        ...list,
        {
          tempKey: `C${nextNum}_${Date.now().toString(36).slice(-3)}`,
          parentTempKey,
          name: parentTempKey ? `Tiêu chí con ${nextNum}` : `Tiêu chí mới ${nextNum}`,
          description: null,
          weightPercent: 10,
          maxScore: 10,
          isRequired: true,
          learningOutcome: null,
          evidenceGuidance: null,
          levels: DEFAULT_RUBRIC_LEVELS.map(l => ({ ...l })),
        },
      ]
    })
  }

  const removeCriterion = (tempKey: string) => {
    mutateCriteria(list => list.filter(c => c.tempKey !== tempKey && c.parentTempKey !== tempKey))
  }

  const apply = async () => {
    if (!canApply || busy || !name.trim() || !code.trim() || !weightValid || !majorValid) return
    setBusy(true); setError('')
    try {
      const result = await applyRubricAiSetup({
        idempotencyKey: idempotencyKey.current,
        runId: runId ?? null,
        departmentId: departmentId ?? null,
        academicSemesterId: semesterId,
        majorId: needsMajor ? majorId : null,
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        projectMode,
        evaluationStage,
        evaluationScope,
        criteria,
      })
      setApplied(result)
      onApplied?.(result)
    } catch (err) {
      if (err instanceof HttpError) {
        setError(humanizeHttpError(err, 'Chưa tạo được bộ tiêu chí nháp. Kiểm tra mã bộ tiêu chí, trọng số và học kỳ hiện hành.'))
      } else {
        setError('Chưa kết nối được máy chủ. Nội dung chỉnh sửa của bạn vẫn được giữ nguyên.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (applied) {
    return (
      <section className="assistant-setup-card assistant-setup-done" aria-label="Kết quả tạo bộ tiêu chí nháp">
        <div className="assistant-setup-done-head">
          <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <div>
            <h3>Đã tạo bộ tiêu chí bản nháp</h3>
            <p>
              <strong>{applied.code}</strong> · {applied.name} ({applied.criteriaCount} tiêu chí · trạng thái <strong>{displayLabel(applied.status)}</strong>).
              Bộ tiêu chí cần được rà soát và phê duyệt trước khi công bố.
            </p>
          </div>
        </div>
        {applied.warnings && applied.warnings.length > 0 && (
          <ul className="assistant-setup-warnings">
            {applied.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
        {onOpenRubrics && (
          <div className="assistant-setup-links">
            <button type="button" onClick={onOpenRubrics}>Mở quản lý Bộ tiêu chí</button>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="assistant-setup-card" aria-label="Gói thiết lập Bộ tiêu chí đánh giá">
      <header className="assistant-setup-head">
        <span className="assistant-structured-kicker">
          <span className="material-symbols-outlined" aria-hidden="true">grading</span>
          Bộ tiêu chí đánh giá bản nháp · Xem trước &amp; chỉnh sửa trực tiếp
        </span>
      </header>
      {plan.warnings.length > 0 && (
        <ul className="assistant-setup-warnings">
          {plan.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
      <div className="assistant-rubric-grid">
        <label>
          Mã bộ tiêu chí
          <input value={code} disabled={busy} maxLength={50} onChange={e => { idempotencyKey.current = makeUuid(); setCode(e.target.value) }} />
        </label>
        <label>
          Tên bộ tiêu chí
          <input value={name} disabled={busy} maxLength={255} onChange={e => { idempotencyKey.current = makeUuid(); setName(e.target.value) }} />
        </label>
        {departments.length > 0 && (
          <label>
            Bộ môn / Khoa
            <select
              aria-label="Bộ môn áp dụng bộ tiêu chí"
              value={departmentId ?? ''}
              disabled={busy}
              onChange={e => {
                idempotencyKey.current = makeUuid()
                setDepartmentId(e.target.value ? Number(e.target.value) : null)
                setMajorId(null)
              }}
            >
              <option value="">Mặc định theo tài khoản</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>
        )}
        {semesters.length > 0 && (
          <label>
            Học kỳ áp dụng
            <select
              aria-label="Học kỳ áp dụng bộ tiêu chí"
              value={semesterId || ''}
              disabled={busy}
              onChange={e => {
                idempotencyKey.current = makeUuid()
                setSemesterId(e.target.value ? Number(e.target.value) : 0)
              }}
            >
              <option value="">Học kỳ đang hoạt động</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.code ? `${s.code} · ${s.name}` : s.name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          Mô hình
          <select value={projectMode} disabled={busy} onChange={e => { idempotencyKey.current = makeUuid(); setProjectMode(e.target.value) }}>
            <option value="SINGLE_MAJOR">Đơn ngành</option>
            <option value="INTERDISCIPLINARY">Liên ngành</option>
          </select>
        </label>
        <label>
          Giai đoạn
          <select value={evaluationStage} disabled={busy} onChange={e => { idempotencyKey.current = makeUuid(); setEvaluationStage(e.target.value) }}>
            <option value="ON_GOING">Đánh giá quá trình</option>
            <option value="COLD">Chấm nguội</option>
            <option value="DEFENSE">Bảo vệ</option>
          </select>
        </label>
        <label>
          Phạm vi
          <select
            value={evaluationScope}
            disabled={busy}
            onChange={e => {
              idempotencyKey.current = makeUuid()
              setEvaluationScope(e.target.value)
              if (e.target.value === 'COMMON') setMajorId(null)
            }}
          >
            <option value="COMMON">Chung (Cả đồ án)</option>
            <option value="MAJOR_SPECIFIC">Theo ngành</option>
            <option value="INDIVIDUAL">Cá nhân</option>
          </select>
        </label>
        {needsMajor && (
          <label>
            Chuyên ngành *
            <select
              aria-label="Chuyên ngành áp dụng bộ tiêu chí"
              value={majorId ?? ''}
              disabled={busy}
              onChange={e => {
                idempotencyKey.current = makeUuid()
                setMajorId(e.target.value ? Number(e.target.value) : null)
              }}
            >
              <option value="">Chọn chuyên ngành</option>
              {filteredMajors.map(m => (
                <option key={m.id} value={m.id}>{m.code ? `${m.code} · ${m.name}` : m.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label className="assistant-setup-sublabel">
        Mô tả
        <textarea rows={2} value={description} disabled={busy} onChange={e => { idempotencyKey.current = makeUuid(); setDescription(e.target.value) }} />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-xs text-ink">Danh sách tiêu chí ({criteria.length})</strong>
        <button
          type="button"
          disabled={busy}
          onClick={() => addCriterion(null)}
          className="rounded-md border border-primary/30 bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          ＋ Thêm tiêu chí gốc
        </button>
      </div>

      <div className="assistant-setup-list">
        {criteria.map((c, idx) => {
          const isChild = Boolean(c.parentTempKey?.trim())
          const isParent = parentKeys.has(c.tempKey)
          const parentName = isChild ? criteria.find(p => p.tempKey === c.parentTempKey)?.name : null
          return (
            <article key={c.tempKey || idx} className={`assistant-setup-item ${isChild ? 'ml-4 border-l-2 border-l-primary/40' : ''}`}>
              <div className="assistant-setup-item-row">
                <input
                  aria-label={`Tên tiêu chí ${idx + 1}`}
                  value={c.name}
                  disabled={busy}
                  onChange={e => mutateCriteria(list => list.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                />
                <label className="assistant-weight-input">
                  <input
                    type="number"
                    min={0.5}
                    max={100}
                    step={0.5}
                    value={c.weightPercent}
                    disabled={busy}
                    onChange={e => mutateCriteria(list => list.map((x, i) => i === idx ? { ...x, weightPercent: Number(e.target.value) } : x))}
                  />%
                </label>
                {!isChild && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => addCriterion(c.tempKey)}
                    className="rounded border border-hairline px-2 py-1 text-xs font-medium text-primary hover:bg-primary-subtle"
                    title="Thêm tiêu chí con thuộc nhóm này"
                  >
                    + Con
                  </button>
                )}
                {criteria.length > 1 && (
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Xóa tiêu chí ${c.name}`}
                    onClick={() => removeCriterion(c.tempKey)}
                    className="rounded border border-status-error-border px-2 py-1 text-xs font-medium text-status-error-text hover:bg-status-error-bg"
                  >
                    Xóa
                  </button>
                )}
              </div>

              {parentName && <small className="text-xs text-primary">Thuộc nhóm: {parentName}</small>}

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-ink-soft">
                  Chuẩn đầu ra (LO)
                  <input
                    value={c.learningOutcome ?? ''}
                    disabled={busy}
                    placeholder="VD: CLO1 · Thiết kế kiến trúc"
                    onChange={e => mutateCriteria(list => list.map((x, i) => i === idx ? { ...x, learningOutcome: e.target.value || null } : x))}
                    className="mt-1 w-full rounded border border-hairline bg-card px-2 py-1.5 text-xs text-ink"
                  />
                </label>
                <label className="text-xs text-ink-soft">
                  Hướng dẫn minh chứng
                  <input
                    value={c.evidenceGuidance ?? ''}
                    disabled={busy}
                    placeholder="VD: Sơ đồ ERD, báo cáo kiểm thử…"
                    onChange={e => mutateCriteria(list => list.map((x, i) => i === idx ? { ...x, evidenceGuidance: e.target.value || null } : x))}
                    className="mt-1 w-full rounded border border-hairline bg-card px-2 py-1.5 text-xs text-ink"
                  />
                </label>
              </div>

              {!isParent && (
                <details className="mt-2 rounded-lg border border-hairline bg-canvas p-2.5">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-soft">
                    <span>Thang mức chất lượng ({c.levels.length}/4 mức) · Điểm tối đa {c.maxScore ?? 10}</span>
                    {c.levels.length < 4 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={e => {
                          e.preventDefault()
                          mutateCriteria(list => list.map((x, i) => i === idx ? { ...x, levels: DEFAULT_RUBRIC_LEVELS.map(l => ({ ...l })) } : x))
                        }}
                        className="rounded border border-primary/30 bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary"
                      >
                        Điền sẵn 4 mức chuẩn
                      </button>
                    )}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {c.levels.map((lvl, lIdx) => (
                      <div key={lIdx} className="grid gap-1.5 rounded border border-hairline bg-card p-2 sm:grid-cols-12">
                        <input
                          aria-label={`Tên mức ${lIdx + 1} của ${c.name}`}
                          value={lvl.label}
                          disabled={busy}
                          onChange={e => mutateCriteria(list => list.map((x, i) => i === idx ? {
                            ...x,
                            levels: x.levels.map((lv, li) => li === lIdx ? { ...lv, label: e.target.value } : lv),
                          } : x))}
                          className="sm:col-span-3 rounded border border-hairline px-2 py-1 text-xs"
                          placeholder="Tên mức"
                        />
                        <input
                          type="number"
                          step={0.1}
                          aria-label={`Từ điểm mức ${lIdx + 1}`}
                          value={lvl.scoreFrom ?? ''}
                          disabled={busy}
                          onChange={e => mutateCriteria(list => list.map((x, i) => i === idx ? {
                            ...x,
                            levels: x.levels.map((lv, li) => li === lIdx ? { ...lv, scoreFrom: e.target.value === '' ? null : Number(e.target.value) } : lv),
                          } : x))}
                          className="sm:col-span-2 rounded border border-hairline px-2 py-1 text-xs"
                          placeholder="Từ"
                        />
                        <input
                          type="number"
                          step={0.1}
                          aria-label={`Đến điểm mức ${lIdx + 1}`}
                          value={lvl.scoreTo ?? ''}
                          disabled={busy}
                          onChange={e => mutateCriteria(list => list.map((x, i) => i === idx ? {
                            ...x,
                            levels: x.levels.map((lv, li) => li === lIdx ? { ...lv, scoreTo: e.target.value === '' ? null : Number(e.target.value) } : lv),
                          } : x))}
                          className="sm:col-span-2 rounded border border-hairline px-2 py-1 text-xs"
                          placeholder="Đến"
                        />
                        <input
                          aria-label={`Mô tả mức ${lIdx + 1} của ${c.name}`}
                          value={lvl.descriptor}
                          disabled={busy}
                          onChange={e => mutateCriteria(list => list.map((x, i) => i === idx ? {
                            ...x,
                            levels: x.levels.map((lv, li) => li === lIdx ? { ...lv, descriptor: e.target.value } : lv),
                          } : x))}
                          className="sm:col-span-5 rounded border border-hairline px-2 py-1 text-xs"
                          placeholder="Mô tả đạt mức…"
                        />
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </article>
          )
        })}
      </div>

      {!majorValid && (
        <p role="alert" className="assistant-setup-error">Phạm vi Theo ngành cần chọn Chuyên ngành áp dụng trước khi lưu.</p>
      )}
      {error && <p role="alert" className="assistant-setup-error">{error}</p>}

      <footer className="assistant-setup-footer">
        <div>
          <p className={weightValid ? 'assistant-weight-ok' : 'assistant-weight-bad'}>
            Tổng trọng số tiêu chí gốc: <strong>{rootWeightSum}%</strong> {!weightValid && '(cần bằng đúng 100%)'}
          </p>
          {groupWeightErrors.length > 0 && (
            <p className="text-xs text-status-error-text">{groupWeightErrors.join(' · ')}</p>
          )}
        </div>
        {canApply ? (
          <button
            type="button"
            className="assistant-setup-apply"
            disabled={busy || !weightValid || !majorValid || !name.trim() || !code.trim()}
            onClick={() => void apply()}
          >
            {busy ? 'Đang lưu bộ tiêu chí nháp…' : 'Tạo bộ tiêu chí bản nháp'}
          </button>
        ) : (
          <p className="assistant-setup-perm-note">Chỉ Cán bộ bộ môn hoặc Quản trị viên mới có quyền tạo bộ tiêu chí đánh giá.</p>
        )}
      </footer>
    </section>
  )
}
