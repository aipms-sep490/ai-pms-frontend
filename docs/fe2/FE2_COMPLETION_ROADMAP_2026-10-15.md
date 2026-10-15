# Roadmap hoàn thiện FE2 — 15/10/2026

## Quy trình đã chốt với người dùng

- Một nhánh duy nhất: `feat/fe2-completion`, từ develop `1db452881184f2e2c8245ee7cecbb9337f01c1eb` (đã fetch, trùng origin/develop lúc bắt đầu).
- FE1/FE2/FE3 làm song song từ nền develop hiện tại. Merge theo thứ tự FE1 → FE2 → FE3.
- Không đợi FE1, không pull/merge/rebase develop trở lại nhánh FE2. Conflict được xử lý ở lượt merge vào develop; kiểm tra lại cây tích hợp khi đó.
- Chia commit/checklist theo chặng trên cùng nhánh; một PR tổng. Không tự merge develop hoặc bật auto-merge.
- Quy trình này thay phần chia nhánh/task và chờ merge của roadmap 09/10/tài liệu phân công cho đợt này.
- BE nghiệm thu: https://api-staging.khaidz.com. Cấu hình local ở `.env.local` FE, giữ nguyên vite.config.ts.
- Giữ thiết kế hiện hành, capability/scoring/version/token do BE quyết định; không sửa BE hoặc thay policy dữ liệu chung để test.

## Chặng thực hiện

| Chặng | Phạm vi | Đầu ra / kiểm tra | Trạng thái |
| --- | --- | --- | --- |
| 0 | Baseline, route inventory, Swagger staging và source BE | endpoint → DTO → screen → action/reason → test; baseline checks; tách source/deployed/acceptance | SOURCE_COMPLETE / ACCEPTANCE_BLOCKED |
| 1 — B1 | Router/sidebar/lazy registry/guards/flags | Admin học kỳ/kỳ/qualification; policy scope riêng; agreement trước ACTIVE và lịch sử; URL trực tiếp/refresh/back/roles/notification | IMPLEMENTED / STAGING_FIXTURE_BLOCKED |
| 2 — B2 | Assignment evidence | items[], fileId/name/MIME/size/version; exact scoped download, revoked/IDOR/locked version | IMPLEMENTED / STAGING_FIXTURE_BLOCKED |
| 3 — B2 | Evaluator/scoring/scheme/assignment/publication | Scope và stage riêng; paging; draft/save/finalize/stale; demo/approval/readiness, không tính điểm chính thức ở FE | IMPLEMENTED / STAGING_FIXTURE_BLOCKED |
| 4 — B3 | Appeal contract và student component | PagedResult/source/policy/window/target/student/component/version/token; submit/evidence/tracking/history; export component cho FE1 | IMPLEMENTED / STAGING_FIXTURE_BLOCKED |
| 5 — B3 | Department/reviewer/decision | Window/policy/close/staff correction/reviewer/amendment/retain/preview/token/decision/revision; 409 giữ nháp và xác nhận lại | IMPLEMENTED / STAGING_FIXTURE_BLOCKED |
| 6 — B1/B4 | Results/Industry auth-router integration | Latest revision nhất quán; Industry riêng, không cấp role học thuật; contract nối FE3, không lưu invitation secret | AUTH_IMPLEMENTED / FE1_FE3_INTEGRATION_PENDING |
| 7 — B4 | Kiểm thử và bàn giao | typecheck/lint/build/all tests; browser/API evidence; route checklist và blocker; một PR review được | CHECKS_PASS / ACCEPTANCE_BLOCKED |

## Phân chia file và dependency

- FE2: src/app/router, sidebar/shared guards, shared HTTP/auth/config, evaluations/results/appeals, route/contract tests.
- FE1: student/team/execution/collaboration, agreement/peer/weekly, StudentProjectResultPage. FE2 xuất component/handoff, không sửa chồng trang này.
- FE3: academic/admin/COLD/defense/gates/recommendations/Industry pages. FE2 mở route và auth boundaries; không giả lập page chưa bàn giao.
- FE1 route mới/FE3 portal/enrollment/COLD defense đầy đủ chưa có: ghi dependency cụ thể; source/contract tests không thay browser acceptance.
- Provider/credential/test fixture thiếu: BLOCKED hoặc NOT_RUN. Dùng dữ liệu giả FE-ACCEPT-{runId}, không reset/xóa dữ liệu chung, không log secret.

## Tiêu chí nghiệm thu

- Toàn bộ route FE2 có PASS/FAIL/BLOCKED/NOT_RUN, không dùng số test/build xanh làm tỷ lệ hoàn thành.
- Quyền Admin/department/evaluator/expert không lẫn; 401 dùng session chung, 403/404 không lộ dữ liệu, 409 giữ nháp/tải mới/không replay, 422 hiển thị blocker.
- List dùng paging/count BE; download/history exact version; scope COMMON/MAJOR_SPECIFIC/INDIVIDUAL tách stage ON_GOING/COLD/DEFENSE.
- Appeal: window → student request → reviewer → amendment → preview → người khác quyết định → revision/history. Không sửa finalized evaluation hoặc nhập tổng điểm.
- Kiểm tra sai khoa/ngành/student, revoked assignment, file IDOR, hai tab, stale publication và duplicate.
- Golden demo đúng fixture: 8,10 / 7,90 / 7,40; project 7,67. DEMO bị chặn publication là đúng, không giả phê duyệt.
- Full typecheck/lint/build/unit/component; browser desktop/mobile/keyboard/direct reload/download; ghi FE SHA/BE environment/request IDs, loại secret.
- Feature correction/Industry chỉ bật khi đạt; dependency FE3/provider chưa chạy giữ BLOCKED/NOT_RUN.

## Nhật ký

- 15/10: nhánh mới tạo từ develop 1db4528, FE sạch; BE source tham khảo 090f93d có file untracked của người dùng, không sửa.
- Đã thấy evidence download còn /download; evidence projection FE dùng files thay vì wire items; correction API cũ chỉ reason/array; agreement route đang nằm trong ACTIVE guard.

- 15/10: đã triển khai router/Admin/agreement, multi-role context, evidence items/fileId/version, paging evaluator và giữ nháp stale; phúc khảo student/lead/reviewer/preview/decision/history; Industry auth boundary và enrollment shared.
- Kết quả chi tiết, route checklist, handoff và blocker: [FE2_COMPLETION_CONTRACT_AND_ACCEPTANCE_2026-10-15.md](FE2_COMPLETION_CONTRACT_AND_ACCEPTANCE_2026-10-15.md).
- Admin test mới đã xác minh đăng nhập được; staging chưa có semester/period/project cho acceptance. Không bật rollout hoặc tự tạo phê duyệt học thuật.

- Validation cuối: build/typecheck PASS; lint exit 0 (144 warnings, 0 errors); full suite 1196/1196 PASS. Acceptance trên fixture và provider thật vẫn chưa hoàn tất.
