# AI-PMS — KẾ HOẠCH NÂNG CẤP ĐỒNG BỘ UI/UX (UIUX CHANGE PLAN)

**Phiên bản:** 1.0 — 31/10/2026  
**Định vị:** Academic Command Center (Navy `#0F2747` · Teal `#12B3A8` · Amber `#F6B94C` · Canvas `#F6F8FB`)  
**Mục tiêu:** Áp dụng toàn diện bộ nhận diện mới, nâng cao độ hoàn thiện visual, tương tác, accessibility và tính thống nhất cho toàn bộ hệ thống mà KHÔNG gây regression logic.

---

## CÁC BATCH TRIỂN KHAI

### Batch 1: App Shell, Design Tokens, Brand Assets & UI Primitives
- **Phạm vi:**
  - Nhập bộ token `--aipms-ui-*` từ `standards/aipms-ui-tokens.css` vào `src/index.css`.
  - Cập nhật palette `@theme` của Tailwind v4 đồng bộ với bảng màu Navy-Teal chuẩn (`#0F2747`, `#12B3A8`, `#DDF7F4`, `#F6B94C`, `#E35D6A`, `#F6F8FB`, `#D9E1EC`, `#162033`).
  - Đưa logo chính thức `ai-pms-logo.svg` và `ai-pms-app-icon.svg` vào Header & Sidebar; thay biểu tượng trường học tạm bằng logo biểu tượng P đường mốc tăng trưởng.
  - Chuẩn hóa các UI Primitives: `Button`, `Input`, `Select`, `Card`, `Badge`, `StatusBadge`, `Table`, `Modal`, `FilterChips`, `Pagination`.
  - Nâng cấp Sidebar (active state, group accordion, navy accent, hover micro-transitions) và TopHeader (breadcrumbs, academic context, notification popover).
- **Kiểm thử:** `pnpm typecheck`, `pnpm lint`, `pnpm test src/app/layouts`, `pnpm test src/components/ui`, `pnpm test src/test/design-tokens.test.ts`.

### Batch 2: Dashboards & Data Tables
- **Phạm vi:**
  - Nâng cấp `OverviewPage` (sinh viên), `SupervisorDashboardPage` (giảng viên), `PortfolioDashboardPage` (bộ môn & admin), `AdminWorkspacePage`.
  - Chuẩn hóa card KPI (thống nhất font số, nhãn, accent viền teal/amber, empty/loading states).
  - Tối ưu hóa bảng dữ liệu `Table.tsx` & các bảng danh sách: row hover, status pill, search toolbar, phân trang.
- **Kiểm thử:** `pnpm test src/features/dashboard`, `pnpm test src/features/users`, `pnpm test src/app/pages`.

### Batch 3: Team, Project & Academic Governance Forms
- **Phạm vi:**
  - `TeamManagementPage`: danh sách thành viên, trạng thái mời, huy hiệu chuyên ngành verified-major.
  - `TopicCataloguePage`, `RegistrationSourcePage`, `ProjectRegistrationFormPage`, `ProjectReviewStatusPage`: luồng đăng ký đề tài dạng step trực quan, cảnh báo validation rõ ràng.
  - `AcademicStructurePage`, `AcademicGovernancePage`, `PeriodPolicyManagementPage`, `RubricManagementPage`: các biểu mẫu học vụ chuyên nghiệp, phân cấp rõ ràng.
- **Kiểm thử:** `pnpm test src/features/teams`, `pnpm test src/features/projects/pages/ProjectRegistrationFormPage.test.tsx`, `pnpm test src/features/academic`, `pnpm test src/features/evaluations/RubricManagementPage.test.tsx`.

### Batch 4: Active Project Workspace, Kanban Task Board, Timeline & Gantt
- **Phạm vi:**
  - `ActiveProjectWorkspacePage`: header dự án chuẩn Academic Command Center, thanh trạng thái, KPI tổng hợp.
  - `TaskBoardPage`: Kanban board có chiều sâu thị giác (surface card trắng, border hairline, status tags, priority pill, avatar, deadline highlight khi trễ hạn, drag-drop feedback mượt mà).
  - `TaskDetailPage`: chi tiết task, checklist, phân công, liên kết minh chứng.
  - `MilestoneDetailPage` & `GanttPage`: progress rail đường mốc đồ án, lịch trình rõ ràng.
- **Kiểm thử:** `pnpm test src/features/tasks`, `pnpm test src/features/milestones`, `pnpm test src/features/progress`, `pnpm test src/features/projects/pages/CollaborationWorkspace.test.tsx`.

### Batch 5: Progress Reports, Meetings, Files, Evidence Ledger & Deliverables
- **Phạm vi:**
  - `ProgressReportsPage` & `ProgressReportDetailPage`: hiển thị chu kỳ báo cáo, form nộp sạch đẹp, phản hồi GVHD.
  - `MeetingsPage`, `CreateMeetingPage`, `MeetingDetailPage`: lịch họp, biên bản, action items, giao diện phòng họp video.
  - `DeliverablesPage`, `ProjectFilesPage`, `ProjectEvidenceLedgerPage`: kho file và sổ cái minh chứng, hiển thị version rõ ràng.
- **Kiểm thử:** `pnpm test src/features/reports`, `pnpm test src/features/meetings`, `pnpm test src/features/deliverables`, `pnpm test src/features/files`.

### Batch 6: Checkpoints, Review Gates & Evaluation Workspaces
- **Phạm vi:**
  - `StudentReviewTimelinePage`, `AssignedGateReviewPage`, `ReviewGateGovernancePage`: giao diện Review Gates đồng bộ với mockup `references/preview-reviews.png`.
  - Phân định rõ Câu hỏi (Questions) và Yêu cầu chỉnh sửa (Corrective Actions).
  - `EvaluatorWorkspacePage`, `EvaluatorAssignmentDetailPage`, `EvaluationSchemeManagementPage`, `ResultPublicationPage`, `ResultCorrectionsPage`: bảng chấm điểm Rubric, phân định rõ ràng các scope `COMMON` / `OWN_MAJOR` / `INDIVIDUAL`.
- **Kiểm thử:** `pnpm test src/features/review-gates`, `pnpm test src/features/evaluations`, `pnpm test src/features/results`.

### Batch 7: AI Insights, Analytics, Notifications, Onboarding & Mobile/A11y Polish
- **Phạm vi:**
  - `NotificationsPage`: phân loại thông báo, thời gian chuẩn Việt Nam.
  - `CalendarAttentionPage`: lịch tổng hợp và panel các việc cần chú ý khẩn cấp.
  - `ProjectAiPage` & `AcademicAssistantPage`: trợ lý AI nổi và trang trợ lý học vụ, phân biệt rõ khuyến nghị AI với quyết định chính thức.
  - Responsive audit ở 1440px, 1024px, 768px, 390px; kiểm tra contrast WCAG AA, keyboard navigation (Tab/Shift+Tab/Esc), prefers-reduced-motion.
- **Kiểm thử:** Toàn bộ test suite `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
