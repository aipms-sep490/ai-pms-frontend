import type { ReactNode } from 'react'
import { useAcademicWorkflow } from './useAcademicWorkflow'

export function AcademicWorkflowGate({ children }: { children: ReactNode }) {
  const { workflowContext, status, error, errorKind, refresh } = useAcademicWorkflow()

  if (status === 'loading' && !workflowContext) {
    return <ContextMessage title="Đang tải bối cảnh học vụ…" detail="Đang đồng bộ phạm vi học vụ và quyền truy cập của bạn." />
  }

  if (status === 'forbidden') {
    return <ContextMessage title="Bạn không có quyền truy cập bối cảnh học vụ này." detail="Quyền và phạm vi bộ môn được máy chủ kiểm soát." />
  }

  if (status === 'unavailable') {
    const title = errorKind === 'authentication'
      ? 'Không thể xác thực phiên đăng nhập cho bối cảnh học vụ.'
      : 'Bối cảnh học vụ hiện chưa khả dụng.'
    return <ContextMessage title={title} detail={error?.message ?? 'Vui lòng thử lại.'} onRetry={refresh} />
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
