import type { ReactNode } from 'react'
import { useAcademicWorkflow } from './useAcademicWorkflow'
import { PageLoading } from '../../components/ui/PageLoading'

export function AcademicWorkflowGate({ children }: { children: ReactNode }) {
  const { workflowContext, status, errorKind, refresh } = useAcademicWorkflow()

  if ((status === 'idle' || status === 'loading') && !workflowContext) {
    return <PageLoading fullPage />
  }

  if (status === 'forbidden') {
    return <ContextMessage title="Bạn không có quyền truy cập." detail="Liên hệ bộ môn nếu bạn cần sử dụng chức năng này." />
  }

  if (status === 'unavailable') {
    const title = errorKind === 'authentication'
      ? 'Chưa xác minh được phiên đăng nhập.'
      : 'Chưa tải được thông tin tài khoản.'
    return <ContextMessage title={title} detail="Hãy thử lại để tiếp tục." onRetry={refresh} />
  }

  return <>{children}</>
}

function ContextMessage({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => Promise<void> }) {
  return (
    <main className="min-h-screen grid place-items-center bg-canvas p-6 text-center" aria-live="polite">
      <div className="max-w-md">
        <h1 className="text-base font-semibold text-slate-800">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{detail}</p>
        {onRetry ? (
          <button type="button" className="mt-4 text-blue-700 underline" onClick={() => void onRetry()}>
            Thử lại
          </button>
        ) : null}
      </div>
    </main>
  )
}
