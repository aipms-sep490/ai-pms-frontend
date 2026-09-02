import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { MultidisciplinaryTag } from '../../../components/ui/MultidisciplinaryTag'
import type { ProjectMember, ProjectDossier } from '../types/project-dossier.types'

interface TeamCompositionCardProps {
  members: ProjectMember[]
  breakdown: ProjectDossier['majorBreakdown']
}

export function TeamCompositionCard({ members, breakdown }: TeamCompositionCardProps) {
  return (
    <Card className="border-hairline bg-white shadow-xs">
      <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">
            diversity_3
          </span>
          <CardTitle className="text-sm font-heading">
            Cơ cấu Nhóm Đa ngành (5 Thành viên)
          </CardTitle>
        </div>

        {/* Multidisciplinary Breakdown Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {breakdown.map((item) => (
            <div
              key={item.major}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-50 border border-hairline"
            >
              <MultidisciplinaryTag major={item.major} />
              <span className="text-slate-600 font-semibold">{item.percent}%</span>
              <span className="text-slate-400">({item.count})</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-hairline font-mono text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 font-semibold">Thành viên</th>
                <th className="py-2.5 px-3 font-semibold">Chuyên ngành</th>
                <th className="py-2.5 px-4 font-semibold min-w-[200px]">Trách nhiệm chính</th>
                <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">Đóng góp</th>
                <th className="py-2.5 px-4 font-semibold">Liên hệ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-heading font-semibold text-slate-900">
                        {member.name}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {member.studentId} • {member.role}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <MultidisciplinaryTag major={member.major} />
                  </td>
                  <td className="py-3 px-4 text-slate-600 leading-relaxed">
                    {member.responsibility}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <div className="inline-flex flex-col items-center">
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {member.storyPoints} SP
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        ({member.contributionPercent}%)
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[200px]">
                    {member.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
