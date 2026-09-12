import type { MajorType } from '../../../components/ui/MultidisciplinaryTag'
import type {
  ProjectDossier,
  ProjectMember,
  SupervisorInfo,
  ApprovalStage,
} from '../types/project-dossier.types'
import type {
  ProjectDto,
  ProjectStatusHistoryDto,
  TeamDto,
  SupervisorAssignmentDto,
} from '../../../types/backend'

export function normalizeMajorType(code?: string | null): MajorType {
  if (!code) return 'SE'
  const normalized = code.trim().toUpperCase()
  if (normalized === 'SE' || normalized === 'SOFTWARE ENGINEERING' || normalized === 'CS') return 'SE'
  if (normalized === 'UI/UX' || normalized === 'UIUX' || normalized === 'GD' || normalized === 'GRAPHIC DESIGN') return 'UI/UX'
  if (normalized === 'AI' || normalized === 'ARTIFICIAL INTELLIGENCE') return 'AI'
  if (normalized === 'QA' || normalized === 'TESTING') return 'QA'
  if (normalized === 'IS' || normalized === 'INFORMATION SYSTEMS' || normalized === 'IA') return 'IS'
  return 'SE'
}

export function mapProjectStatusToDossier(
  status?: string | null,
): { status: 'approved' | 'active' | 'pending'; statusLabel: string } {
  const normalized = (status ?? '').trim()

  switch (normalized) {
    case 'Approved':
      return { status: 'approved', statusLabel: 'Đã phê duyệt & Khởi động' }
    case 'Active':
      return { status: 'active', statusLabel: 'Đang thực hiện đồ án' }
    case 'FinalSubmission':
      return { status: 'active', statusLabel: 'Nghiệm thu & Nộp báo cáo' }
    case 'Completed':
      return { status: 'approved', statusLabel: 'Đã hoàn thành bảo vệ' }
    case 'Archived':
      return { status: 'approved', statusLabel: 'Đã lưu trữ' }
    case 'Draft':
      return { status: 'pending', statusLabel: 'Bản nháp đề tài' }
    case 'Submitted':
      return { status: 'pending', statusLabel: 'Đã nộp đề cương sơ bộ' }
    case 'UnderReview':
      return { status: 'pending', statusLabel: 'Đang thẩm định đề cương' }
    case 'RevisionRequired':
      return { status: 'pending', statusLabel: 'Yêu cầu chỉnh sửa đề cương' }
    case 'Rejected':
      return { status: 'pending', statusLabel: 'Đề tài bị từ chối' }
    case 'SupervisorPending':
      return { status: 'pending', statusLabel: 'Chờ GVHD tiếp nhận' }
    default:
      return { status: 'pending', statusLabel: normalized || 'Đang xử lý' }
  }
}

