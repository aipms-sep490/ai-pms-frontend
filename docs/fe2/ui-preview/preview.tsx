// Standalone review artifact: renders production components with isolated display fixtures.
import { useMemo, useState, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import '../../../src/index.css'
import './preview.css'
import { AuthSessionContext, type AuthSessionContextValue } from '../../../src/features/auth/context/auth-session-context'
import { AcademicWorkflowContext, type AcademicWorkflowContextValue } from '../../../src/app/context/academic-workflow-context'
import { EvaluatorWorkspacePage } from '../../../src/features/evaluations/pages/EvaluatorWorkspacePage'
import { EvaluatorAssignmentRoute } from '../../../src/features/evaluations/components/EvaluatorAssignmentRoute'
import { EvaluatorAssignmentDetailPage } from '../../../src/features/evaluations/pages/EvaluatorAssignmentDetailPage'
import { EvaluatorAssignmentManagementPage } from '../../../src/features/evaluations/EvaluatorAssignmentManagementPage'
import { StudentAppealPanel } from '../../../src/features/results/ResultCorrectionPanel'
import { AppealManagementPanel } from '../../../src/features/results/AppealManagementPanel'
import { AppealRequestDetail } from '../../../src/features/results/AppealRequestDetail'
import { ResultHistoryPanel } from '../../../src/features/results/ResultHistoryPanel'
import { ResultPublicationPage } from '../../../src/features/results/ResultPublicationPage'
import { IndustryLayout, IndustryWorkspaceRoute, IndustryAssignmentRoute } from '../../../src/features/auth/components/IndustryRoutes'
import { IndustryEnrollmentRoute } from '../../../src/features/auth/components/IndustryEnrollmentRoute'
import { QualificationPolicyPanel } from '../../../src/features/academic/components/QualificationPolicyPanel'
import { previewFetch, resetPreview, conflictNextWrite, setPreviewPublicationReady, unhandled } from './fixtures'

// No fallback to the network: a write here can never reach staging.
globalThis.fetch = previewFetch
const sheets = [
  { id: 'workspace', title: 'Danh sách chấm', actor: 'Giảng viên', path: '/evaluator/workspace', hint: 'Lọc trạng thái → bấm “Tiếp tục chấm” để mở bản điểm.' },
  { id: 'scoring', title: 'Chấm điểm & báo cáo', actor: 'Người chấm', path: '/evaluator/assignments/41', hint: 'Chọn báo cáo bên trái → sửa điểm / nhận xét bên phải → lưu nháp → yêu cầu chốt.' },
  { id: 'assignments', title: 'Phân công người chấm', actor: 'Khoa', path: '/department/projects/9/evaluators', hint: 'Chọn đợt → thành phần → giảng viên. Có thể thử phân công hoặc thu hồi trong dữ liệu mẫu.' },
  { id: 'publication', title: 'Công bố kết quả', actor: 'Khoa chủ trì', path: '/department/projects/9/result', hint: 'Xem bản điểm và điều kiện công bố. Dùng công tắc “Đủ điều kiện” để xem nút xác nhận trong kịch bản minh họa.' },
  { id: 'student', title: 'SV gửi phúc khảo', actor: 'Sinh viên', path: '/project/result', hint: 'Chọn đợt → thành phần → nhập lý do → gửi. Bấm yêu cầu để bổ sung tệp và theo dõi.' },
  { id: 'windows', title: 'Mở đợt & đính chính', actor: 'Khoa chủ trì', path: '/department/projects/9/corrections', hint: 'Đọc kết quả hiện tại → thêm đối tượng → chọn thời gian mở đợt. Bên dưới có form tạo đính chính của khoa.' },
  { id: 'assign-reviewer', title: 'Giao reviewer', actor: 'Khoa chủ trì', path: '/review/projects/9/corrections?request=7', hint: 'Nhập ID reviewer → bấm giao. Đây là phần chi tiết của một yêu cầu phúc khảo.' },
  { id: 'reviewer', title: 'Reviewer chấm lại', actor: 'Reviewer', path: '/review/projects/9/corrections?request=7', hint: 'Bấm “Đọc hồ sơ review đã khóa” → nhập điểm / lý do tiêu chí → chọn giữ nguyên hoặc đính chính → lưu đề nghị.' },
  { id: 'decision', title: 'Duyệt / từ chối', actor: 'Người quyết định', path: '/review/projects/9/corrections?request=7', hint: 'Nhập lý do → xem trước kết quả ảnh hưởng → chấp nhận hoặc từ chối → xem hộp xác nhận.' },
  { id: 'history', title: 'Lịch sử kết quả', actor: 'Sinh viên / khoa', path: '/project/result', hint: 'Bấm v1 hoặc v2 để xem đúng bản kết quả đã chọn và bảng cấu thành điểm.' },
  { id: 'industry', title: 'Cổng chuyên gia', actor: 'Chuyên gia doanh nghiệp', path: '/industry/workspace', hint: 'Bấm đồ án trong danh sách để xem chi tiết phân công tư vấn. Phần này chỉ đọc.' },
  { id: 'enroll', title: 'Liên kết mời', actor: 'Chuyên gia doanh nghiệp', path: '/industry/enroll', hint: 'Đây là trạng thái mở trang khi thiếu thư mời hợp lệ. Google thật cần thư mời và cấu hình provider.' },
  { id: 'qualification', title: 'Điều kiện chứng nhận', actor: 'Admin / nhân viên khoa', path: '/academic/project-periods/3/policy', hint: 'Đổi vai trò Admin / nhân viên khoa để thấy form được sửa hoặc chỉ đọc.' },
] as const
type SheetId = typeof sheets[number]['id']

class ScreenBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' }
  static getDerivedStateFromError(error: Error) { return { error: error.message } }
  render() { return this.state.error ? <section role="alert">Chưa mở được bản xem: {this.state.error}</section> : this.props.children }
}

