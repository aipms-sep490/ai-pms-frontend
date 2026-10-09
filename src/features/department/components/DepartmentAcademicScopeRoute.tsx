import { Link, Outlet } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { PageLoading } from '../../../components/ui/PageLoading'

/** Requires the server-derived active Department scope after identity routing. */
export function DepartmentAcademicScopeRoute() {
  const { academic, status, refresh } = useAcademicWorkflow()

  if (status === 'idle' || status === 'loading') return <PageLoading fullPage />
  if (status === 'unavailable') return <ScopeMessage title="Chưa xác minh được phạm vi bộ môn." detail="Hãy thử tải lại thông tin học vụ trước khi tiếp tục." onRetry={refresh} />
  if (status === 'forbidden' || !academic?.hasActiveDepartmentScope || academic.departments.length === 0) {
    return <ScopeMessage title="Phạm vi bộ môn không hợp lệ hoặc đã hết hiệu lực." detail="Bạn không có quyền truy cập khu vực quản lý học vụ này. Kiểm tra bộ môn được liên kết với hồ sơ tài khoản; nếu vừa được cập nhật, hãy tải lại." onRetry={refresh} />
  }

  return <Outlet />
}

function ScopeMessage({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => Promise<void> }) {
  return <section className="workspace-surface mx-auto my-8 max-w-xl p-6 text-center" role="alert"><h1 className="text-xl font-semibold text-slate-800">{title}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link className="ex-button" to="/profile">Xem hồ sơ tài khoản</Link>{onRetry ? <button type="button" className="ex-button" onClick={() => void onRetry()}>Thử lại</button> : null}</div></section>
}