export function mapProjectDossier(
  project: ProjectDto,
  team?: TeamDto | null,
  supervisorAssignments?: SupervisorAssignmentDto[] | null,
  history?: ProjectStatusHistoryDto[] | null,
  options?: {
    semester?: string
    cdioScore?: number
    isSimulation?: boolean
  },
): ProjectDossier {
  const { status, statusLabel } = mapProjectStatusToDossier(project.status)

  // Map Members
  const rawMembers = team?.members ?? []

  const members: ProjectMember[] = rawMembers.map((m, index) => {
    const isLeader = m.isLeader
    return {
      id: `MEM-${String(m.userId).padStart(2, '0')}`,
      name: m.fullName,
      studentId: `ID #${m.userId}`,
      role: isLeader ? 'Trưởng nhóm' : 'Thành viên dự án',
      major: normalizeMajorType(project.majors?.[index % (project.majors?.length || 1)]?.majorCode),
      responsibility: isLeader ? 'Trưởng nhóm' : 'Thành viên dự án',
      storyPoints: 0,
      contributionPercent: 0,
      email: '',
    }
  })

  // Major Breakdown
  const majorCounts = new Map<MajorType, number>()
  if (members.length > 0) {
    for (const m of members) {
      majorCounts.set(m.major, (majorCounts.get(m.major) ?? 0) + 1)
    }
  } else if (project.majors && project.majors.length > 0) {
    for (const pm of project.majors) {
      const type = normalizeMajorType(pm.majorCode)
      majorCounts.set(type, (majorCounts.get(type) ?? 0) + 1)
    }
  } else {
    majorCounts.set('SE', 1)
  }

  const totalCount = Array.from(majorCounts.values()).reduce((a, b) => a + b, 0)
  const majorBreakdown = Array.from(majorCounts.entries()).map(([major, count]) => {
    const percent = Math.round((count / totalCount) * 100)
    const labelMap: Record<MajorType, string> = {
      SE: 'Kỹ thuật Phần mềm',
      'UI/UX': 'Thiết kế Mỹ thuật số',
      UIUX: 'Thiết kế Mỹ thuật số',
      AI: 'Trí tuệ Nhân tạo',
      QA: 'Đảm bảo Chất lượng & Kiểm thử',
      IS: 'Hệ thống Thông tin',
      ALL: 'Tất cả chuyên ngành',
    }
    return {
      major,
      label: labelMap[major] ?? major,
      percent,
      count,
    }
  })

  // Supervisors - only consider active assignments (isPrimary && !endedAt)
  const primaryAssignment = supervisorAssignments?.find((a) => a.isPrimary && !a.endedAt)
  const reviewerAssignment = supervisorAssignments?.find((a) => !a.isPrimary && !a.endedAt)

  const supervisor: SupervisorInfo = {
    name: primaryAssignment?.supervisorName ?? 'Chưa phân công GVHD',
    title: 'Giảng viên Hướng dẫn',
    department: 'Khoa Công nghệ Thông tin',
    email: '',
    hasDigitalSignature: Boolean(primaryAssignment),
    signatureDate: primaryAssignment?.assignedAt,
  }

  const reviewer: SupervisorInfo = {
    name: reviewerAssignment?.supervisorName ?? 'Chưa phân công phản biện',
    title: 'Giảng viên Phản biện',
    department: 'Khoa Công nghệ Thông tin',
    email: '',
    hasDigitalSignature: false,
  }

  // Timeline
  let timeline: ApprovalStage[] = []
  if (history && history.length > 0) {
    timeline = history.map((h, i) => {
      let stageStatus: 'completed' | 'current' | 'upcoming' = 'completed'
      if (i === history.length - 1) {
        stageStatus = project.status === 'Approved' || project.status === 'Active' ? 'completed' : 'current'
      }
      return {
        step: i + 1,
        title: `Chuyển trạng thái: ${h.newStatus}`,
        date: new Date(h.changedAt).toLocaleDateString('vi-VN'),
        status: stageStatus,
        decision: h.newStatus,
        reviewer: h.changedByName,
        note: h.reason ?? undefined,
      }
    })
  } else {
    // Default 4 standard stages fallback based on project status
    const isApprovedOrActive = project.status === 'Approved' || project.status === 'Active'
    timeline = [
      {
        step: 1,
        title: 'Đăng ký nhóm & Đề xuất đề tài',
        date: new Date(project.registeredAt || project.createdAt).toLocaleDateString('vi-VN'),
        status: 'completed',
        decision: 'Chấp thuận đề cương sơ bộ',
        reviewer: project.createdByName || 'Hệ thống AI-PMS',
        note: 'Đề tài đã hoàn tất đăng ký với đầy đủ thông tin.',
      },
      {
        step: 2,
        title: 'GVHD thẩm định & Đồng ý hướng dẫn',
        date: project.submittedAt ? new Date(project.submittedAt).toLocaleDateString('vi-VN') : 'Đang xử lý',
        status: isApprovedOrActive ? 'completed' : 'current',
        decision: isApprovedOrActive ? 'Đồng ý hướng dẫn' : 'Chờ thẩm định',
        reviewer: supervisor.name,
      },
      {
        step: 3,
        title: 'Hội đồng Bộ môn Phê duyệt đề tài',
        date: project.approvedAt ? new Date(project.approvedAt).toLocaleDateString('vi-VN') : 'Đang xử lý',
        status: isApprovedOrActive ? 'completed' : 'upcoming',
        decision: isApprovedOrActive ? 'Phê duyệt đề tài' : 'Chờ hội đồng',
        reviewer: 'Hội đồng Khoa CNTT',
      },
      {
        step: 4,
        title: 'Khởi động & Thực hiện Cột mốc',
        date: 'Theo kế hoạch',
        status: project.status === 'Active' ? 'current' : 'upcoming',
        decision: project.status === 'Active' ? 'Đang thực hiện' : 'Chưa kích hoạt',
        reviewer: 'GVHD & Nhóm SV',
      },
    ]
  }

  return {
    titleVi: project.title,
    titleEn: project.description ? `${project.title} (English Reference)` : project.title,
    projectCode: project.code,
    groupCode: team?.code || project.teamName || 'N/A',
    semester: options?.semester ?? 'Fall 2026',
    status,
    statusLabel,
    cdioScore: options?.cdioScore ?? 98,
    supervisor,
    reviewer,
    members,
    timeline,
    majorBreakdown,
    isSimulation: options?.isSimulation ?? true,
  }
}