export function WindowsPreview() {
  const [request, setRequest] = useState<number | null>(null)
  return <div className="space-y-5"><AppealManagementPanel projectId={9} onCreated={setRequest} />{request && <AppealRequestDetail projectId={9} requestId={request} />}</div>
}

export function PreviewScreen({ id, empty, staff }: { id: SheetId; empty: boolean; staff: boolean }) {
  const auth = useMemo<AuthSessionContextValue>(() => ({ session: { accessToken: 'local-preview-only', tokenType: 'Bearer', expiresAtUtc: '', refreshToken: '', refreshTokenExpiresAtUtc: '', user: { id: id === 'student' ? 88 : 3, fullName: id === 'industry' ? 'Chuyên gia minh họa' : 'Tài khoản minh họa', email: 'preview@example.invalid', roles: id === 'industry' ? [] : id === 'qualification' ? [staff ? 'DEPARTMENT_STAFF' : 'ADMIN'] : ['DEPARTMENT_STAFF'] } }, status: 'authenticated', error: null, login: async () => { throw new Error('Chỉ là bản xem giao diện') }, logout: () => {}, refreshProfile: async () => {}, restoreSession: async () => {} }), [id, staff])
  const academic = useMemo<AcademicWorkflowContextValue>(() => ({ currentUser: null, workflowContext: null, academic: { organization: null, departments: [{ id: 2, code: 'IT', name: 'Khoa CNTT', isActive: true }], majors: [], currentSemesters: [], selectedSemester: null, periods: [], hasActiveDepartmentScope: true, hasEligibleStudentProfile: true, issues: [] }, authorization: { roles: [], permissions: [], departmentIds: [], majorIds: [] }, refresh: async () => {}, status: 'ready', error: null, errorKind: null }), [])
  const router = useMemo(() => {
    resetPreview(id, empty)
    const views: Record<SheetId, ReactNode> = { workspace: <EvaluatorWorkspacePage />, scoring: <EvaluatorAssignmentDetailPage />, assignments: <EvaluatorAssignmentManagementPage />, publication: <ResultPublicationPage />, student: <StudentAppealPanel projectId={9} studentId={88} />, windows: <WindowsPreview />, 'assign-reviewer': <AppealRequestDetail projectId={9} requestId={7} />, reviewer: <AppealRequestDetail projectId={9} requestId={7} />, decision: <AppealRequestDetail projectId={9} requestId={7} />, history: <ResultHistoryPanel projectId={9} studentId={88} />, industry: <IndustryLayout />, enroll: <IndustryEnrollmentRoute />, qualification: <QualificationPolicyPanel periodId={3} /> }
    return createMemoryRouter([
      { path: '/evaluator/workspace', element: <EvaluatorWorkspacePage /> },
      { element: <EvaluatorAssignmentRoute />, children: [{ path: '/evaluator/assignments/:assignmentId', element: <EvaluatorAssignmentDetailPage /> }] },
      { path: '/industry', element: <IndustryLayout />, children: [{ path: 'workspace', element: <IndustryWorkspaceRoute /> }, { path: 'assignments/:assignmentId', element: <IndustryAssignmentRoute /> }] },
      { path: '/department/projects/:projectId/evaluators', element: <EvaluatorAssignmentManagementPage /> },
      { path: '/department/projects/:projectId/result', element: <ResultPublicationPage /> },
      { path: '/view', element: views[id] },
      { path: '*', element: <p>Liên kết này thuộc phần khác của app. Chọn một sheet ở bên trái để tiếp tục xem FE2.</p> },
    ], { initialEntries: [id === 'workspace' ? '/evaluator/workspace' : id === 'scoring' ? '/evaluator/assignments/41' : id === 'industry' ? '/industry/workspace' : id === 'assignments' ? '/department/projects/9/evaluators' : id === 'publication' ? '/department/projects/9/result' : '/view'] })
  }, [id, empty])
  return <AuthSessionContext.Provider value={auth}><AcademicWorkflowContext.Provider value={academic}><ScreenBoundary><RouterProvider router={router} /></ScreenBoundary></AcademicWorkflowContext.Provider></AuthSessionContext.Provider>
}

