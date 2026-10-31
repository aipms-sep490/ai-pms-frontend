import { useEffect, useState } from 'react'
import type { GateStatus } from '../types/review-gates.types'
import { env } from '../../../app/config/env'
import { getProject } from '../../../services/api/projects.api'
import { HttpError } from '../../../services/http/http-client'
import { dateTimeLabel } from '../../execution/execution-utils'

interface InterdisciplinaryGatePanelProps {
  projectId?: string
  hybridScopes?: Record<string, GateStatus>
  hybridScopeLabels?: Record<string, string>
  hybridScopeDecisionDetails?: Record<string, { decidedByName?: string | null; decidedAt?: string | null }>
  hybridScopeCapabilities?: Record<string, boolean>
  onUpdateScopeDecision: (
    projectId: string,
    scope: string,
    newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  ) => Promise<void> | void
}

const scopeMeta: Record<string, { name: string; desc: string }> = {
  COMMON: {
    name: 'Tích hợp chung (Common Integration)',
    desc: 'Mục tiêu chung, bài toán liên ngành và ma trận liên kết yêu cầu',
  },
  IT: {
    name: 'Công nghệ thông tin (IT Architecture & API)',
    desc: 'Thiết kế hệ thống, sơ đồ CSDL và giao tiếp RESTful API',
  },
  Marketing: {
    name: 'Digital Marketing (Customer Research & GTM)',
    desc: 'Chân dung khách hàng, kế hoạch truyền thông và định vị sản phẩm',
  },
  Design: {
    name: 'Thiết kế UX/UI (User Journey & Prototype)',
    desc: 'Luồng trải nghiệm người dùng và nguyên mẫu tương tác Hi-Fi',
  },
}

