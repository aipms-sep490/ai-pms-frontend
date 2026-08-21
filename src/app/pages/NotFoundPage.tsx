import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'

export function NotFoundPage() {
  return (
    <section className="empty-page flex flex-col items-center justify-center text-center py-16 px-4">
      <p className="eyebrow text-blue-600 font-mono text-xs font-bold uppercase tracking-widest">404 • Không tìm thấy trang</p>
      <h1 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-3">
        Đường dẫn không tồn tại
      </h1>
      <p className="text-slate-500 max-w-md mb-6 text-sm">
        Trang bạn đang truy cập chưa được đăng ký trong hệ thống AI-PMS hoặc đang trong quá trình phát triển.
      </p>
      <Link to="/project/workspace">
        <Button variant="primary" size="md" icon="arrow_back">
          Quay lại Bàn làm việc
        </Button>
      </Link>
    </section>
  )
}
