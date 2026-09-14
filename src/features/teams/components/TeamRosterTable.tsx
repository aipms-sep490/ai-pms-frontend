import { useState } from 'react'
import type { TeamMemberDto } from '../../../types/backend'
import { MultidisciplinaryTag, type MajorType } from '../../../components/ui/MultidisciplinaryTag'

interface TeamRosterTableProps {
  members: TeamMemberDto[]
  currentUserId: number
  currentUserStudentCode?: string
  isLeader: boolean
  rosterLocked: boolean
  onRemoveMember: (userId: number) => Promise<void>
  onOpenTransferLeader: () => void
}

export function TeamRosterTable({
  members,
  currentUserId,
  currentUserStudentCode,
  isLeader,
  rosterLocked,
  onRemoveMember,
  onOpenTransferLeader,
}: TeamRosterTableProps) {
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [confirmKickId, setConfirmKickId] = useState<number | null>(null)

  const handleKick = async (userId: number) => {
    setRemovingId(userId)
    try {
      await onRemoveMember(userId)
    } finally {
      setRemovingId(null)
      setConfirmKickId(null)
    }
  }

  const resolveMajor = (majorId?: number | null): MajorType => {
    if (majorId === 101) return 'SE'
    if (majorId === 102) return 'AI'
    if (majorId === 103) return 'UI/UX'
    if (majorId === 104) return 'QA'
    if (majorId === 105) return 'IS'
    return 'SE'
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Danh sách Thành viên (Roster)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hiện có {members.length} thành viên • Quy định đồ án yêu cầu 4 đến 5 thành viên
          </p>
        </div>
        {isLeader && !rosterLocked && members.length > 1 && (
          <button
            type="button"
            onClick={onOpenTransferLeader}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
            Chuyển quyền Trưởng nhóm
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase font-semibold border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">Thành viên</th>
              <th className="py-3 px-4">
                Mã định danh
                <span className="ml-1 text-[10px] text-amber-600 font-normal lowercase">(BE_PARTIAL_GAP)</span>
              </th>
              <th className="py-3 px-4">Chuyên ngành</th>
              <th className="py-3 px-4">Vai trò</th>
              <th className="py-3 px-4">Tư cách đồ án</th>
              {isLeader && !rosterLocked && <th className="py-3 px-4 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId
              const identifier = isSelf && currentUserStudentCode ? currentUserStudentCode : `ID: #${member.userId}`

              return (
                <tr key={member.userId} className={`hover:bg-slate-50/50 ${isSelf ? 'bg-blue-50/20' : ''}`}>
                  <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                      {member.fullName.charAt(0)}
                    </div>
                    <div>
                      <span>{member.fullName}</span>
                      {isSelf && <span className="ml-1.5 text-[11px] text-blue-600 font-semibold">(Bạn)</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-700">
                    {identifier}
                  </td>
                  <td className="py-3 px-4">
                    <MultidisciplinaryTag major={resolveMajor(member.majorId)} />
                  </td>
                  <td className="py-3 px-4">
                    {member.isLeader ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="material-symbols-outlined text-[14px]">star</span>
                        Trưởng nhóm
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-slate-600 bg-slate-100">
                        Thành viên
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {member.isEligibleStudent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Đủ điều kiện
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-700 font-medium">
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        Chưa đủ điều kiện
                      </span>
                    )}
                  </td>
                  {isLeader && !rosterLocked && (
                    <td className="py-3 px-4 text-right">
                      {!member.isLeader && (
                        <div>
                          {confirmKickId === member.userId ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-xs text-rose-600 font-medium">Xác nhận xóa?</span>
                              <button
                                type="button"
                                onClick={() => handleKick(member.userId)}
                                disabled={removingId === member.userId}
                                className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                              >
                                {removingId === member.userId ? '...' : 'Xóa'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmKickId(null)}
                                className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs hover:bg-slate-200"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmKickId(member.userId)}
                              className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-semibold transition-colors"
                            >
                              Xóa khỏi nhóm
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-2.5 bg-slate-50/50 border-t border-slate-100 text-[11px] text-slate-400">
        Lưu ý: Backend TeamMemberDto chưa trả về trường MSSV/Tên ngành. Mã sinh viên hiện được liên kết theo tài khoản người dùng thực tế.
      </div>
    </div>
  )
}
