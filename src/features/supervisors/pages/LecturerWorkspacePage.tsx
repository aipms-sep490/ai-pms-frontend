import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpGet, httpPost } from '../../../services/http/http-client'
import { Button } from '../../../components/ui/Button'
import type { PagedResult, ProjectDto, SupervisorAssignmentDto, SupervisorRequestDto, TeamDto } from '../../../types/backend'
import { useAuthSession } from '../../auth/context/useAuthSession'

export function LecturerWorkspacePage() {
  const { session } = useAuthSession()
  const [assignments, setAssignments] = useState<SupervisorAssignmentDto[]>([])
  const [requests, setRequests] = useState<SupervisorRequestDto[]>([])
  const [projectTitles, setProjectTitles] = useState<Record<number, string>>({})
  const [projects, setProjects] = useState<Record<number, ProjectDto>>({})
  const [teams, setTeams] = useState<Record<number, TeamDto>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [respondingId, setRespondingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ownAssignments, inbox] = await Promise.all([
        httpGet<PagedResult<SupervisorAssignmentDto>>('/supervisors/assignments?page=1&pageSize=50'),
        httpGet<PagedResult<SupervisorRequestDto>>('/supervisors/requests?page=1&pageSize=50'),
      ])
      setAssignments(ownAssignments.items)
      setRequests(inbox.items)

      const allProjectIds = [
        ...new Set([
          ...ownAssignments.items.filter((item) => !item.endedAt).map((item) => item.projectId),
          ...inbox.items.map((item) => item.projectId),
        ]),
      ]

      const projectResults = await Promise.allSettled(allProjectIds.map((id) => httpGet<ProjectDto>(`/projects/${id}`)))
      const titles: Record<number, string> = {}
      const projMap: Record<number, ProjectDto> = {}
      const teamIdsToFetch: number[] = []

      projectResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const p = result.value
          titles[allProjectIds[index]] = p.title
          projMap[allProjectIds[index]] = p
          if (p.teamId && !teamIdsToFetch.includes(p.teamId)) {
            teamIdsToFetch.push(p.teamId)
          }
        }
      })
      setProjectTitles(titles)
      setProjects(projMap)

      // Fetch team details for all teams involved
      const teamResults = await Promise.allSettled(teamIdsToFetch.map((tId) => httpGet<TeamDto>(`/teams/${tId}`)))
      const teamMap: Record<number, TeamDto> = {}
      teamResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          teamMap[teamIdsToFetch[idx]] = result.value
        }
      })
      setTeams(teamMap)
    } catch {
      setError('Không thể tải phân công và lời mời từ backend. Hãy thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const respond = async (request: SupervisorRequestDto, decision: 'accept' | 'reject') => {
    if (!window.confirm(`Xác nhận ${decision === 'accept' ? 'nhận' : 'từ chối'} lời mời hướng dẫn project #${request.projectId}?`)) return
    setRespondingId(request.id)
    setError(null)
    try {
      await httpPost(`/supervisor-requests/${request.id}/${decision}`, { message: '' })
      await load()
    } catch {
      setError('Backend từ chối thao tác. Vui lòng tải lại inbox và kiểm tra trạng thái lời mời.')
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Không gian giảng viên</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Bàn làm việc GVHD</h1>
          <p className="mt-1 text-sm text-slate-600">{session?.user.fullName} · Phân công và lời mời hướng dẫn từ backend</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon="refresh" onClick={() => void load()} disabled={loading}>
            Tải lại dữ liệu
          </Button>
          <Link to="/profile" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline px-2 py-1">
            Hồ sơ tài khoản
          </Link>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
            Project được phân công
          </h2>
          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            {assignments.length} nhóm
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải…</p>
        ) : assignments.length ? (
          <ul className="space-y-3">
            {assignments.map((assignment) => (
              <li key={assignment.id} className="rounded-xl border border-slate-200 p-4 text-sm bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {projectTitles[assignment.projectId] || `Project #${assignment.projectId}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {assignment.isPrimary ? 'GVHD chính' : 'Đồng hướng dẫn'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${assignment.endedAt ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {assignment.endedAt ? 'Đã kết thúc' : 'Đang hướng dẫn'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Chưa có phân công hướng dẫn.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">mail</span>
            Lời mời hướng dẫn
          </h2>
          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            {requests.length} yêu cầu
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Đang tải…</p>
        ) : requests.length ? (
          <ul className="space-y-3">
            {requests.map((request) => {
              const proj = projects[request.projectId]
              const team = proj?.teamId ? teams[proj.teamId] : null

              return (
                <li key={request.id} className="rounded-xl border border-slate-200 p-4 text-sm bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-base">
                        {projectTitles[request.projectId] || `Project #${request.projectId}`}
                      </span>
                      {proj?.code && (
                        <span className="ml-2 font-mono text-xs text-slate-400">
                          ({proj.code})
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded font-mono text-xs font-semibold self-start sm:self-auto ${
                      request.status === 'ACCEPTED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : request.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {request.status}
                    </span>
                  </div>

                  {/* Team Members Roster */}
                  {team && (
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-blue-600">groups</span>
                          Nhóm sinh viên: {team.name} {team.code ? `• ${team.code}` : ''}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {team.members.length} thành viên
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {team.members.map((m) => (
                          <div key={m.userId} className="flex items-center gap-2 text-slate-700">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${m.isLeader ? 'bg-amber-500' : 'bg-blue-400'}`} />
                            <span className="font-semibold text-slate-900">{m.fullName}</span>
                            {m.isLeader && (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded-full font-bold">
                                Trưởng nhóm
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.requestMessage && (
                    <p className="mt-2 text-slate-600 bg-white border border-slate-200 rounded-lg p-2.5 text-xs">
                      <span className="font-semibold text-slate-700">Lời nhắn từ nhóm:</span> {request.requestMessage}
                    </p>
                  )}
                {request.status === 'PENDING' && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon="check"
                      disabled={respondingId !== null}
                      onClick={() => void respond(request, 'accept')}
                    >
                      Nhận hướng dẫn
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon="close"
                      disabled={respondingId !== null}
                      onClick={() => void respond(request, 'reject')}
                    >
                      Từ chối
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Chưa có lời mời hướng dẫn.</p>
        )}
      </section>
    </div>
  )
}
