import { useEffect, useState } from 'react'
import type { GateStatus } from '../types/review-gates.types'

interface InterdisciplinaryGatePanelProps {
  projectId?: string
  hybridScopes?: Record<string, GateStatus>
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
  onUpdateScopeDecision,
}: InterdisciplinaryGatePanelProps) {
  const [scopes, setScopes] = useState<Record<string, GateStatus>>(hybridScopes || {})
  const [busyScope, setBusyScope] = useState<string | null>(null)
  const [scopeError, setScopeError] = useState<string | null>(null)

  useEffect(() => {
    if (hybridScopes) {
      setScopes(hybridScopes)
    } else {
      setScopes({})
    }
  }, [hybridScopes])

  async function handleScopeChange(scope: string, val: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW') {
    if (!projectId) return
    const prevVal = scopes[scope]
    setScopes(prev => ({ ...prev, [scope]: val }))
    setBusyScope(scope)
    setScopeError(null)
    try {
      await onUpdateScopeDecision(projectId, scope, val)
    } catch (err: unknown) {
      // Rollback on error
      setScopes(prev => ({ ...prev, [scope]: prevVal }))
      setScopeError(err instanceof Error ? err.message : 'Không thể cập nhật quyết định ngành.')
    } finally {
      setBusyScope(null)
    }
  }

  const scopeKeys = Object.keys(scopes)
  const allPassed = scopeKeys.length > 0 && Object.values(scopes).every(s => s === 'PASSED')
  const hasRevision = Object.values(scopes).some(s => s === 'REVISION_REQUIRED')

  if (scopeKeys.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <span className="material-symbols-outlined mx-auto text-4xl text-slate-300">hub</span>
        <h3 className="mt-3 text-sm font-bold text-slate-800">
          Chưa có phân nhánh chuyên môn liên ngành
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-500">
          {projectId
            ? `Đồ án ${projectId} chưa có cấu trúc phân nhánh liên ngành hoặc đang chờ Hội đồng thẩm định công bố snapshot các phân ban chuyên môn.`
            : 'Vui lòng chọn đồ án liên ngành để xem chi tiết các phân nhánh chuyên môn.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
            {allPassed ? 'ĐỦ ĐIỀU KIỆN PASS' : 'CHỜ THẨM ĐỊNH CÁC NGÀNH'}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Đồ án liên ngành được thẩm định độc lập theo từng phân ban chuyên môn trước khi xét duyệt Cổng tích hợp chung.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Scopes Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
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
                    name: scopeMeta[scopeKey]?.name || `Chuyên ngành ${scopeKey}`,
                    desc: scopeMeta[scopeKey]?.desc || `Thẩm định yêu cầu chuyên ngành ${scopeKey}`,
                  }
                  return (
                    <tr key={item.scope} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        <strong className="block font-semibold text-slate-900">{item.name}</strong>
                        <span className="text-xs text-slate-500">{item.desc}</span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                          BẮT BUỘC
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          disabled={busyScope === item.scope}
                          value={scopes[item.scope] || 'IN_REVIEW'}
                          onChange={e =>
                            handleScopeChange(
                              item.scope,
                              e.target.value as 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
                            )
                          }
                          className={`rounded-lg border p-1.5 text-xs font-bold focus:outline-none ${
                            scopes[item.scope] === 'PASSED'
                              ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800'
                              : scopes[item.scope] === 'REVISION_REQUIRED'
                              ? 'border-rose-300 bg-rose-50/50 text-rose-800'
                              : 'border-blue-300 bg-blue-50/50 text-blue-800'
                          } ${busyScope === item.scope ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <option value="PASSED">✓ ĐẠT (PASSED)</option>
                          <option value="REVISION_REQUIRED">⚠ CẦN SỬA (REVISION)</option>
                          <option value="IN_REVIEW">⏳ ĐANG XÉT (IN_REVIEW)</option>
                        </select>
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
                <div key={s} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                  <span><strong>{scopeMeta[s]?.name || s}</strong>: Yêu cầu chuẩn đầu ra chuyên ngành</span>
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
              Kết luận thẩm định liên ngành
            </span>
            <div className="mt-2 text-2xl font-black">
              {allPassed ? 'READY FOR PASS' : hasRevision ? 'REVISION REQUIRED' : 'BLOCKED'}
            </div>
            <p className="mt-2 text-xs leading-relaxed opacity-90">
              {allPassed
                ? 'Tất cả các ngành tham gia đều đã xác nhận PASSED. Khoa trưởng ngành có thể ký duyệt chính thức để chuyển sang Gate kế tiếp.'
                : 'Gate liên ngành KHÔNG THỂ PASS nếu bất kỳ ngành bắt buộc nào chưa đạt hoặc cần chỉnh sửa.'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-2 shadow-xs">
            <strong className="block font-bold text-slate-800">Thẩm quyền pháp lý:</strong>
            <p className="leading-relaxed">
              Khoa Trưởng ngành chỉ điều phối và chốt kết quả chung khi các ngành tham gia đã đồng thuận.
              Không một ngành nào được quyền tự ý duyệt thay thế kết luận chuyên môn của ngành khác.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
