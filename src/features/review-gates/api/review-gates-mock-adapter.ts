import type {
  AssignedReviewItem,
  DefenseReadinessSummary,
  GateDecisionRequest,
  ProjectReviewMatrixRow,
  ReviewGateTemplate,
  StudentReviewTimelineDto,
  SubmitGatePackageRequest,
  SubmitRevisionRequest,
  SupervisorFeedbackRequest,
  VerifyEvidenceRequest,
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

const initialStudentTimeline: StudentReviewTimelineDto = {
    projectId: 'IT-01',
    projectCode: 'IT-SEP490-01',
    projectName: 'Campus Support Platform',
    projectMode: 'SINGLE_MAJOR',
    major: 'Information Technology',
    effectivePolicyVersion: '1.0',
    currentGateCode: 'R2',
    academicProgress: 25,
    academicProgressSource: 'Hội đồng thẩm định Khoa CNTT (R1 Đạt)',
    isDefenseReady: false,
    defenseReadinessStatus: 'NOT_READY',
    disciplineProgress: [
      { scope: 'IT', name: 'Công nghệ thông tin', progress: 50, status: 'IN_REVIEW' },
    ],
    taskProgress: 68,
    capabilities: {
      canSubmitPackage: true,
      canSubmitRevision: true,
      blockingReasons: [],
    },
    gates: [
      {
        gateInstanceId: 'inst-r1',
        code: 'R1',
        title: 'Requirement & Analysis',
        objective: 'Xác nhận problem, yêu cầu người dùng và phạm vi giải pháp.',
        status: 'PASSED',
        reviewEligibility: 'READY',
        isRequired: true,
        windowStart: '2026-09-05',
        windowEnd: '2026-09-25',
        blockingReasons: [],
        requirements: [
          {
            id: 'req-r1-1',
            code: 'R1-PROPOSAL',
            title: 'Project Proposal',
            type: 'DOCUMENT',
            scope: 'COMMON',
            isMandatory: true,
            verificationStatus: 'ACCEPTED',
            latestArtifact: {
              version: 1,
              filename: 'Proposal_v1.pdf',
              submittedAt: '2026-09-20 14:00',
              submittedBy: 'Nguyen Van A (Leader)',
            },
          },
          {
            id: 'req-r1-2',
            code: 'R1-SRS',
            title: 'Software Requirement Specification (SRS)',
            type: 'DOCUMENT',
            scope: 'IT',
            isMandatory: true,
            verificationStatus: 'ACCEPTED',
            latestArtifact: {
              version: 1,
              filename: 'SRS_v1.0.pdf',
              submittedAt: '2026-09-22 10:30',
              submittedBy: 'Nguyen Van A (Leader)',
            },
          },
        ],
      },
      {
        gateInstanceId: 'inst-r2',
        code: 'R2',
        title: 'System Design & Prototype',
        objective: 'Review kiến trúc, thiết kế cơ sở dữ liệu, prototype có minh chứng tương tác.',
        status: 'REVISION_REQUIRED',
        reviewEligibility: 'READY',
        isRequired: true,
        windowStart: '2026-09-26',
        windowEnd: '2026-10-16',
        blockingReasons: [
          {
            code: 'MANDATORY_EVIDENCE_REJECTED',
            requirementCode: 'R2-SDD',
            message: 'Tài liệu Software Design Document (SDD) bị từ chối: Architecture diagram cần bổ sung component boundary.',
          },
        ],
        requirements: [
          {
            id: 'req-r2-1',
            code: 'R2-ERD',
            title: 'Architecture & Database ERD',
            type: 'EVIDENCE',
            scope: 'IT',
            isMandatory: true,
            verificationStatus: 'ACCEPTED',
            latestArtifact: {
              version: 1,
              filename: 'ERD_Architecture_v1.pdf',
              submittedAt: '2026-10-10 09:15',
              submittedBy: 'Nguyen Van A (Leader)',
            },
            reviewerFeedback: 'ERD chuẩn hóa tốt, đã ánh xạ đủ quan hệ nghiệp vụ.',
          },
          {
            id: 'req-r2-2',
            code: 'R2-SDD',
            title: 'Software Design Document (SDD)',
            type: 'DOCUMENT',
            scope: 'IT',
            isMandatory: true,
            verificationStatus: 'REJECTED',
            latestArtifact: {
              version: 2,
              filename: 'SDD_v2.pdf',
              submittedAt: '2026-10-14 16:30',
              submittedBy: 'Nguyen Van A (Leader)',
              notes: 'Bổ sung sequence diagram cho auth module.',
            },
            reviewerFeedback: 'Reviewer yêu cầu bổ sung Software Design Document và architecture boundary notes trước khi xét PASS.',
          },
          {
            id: 'req-r2-3',
            code: 'R2-PROTO',
            title: 'Figma Interactive Prototype',
            type: 'DEMO',
            scope: 'IT',
            isMandatory: false,
            verificationStatus: 'ACCEPTED',
            latestArtifact: {
              version: 1,
              filename: 'https://figma.com/proto/campus-support-v1',
              submittedAt: '2026-10-12 11:00',
              submittedBy: 'Tran Thi B (Member)',
            },
          },
        ],
      },
      {
        gateInstanceId: 'inst-r3',
        code: 'R3',
        title: 'Implementation & Testing',
        objective: 'Kiểm tra kết quả hiện thực hóa MVP và minh chứng kiểm thử tự động.',
        status: 'PLANNED',
        reviewEligibility: 'BLOCKED',
        isRequired: true,
        windowStart: '2026-10-17',
        windowEnd: '2026-11-11',
        blockingReasons: [
          {
            code: 'PREREQUISITE_GATE_NOT_PASSED',
            requirementCode: 'R2',
            message: 'Cần hoàn thành và đạt PASS tại Review 2 trước khi mở đợt thẩm định Review 3.',
          },
        ],
        requirements: [
          {
            id: 'req-r3-1',
            code: 'R3-MVP',
            title: 'Working MVP Source Code & PR',
            type: 'LINK',
            scope: 'IT',
            isMandatory: true,
            verificationStatus: 'PENDING',
          },
          {
            id: 'req-r3-2',
            code: 'R3-TEST',
            title: 'Test Coverage Report (>70%)',
            type: 'DOCUMENT',
            scope: 'IT',
            isMandatory: true,
            verificationStatus: 'PENDING',
          },
        ],
      },
      {
        gateInstanceId: 'inst-r4',
        code: 'R4',
        title: 'Final Readiness & Deployment',
        objective: 'Kiểm tra hồ sơ tổng kết, triển khai thực tế và điều kiện sẵn sàng bảo vệ.',
        status: 'PLANNED',
        reviewEligibility: 'BLOCKED',
        isRequired: true,
        windowStart: '2026-11-12',
        windowEnd: '2026-12-05',
        blockingReasons: [
          {
            code: 'PREREQUISITE_GATE_NOT_PASSED',
            requirementCode: 'R3',
            message: 'Chưa hoàn thành Review 3.',
          },
        ],
        requirements: [
          {
            id: 'req-r4-1',
            code: 'R4-REPORT',
            title: 'Final Capstone Report',
            type: 'DOCUMENT',
            scope: 'COMMON',
            isMandatory: true,
            verificationStatus: 'PENDING',
          },
          {
            id: 'req-r4-2',
            code: 'R4-DEPLOY',
            title: 'Production Staging Deployment URL',
            type: 'LINK',
            scope: 'IT',
            isMandatory: true,
            verificationStatus: 'PENDING',
          },
        ],
      },
    ],
  }

const initialAssignedReviews: AssignedReviewItem[] = [
    {
      id: 'rev-it-01-r2',
      projectId: 'IT-01',
      projectCode: 'IT-SEP490-01',
      projectName: 'Campus Support Platform',
      gateCode: 'R2',
      gateTitle: 'System Design & Prototype',
      scope: 'IT',
      dueAt: '2026-10-18 23:59',
      status: 'IN_REVIEW',
      latestDecision: 'REVISION_REQUIRED',
      reviewerNotes: 'Cần sửa SDD trước khi xét PASS. Architecture boundary chưa rõ.',
      concurrencyToken: 'token-rev-01',
      requirements: [
        {
          id: 'req-r2-1',
          code: 'R2-ERD',
          title: 'Architecture & Database ERD',
          type: 'EVIDENCE',
          scope: 'IT',
          isMandatory: true,
          verificationStatus: 'ACCEPTED',
          latestArtifact: {
            version: 1,
            filename: 'ERD_Architecture_v1.pdf',
            submittedAt: '2026-10-10 09:15',
            submittedBy: 'Nguyen Van A (Leader)',
          },
          reviewerFeedback: 'ERD chuẩn hóa tốt, đã ánh xạ đủ quan hệ nghiệp vụ.',
        },
        {
          id: 'req-r2-2',
          code: 'R2-SDD',
          title: 'Software Design Document (SDD)',
          type: 'DOCUMENT',
          scope: 'IT',
          isMandatory: true,
          verificationStatus: 'REJECTED',
          latestArtifact: {
            version: 2,
            filename: 'SDD_v2.pdf',
            submittedAt: '2026-10-14 16:30',
            submittedBy: 'Nguyen Van A (Leader)',
            notes: 'Bổ sung sequence diagram cho auth module.',
          },
          reviewerFeedback: 'Reviewer yêu cầu bổ sung Software Design Document và architecture boundary notes trước khi xét PASS.',
        },
        {
          id: 'req-r2-3',
          code: 'R2-PROTO',
          title: 'Figma Interactive Prototype',
          type: 'DEMO',
          scope: 'IT',
          isMandatory: false,
          verificationStatus: 'ACCEPTED',
          latestArtifact: {
            version: 1,
            filename: 'https://figma.com/proto/campus-support-v1',
            submittedAt: '2026-10-12 11:00',
            submittedBy: 'Tran Thi B (Member)',
          },
        },
      ],
    },
    {
      id: 'rev-it-02-r3',
      projectId: 'IT-02',
      projectCode: 'IT-SEP490-02',
      projectName: 'Smart Library System',
      gateCode: 'R3',
      gateTitle: 'Implementation & Testing',
      scope: 'IT',
      dueAt: '2026-11-01 23:59',
      status: 'PENDING_REVIEW',
      concurrencyToken: 'token-rev-02',
      requirements: [
        {
          id: 'req-it2-r3-1',
          code: 'R3-MVP',
          title: 'Smart Library Core MVP API',
          type: 'LINK',
          scope: 'IT',
          isMandatory: true,
          verificationStatus: 'SUBMITTED',
          latestArtifact: {
            version: 1,
            filename: 'https://github.com/aipms/smart-library/pull/42',
            submittedAt: '2026-10-16 14:20',
            submittedBy: 'Le Van C (Leader)',
            notes: 'Đã hoàn thành module mượn trả và xác thực thẻ RFID.',
          },
        },
      ],
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
      if (this.templates[idx].status === 'PUBLISHED') {
        const currentGatesStr = JSON.stringify(this.templates[idx].gates)
        const newGatesStr = JSON.stringify(template.gates)
        if (currentGatesStr !== newGatesStr) {
          throw new Error('403: Không thể sửa đổi cấu trúc đợt thẩm định của mẫu chính sách đã công bố (PUBLISHED). Hãy tạo bản nháp hoặc phiên bản mới.')
        }
      }
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

  async publishTemplate(id: string, concurrencyToken?: string): Promise<ReviewGateTemplate> {
    const item = this.templates.find(t => t.id === id)
    if (!item) throw new Error('Template not found')
    if (item.gates.length === 0) {
      throw new Error('422: Không thể công bố mẫu tiến trình khi chưa có Review Gate nào.')
    }
    if (concurrencyToken && item.concurrencyToken && item.concurrencyToken !== concurrencyToken) {
      throw new Error('409: Dữ liệu mẫu tiến trình đã được cập nhật bởi quản trị viên khác. Hãy tải lại trang.')
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

    // Sync to cached timeline if present
    const timeline = this.studentTimelines[projectId]
    if (timeline) {
      const gate = timeline.gates.find(g => g.code === gateCode)
      if (gate) {
        gate.status = newStatus
        if (newStatus === 'PASSED') {
          gate.blockingReasons = []
          gate.requirements.forEach(r => {
            if (r.isMandatory && r.verificationStatus !== 'ACCEPTED') {
              r.verificationStatus = 'ACCEPTED'
            }
          })
          // Advance next gate if applicable
          const nextGateIdx = timeline.gates.findIndex(g => g.code === gateCode) + 1
          if (nextGateIdx < timeline.gates.length && timeline.gates[nextGateIdx].status === 'PLANNED') {
            timeline.gates[nextGateIdx].reviewEligibility = 'READY'
            timeline.gates[nextGateIdx].blockingReasons = []
          }
        }
      }
    }

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

  private studentTimelines: Record<string, StudentReviewTimelineDto> = {
    'IT-01': JSON.parse(JSON.stringify(initialStudentTimeline)),
  }
  private assignedReviews: AssignedReviewItem[] = JSON.parse(JSON.stringify(initialAssignedReviews))

  private getOrCreateTimeline(projectId = 'IT-01'): StudentReviewTimelineDto {
    if (!this.studentTimelines[projectId]) {
      const project = this.matrix.find(p => p.projectId === projectId)
      const cloned: StudentReviewTimelineDto = JSON.parse(JSON.stringify(initialStudentTimeline))
      cloned.projectId = projectId
      if (project) {
        cloned.projectName = project.projectName
        cloned.projectCode = project.projectId
        cloned.projectMode = project.mode
        cloned.major = project.major
        cloned.taskProgress = project.taskProgress
        if (project.mode === 'INTERDISCIPLINARY') {
          cloned.disciplineProgress = [
            { scope: 'IT', name: 'Công nghệ thông tin', progress: 60, status: 'IN_REVIEW' },
            { scope: 'Marketing', name: 'Digital Marketing', progress: 50, status: 'IN_REVIEW' },
            { scope: 'Design', name: 'Thiết kế UX/UI', progress: 40, status: 'REVISION_REQUIRED' },
          ]
          cloned.academicProgress = 25
          cloned.academicProgressSource = 'Hội đồng liên ngành IT/MKT/Design (G1 Đạt)'
        }
        cloned.gates.forEach(g => {
          if (project.gateStatuses[g.code]) {
            g.status = project.gateStatuses[g.code]
          }
        })
      }
      this.studentTimelines[projectId] = cloned
    }
    return this.studentTimelines[projectId]
  }

  reset(): void {
    this.templates = JSON.parse(JSON.stringify(initialTemplates))
    this.matrix = JSON.parse(JSON.stringify(initialMatrix))
    this.studentTimelines = {
      'IT-01': JSON.parse(JSON.stringify(initialStudentTimeline)),
    }
    this.assignedReviews = JSON.parse(JSON.stringify(initialAssignedReviews))
  }

  async getStudentReviewTimeline(projectId = 'IT-01'): Promise<StudentReviewTimelineDto> {
    await new Promise(r => setTimeout(r, 60))
    const timeline = this.getOrCreateTimeline(projectId)
    return JSON.parse(JSON.stringify(timeline))
  }

  async submitRevision(req: SubmitRevisionRequest, isLeader: boolean): Promise<StudentReviewTimelineDto> {
    await new Promise(r => setTimeout(r, 80))
    if (!isLeader) {
      throw new Error('403: Không đủ thẩm quyền. Chỉ trưởng nhóm (Student Leader) mới có quyền nộp hồ sơ review hoặc bản sửa.')
    }
    if (!req.artifactName?.trim() || !req.notes?.trim()) {
      throw new Error('422: Minh chứng nộp và lý do chỉnh sửa không được để trống.')
    }

    const timeline = this.getOrCreateTimeline(req.projectId)
    const gate = timeline.gates.find(g => g.code === req.gateCode)
    if (!gate) throw new Error(`404: Không tìm thấy Gate ${req.gateCode}`)
    const reqItem = gate.requirements.find(r => r.id === req.requirementId)
    if (!reqItem) throw new Error(`404: Không tìm thấy requirement ${req.requirementId}`)

    const currentVer = reqItem.latestArtifact?.version ?? 0
    if (req.expectedVersion !== undefined && req.expectedVersion !== currentVer) {
      throw new Error(`409: Xung đột phiên bản minh chứng. Phiên bản dự kiến: ${req.expectedVersion}, phiên bản hiện tại trên hệ thống: ${currentVer}. Vui lòng tải lại dữ liệu mới nhất.`)
    }

    const nextVer = currentVer + 1
    reqItem.verificationStatus = 'SUBMITTED'
    reqItem.latestArtifact = {
      version: nextVer,
      filename: req.file?.name || req.linkUrl || req.artifactName,
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      submittedBy: 'Nguyen Van A (Leader)',
      notes: req.notes,
    }
    gate.status = 'IN_REVIEW'
    gate.blockingReasons = []

    const assigned = this.assignedReviews.find(a => a.projectId === req.projectId && a.gateCode === req.gateCode)
    if (assigned) {
      const aReq = assigned.requirements.find(r => r.id === req.requirementId)
      if (aReq) {
        aReq.verificationStatus = 'SUBMITTED'
        aReq.latestArtifact = reqItem.latestArtifact
      }
      assigned.status = 'IN_REVIEW'
      assigned.concurrencyToken = `token-${Date.now()}`
    }

    // Also sync to matrix row
    const mRow = this.matrix.find(p => p.projectId === req.projectId)
    if (mRow) {
      mRow.gateStatuses[req.gateCode] = 'IN_REVIEW'
    }

    return JSON.parse(JSON.stringify(timeline))
  }

  async submitGateForReview(req: SubmitGatePackageRequest): Promise<StudentReviewTimelineDto> {
    await new Promise(r => setTimeout(r, 60))
    const timeline = this.getOrCreateTimeline(req.projectId)
    const gate = timeline.gates.find(g => g.code === req.gateCode)
    if (!gate) throw new Error(`404: Không tìm thấy Gate ${req.gateCode}`)
    gate.status = 'IN_REVIEW'
    gate.blockingReasons = []
    const mRow = this.matrix.find(p => p.projectId === req.projectId)
    if (mRow) {
      mRow.gateStatuses[req.gateCode] = 'IN_REVIEW'
    }
    return JSON.parse(JSON.stringify(timeline))
  }

  async submitSupervisorFeedback(req: SupervisorFeedbackRequest): Promise<void> {
    await new Promise(r => setTimeout(r, 60))
    if (!req.feedback?.trim()) {
      throw new Error('422: Nội dung nhận xét hướng dẫn không được để trống.')
    }
    const timeline = this.getOrCreateTimeline(req.projectId)
    if (!timeline.supervisorFeedbacks) {
      timeline.supervisorFeedbacks = []
    }
    timeline.supervisorFeedbacks.push({
      gateCode: req.gateCode,
      feedback: req.feedback.trim(),
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      supervisorName: 'GVHD Chính',
    })
  }

  async getAssignedReviews(): Promise<AssignedReviewItem[]> {
    await new Promise(r => setTimeout(r, 60))
    return JSON.parse(JSON.stringify(this.assignedReviews))
  }

  get studentTimeline(): StudentReviewTimelineDto {
    return this.getOrCreateTimeline('IT-01')
  }

  async verifyEvidence(req: VerifyEvidenceRequest): Promise<AssignedReviewItem> {
    await new Promise(r => setTimeout(r, 80))
    const assigned = this.assignedReviews.find(a => a.id === req.assignmentId)
    if (!assigned) throw new Error(`404: Không tìm thấy phân công review ${req.assignmentId}`)

    if (assigned.concurrencyToken !== req.concurrencyToken) {
      throw new Error('409: Dữ liệu đã thay đổi bởi phiên làm việc khác. Vui lòng tải lại.')
    }

    const requirement = assigned.requirements.find(r => r.id === req.requirementId)
    if (!requirement) throw new Error(`404: Không tìm thấy requirement ${req.requirementId}`)

    requirement.verificationStatus = req.decision
    if (req.feedback) requirement.reviewerFeedback = req.feedback
    assigned.concurrencyToken = `token-${Date.now()}`

    const targetTimeline = this.getOrCreateTimeline(assigned.projectId)
    const gate = targetTimeline.gates.find(g => g.code === assigned.gateCode)
    if (gate) {
      const gReq = gate.requirements.find(r => r.id === req.requirementId)
      if (gReq) {
        gReq.verificationStatus = req.decision
        if (req.feedback) gReq.reviewerFeedback = req.feedback
      }
    }

    return JSON.parse(JSON.stringify(assigned))
  }

  async submitGateDecision(req: GateDecisionRequest): Promise<AssignedReviewItem> {
    await new Promise(r => setTimeout(r, 90))
    const assigned = this.assignedReviews.find(a => a.id === req.assignmentId)
    if (!assigned) throw new Error(`404: Không tìm thấy phân công review ${req.assignmentId}`)

    if (assigned.concurrencyToken !== req.concurrencyToken) {
      throw new Error('409: Dữ liệu đã thay đổi bởi phiên làm việc khác. Vui lòng tải lại.')
    }

    if (!req.notes?.trim()) {
      throw new Error('422: Bắt buộc ghi nhận xét thẩm định khi ra quyết định.')
    }

    if (req.decision === 'PASSED') {
      const unacceptedMandatory = assigned.requirements.filter(r => r.isMandatory && r.verificationStatus !== 'ACCEPTED')
      if (unacceptedMandatory.length > 0) {
        throw new Error(
          `422: Không thể xác nhận Gate PASS vì còn ${unacceptedMandatory.length} minh chứng bắt buộc chưa được ACCEPTED (${unacceptedMandatory.map(r => r.title).join(', ')}).`,
        )
      }
    }

    assigned.latestDecision = req.decision
    assigned.status = 'DECIDED'
    assigned.reviewerNotes = req.notes
    assigned.concurrencyToken = `token-${Date.now()}`

    const targetTimeline = this.getOrCreateTimeline(assigned.projectId)
    const gate = targetTimeline.gates.find(g => g.code === assigned.gateCode)
    if (gate) {
      gate.status = req.decision
      if (req.decision === 'PASSED') {
        const nextIdx = targetTimeline.gates.findIndex(g => g.code === assigned.gateCode) + 1
        if (nextIdx < targetTimeline.gates.length) {
          targetTimeline.gates[nextIdx].reviewEligibility = 'READY'
          targetTimeline.gates[nextIdx].blockingReasons = []
          targetTimeline.currentGateCode = targetTimeline.gates[nextIdx].code
        }
      } else {
        gate.blockingReasons = [
          {
            code: 'REVISION_REQUIRED_BY_REVIEWER',
            message: req.notes,
          },
        ]
      }
    }

    // Also update matrix row
    const project = this.matrix.find(p => p.projectId === assigned.projectId)
    if (project) {
      project.gateStatuses[assigned.gateCode] = req.decision
    }

    return JSON.parse(JSON.stringify(assigned))
  }
}

export const reviewGatesMockAdapter = new ReviewGatesMockAdapter()

