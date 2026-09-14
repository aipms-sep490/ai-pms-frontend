import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { services } from '../../../services/service-gateway'
import { useStudentJourney } from '../../../app/context/useStudentJourney'

const TEST_ACCOUNTS = [
  {
    label: 'Ngô Thanh Mai (Chưa có nhóm - Test từ đầu)',
    email: 'maintde180906@fpt.edu.vn',
    password: 'Password@123',
    actualPassword: 'Aipms@123',
    major: 'Information Assurance (IA)',
    role: 'Student',
  },
  {
    label: 'Nguyễn Minh Khang (Trưởng nhóm SEP490_G01)',
    email: 'khangnmde180901@fpt.edu.vn',
    password: 'Password@123',
    actualPassword: 'Aipms@123',
    major: 'Software Engineering (SE)',
    role: 'Student Leader',
  },
  {
    label: 'Lê Hoàng Long (Sinh viên tự do)',
    email: 'longlhde180902@fpt.edu.vn',
    password: 'Password@123',
    actualPassword: 'Aipms@123',
    major: 'Software Engineering (SE)',
    role: 'Student',
  },
]

export function LoginPage() {
  const navigate = useNavigate()
  const journey = useStudentJourney()
  const [email, setEmail] = useState('maintde180906@fpt.edu.vn')
  const [password, setPassword] = useState('Aipms@123')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await services.auth.login({ email, password })
      await journey.refreshAll()
      navigate('/project/workspace')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const selectAccount = (acc: typeof TEST_ACCOUNTS[0]) => {
    setEmail(acc.email)
    setPassword(acc.actualPassword)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-3">
            <span className="material-symbols-outlined text-2xl text-white">school</span>
          </div>
          <h1 className="text-xl font-bold font-display">AI-PMS // FPT UNIVERSITY</h1>
          <p className="text-xs text-white/80 mt-1">Hệ thống Quản trị Vòng đời Đồ án Tốt nghiệp</p>
        </div>

        {/* Body */}
        <div className="p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Đăng nhập tài khoản Sinh viên</h2>
          <p className="text-xs text-slate-500 mb-6">Sử dụng tài khoản FPT Education để truy cập vào hệ thống</p>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500 text-base shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email sinh viên
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@fpt.edu.vn"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">login</span>
                  <span>Đăng nhập</span>
                </>
              )}
            </button>
          </form>

          {/* Quick accounts for E2E testing */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Tài khoản khảo sát E2E:
            </span>
            <div className="space-y-2">
              {TEST_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => selectAccount(acc)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    email === acc.email
                      ? 'bg-primary/5 border-primary text-primary font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold">{acc.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{acc.email} &bull; {acc.major}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
