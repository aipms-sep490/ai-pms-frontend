import { useEffect, useState } from 'react'
import type { GateStatus } from '../types/review-gates.types'
import { env } from '../../../app/config/env'

interface InterdisciplinaryGatePanelProps {
  projectId?: string
  hybridScopes?: Record<string, GateStatus>
  hybridScopeLabels?: Record<string, string>
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
    if (!projectId || !env.reviewGatesMockEnabled || busyScope) return
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
  const scopeName = (key: string) => hybridScopeLabels?.[key]?.trim() || scopeMeta[key]?.name || `Ngành ${key}`

  if (scopeKeys.length === 0) {
    return (
      <div className="rounded-xl border border-hairline bg-card p-8 text-center shadow-xs">
        <span className="material-symbols-outlined mx-auto text-4xl text-slate-300">hub</span>
        <h3 className="mt-3 text-sm font-bold text-ink">
          Chưa có phân nhánh chuyên môn liên ngành
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs text-ink-muted">
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
      <div className="rounded-xl border border-hairline bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Đồ án liên ngành · {projectId || 'Chưa chọn đồ án'}
            </span>
            <h2 className="text-lg font-bold text-ink">
              G2 · Integrated Concept & Architecture Gate
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold border ${
              allPassed
                ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                : 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
            }`}
          >
            {allPassed ? 'CÁC NHÁNH ĐÃ ĐẠT' : 'CHỜ THẨM ĐỊNH CÁC NGÀNH'}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Đồ án liên ngành được thẩm định độc lập theo từng phân ban chuyên môn trước khi xét duyệt Cổng tích hợp chung.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Scopes Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-hairline bg-card shadow-xs overflow-x-auto">
            <div className="border-b border-slate-100 p-4">
              <h3 className="text-sm font-bold text-ink">
                Thẩm định phân theo từng Chuyên ngành (Scope Review)
              </h3>
              <p className="text-xs text-ink-muted">
                Mỗi bộ môn tham gia chỉ thẩm định và ra quyết định trong phạm vi chuyên môn của mình.
              </p>
            </div>

            {scopeError && (
              <div role="alert" className="mx-4 mt-3 rounded-lg border border-status-error-border bg-status-error-bg p-2.5 text-xs text-danger-text">
                ✕ {scopeError}
              </div>
            )}

            <table className="w-full text-left text-xs">
              <thead className="bg-canvas font-semibold uppercase tracking-wider text-ink-muted border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Phạm vi chuyên ngành</th>
                  <th className="py-3 px-3 text-center">Bắt buộc</th>
                  <th className="py-3 px-4">Quyết định Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-ink-soft">
                {scopeKeys.map(scopeKey => {
                  const item = {
                    scope: scopeKey,
                    name: scopeName(scopeKey),
                    desc: scopeMeta[scopeKey]?.desc || 'Thẩm định yêu cầu chuyên ngành',
                  }
                  return (
                    <tr key={item.scope} className="hover:bg-canvas">
                      <td className="py-3.5 px-4">
                        <strong className="block font-semibold text-ink">{item.name}</strong>
                        <span className="text-xs text-ink-muted">{item.desc}</span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="rounded-full bg-status-success-bg px-2 py-0.5 text-xs font-bold text-status-success-text border border-status-success-border">
                          BẮT BUỘC
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          aria-label={`Trạng thái thẩm định · ${item.name}`}
                          disabled={!env.reviewGatesMockEnabled || busyScope !== null}
                          value={scopes[item.scope] || 'IN_REVIEW'}
                          onChange={e =>
                            handleScopeChange(
                              item.scope,
                              e.target.value as 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
                            )
                          }
                          className={`min-h-11 max-w-full rounded-lg border p-1.5 text-xs font-bold focus:ring-2 focus:ring-primary ${
                            scopes[item.scope] === 'PASSED'
                              ? 'border-status-success-border bg-status-success-bg text-status-success-text'
                              : scopes[item.scope] === 'REVISION_REQUIRED'
                              ? 'border-danger bg-status-error-bg/50 text-danger-text'
                              : 'border-status-info-border bg-status-info-bg text-status-info-text'
                          } ${busyScope === item.scope ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <option value="PASSED">Đã đạt</option>
                          <option value="REVISION_REQUIRED">Cần chỉnh sửa</option>
                          <option value="IN_REVIEW">Đang thẩm định</option>
                          <option value="PLANNED" disabled>Chưa bắt đầu</option>
                          <option value="LOCKED" disabled>Chưa mở</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-hairline bg-card p-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft mb-2">
              Liên kết phụ thuộc giữa các chuyên ngành (Cross-discipline Traceability)
            </h4>
            <div className="space-y-2 text-xs">
              {scopeKeys.map(s => (
                <div key={s} className="flex flex-wrap gap-2 items-center justify-between rounded-lg border border-slate-100 bg-canvas p-2.5">
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
                ? 'border-status-success-border bg-status-success-bg text-status-success-text'
                : 'border-status-warning-border bg-status-warning-bg/70 text-status-warning-text'
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

          <div className="rounded-xl border border-hairline bg-card p-4 text-xs text-ink-muted space-y-2 shadow-xs">
            <strong className="block font-bold text-ink">Phạm vi giám sát:</strong>
            <p className="leading-relaxed">
              Bảng này chỉ hiển thị tiến trình. Reviewer được phân công gửi quyết định tại hàng đợi thẩm định trong phạm vi được cấp.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
