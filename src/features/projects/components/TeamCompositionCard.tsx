import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { MultidisciplinaryTag } from '../../../components/ui/MultidisciplinaryTag'
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../../components/ui/Table'
import type { ProjectMember, ProjectDossier } from '../types/project-dossier.types'

interface TeamCompositionCardProps {
  members: ProjectMember[]
  breakdown: ProjectDossier['majorBreakdown']
}

export function TeamCompositionCard({ members, breakdown }: TeamCompositionCardProps) {
  return (
    <Card className="border-hairline bg-card shadow-xs">
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
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-card border border-hairline"
            >
              <MultidisciplinaryTag major={item.major} />
              <span className="text-ink-muted font-semibold">{item.percent}%</span>
              <span className="text-ink-muted">({item.count})</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table stack className="text-xs">
          <TableHead>
            <TableRow head>
              <TableHeaderCell>Thành viên</TableHeaderCell>
              <TableHeaderCell>Chuyên ngành</TableHeaderCell>
              <TableHeaderCell>Trách nhiệm chính</TableHeaderCell>
              <TableHeaderCell numeric>Đóng góp</TableHeaderCell>
              <TableHeaderCell>Liên hệ</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell label="Thành viên">
                  <div className="flex flex-col">
                    <span className="font-heading font-semibold text-ink">
                      {member.name}
                    </span>
                    <span className="font-mono text-xs text-ink-muted">
                      {member.studentId} • {member.role}
                    </span>
                  </div>
                </TableCell>
                <TableCell label="Chuyên ngành">
                  <MultidisciplinaryTag major={member.major} />
                </TableCell>
                <TableCell label="Trách nhiệm chính" className="leading-relaxed">
                  {member.responsibility}
                </TableCell>
                <TableCell label="Đóng góp" numeric>
                  <div className="inline-flex flex-col items-end">
                    <span className="font-bold">{member.storyPoints} SP</span>
                    <span className="text-ink-muted">({member.contributionPercent}%)</span>
                  </div>
                </TableCell>
                <TableCell label="Liên hệ" className="truncate max-w-[200px]">
                  {member.email}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