export function App() {
  const [id, setId] = useState<SheetId>('scoring'), [empty, setEmpty] = useState(false), [revision, setRevision] = useState(0), [staff, setStaff] = useState(false), [ready, setReady] = useState(false), [notice, setNotice] = useState('')
  const selected = sheets.find(sheet => sheet.id === id)!
  function select(next: SheetId) { setId(next); setEmpty(false); setReady(false); setNotice(''); setRevision(value => value + 1); window.scrollTo(0, 0) }
  return <div className="fe2-viewer"><header className="viewer-head"><div><b>FE2 · Xem giao diện</b><span>Component thật của app · dữ liệu mẫu · thao tác không gửi lên staging</span></div><button onClick={() => { setReady(false); setNotice(''); setRevision(value => value + 1) }}>Làm lại từ đầu ↺</button><a href="http://localhost:5173/login" target="_blank" rel="noreferrer">Mở app thật ↗</a></header><div className="viewer-layout"><nav className="viewer-nav" aria-label="Các màn hình FE2">{sheets.map((sheet, index) => <button key={sheet.id} className={id === sheet.id ? 'selected' : ''} aria-current={id === sheet.id ? 'page' : undefined} onClick={() => select(sheet.id)}><span>{String(index + 1).padStart(2, '0')}</span><div>{sheet.title}<small>{sheet.actor}</small></div></button>)}</nav><main className="viewer-main"><section className="viewer-instructions"><p>{selected.hint}</p><div className="viewer-tools"><span className="viewer-route">Trong app: <code>{selected.path.replace('/9/', '/:projectId/').replace('/41', '/:assignmentId').replace('/3/', '/:periodId/').replace('request=7', 'request=:requestId')}</code></span>{['workspace', 'scoring', 'student', 'windows', 'history', 'industry', 'assignments'].includes(id) && <label><input type="checkbox" checked={empty} onChange={event => { setEmpty(event.target.checked); setRevision(value => value + 1) }} />Thử khi chưa có dữ liệu</label>}{id === 'qualification' && <label>Đang xem với vai trò <select value={staff ? 'staff' : 'admin'} onChange={event => setStaff(event.target.value === 'staff')}><option value="admin">Admin</option><option value="staff">Nhân viên khoa</option></select></label>}{id === 'publication' && <label><input type="checkbox" checked={ready} onChange={event => { setReady(event.target.checked); setPreviewPublicationReady(event.target.checked); setNotice('Bấm “Tải lại kết quả” bên dưới để xem trạng thái vừa chọn. Đây là điều kiện minh họa.') }} />Đủ điều kiện (minh họa)</label>}{['scoring', 'student', 'windows', 'assign-reviewer', 'reviewer', 'decision'].includes(id) && <button onClick={() => { conflictNextWrite(); setNotice('Thao tác lưu / gửi kế tiếp sẽ báo dữ liệu đã thay đổi. Thử nhập nội dung rồi gửi để xem cách giao diện giữ nháp.') }}>Thử lỗi dữ liệu đã thay đổi</button>}</div>{notice && <p role="status" className="viewer-notice">{notice}</p>}</section><div className="viewer-screen" key={`${id}:${revision}:${staff}`}><PreviewScreen id={id} empty={empty} staff={staff} /></div></main></div></div>
}
resetPreview('scoring')
Object.defineProperty(window, '__fe2Preview', { value: { unhandled }, configurable: true })
createRoot(document.getElementById('root')!).render(<App />)
