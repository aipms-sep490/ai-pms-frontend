import type { TopicItem } from '../../types/topic.types'

/**
 * Reference topics catalogue fixture.
 * Status: FE_MOCK_ONLY_BE_PENDING
 * Note: Backend has no TopicsController or Topics database table.
 * These are suggested reference ideas for students.
 */
export const REFERENCE_TOPICS: TopicItem[] = [
  {
    id: 'TOPIC_SE_01',
    code: 'SE-2026-01',
    titleVi: 'Hệ thống Quản trị Vòng đời Đồ án Tốt nghiệp Ứng dụng AI Hỗ trợ Phân rã Công việc WBS',
    titleEn: 'AI-Powered Capstone Project Lifecycle Management System with WBS Decomposition',
    domain: 'Software Engineering / EdTech',
    leadMajor: 'SE',
    participatingMajors: ['SE'],
    suggestedMajors: ['SE'],
    isInterdisciplinary: false,
    difficulty: 'ADVANCED',
    description:
      'Nghiên cứu và xây dựng nền tảng quản lý đồ án tốt nghiệp tích hợp AI Agent hỗ trợ sinh viên phân rã mục tiêu thành Work Breakdown Structure (WBS), tự động cảnh báo tiến độ và đánh giá năng lực theo chuẩn CDIO.',
    objectives:
      '1. Tối ưu hóa quy trình theo dõi tiến độ đồ án giữa Khoa - Giảng viên - Sinh viên.\n2. Tích hợp AI Agent gợi ý phân bổ task và ước lượng thời lượng sprint.\n3. Cung cấp bảng điều khiển trực quan hóa Gantt Chart và Kanban.',
    expectedOutput:
      'Hệ thống Web Platform hoàn chỉnh, tài liệu kiến trúc Clean Architecture, bộ kiểm thử tự động đạt độ bao phủ > 80%, mô hình đánh giá rủi ro trễ hạn.',
    technologies: ['.NET 9', 'React 19', 'TypeScript', 'Tailwind CSS', 'SQL Server', 'Gemini AI API'],
    suggestedSupervisor: 'TS. Nguyễn Văn A (Khoa CNTT)',
    status: 'AVAILABLE',
  },
  {
    id: 'TOPIC_SE_02',
    code: 'SE-2026-02',
    titleVi: 'Nền tảng Tự động hóa Kiểm thử Hiệu năng và Bảo mật cho Ứng dụng Microservices',
    titleEn: 'Automated Performance and Security Testing Platform for Microservices Applications',
    domain: 'DevOps & Quality Assurance',
    leadMajor: 'SE',
    participatingMajors: ['SE'],
    suggestedMajors: ['SE'],
    isInterdisciplinary: false,
    difficulty: 'COMPLEX',
    description:
      'Xây dựng công cụ CI/CD pipeline tự động tiêm kiểm thử tải (load testing) và quét lỗ hổng OWASP Top 10 trong môi trường Kubernetes staging.',
    objectives:
      '1. Giảm thời gian phát hiện lỗ hổng bảo mật trong chu kỳ release phần mềm.\n2. Tự động hóa báo cáo kiểm thử tải với phân tích tắc nghẽn tài nguyên.',
    expectedOutput:
      'Bộ công cụ CLI, Dashboard phân tích telemetry, tài liệu hướng dẫn tích hợp GitHub Actions.',
    technologies: ['Go', 'TypeScript', 'Docker', 'Kubernetes', 'Prometheus', 'Grafana'],
    suggestedSupervisor: 'ThS. Trần Thị B (Bộ môn KTPM)',
    status: 'AVAILABLE',
  },
  {
    id: 'TOPIC_SE_03',
    code: 'SE-2026-03',
    titleVi: 'Hệ thống Quản lý Chuỗi Cung ứng Dược phẩm Ứng dụng Blockchain Private và IoT Sensor',
    titleEn: 'Pharmaceutical Supply Chain Management System using Private Blockchain and IoT Sensors',
    domain: 'Healthcare Logistics',
    leadMajor: 'SE',
    participatingMajors: ['SE'],
    suggestedMajors: ['SE'],
    isInterdisciplinary: false,
    difficulty: 'COMPLEX',
    description:
      'Ứng dụng sổ cái phân tán Hyperledger Fabric để truy xuất nguồn gốc và giám sát điều kiện nhiệt độ/độ ẩm của vắc xin trong quá trình vận chuyển.',
    objectives:
      '1. Đảm bảo tính toàn vẹn dữ liệu chuỗi cung ứng lạnh.\n2. Cảnh báo thời gian thực khi nhiệt độ vượt ngưỡng cho phép.',
    expectedOutput:
      'Hệ thống Smart Contract, ứng dụng quản lý kho vận Web/Mobile, gateway thu thập telemetry từ cảm biến.',
    technologies: ['Hyperledger Fabric', 'Node.js', 'React', 'MQTT', 'PostgreSQL'],
    suggestedSupervisor: 'TS. Lê Hoàng C (Khoa CNTT)',
    status: 'AVAILABLE',
  },
  {
    id: 'TOPIC_AI_01',
    code: 'AI-2026-01',
    titleVi: 'Trợ lý Ảo Hỗ trợ Y tế Cơ sở Phân loại Triệu chứng và Tư vấn Ban đầu Sử dụng RAG',
    titleEn: 'Primary Healthcare AI Assistant for Symptom Triage using Retrieval-Augmented Generation',
    domain: 'Artificial Intelligence / Healthcare',
    leadMajor: 'AI',
    participatingMajors: ['AI'],
    suggestedMajors: ['AI'],
    isInterdisciplinary: false,
    difficulty: 'ADVANCED',
    description:
      'Xây dựng hệ thống hỏi đáp y tế dựa trên kỹ thuật RAG với cơ sở dữ liệu phác đồ điều trị chính thống của Bộ Y tế, cảnh báo dấu hiệu nguy hiểm và gợi ý hướng xử trí.',
    objectives:
      '1. Hỗ trợ người dân tiếp cận thông tin y tế chính xác, giảm tải cho trạm y tế tuyến đầu.\n2. Đánh giá độ tin cậy và kiểm soát ảo giác (hallucination) của LLM trong miền y tế.',
    expectedOutput:
      'Vector Database tích hợp phác đồ điều trị, Web App giao diện hội thoại y tế, báo cáo kiểm thử lâm sàng giả lập.',
    technologies: ['Python', 'FastAPI', 'Qdrant Vector DB', 'LangChain', 'React'],
    suggestedSupervisor: 'PGS.TS. Đỗ Hoàng D (Viện AI)',
    status: 'AVAILABLE',
  },
]
