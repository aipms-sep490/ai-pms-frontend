import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { WorkspacePage } from '../../../components/ui/WorkspacePage'
import {
  getDefenseReadiness,
  getProjectReviewMatrix,
  getReviewGateTemplates,
  publishReviewGateTemplate,
  saveReviewGateTemplate,
  updateGateDecision,
  updateHybridScopeDecision,
} from '../api/review-gates-api'
import type {
  DefenseReadinessSummary,
  ProjectReviewMatrixRow,
  ReviewGateTemplate,
} from '../types/review-gates.types'
import { ReviewGateBuilder } from '../components/ReviewGateBuilder'
import { ProjectProgressMatrix } from '../components/ProjectProgressMatrix'
import { InterdisciplinaryGatePanel } from '../components/InterdisciplinaryGatePanel'
import { DefenseReadinessChecker } from '../components/DefenseReadinessChecker'

export function ReviewGateGovernancePage() {
  const { periodId } = useParams<{ periodId?: string }>()
  const [activeTab, setActiveTab] = useState<'overview' | 'builder' | 'matrix' | 'hybrid' | 'defense'>('overview')
  const [templates, setTemplates] = useState<ReviewGateTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-it-2026')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('IT-02')
  const [matrixProjects, setMatrixProjects] = useState<ProjectReviewMatrixRow[]>([])
  const [defenseSummary, setDefenseSummary] = useState<DefenseReadinessSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAllData()
  }, [periodId])

  useEffect(() => {
    if (selectedProjectId) {
      getDefenseReadiness(selectedProjectId)
        .then(res => setDefenseSummary(res))
        .catch(() => {})
    }
  }, [selectedProjectId])

  async function loadAllData() {
    setLoading(true)
    setError(null)
    try {
      const [tmplList, matrixList, defSummary] = await Promise.all([
        getReviewGateTemplates(),
        getProjectReviewMatrix(),
        getDefenseReadiness(selectedProjectId),
      ])
      setTemplates(tmplList)
      setMatrixProjects(matrixList)
      setDefenseSummary(defSummary)
      if (tmplList.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(tmplList[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa tải được dữ liệu tiến trình học vụ.')
    } finally {
      setLoading(false)
    }
  }

  const currentTemplate =
    templates.find(t => t.id === selectedTemplateId) || templates[0] || null

  function handleTemplateChange(updated: ReviewGateTemplate) {
    setTemplates(prev => prev.map(t => (t.id === updated.id ? updated : t)))
  }

  async function handleSaveDraft() {
    if (!currentTemplate) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const saved = await saveReviewGateTemplate(currentTemplate)
      setTemplates(prev => prev.map(t => (t.id === saved.id ? saved : t)))
      setNotice('Đã lưu bản nháp tiến trình thành công.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu bản nháp.')
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    if (!currentTemplate) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const published = await publishReviewGateTemplate(currentTemplate.id, currentTemplate.concurrencyToken)
      setTemplates(prev => prev.map(t => (t.id === published.id ? published : t)))
      setNotice(`Đã công bố chính thức mẫu tiến trình ${published.name} (phiên bản v${published.version}).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể công bố chính sách.')
    } finally {
      setBusy(false)
    }
  }

  function handleCloneTemplate(templateToClone: ReviewGateTemplate) {
    const nextVer = (parseFloat(templateToClone.version) + 1.0).toFixed(1)
    const cloned: ReviewGateTemplate = {
      ...templateToClone,
      id: `tmpl-draft-${Date.now()}`,
      code: `${templateToClone.code}-v${nextVer}`,
      name: `${templateToClone.name} (Bản nháp v${nextVer})`,
      status: 'DRAFT',
      version: `${nextVer}-draft`,
      concurrencyToken: `token-${Date.now()}`,
      gates: templateToClone.gates.map((g, gi) => ({
        ...g,
        id: `gate-clone-${Date.now()}-${gi}`,
        requirements: g.requirements.map((r, ri) => ({
          ...r,
          id: `req-clone-${Date.now()}-${ri}`,
        })),
      })),
    }
    setTemplates(prev => [cloned, ...prev])
    setSelectedTemplateId(cloned.id)
    setActiveTab('builder')
    setNotice(`Đã nhân bản ${templateToClone.name} thành bản nháp mới v${cloned.version}.`)
  }

  async function handleUpdateDecision(
    projectId: string,
    gateCode: string,
    newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  ) {
    try {
      const updated = await updateGateDecision(projectId, gateCode, newStatus)
      setMatrixProjects(prev => prev.map(p => (p.projectId === updated.projectId ? updated : p)))
      setNotice(`Đã ghi nhận kết luận thẩm định cho đồ án ${projectId}: ${gateCode} → ${newStatus}.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật kết luận thẩm định.'
      setError(msg)
      throw err
    }
  }

  async function handleUpdateHybridScopeDecision(
    projectId: string,
    scope: string,
    newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  ) {
    try {
      const updated = await updateHybridScopeDecision(projectId, scope, newStatus)
      setMatrixProjects(prev => prev.map(p => (p.projectId === updated.projectId ? updated : p)))
      setNotice(`Đã cập nhật quyết định ngành ${scope} của đồ án ${projectId}: ${newStatus}.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật quyết định ngành.'
      setError(msg)
      throw err
    }
  }

  return (
    <WorkspacePage
      title="Cấu hình & Giám sát Tiến trình Đồ án"
      eyebrow="Quản lý Học vụ · Review Gate Governance"
      description="Thiết kế các đợt thẩm định học thuật (Review Gates R1..Rn), kiểm tra điều kiện minh chứng và ma trận theo dõi tiến độ các nhóm."
    >
      {/* Alert Notices */}
      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800"
        >
          <span>✓ {notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800"
        >
          <span>✕ {error}</span>
          <button type="button" onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            ✕
          </button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-primary text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Thư viện Mẫu Tiến trình (Overview)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('builder')}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'builder'
              ? 'bg-primary text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Thiết kế Review Gates (Builder)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'matrix'
              ? 'bg-primary text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Ma trận Giám sát Tiến trình (Matrix)
        </button>
        <button
          type="button"
          onClick={() => {
            const currentHasHybrid = matrixProjects.find(p => p.projectId === selectedProjectId)?.hybridScopes
            if (!currentHasHybrid) {
              const firstHybrid = matrixProjects.find(p => p.mode === 'INTERDISCIPLINARY' || p.hybridScopes)
              if (firstHybrid) setSelectedProjectId(firstHybrid.projectId)
            }
            setActiveTab('hybrid')
          }}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'hybrid'
              ? 'bg-primary text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Gate Liên ngành (Interdisciplinary)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('defense')}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === 'defense'
              ? 'bg-primary text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Xét Điều kiện Bảo vệ (Defense Readiness)
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Đang tải dữ liệu tiến trình học vụ…
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW / TEMPLATES LIBRARY */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-500">Kỳ học áp dụng</span>
                  <p className="mt-1 text-xl font-bold text-slate-800">
                    {periodId ? decodeURIComponent(periodId) : 'Fall 2026 · SEP490'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-500">Mẫu tiến trình</span>
                  <p className="mt-1 text-2xl font-black text-primary">{templates.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-500">Số Gates tiêu chuẩn</span>
                  <p className="mt-1 text-2xl font-black text-slate-800">
                    {templates.length > 0 ? `${templates[0].gatesCount < 10 ? '0' : ''}${templates[0].gatesCount} Gates` : '04 Gates'}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-amber-800">Trạng thái phê duyệt</span>
                  <p className="mt-1 text-lg font-bold text-amber-800">Bản nháp Bộ môn</p>
                </div>
              </div>

              {/* Template Library Table */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                  <h3 className="text-sm font-bold text-slate-800">Danh mục Mẫu Tiến trình Review</h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newDraft: ReviewGateTemplate = {
                        id: `tmpl-draft-${Date.now()}`,
                        code: `TMPL-${Date.now().toString().slice(-4)}`,
                        name: 'Mẫu tiến trình mới (Bản nháp)',
                        mode: 'SINGLE_MAJOR',
                        major: 'Kỹ thuật Phần mềm',
                        gatesCount: 1,
                        status: 'DRAFT',
                        version: '1.0-draft',
                        concurrencyToken: `token-${Date.now()}`,
                        gates: [
                          {
                            id: `gate-${Date.now()}-1`,
                            code: 'R1',
                            title: 'Đợt 1: Đề cương & Đặc tả (Bản nháp)',
                            objective: 'Thẩm định đề cương chi tiết và yêu cầu chức năng.',
                            required: true,
                            blockNextGate: true,
                            start: '2026-11-01',
                            end: '2026-11-15',
                            reviewerPolicy: 'Assigned Reviewer',
                            reviewScope: 'COMMON',
                            requirements: [],
                          },
                        ],
                      }
                      setTemplates(prev => [newDraft, ...prev])
                      setSelectedTemplateId(newDraft.id)
                      setActiveTab('builder')
                      setNotice('Đã tạo bản nháp tiến trình mới. Vui lòng thiết lập cấu trúc Gates và lưu bản nháp.')
                    }}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-primary-hover cursor-pointer"
                  >
                    ＋ Tạo Mẫu Tiến trình Mới
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Tên Mẫu Tiến trình</th>
                        <th className="py-3 px-4">Chế độ / Ngành</th>
                        <th className="py-3 px-3 text-center">Số Gate</th>
                        <th className="py-3 px-3 text-center">Phiên bản</th>
                        <th className="py-3 px-3 text-center">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {templates.map(tmpl => (
                        <tr key={tmpl.id} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4">
                            <strong className="block font-bold text-slate-900">{tmpl.name}</strong>
                            <span className="text-xs text-slate-400 font-mono">{tmpl.code}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="block font-semibold text-slate-800">
                              {tmpl.mode === 'SINGLE_MAJOR' ? 'Đơn ngành' : 'Liên ngành'}
                            </span>
                            <span className="text-xs text-slate-500">{tmpl.major}</span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold">{tmpl.gatesCount}</td>
                          <td className="py-3.5 px-3 text-center font-mono">v{tmpl.version}</td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                                tmpl.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {tmpl.status === 'PUBLISHED' ? 'ĐÃ CÔNG BỐ' : 'BẢN NHÁP'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {tmpl.status === 'PUBLISHED' && (
                              <button
                                type="button"
                                onClick={() => handleCloneTemplate(tmpl)}
                                className="rounded-md border border-slate-200 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100"
                                title="Nhân bản tạo phiên bản nháp mới"
                              >
                                Nhân bản
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTemplateId(tmpl.id)
                                setActiveTab('builder')
                              }}
                              className="rounded-md border border-slate-200 px-3 py-1 font-semibold text-primary hover:bg-slate-100"
                            >
                              Thiết kế Gate ↗
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUILDER */}
          {activeTab === 'builder' && currentTemplate && (
            <ReviewGateBuilder
              template={currentTemplate}
              onChange={handleTemplateChange}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              onClone={handleCloneTemplate}
              busy={busy}
            />
          )}

          {/* TAB 3: MATRIX */}
          {activeTab === 'matrix' && (
            <ProjectProgressMatrix
              projects={matrixProjects}
              onUpdateDecision={handleUpdateDecision}
              onSelectProject={(id) => setSelectedProjectId(id)}
              onSelectHybridProject={(id) => {
                setSelectedProjectId(id)
                setActiveTab('hybrid')
              }}
            />
          )}

          {/* TAB 4: HYBRID */}
          {activeTab === 'hybrid' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2">
                  <label htmlFor="hybrid-project-select" className="text-xs font-bold text-slate-700">
                    Đồ án liên ngành:
                  </label>
                  <select
                    id="hybrid-project-select"
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    {matrixProjects
                      .filter(p => p.mode === 'INTERDISCIPLINARY' || p.hybridScopes)
                      .map(p => (
                        <option key={p.projectId} value={p.projectId}>
                          {p.projectId} — {p.projectName}
                        </option>
                      ))}
                  </select>
                </div>
                <span className="text-xs text-slate-500">
                  {matrixProjects.filter(p => p.mode === 'INTERDISCIPLINARY' || p.hybridScopes).length} đồ án liên ngành
                </span>
              </div>

              <InterdisciplinaryGatePanel
                projectId={selectedProjectId}
                hybridScopes={matrixProjects.find(p => p.projectId === selectedProjectId)?.hybridScopes}
                onUpdateScopeDecision={handleUpdateHybridScopeDecision}
              />
            </div>
          )}

          {/* TAB 5: DEFENSE READINESS */}
          {activeTab === 'defense' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2">
                  <label htmlFor="defense-project-select" className="text-xs font-bold text-slate-700">
                    Chọn đồ án thẩm định điều kiện bảo vệ:
                  </label>
                  <select
                    id="defense-project-select"
                    value={selectedProjectId}
                    onChange={e => {
                      const newId = e.target.value
                      setSelectedProjectId(newId)
                      getDefenseReadiness(newId)
                        .then(res => setDefenseSummary(res))
                        .catch(() => setDefenseSummary(null))
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    {matrixProjects.map(p => (
                      <option key={p.projectId} value={p.projectId}>
                        {p.projectId} — {p.projectName} ({p.mode === 'INTERDISCIPLINARY' ? 'Liên ngành' : 'Đơn ngành'})
                      </option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-slate-500">
                  Mã dự án: <strong>{selectedProjectId}</strong>
                </span>
              </div>

              {defenseSummary ? (
                <DefenseReadinessChecker
                  summary={defenseSummary}
                  onRecheck={() => {
                    getDefenseReadiness(selectedProjectId)
                      .then(res => setDefenseSummary(res))
                      .catch(() => {})
                    setNotice('Đã kiểm tra lại điều kiện bảo vệ.')
                  }}
                />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  Chưa có dữ liệu điều kiện bảo vệ cho đồ án {selectedProjectId}.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </WorkspacePage>
  )
}

export default ReviewGateGovernancePage
