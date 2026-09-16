import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { HttpError } from '../../../services/http/http-client'
import { useProjectReview } from '../hooks/useProjectReview'
import './project-review.css'

const actionable = (status: string) => ['SUBMITTED', 'UNDER_REVIEW'].includes(status)

export function ProjectReviewPage() {
  const { id } = useParams()
  const review = useProjectReview(id ? Number(id) : undefined)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')

  if (review.isUnauthorized) return <p><Link to="/login">Đăng nhập</Link></p>
  if (review.loading) return <p className="p-8 text-center text-slate-500">Đang tải thẩm định đề án...</p>
  if (review.isForbidden) return <p className="p-8 text-center text-rose-600">Backend từ chối Department scope.</p>
  if (review.error) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center flex flex-col items-center gap-4">
        <p className="text-rose-600 text-sm font-semibold">
          {review.error instanceof HttpError && review.error.status === 409
            ? 'Project đã được reviewer khác cập nhật. Hãy refresh trước khi quyết định.'
            : 'Không thể tải dữ liệu Thẩm định Đề tài.'}
        </p>
        <Button onClick={() => void review.refresh()}>Refresh</Button>
      </div>
    )
  }

  // 1. Queue List View
  if (!id) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Hội đồng Thẩm định Đề cương Đồ án
          </h1>
          <p className="text-xs text-slate-500">
            Danh sách các đề tài đồ án tốt nghiệp do nhóm sinh viên đề xuất đang chờ Khoa phê duyệt.
          </p>
        </div>

        {review.queue.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">inbox</span>
            <p className="text-sm font-semibold text-slate-700">Hiện không có đề tài nào chờ thẩm định</p>
            <p className="text-xs text-slate-400 mt-1">Khi sinh viên nộp đề cương mới, đề tài sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {review.queue.map((project) => (
              <article
                key={project.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {project.code}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        project.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : project.status === 'UNDER_REVIEW'
                          ? 'bg-purple-100 text-purple-800'
                          : project.status === 'SUBMITTED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {project.status === 'APPROVED'
                        ? 'ĐÃ DUYỆT'
                        : project.status === 'UNDER_REVIEW'
                        ? 'ĐANG THẨM ĐỊNH'
                        : project.status === 'SUBMITTED'
                        ? 'CHỜ DUYỆT'
                        : project.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 truncate">
                    {project.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Nhóm: <span className="font-semibold text-slate-700">{project.teamName}</span> • Chuyên ngành:{' '}
                    <span className="font-semibold text-slate-700">
                      {project.majors.map((m) => m.majorCode).join(', ') || 'Chưa gán'}
                    </span>
                    {project.submittedAt && ` • Nộp lúc: ${new Date(project.submittedAt).toLocaleDateString('vi-VN')}`}
                  </p>
                </div>

                <Link
                  to={`/department/projects/review/${project.id}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                >
                  Mở Thẩm định
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 2. Detail View for a specific project
  const currentProject = review.queue.find((p) => p.id === Number(id))
  const projectInfo = review.projectInfo
  const latestHistory = review.history.length > 0 ? review.history[review.history.length - 1] : null
  const status = latestHistory?.newStatus ?? projectInfo?.status ?? currentProject?.status ?? ''

  const rawEvidence = review.detail?.latestSubmission?.evidence as
    | { members?: Array<{ userId?: number; fullName?: string; majorId?: number; isLeader?: boolean; majorCode?: string; isEligibleStudent?: boolean }> }
    | undefined
  const teamMembers = review.team?.members && review.team.members.length > 0 ? review.team.members : (rawEvidence?.members ?? [])

  const submit = async (kind: 'start-review' | 'revision' | 'approve' | 'reject') => {
    if ((kind === 'revision' || kind === 'reject') && !reason.trim()) {
      setMessage('Lý do là bắt buộc khi yêu cầu chỉnh sửa hoặc từ chối đề tài.')
      return
    }

    const label =
      kind === 'start-review'
        ? 'bắt đầu thẩm định'
        : kind === 'approve'
        ? 'PHÊ DUYỆT ĐỀ CƯƠNG'
        : kind === 'revision'
        ? 'yêu cầu chỉnh sửa'
        : 'từ chối'

    if (!confirm(`Xác nhận ${label} đề tài đồ án này?`)) return

    try {
      await review.action(kind, reason.trim() || undefined)
      setReason('')
      setMessage(
        kind === 'approve'
          ? 'Đã phê duyệt đề cương đề tài thành công!'
          : kind === 'revision'
          ? 'Đã gửi yêu cầu chỉnh sửa đề cương.'
          : kind === 'start-review'
          ? 'Đã bắt đầu thẩm định đề tài.'
          : 'Đã từ chối đề tài đồ án.'
      )
    } catch (error) {
      setMessage(
        error instanceof HttpError && error.status === 409
          ? 'Project đã thay đổi. Refresh trước khi quyết định lại.'
          : error instanceof HttpError && error.status === 403
          ? 'Backend từ chối quyền hoặc Department scope.'
          : error instanceof Error
          ? error.message
          : 'Backend từ chối thao tác.'
      )
    }
  }

  const projectTitle = projectInfo?.title || currentProject?.title || 'Chi tiết Đề cương Đồ án'
  const projectCode = projectInfo?.code || currentProject?.code || `Project #${id}`
  const teamName = projectInfo?.teamName || currentProject?.teamName || '—'
  const submittedDate = projectInfo?.submittedAt
    ? new Date(projectInfo.submittedAt).toLocaleString('vi-VN')
    : review.detail?.latestSubmission?.submittedAt
    ? new Date(review.detail.latestSubmission.submittedAt).toLocaleString('vi-VN')
    : 'Chưa có'

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/department/projects/review"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Quay lại danh sách chờ duyệt
        </Link>
      </div>

      {/* Project Overview Card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {projectCode}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : status === 'UNDER_REVIEW'
                    ? 'bg-purple-100 text-purple-800'
                    : status === 'SUBMITTED'
                    ? 'bg-amber-100 text-amber-800'
                    : status === 'REVISION_REQUIRED'
                    ? 'bg-orange-100 text-orange-800'
                    : status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {status === 'APPROVED'
                  ? 'ĐÃ DUYỆT (APPROVED)'
                  : status === 'UNDER_REVIEW'
                  ? 'ĐANG THẨM ĐỊNH (UNDER_REVIEW)'
                  : status === 'SUBMITTED'
                  ? 'CHỜ THẨM ĐỊNH (SUBMITTED)'
                  : status === 'REVISION_REQUIRED'
                  ? 'YÊU CẦU CHỈNH SỬA (REVISION_REQUIRED)'
                  : status === 'REJECTED'
                  ? 'BỊ TỪ CHỐI (REJECTED)'
                  : status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {projectTitle}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Nhóm sinh viên: <span className="font-semibold text-slate-700">{teamName}</span>
              {projectInfo?.createdByName && (
                <span> • Trưởng nhóm: <span className="font-semibold text-slate-700">{projectInfo.createdByName}</span></span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400">Hình thức đào tạo:</span>{' '}
            <span className="font-semibold text-slate-800">
              {review.detail?.academicScope?.mode === 'INTERDISCIPLINARY' ? 'Đồ án Liên ngành' : 'Đồ án Đơn ngành'}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Thời điểm nộp:</span>{' '}
            <span className="font-semibold text-slate-800">
              {submittedDate}
            </span>
          </div>
        </div>
      </section>

      {/* Proposed Team Members Roster Card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-blue-600">groups</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Thông tin Nhóm & Thành viên ({teamMembers.length} Thành viên)
            </h2>
          </div>
          {review.team?.code && (
            <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 self-start sm:self-auto">
              Mã nhóm: {review.team.code} • Trạng thái: {review.team.status}
            </span>
          )}
        </div>

        {teamMembers.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Chưa có dữ liệu danh sách thành viên nhóm từ backend.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Họ và Tên Sinh viên</th>
                  <th className="py-2.5 px-3">Vai trò</th>
                  <th className="py-2.5 px-3">Chuyên ngành</th>
                  <th className="py-2.5 px-3 text-right">Tình trạng hồ sơ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamMembers.map((m: any, idx: number) => {
                  const majorObj = (projectInfo?.majors || []).find((maj) => maj.majorId === m.majorId)
                  const majorDisplay = majorObj
                    ? `${majorObj.majorCode} - ${majorObj.majorName}`
                    : m.majorCode
                    ? `${m.majorCode}`
                    : m.majorId
                    ? `Chuyên ngành #${m.majorId}`
                    : 'Chưa phân ngành'

                  return (
                    <tr key={m.userId ?? idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              m.isLeader ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {m.fullName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{m.fullName || 'Chưa cập nhật tên'}</p>
                            {m.userId && (
                              <p className="text-[10px] text-slate-400 font-mono">User ID: #{m.userId}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {m.isLeader ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="material-symbols-outlined text-[13px]">star</span>
                            Trưởng nhóm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            Thành viên
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-700 bg-blue-50/60 px-2 py-0.5 rounded border border-blue-100">
                          {majorDisplay}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {m.isEligibleStudent !== false ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Đủ điều kiện
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                            <span className="material-symbols-outlined text-[14px]">cancel</span>
                            Chưa hợp lệ
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Rich Project Proposal Information Card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-blue-600">description</span>
          Nội dung Đề cương Đề tài do Nhóm đề xuất
        </h2>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mô tả tóm tắt đề tài:</h3>
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
            {projectInfo?.description || 'Chưa cập nhật mô tả đề tài.'}
          </div>
        </div>

        {/* Problem Statement */}
        {projectInfo?.problemStatement && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Đặt vấn đề & Bối cảnh:</h3>
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {projectInfo.problemStatement}
            </div>
          </div>
        )}

        {/* Objectives */}
        {projectInfo?.objectives && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Mục tiêu đề tài:</h3>
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {projectInfo.objectives}
            </div>
          </div>
        )}

        {/* Expected Output */}
        {projectInfo?.expectedOutput && (
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Sản phẩm & Kết quả bàn giao dự kiến:</h3>
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {projectInfo.expectedOutput}
            </div>
          </div>
        )}

        {/* Majors & Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Chuyên ngành liên quan:</span>
            <div className="flex flex-wrap gap-1.5">
              {(projectInfo?.majors || currentProject?.majors || []).map((m, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold"
                >
                  {m.majorCode} - {m.majorName}
                </span>
              ))}
              {(!projectInfo?.majors || projectInfo.majors.length === 0) &&
                (!currentProject?.majors || currentProject.majors.length === 0) && (
                  <span className="text-xs text-slate-400 italic">Chưa xác định</span>
                )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Công nghệ & Thẻ từ khóa:</span>
            <div className="flex flex-wrap gap-1.5">
              {(projectInfo?.tags || []).map((t, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    t.tagType === 'TECHNOLOGY'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : t.tagType === 'DOMAIN'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {t.name}
                </span>
              ))}
              {(!projectInfo?.tags || projectInfo.tags.length === 0) && (
                <span className="text-xs text-slate-400 italic">Chưa gắn thẻ</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* History Timeline */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          Lịch sử Xét duyệt & Chuyển trạng thái
        </h2>
        {review.history.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa có bản ghi lịch sử xét duyệt.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {review.history.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 text-xs p-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <span className="material-symbols-outlined text-[18px] text-blue-600 shrink-0 mt-0.5">
                  history
                </span>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">
                      {item.oldStatus ?? 'DRAFT'} →{' '}
                      <span className="text-blue-700 font-bold">{item.newStatus}</span>
                    </span>
                    <span className="text-slate-400">• Bởi: {item.changedByName}</span>
                    <span className="text-slate-400">• {new Date(item.changedAt).toLocaleString('vi-VN')}</span>
                  </div>
                  {item.reason && (
                    <p className="text-slate-600 mt-1 italic">Phản hồi: "{item.reason}"</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Decision Panel */}
      {status === 'APPROVED' ? (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800">
          <span className="material-symbols-outlined text-2xl text-emerald-600">check_circle</span>
          <div>
            <h3 className="font-bold text-sm">Đề cương đồ án đã được PHÊ DUYỆT</h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              Hội đồng Khoa đã phê duyệt thành công đề tài này. Nhóm sinh viên đã có thể tiến hành bước tiếp theo (ghép Giảng viên Hướng dẫn).
            </p>
          </div>
        </div>
      ) : actionable(status) ? (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Quyết định Thẩm định của Hội đồng Khoa
          </h2>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do bắt buộc khi revision/reject (hoặc nhận xét của Hội đồng)..."
            className="w-full min-h-[90px] p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex flex-wrap items-center gap-3">
            {status === 'SUBMITTED' && (
              <Button
                variant="secondary"
                onClick={() => void submit('start-review')}
              >
                Start review
              </Button>
            )}

            <Button
              variant="primary"
              onClick={() => void submit('approve')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Approve
            </Button>

            <Button
              variant="outline"
              onClick={() => void submit('revision')}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              Request revision
            </Button>

            <Button
              variant="outline"
              onClick={() => void submit('reject')}
              className="text-rose-700 border-rose-300 hover:bg-rose-50"
            >
              Reject
            </Button>
          </div>
        </section>
      ) : status === 'REVISION_REQUIRED' ? (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800">
          <span className="material-symbols-outlined text-2xl text-amber-500 shrink-0 mt-0.5">pending_actions</span>
          <div>
            <h3 className="font-bold text-sm">Đã yêu cầu Chỉnh sửa — Chờ sinh viên nộp lại</h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Hội đồng Khoa đã gửi yêu cầu chỉnh sửa về phía nhóm sinh viên. Khi nhóm nộp lại đề cương, trạng thái sẽ chuyển về <strong>SUBMITTED</strong> và có thể thẩm định tiếp.
            </p>
          </div>
        </div>
      ) : status === 'REJECTED' ? (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800">
          <span className="material-symbols-outlined text-2xl text-rose-500 shrink-0 mt-0.5">cancel</span>
          <div>
            <h3 className="font-bold text-sm">Đề cương đã bị Từ chối — Trạng thái cuối</h3>
            <p className="text-xs text-rose-700 mt-0.5">
              Hội đồng Khoa đã từ chối đề cương này. Nhóm sinh viên cần đăng ký đề tài mới nếu muốn tiếp tục.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
          Không có hành động thẩm định cho trạng thái {status || 'hiện tại'}.
        </div>
      )}

      {/* Message notification */}
      {message && (
        <div
          role="status"
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.includes('thành công') || message.includes('PHÊ DUYỆT')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {message.includes('thành công') || message.includes('PHÊ DUYỆT') ? 'check_circle' : 'info'}
          </span>
          {message}
        </div>
      )}
    </div>
  )
}

