import type {
  DefenseReadinessSummary,
  ProjectReviewMatrixRow,
  ReviewGateTemplate,
} from '../types/review-gates.types'

const initialTemplates: ReviewGateTemplate[] = [
  {
    id: 'tmpl-it-2026',
    code: 'IT-SEP-2026',
    name: 'IT Capstone – Review 1–4',
    mode: 'SINGLE_MAJOR',
    major: 'Information Technology',
    gatesCount: 4,
    status: 'DRAFT',
    version: '1.0',
    concurrencyToken: 'it-token-v1',
    gates: [
      {
        id: 'gate-r1',
        code: 'R1',
        title: 'Requirement & Analysis',
        objective: 'Xác nhận problem, yêu cầu nghiệp vụ và kế hoạch thực hiện đồ án',
        required: true,
        blockNextGate: true,
        start: '2026-09-05',
        end: '2026-09-25',
        reviewerPolicy: 'Assigned Supervisor / Reviewer',
        reviewScope: 'COMMON',
        requirements: [
          {
            id: 'req-r1-1',
            title: 'Project Proposal (Bản đề cương chi tiết)',
            type: 'DOCUMENT',
            scope: 'COMMON',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'req-r1-2',
            title: 'Software Requirement Specification (SRS v1.0)',
            type: 'DOCUMENT',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'req-r1-3',
            title: 'Project Plan / WBS & Sprint Schedule',
            type: 'EVIDENCE',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
        ],
      },
      {
        id: 'gate-r2',
        code: 'R2',
        title: 'System Design & Prototype',
        objective: 'Thẩm định kiến trúc hệ thống, thiết kế CSDL và prototype có minh chứng',
        required: true,
        blockNextGate: true,
        start: '2026-09-26',
        end: '2026-10-16',
        reviewerPolicy: 'Assigned IT Reviewer',
        reviewScope: 'MAJOR_SPECIFIC',
        requirements: [
          {
            id: 'req-r2-1',
            title: 'Software Design Document (SDD v1.0)',
            type: 'DOCUMENT',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'req-r2-2',
            title: 'Architecture & Database ERD Schema',
            type: 'EVIDENCE',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'req-r2-3',
            title: 'Demonstrable Interactive Prototype',
            type: 'DEMO',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
        ],
      },
      {
        id: 'gate-r3',
        code: 'R3',
        title: 'Implementation & Testing',
        objective: 'Kiểm tra tiến độ hiện thực hóa mã nguồn, chức năng cốt lõi và kiểm thử',
        required: true,
        blockNextGate: true,
        start: '2026-10-17',
        end: '2026-11-11',
        reviewerPolicy: 'Assigned IT Reviewer',
        reviewScope: 'MAJOR_SPECIFIC',
        requirements: [
          {
            id: 'req-r3-1',
            title: 'Working MVP Deployment / Demo',
            type: 'DEMO',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'req-r3-2',
            title: 'Source Code Repository / Pull Requests',
            type: 'LINK',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'req-r3-3',
            title: 'Automated & Manual Test Reports',
            type: 'DOCUMENT',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
        ],
      },
      {
        id: 'gate-r4',
        code: 'R4',
        title: 'Final Readiness',
        objective: 'Kiểm tra toàn bộ hồ sơ nghiệm thu và điều kiện sẵn sàng bảo vệ',
        required: true,
        blockNextGate: false,
        blocksDefense: true,
        start: '2026-11-12',
        end: '2026-12-05',
        reviewerPolicy: 'Supervisor + Authorized Reviewer',
        reviewScope: 'COMMON',
        requirements: [
          {
            id: 'req-r4-1',
            title: 'Final Capstone Report (Báo cáo tổng kết)',
            type: 'DOCUMENT',
            scope: 'COMMON',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'req-r4-2',
            title: 'Release & Deployment Evidence',
            type: 'EVIDENCE',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'req-r4-3',
            title: 'Xử lý các kiến nghị của Reviewer từ các đợt trước',
            type: 'PREVIOUS_GATE',
            scope: 'COMMON',
            verification: 'SYSTEM + HUMAN',
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: 'tmpl-mkt-2026',
    code: 'MKT-CAP-2026',
    name: 'Marketing – Progress Template',
    mode: 'SINGLE_MAJOR',
    major: 'Digital Marketing',
    gatesCount: 4,
    status: 'PROPOSED',
    version: '0.9',
    concurrencyToken: 'mkt-token-v1',
    gates: [
      {
        id: 'mkt-r1',
        code: 'R1',
        title: 'Market Research & Problem Statement',
        objective: 'Nghiên cứu thị trường và xác định phân khúc mục tiêu',
        required: true,
        blockNextGate: true,
        start: '2026-09-05',
        end: '2026-09-25',
        reviewerPolicy: 'Assigned Marketing Reviewer',
        reviewScope: 'COMMON',
        requirements: [
          {
            id: 'mkt-req-1',
            title: 'Market Research & Customer Insight Report',
            type: 'DOCUMENT',
            scope: 'Marketing',
            verification: 'HUMAN',
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: 'tmpl-hyb-2026',
    code: 'HYB-2026',
    name: 'Integrated Capstone – IT/MKT/Design',
    mode: 'INTERDISCIPLINARY',
    major: 'IT + Marketing + Design',
    gatesCount: 4,
    status: 'DRAFT',
    version: '1.0',
    concurrencyToken: 'hyb-token-v1',
    gates: [
      {
        id: 'hyb-g1',
        code: 'G1',
        title: 'Problem Validation & Multi-discipline Discovery',
        objective: 'Common problem statement + required major discovery evidence',
        required: true,
        blockNextGate: true,
        start: '2026-09-05',
        end: '2026-09-25',
        reviewerPolicy: 'Lead + Scoped Discipline Reviewers',
        reviewScope: 'COMMON',
        requirements: [
          {
            id: 'hyb-req-1-1',
            title: 'Shared Problem Statement & Value Proposition',
            type: 'DOCUMENT',
            scope: 'COMMON',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'hyb-req-1-2',
            title: 'IT Technical Needs & Feasibility',
            type: 'DOCUMENT',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'hyb-req-1-3',
            title: 'Marketing Customer Persona & Insights',
            type: 'EVIDENCE',
            scope: 'Marketing',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'hyb-req-1-4',
            title: 'Design User Research & Wireframes',
            type: 'EVIDENCE',
            scope: 'Design',
            verification: 'HUMAN',
            required: true,
          },
        ],
      },
      {
        id: 'hyb-g2',
        code: 'G2',
        title: 'Integrated Concept Gate',
        objective: 'Architecture, strategy and UX alignment across disciplines',
        required: true,
        blockNextGate: true,
        start: '2026-09-26',
        end: '2026-10-16',
        reviewerPolicy: 'Lead + Required Participating Department Reviewers',
        reviewScope: 'COMMON',
        requirements: [
          {
            id: 'hyb-req-2-1',
            title: 'Integration Concept & Cross-discipline Traceability',
            type: 'DOCUMENT',
            scope: 'COMMON',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'hyb-req-2-2',
            title: 'IT Architecture & REST API Spec',
            type: 'DOCUMENT',
            scope: 'IT',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'hyb-req-2-3',
            title: 'Marketing Go-to-Market Strategy',
            type: 'EVIDENCE',
            scope: 'Marketing',
            verification: 'HUMAN',
            required: true,
          },
          {
            id: 'hyb-req-2-4',
            title: 'Design Hi-Fi Interactive Prototype',
            type: 'DEMO',
            scope: 'Design',
            verification: 'HUMAN',
            required: true,
          },
        ],
      },
      {
        id: 'hyb-g3',
        code: 'G3',
        title: 'Integrated MVP & Multi-discipline Feasibility',
        objective: 'Technical, market and UX feasibility evidenced',
        required: true,
        blockNextGate: true,
        start: '2026-10-17',
        end: '2026-11-11',
        reviewerPolicy: 'Assigned Common & Discipline Reviewers',
        reviewScope: 'COMMON',
        requirements: [
          {
            id: 'hyb-req-3-1',
            title: 'Integrated Working Demo',
            type: 'DEMO',
            scope: 'COMMON',
            verification: 'HUMAN',
            required: true,
          },
        ],
      },
      {
        id: 'hyb-g4',
        code: 'G4',
        title: 'Final Readiness & Defense Clearance',
        objective: 'Integrated final package + all required major scopes accepted',
        required: true,
        blockNextGate: false,
        blocksDefense: true,
        start: '2026-11-12',
        end: '2026-12-05',
        reviewerPolicy: 'Authorized Lead Department Reviewer',
        reviewScope: 'COMMON',
        requirements: [
          {
            id: 'hyb-req-4-1',
            title: 'Integrated Final Documentation Package',
            type: 'DOCUMENT',
            scope: 'COMMON',
            verification: 'HUMAN',
            required: true,
          },
        ],
      },
    ],
  },
]

const initialMatrix: ProjectReviewMatrixRow[] = [
  {
    projectId: 'IT-01',
    projectName: 'Campus Support Platform',
    mode: 'SINGLE_MAJOR',
    major: 'Information Technology',
    dept: 'IT',
    taskProgress: 54,
    gateStatuses: {
      R1: 'PASSED',
      R2: 'REVISION_REQUIRED',
      R3: 'LOCKED',
      R4: 'LOCKED',
    },
    blockingReasons: {
      R2: [
        'Reviewer yêu cầu cập nhật sơ đồ kiến trúc SDD: chưa làm rõ cơ chế xác thực JWT và phân quyền RBAC.',
        'Thiếu minh chứng video demo tương tác cho Prototype POC.',
      ],
    },
  },
  {
    projectId: 'IT-02',
    projectName: 'Smart Library System',
    mode: 'SINGLE_MAJOR',
    major: 'Information Technology',
    dept: 'IT',
    taskProgress: 73,
    gateStatuses: {
      R1: 'PASSED',
      R2: 'PASSED',
      R3: 'IN_REVIEW',
      R4: 'LOCKED',
    },
  },
  {
    projectId: 'MKT-01',
    projectName: 'Digital Retail Campaign',
    mode: 'SINGLE_MAJOR',
    major: 'Digital Marketing',
    dept: 'Marketing',
    taskProgress: 62,
    gateStatuses: {
      R1: 'PASSED',
      R2: 'PASSED',
      R3: 'PLANNED',
      R4: 'LOCKED',
    },
  },
  {
    projectId: 'HYB-01',
    projectName: 'Integrated Customer Experience',
    mode: 'INTERDISCIPLINARY',
    major: 'IT + Marketing + Design',
    dept: 'IT',
    taskProgress: 59,
    gateStatuses: {
      G1: 'PASSED',
      G2: 'IN_REVIEW',
      G3: 'LOCKED',
      G4: 'LOCKED',
    },
    hybridScopes: {
      COMMON: 'PASSED',
      IT: 'PASSED',
      Marketing: 'PASSED',
      Design: 'REVISION_REQUIRED',
    },
    blockingReasons: {
      G2: [
        'Design Scope chưa đạt: Bản thiết kế UI chưa đồng bộ với API Contract của nhóm IT.',
      ],
    },
  },
]

class ReviewGatesMockAdapter {
  private templates: ReviewGateTemplate[] = JSON.parse(JSON.stringify(initialTemplates))
  private matrix: ProjectReviewMatrixRow[] = JSON.parse(JSON.stringify(initialMatrix))

  async getTemplates(): Promise<ReviewGateTemplate[]> {
    return JSON.parse(JSON.stringify(this.templates))
  }

  async getTemplateById(id: string): Promise<ReviewGateTemplate | null> {
    const item = this.templates.find(t => t.id === id)
    return item ? JSON.parse(JSON.stringify(item)) : null
  }

  async saveTemplate(template: ReviewGateTemplate): Promise<ReviewGateTemplate> {
    const idx = this.templates.findIndex(t => t.id === template.id)
    if (idx !== -1) {
      if (this.templates[idx].concurrencyToken !== template.concurrencyToken) {
        throw new Error('409: Dữ liệu mẫu tiến trình đã được cập nhật bởi quản trị viên khác. Hãy tải lại trang.')
      }
      const updated: ReviewGateTemplate = {
        ...template,
        concurrencyToken: `token-${Date.now()}`,
        gatesCount: template.gates.length,
      }
      this.templates[idx] = updated
      return JSON.parse(JSON.stringify(updated))
    }
    const created: ReviewGateTemplate = {
      ...template,
      id: template.id || `tmpl-${Date.now()}`,
      concurrencyToken: `token-${Date.now()}`,
      gatesCount: template.gates.length,
    }
    this.templates.push(created)
    return JSON.parse(JSON.stringify(created))
  }

  async publishTemplate(id: string): Promise<ReviewGateTemplate> {
    const item = this.templates.find(t => t.id === id)
    if (!item) throw new Error('Template not found')
    if (item.gates.length === 0) {
      throw new Error('422: Không thể công bố mẫu tiến trình khi chưa có Review Gate nào.')
    }
    item.status = 'PUBLISHED'
    item.version = (parseFloat(item.version) + 0.1).toFixed(1)
    item.concurrencyToken = `token-${Date.now()}`
    return JSON.parse(JSON.stringify(item))
  }

  async getMonitoringMatrix(filterMode?: string): Promise<ProjectReviewMatrixRow[]> {
    let rows = this.matrix
    if (filterMode && filterMode !== 'ALL') {
      rows = rows.filter(r => r.mode === filterMode)
    }
    return JSON.parse(JSON.stringify(rows))
  }

  async updateProjectGateDecision(
    projectId: string,
    gateCode: string,
    newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  ): Promise<ProjectReviewMatrixRow> {
    const project = this.matrix.find(p => p.projectId === projectId)
    if (!project) throw new Error('Project not found')
    project.gateStatuses[gateCode] = newStatus
    return JSON.parse(JSON.stringify(project))
  }

  async updateHybridScopeDecision(
    projectId: string,
    scope: string,
    newStatus: 'PASSED' | 'REVISION_REQUIRED' | 'IN_REVIEW',
  ): Promise<ProjectReviewMatrixRow> {
    const project = this.matrix.find(p => p.projectId === projectId)
    if (!project || !project.hybridScopes) throw new Error('Hybrid project not found')
    project.hybridScopes[scope] = newStatus
    
    // Check if all scopes are PASSED
    const allPassed = Object.values(project.hybridScopes).every(s => s === 'PASSED')
    if (allPassed) {
      project.gateStatuses['G2'] = 'PASSED'
      project.gateStatuses['G3'] = 'IN_REVIEW'
    } else if (Object.values(project.hybridScopes).some(s => s === 'REVISION_REQUIRED')) {
      project.gateStatuses['G2'] = 'REVISION_REQUIRED'
    }
    return JSON.parse(JSON.stringify(project))
  }

  async getDefenseReadiness(projectId: string): Promise<DefenseReadinessSummary> {
    const project = this.matrix.find(p => p.projectId === projectId) || this.matrix[1]
    const r1to4Passed = project.gateStatuses['R4'] === 'PASSED'
    const conditions = [
      {
        id: 'cond-1',
        title: 'Hoàn thành và ĐẠT (PASSED) tất cả các đợt Review Gate (R1–R4)',
        satisfied: r1to4Passed,
        detail: r1to4Passed
          ? 'Đã vượt qua tất cả các đợt thẩm định học thuật bắt buộc.'
          : 'Đợt thẩm định R3 đang chờ duyệt hoặc R4 chưa mở.',
        isMandatory: true,
      },
      {
        id: 'cond-2',
        title: 'Nộp đủ hồ sơ nghiệm thu cuối kỳ (Final Submission Checklist)',
        satisfied: false,
        detail: 'Chưa nộp mã nguồn bàn giao hoặc báo cáo toàn văn chính thức.',
        isMandatory: true,
      },
      {
        id: 'cond-3',
        title: 'Chữ ký xác nhận đồng ý cho bảo vệ của GVHD chính (Supervisor Sign-off)',
        satisfied: false,
        detail: 'Chưa có bản xác nhận chính thức từ Giảng viên hướng dẫn.',
        isMandatory: true,
      },
      {
        id: 'cond-4',
        title: 'Đóng băng chính sách học vụ kỳ đồ án (Policy Version Freeze)',
        satisfied: true,
        detail: 'Chính sách kỳ Fall 2026 đã được bộ môn phê duyệt và khóa sửa đổi.',
        isMandatory: true,
      },
      {
        id: 'cond-5',
        title: 'Điều kiện học vụ cá nhân từng sinh viên (Per-student Eligibility)',
        satisfied: null,
        detail: 'Chờ xét duyệt điều kiện tích lũy tín chỉ và học phần tiên quyết.',
        isMandatory: false,
      },
    ]

    const blockedCount = conditions.filter(c => c.isMandatory && c.satisfied === false).length
    return {
      projectId: project.projectId,
      projectName: project.projectName,
      isReady: blockedCount === 0,
      blockedCount,
      conditions,
    }
  }
}

export const reviewGatesMockAdapter = new ReviewGatesMockAdapter()
