# FE v5 — kết quả triển khai local

## Trạng thái tổng thể: PARTIAL

Đã phân tích đủ 26 ticket và triển khai sandbox nghiệp vụ mới cùng board thật chỉ đọc. Chưa hoàn thành toàn bộ acceptance của 107 điểm backlog. Các yêu cầu mới chưa có BE contract được giữ ở prototype/đề xuất; không coi fixture là E2E thật. User chốt FE-only; nhánh BE không có thay đổi.

## Baseline và Git

- FE worktree: `F:/AI-PMS/ai-pms-frontend-workflow-v5`, branch `feat/FE-v5-integrated-workflows`, base `bc8cb98` từ remote develop sau pull --ff-only.
- BE develop: `09abf95`, pull --ff-only; branch sạch `feat/BE-v5-integrated-workflows` trong worktree riêng, không sửa source/DB.
- Primary FE develop vẫn ở `9612e3c`, behind remote 4 commit: `.env.example` dirty chặn Git pull. Không stash/reset/ghi đè thay đổi của user. Bản triển khai đã dùng đúng develop mới nhất trong worktree sạch.
- Không commit/push/PR/merge. Thay đổi local sẵn sàng review.

## Đã triển khai

1. Sandbox `/preview/workflows` trong AppLayout được bảo vệ, chỉ đăng ký route khi cả `VITE_DATA_MODE=mock` và `VITE_ENABLE_WORKFLOW_PREVIEW=true`; mặc định false. Không có adapter gọi URL mock hoặc API thật.
2. COLD reports: 7 vị trí, PDF/DOCX/ZIP, giới hạn fixture 10MiB, version counter + lịch sử metadata thay thế, draft→submitted→locked, mô phỏng hết deadline. PDF do user chọn dùng blob application/pdf và iframe sandbox; revoke URL khi thay thế/unmount.
3. COLD scoring: tiêu chí/trần từ fixture riêng, nhận xét, draft save trước finalize, score thiếu luôn pending, finalized read-only; overview chỉ hiện score sau finalized.
4. Individual weekly: identity sinh viên + tuần, trọng số fixture ghi rõ, draft/submitted, history theo sinh viên, không ghi vào StudentResult chính thức.
5. Leader change fixture: lý do bắt buộc, pending giữ leader cũ, supervisor persona duyệt mới cập nhật badge, reject giữ leader cũ. Luồng thật hiện hữu giữ nguyên BE semantics.
6. Collaboration fixture: task board/list/timeline theo hạn, keyboard alternative cho drag, task detail/subtask/comment/activity, backlog+sprint start/completion preconditions minh họa, meeting creation/RSVP/auto-save notes/lock, chat settings preview. Email luôn ghi rõ chưa gửi.
7. TaskBoardPage thật: board theo enum TODO/IN_PROGRESS/BLOCKED/IN_REVIEW/DONE/CANCELLED, link guarded task detail, giữ filter và phân trang BE. Card/count ghi rõ phạm vi trang. Không thêm status mutation, không giả TOTAL sau client filter. Toolbar wrap và controls tối thiểu 44px.

## Chưa hoàn thành / phụ thuộc

- N01/N02/N03/N04: chuẩn hóa 7 loại report, deadline countdown/policy, download scoped, per-criterion comments DTO, đa evaluator, weekly rubric/version/final-grade mapping, history persisted: BE contract pending. Viewer mới thử bằng PDF local; chưa chứng minh xem PDF cấp từ BE.
- N05: supervisor tạo request, reason/reject mandatory và cấm direct-transfer trước project khác BE hiện tại; cần BE chốt và merge. Không thay đổi quyền FE thật để che khác biệt.
- N06/N07: calendar tuần/tháng, recurring/reminders, email delivery timestamp, rich-text/decisions/action-items và version khóa minutes chưa hoàn thành trong prototype. Màn meeting thật có sẵn được giữ nguyên.
- N08/N09/N10/N11: board thật chưa drag mutation; sprint persisted, task estimate/attachment, bulk atomic, Gantt date/dependency mutation, burndown series cần BE. Timeline fixture hiện là lịch theo hạn, không phải Gantt đầy đủ.
- N12/N13: ChatDock/SignalR/reply hiện hữu được tái sử dụng; attachments/reactions/seen/mute và notification effect chưa triển khai runtime. Settings fixture không xin browser Notification và không lưu preference thật.
- N14/N15: giữ MASTER/layout/dashboard đã merge; chưa migrate toàn bộ trang hoặc nghiệm thu từng role dashboard. Số liệu 255 màu/33 trang trong tài liệu cũ không dùng làm kết quả hiện tại.
- E01–E10: kế thừa màn và flag hiện hữu; BE-03/07/08/09/10/11/12/13/14/15 còn là prerequisite như ma trận. Chưa bật flag chờ BE; chưa nghiệm thu live lifecycle trên DB.

## Kiểm chứng

- Full Vitest: **195 file / 912 test passed, 0 failed, 0 pending**, JSON non-empty 324308 bytes. Inventory source 195 file khớp số testResults. Output: `.cache/workflow-preview/vitest-full.json` (ngoài Playwright outputDir để không bị cleanup).
- Focused final source: **5 file / 23 test passed**. Gate mutation &&→|| bị tests phát hiện; source restored, test lại xanh.
- Typecheck/build/diff-check pass. Full lint exit 0 có warning baseline; preview lint exit 0, không warning. Không giảm rule/test hoặc thêm suppressions. Build còn warning chunk >500kB của application bundle.
- Playwright: **5 tests passed**, scoring/finalize, leader approve, upload/lock, retry, zero `/api`/`/hubs` requests trong sandbox, responsive 375/768/1440, keyboard card focus; toolbar internal overflow và page overflow đều có assertion.
- Screenshots: `test-results/workflow-preview/preview-{375,768,1440}.png`, `board-{375,768,1440}.png`. Đã xem ảnh 375px và sửa toolbar bị cắt. Font symbol trong harness dùng link giống app.
- DevTools đọc DOM fixture: 7 report rows, visible button min height 44px, scrollWidth ≤ viewport. Đây là evidence fixture UI, không phải authenticated production workflow.

## Review

Trust boundary là fixture versus server-owned actions/results. FE dual gate fail closed trong API mode; không persisted grade/PII, không request DB, React escape text, PDF iframe không cho script. Không thêm dependency. Backend authority giữ nguyên, kể cả nơi tài liệu thiết kế khác server hiện tại. Các prototype khác biệt được ghi rõ để BE review thay vì biến thành contract ngầm.

## Cách review

Server local đang chạy trên `http://127.0.0.1:5194/e2e/workflow-preview.html` (harness chỉ dùng cho QA, không yêu cầu login, không bundle vào production entry). Route app là `/preview/workflows` sau mock login khi bật hai flags.

Chạy lại: `pnpm exec vitest run`; `pnpm build`; `pnpm lint`; `pnpm exec playwright test --config playwright.workflow-preview.config.ts`. Handoff chi tiết tại `V5_INTEGRATED_WORKFLOW_ANALYSIS_2026-10-10.md`.
