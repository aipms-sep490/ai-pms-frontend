import { Outlet } from 'react-router-dom'
import { useAcademicWorkflow } from '../../../app/context/useAcademicWorkflow'
import { PageLoading } from '../../../components/ui/PageLoading'

/** Requires the server-derived active Department scope after identity routing. */
export function DepartmentAcademicScopeRoute() {
  const { academic, status, refresh } = useAcademicWorkflow()

  if (status === 'idle' || status === 'loading') return <PageLoading fullPage />
  if (status === 'unavailable') return <ScopeMessage title="Chưa xác minh được phạm vi bộ môn." detail="Hãy thử tải lại thông tin học vụ trước khi tiếp tục." onRetry={refresh} />
  if (status === 'forbidden' || !academic?.hasActiveDepartmentScope || academic.departments.length === 0) {
    return <ScopeMessage title="Phạm vi bộ môn không hợp lệ hoặc đã hết hiệu lực." detail="Bạn không có quyền truy cập khu vực quản lý học vụ này." />
  }

  return <Outlet />
}

function ScopeMessage({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => Promise<void> }) {
  return <main className="min-h-screen grid place-items-center bg-canvas p-6 text-center" role="alert"><div className="max-w-md"><h1 className="text-base font-semibold text-slate-800">{title}</h1><p className="mt-2 text-sm text-slate-600">{detail}</p>{onRetry ? <button type="button" className="mt-4 text-blue-700 underline" onClick={() => void onRetry()}>Thử lại</button> : null}</div></main>
}
