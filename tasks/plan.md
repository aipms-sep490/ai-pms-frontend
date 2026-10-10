# FE1 CIB v4 implementation

## Workstream mới: FE v5 integrated workflows (10/10/2026)

FE-only theo user. Baseline bc8cb98; phân tích, dependency và handoff tại docs/V5_INTEGRATED_WORKFLOW_ANALYSIS_2026-10-10.md. Giữ toàn bộ plan FE1 lịch sử bên dưới.

Thứ tự: kiểm tra contract → fixture state transitions COLD/weekly/leader → sandbox WorkspacePage sau dual flag → board thật chỉ đọc theo enum BE → typecheck/lint/test/build → Playwright responsive/keyboard → báo cáo fixture và BE pending riêng. Không gọi endpoint mock như API thật, không thêm dependency, không commit/push/merge.

Base: origin/develop 87555bab751e06dd8912dd7cea51a407b7810f4a. Scope is FE1 from the approved analysis at F:/AI-PMS/docs/AI-PMS_CIB_v4_IMPACT_FE2_BE_HANDOFF_2026-10-09.md. FE/BE/DB authority and existing UI are retained. No commit/push/PR/merge without authorization.

Implement thin slices: qualification upload with the existing multipart endpoint; atomic task disciplines supported by CreateTaskCommand; authoritative evidence major selector; safe own StudentResult reads. Reuse and verify eligibility, mentor/supervisor, concurrency, final submission and archive with existing tests. No task-list major query is invented: the current list endpoint has no discipline filter. Evidence uses the existing server major filter.

BR mapping: BR-20/22/23/40–58 for qualification/team; BR-70–74 for task disciplines/evidence; BR-100–102/140–142 for final submission; BR-59/143–145 for results. OPEN grading and gate policies remain pending. No synthetic live credentials or mutation against shared AI_PMS.

Risks: BE is not listening on 5080 at initial inspection; full real lifecycle needs isolated BE fixtures and FE2 scoring/publication. Published student DTO redacts snapshotJson; no breakdown is reconstructed. Preserve the dirty primary FE checkout.

Verification: failing behavior tests before each slice; focused regressions; typecheck/lint/build/diff; full Vitest JSON with inventory; Playwright API-mode intercepted contracts, screenshots, keyboard and responsive checks. Report fixture evidence separately from live acceptance. Tasks tracked in tasks/todo.md.

2026-10-09: User explicitly authorized verification, commit, push and safe merge into develop. Retain PR/CI/exact-head gates and no deployment or DB writes.