export function InterdisciplinaryGatePanel({
  projectId,
  hybridScopes,
  hybridScopeLabels,
  hybridScopeDecisionDetails,
  hybridScopeCapabilities,
  onUpdateScopeDecision,
}: InterdisciplinaryGatePanelProps) {
  const [scopes, setScopes] = useState<Record<string, GateStatus>>(hybridScopes || {})
  const [busyScope, setBusyScope] = useState<string | null>(null)
  const [scopeError, setScopeError] = useState<string | null>(null)
  const [draftChoices, setDraftChoices] = useState<Record<string, 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW' | ''>>({})
  const [conflictedScope, setConflictedScope] = useState<string | null>(null)
  const [requiredScopes, setRequiredScopes] = useState<string[]>([])
  const [projectScopeLabels, setProjectScopeLabels] = useState<Record<string, string>>({})
  const [topologyState, setTopologyState] = useState<'loading' | 'ready' | 'unavailable'>('loading')

  useEffect(() => {
    if (hybridScopes) {
      setScopes(hybridScopes)
    } else {
      setScopes({})
    }
  }, [hybridScopes])

  useEffect(() => {
    setDraftChoices({}); setConflictedScope(null); setScopeError(null)
    if (!projectId) { setRequiredScopes([]); setTopologyState('unavailable'); return }
    if (env.reviewGatesMockEnabled) { setRequiredScopes([]); setTopologyState('ready'); return }
    if (!/^\d+$/.test(projectId)) { setRequiredScopes([]); setTopologyState('unavailable'); return }
    let active = true
    setTopologyState('loading')
    void getProject(Number(projectId)).then(project => {
      if (!active) return
      const majorKeys = project.majors.map(item => String(item.majorId))
      setRequiredScopes(['COMMON', ...majorKeys])
      setProjectScopeLabels(Object.fromEntries(project.majors.map(item => [String(item.majorId), item.majorName])))
      setTopologyState('ready')
    }).catch(() => { if (active) { setRequiredScopes([]); setTopologyState('unavailable') } })
    return () => { active = false }
  }, [projectId])

  async function handleScopeChange(scope: string) {
    const val = draftChoices[scope]
    if (!projectId || !val || busyScope || hybridScopeCapabilities?.[scope] === false) return
    setBusyScope(scope)
    setScopeError(null)
    try {
      await onUpdateScopeDecision(projectId, scope, val)
      setDraftChoices(current => { const next = { ...current }; delete next[scope]; return next })
      setConflictedScope(null)
    } catch (err: unknown) {
      if (err instanceof HttpError && err.status === 409) {
        setConflictedScope(scope)
        setScopeError('Quyết định phạm vi đã thay đổi hoặc thiếu token phiên bản. Lựa chọn của bạn vẫn được giữ; hãy đối chiếu trạng thái mới trước khi gửi lại.')
      } else if (err instanceof HttpError && err.status === 403) {
        setScopeError(`Máy chủ không cấp quyền quyết định phạm vi này${err.problem?.code ? ` (${err.problem.code})` : ''}. Lựa chọn của bạn vẫn được giữ.`)
      } else setScopeError('Không thể cập nhật quyết định phạm vi. Lựa chọn của bạn vẫn được giữ để thử lại.')
    } finally {
      setBusyScope(null)
    }
  }

  const effectiveRequiredScopes = env.reviewGatesMockEnabled ? Object.keys(scopes) : requiredScopes
  const scopeKeys = [...new Set([...effectiveRequiredScopes, ...Object.keys(scopes)])]
  const allPassed = topologyState === 'ready' && effectiveRequiredScopes.length > 0 && effectiveRequiredScopes.every(key => scopes[key] === 'PASSED')
  const hasRevision = scopeKeys.some(key => scopes[key] === 'REVISION_REQUIRED')
  const scopeName = (key: string) => hybridScopeLabels?.[key]?.trim() || projectScopeLabels[key] || scopeMeta[key]?.name || `Ngành ${key}`

  if (scopeKeys.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <span className="material-symbols-outlined mx-auto text-4xl text-slate-300">hub</span>
        <h3 className="mt-3 text-sm font-bold text-slate-800">
          Chưa có phân nhánh chuyên môn liên ngành
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-500">
          {topologyState === 'loading' ? 'Đang tải các ngành của đồ án từ hệ thống…' : topologyState === 'unavailable' && projectId
            ? 'Chưa tải được cấu trúc ngành của đồ án. Hãy thử lại; hệ thống chưa thể xác nhận đủ các phạm vi bắt buộc.' : projectId
            ? `Đồ án ${projectId} chưa có cấu trúc phân nhánh liên ngành hoặc đang chờ Hội đồng thẩm định công bố snapshot các phân ban chuyên môn.`
            : 'Vui lòng chọn đồ án liên ngành để xem chi tiết các phân nhánh chuyên môn.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {topologyState !== 'ready' && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{topologyState === 'loading' ? 'Đang đối chiếu đủ phạm vi từ dữ liệu dự án…' : 'Chưa xác nhận được đầy đủ phạm vi bắt buộc; trạng thái sẵn sàng không được suy đoán.'}</p>}
      {/* Header Context */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Đồ án liên ngành · {projectId || 'Chưa chọn đồ án'}
            </span>
            <h2 className="text-lg font-bold text-slate-800">
              G2 · Integrated Concept & Architecture Gate
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold border ${
              allPassed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {allPassed ? 'CÁC NHÁNH ĐÃ ĐẠT' : 'CHỜ THẨM ĐỊNH CÁC NGÀNH'}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Đồ án liên ngành được thẩm định độc lập theo từng phân ban chuyên môn trước khi xét duyệt Cổng tích hợp chung.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Scopes Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-x-auto">
            <div className="border-b border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800">
                Thẩm định phân theo từng Chuyên ngành (Scope Review)
              </h3>
              <p className="text-xs text-slate-500">
                Mỗi bộ môn tham gia chỉ thẩm định và ra quyết định trong phạm vi chuyên môn của mình.
              </p>
            </div>

            {scopeError && (
              <div role="alert" className="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                ✕ {scopeError}
              </div>
            )}

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Phạm vi chuyên ngành</th>
                  <th className="py-3 px-3 text-center">Bắt buộc</th>
                  <th className="py-3 px-4">Quyết định Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {scopeKeys.map(scopeKey => {
                  const item = {
                    scope: scopeKey,
                    name: scopeName(scopeKey),
                    desc: scopeMeta[scopeKey]?.desc || 'Thẩm định yêu cầu chuyên ngành',
                  }
                  return (
                    <tr key={item.scope} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        <strong className="block font-semibold text-slate-900">{item.name}</strong>
                        <span className="text-xs text-slate-500">{item.desc}</span>
                      </td>
                      <td className="py-3.5 px-3 text-center">{effectiveRequiredScopes.includes(item.scope) ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">BẮT BUỘC</span> : <span className="text-slate-500">Chưa xác nhận</span>}</td>
                      <td className="py-3.5 px-4">
                        <select
                          aria-label={`Trạng thái thẩm định · ${item.name}`}
                          disabled={busyScope !== null || hybridScopeCapabilities?.[item.scope] === false}
                          value={draftChoices[item.scope] ?? scopes[item.scope] ?? ''}
                          onChange={e => setDraftChoices(current => ({ ...current, [item.scope]: e.target.value as 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW' | '' }))}
                          className={`min-h-11 max-w-full rounded-lg border p-1.5 text-xs font-bold focus:ring-2 focus:ring-primary ${
                            scopes[item.scope] === 'PASSED'
                              ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800'
                              : scopes[item.scope] === 'REVISION_REQUIRED'
                              ? 'border-rose-300 bg-rose-50/50 text-rose-800'
                              : 'border-blue-300 bg-blue-50/50 text-blue-800'
                          } ${busyScope === item.scope ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <option value="">Chưa có quyết định</option>
                          <option value="PASSED">Đã đạt</option>
                          <option value="REVISION_REQUIRED">Cần chỉnh sửa</option>
                          <option value="IN_REVIEW">Đang thẩm định</option>
                          <option value="PLANNED" disabled>Chưa bắt đầu</option>
                          <option value="LOCKED" disabled>Chưa mở</option>
                        </select>
                        <button type="button" className="mt-2 min-h-11 rounded-lg border border-primary px-3 text-xs font-semibold text-primary disabled:opacity-50" disabled={busyScope !== null || hybridScopeCapabilities?.[item.scope] === false || !draftChoices[item.scope] || (draftChoices[item.scope] === scopes[item.scope] && conflictedScope !== item.scope)} onClick={() => void handleScopeChange(item.scope)}>{busyScope === item.scope ? 'Đang gửi…' : 'Ghi quyết định'}</button>
                        {hybridScopeCapabilities?.[item.scope] === false && <p className="mt-1 text-xs text-slate-500">Máy chủ không cấp quyền quyết định phạm vi này.</p>}
                        {hybridScopeDecisionDetails?.[item.scope] && <p className="mt-1 text-xs text-slate-500">{hybridScopeDecisionDetails[item.scope].decidedByName ?? 'Người quyết định chưa được cung cấp'}{hybridScopeDecisionDetails[item.scope].decidedAt ? ` · ${dateTimeLabel(hybridScopeDecisionDetails[item.scope].decidedAt)}` : ''}</p>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Liên kết phụ thuộc giữa các chuyên ngành (Cross-discipline Traceability)
            </h4>
            <div className="space-y-2 text-xs">
              {scopeKeys.map(s => (
                <div key={s} className="flex flex-wrap gap-2 items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <span><strong>{scopeName(s)}</strong>: Yêu cầu chuẩn đầu ra chuyên ngành</span>
                  <span className="text-slate-400">→ Điều kiện tiên quyết xét duyệt <strong>Cổng tích hợp chung</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Readiness Outcome Card */}
        <div className="lg:col-span-4 space-y-4">
          <div
            className={`rounded-xl border p-5 shadow-xs ${
              allPassed
                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                : 'border-amber-200 bg-amber-50/70 text-amber-950'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider">
              Theo dõi thẩm định liên ngành
            </span>
            <div className="mt-2 text-2xl font-black">
              {allPassed ? 'Các nhánh đã đạt' : hasRevision ? 'Có nhánh cần chỉnh sửa' : 'Chờ thẩm định'}
            </div>
            <p className="mt-2 text-xs leading-relaxed opacity-90">
              Trạng thái từng nhánh do hệ thống trả về. Kết luận cổng và điều kiện chuyển tiếp được xác định bởi hệ thống và reviewer được phân công.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-2 shadow-xs">
            <strong className="block font-bold text-slate-800">Phạm vi giám sát:</strong>
            <p className="leading-relaxed">
              Bảng này chỉ hiển thị tiến trình. Reviewer được phân công gửi quyết định tại hàng đợi thẩm định trong phạm vi được cấp.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
