# FE1 — Canonical Implementation Baseline v4

Ngày: 2026-10-09. Trạng thái: **FE_DONE_BE_PENDING**. Các thay đổi có contract BE hiện tại đã triển khai và kiểm tra; nghiệm thu lifecycle với BE/DB thật vẫn pending. Tài liệu v4 là controlled proposal, D1–D16 OPEN; không áp dụng thêm quy tắc chấm điểm/gate chưa được chốt.

Worktree: `F:/AI-PMS/ai-pms-frontend-cib-v4-fe1`. Branch: `feat/cib-v4-fe1-20261009`. Base FE: `origin/develop` `87555bab751e06dd8912dd7cea51a407b7810f4a`. BE đã đối chiếu: `3742760582a23e72c878fb61f1dadf225dfbca01`.

Nguồn phạm vi: `F:/AI-PMS/docs/AI-PMS_CIB_v4_IMPACT_FE2_BE_HANDOFF_2026-10-09.md`; tài liệu gốc `F:/AI-PMS/AI-PMS_v4.0_Canonical_Implementation_Baseline_BE_FE.docx`; SRS `F:/AI-PMS/docs/context_md/03_srs_requirements.md`; controllers/validators/services BE trên develop. Không thay BE, DB, dependencies, router hoặc luồng chấm/công bố của FE2. Checkout FE chính và các file đang có của người dùng được giữ nguyên. User đã cho phép commit/push/PR/merge develop ngày 2026-10-09. Delivery dùng PR, merge commit và kiểm tra đúng HEAD; xem PR cùng bằng chứng delivery cuối phiên.

## Kết quả theo ticket

| Ticket | Kết quả | Phần triển khai/kiểm tra |
|---|---|---|
| FE1-01 | REUSE_VERIFIED bằng test/fixture | AcademicWorkflowGate, StudentJourneyProvider, ActiveStudentProjectRoute, các execution capabilities tiếp tục là nguồn context và UX guard; endpoint BE quyết định quyền cuối cùng. |
| FE1-02 | CONNECTED | Thêm multipart certificate upload, form nộp/nộp lại trên `/team`, refreshAll sau readback. Không cần project; không gọi JSON submitEvidence sau upload. MIME PDF/PNG/JPEG, giới hạn 20 MiB; BE tiếp tục kiểm tra tên/signature/nội dung. Lỗi giữ tệp, focus thông báo; chặn gửi trùng đồng bộ. Mock mode không gọi API thật. |
| FE1-03 | REUSE_VERIFIED bằng test/fixture | Giữ các kiểm tra mode/quota/eligibility và registration/revision theo BE. Bỏ nhãn đủ điều kiện FE tự suy từ certificate VERIFIED/expiry. Upload không tự nâng trạng thái nhóm thành PASS. |
| FE1-04 | REUSE_VERIFIED bằng test | Primary và discipline mentor tiếp tục dùng assignment/major của BE; không thay route guards. Reuse tokens/error handling của task/milestone/report/meeting/final. |
| FE1-05 | CONNECTED / BE_PENDING cho task-list major filter | WorkspaceTaskForm đọc project major-requirements, kết hợp frozen academic scope, rồi gửi PRIMARY/SUPPORTING ngay trong POST `/tasks`. Liên ngành yêu cầu đúng một PRIMARY; UNKNOWN scope khóa tạo và giải thích. Sổ minh chứng thay nhập ID tự do bằng ngành dự án; mentor giữ filter ngành của assignment kể cả Xóa lọc. Loại bỏ query VERIFIED/REJECTED vì BE chỉ nhận PENDING/UNKNOWN. Ngăn response cũ ghi đè sau đổi filter/context. |
| FE1-06 | REUSE_VERIFIED bằng test | Không tạo thêm final workflow. Test hiện có kiểm checklist/leader quyền submit, package/version/file scope và viewer. Nghiệm thu exact package với đánh giá FE2 cần BE runtime riêng. |
| FE1-07 | CONNECTED | Đọc own StudentResult đã công bố; đổi project/student hoặc mất context không hiện kết quả cũ. Abort/invalidate request cũ; 403 khác unpublished; retry, nhãn ngành từ project metadata được cấp. Kết luận chỉ dịch enum BE, không tự tính từ điểm. Scheme giữ ID tham chiếu vì chưa có tên trong DTO; không gọi endpoint quản trị để lấy tên. Không tái tạo breakdown từ snapshotJson đã bị BE redaction. |
| FE1-08 | VERIFIED bằng test và API fixture / LIVE_PENDING | Full Vitest, typecheck, lint, build, diff-check; Playwright component contract và route thật của ứng dụng. Đã xem ảnh desktop/375px. Bằng chứng chưa chứng minh DB/BE thật hoặc toàn bộ registration→review→final→publication lifecycle. |

## Actor/context/state map

| User | Context/phạm vi | Luồng FE1 |
|---|---|---|
| Sinh viên chưa có project | Auth user + semester/profile của workflow BE | Nộp chứng nhận của chính mình; chờ xác minh; không cần projectId. |
| Trưởng nhóm FORMING/registration | TeamDto + team actions + policy/period | Reuse scope, requirements, roster/eligibility, registration. Qualification không thay quyền/team PASS. |
| Thành viên nhóm | Persisted membership + own profile | Xem điều kiện, nộp own certificate nếu roster chưa khóa; không có quyền quản lý nhóm từ trạng thái local. |
| Trưởng nhóm ACTIVE | Project execution capability + frozen scope | Tạo task cùng disciplines trong một request; 409 giữ draft, không tự replay. |
| Primary supervisor | Persisted active PRIMARY assignment | Reuse execution workspace/actions; scope ngành từ project. |
| Discipline mentor | Persisted DISCIPLINE_MENTOR assignment + majorId | Sổ minh chứng giữ ngành hướng dẫn; không suy primary quyền từ role LECTURER. BE kiểm tra mọi source/read/write. |
| Sinh viên final | Team/project actions + locked final package | Reuse final submission/checklist/version; không làm lại upload hoặc thay final package bằng bản mới. |
| Sinh viên published/completed/archived | Project + own studentId | Own StudentResult chính thức; archived vẫn xem; không dùng ProjectResult thay cho điểm cá nhân. |

Trace BR: FE1-01 → BR-01/02/03/06; FE1-02/03 → BR-20/22/23, BR-30–35, BR-40–58; FE1-04/05 → BR-57/60–63/70–74/80–83/90–91; FE1-06 → BR-100–102/140–142; FE1-07 → BR-59/143–145. Không tạo MSG mới khi nguồn chưa quy định mã cụ thể.

## Bằng chứng và tái chạy

Kết quả full suite: **170 file, 775 test, 0 failures**; JSON không rỗng và danh sách file đối chiếu với toàn bộ test source. Typecheck/build/diff-check đạt. Lint **0 error, 118 warning**, so với **120 warning** trên đúng baseline cùng phiên bản oxlint; không thêm warning, suppression hoặc hạ ngưỡng. Build vẫn cảnh báo kích thước chunk hiện hữu.

Playwright: **10 check component/API fixture + 4 check route thật/API fixture**, không có page error hoặc endpoint fixture chưa được định nghĩa. Hai chế độ SINGLE_MAJOR/INTERDISCIPLINARY, 422 upload giữ tệp/focus, 409 task giữ draft và explicit retry, mentor locked major, 403/404 result, hai sinh viên cùng ngành nhận điểm BE khác nhau, archived own result, responsive 375px. Không biến dữ liệu synthetic thành bằng chứng tính đúng điểm thực tế.

Artifacts tại `test-results/cib-v4-fe1/`: `verification.json`, `full-suite.json`, `full-suite.log`, `typecheck.log`, `lint.json`, `baseline-lint.json`, `build.log`, `browser-evidence.json`, `route-evidence.json`, `live-readonly-probe.json`, screenshots và `browser-trace.zip` (ignored, lưu local). Test-only entry ở `e2e/fixtures/cib-v4-fe1.*` không được đưa vào production build và không sửa app router/auth.

BE runtime cập nhật lúc kết thúc: 5080 đã có listener. Đọc Swagger thật trả 200, xác nhận certificate là multipart và task-list chưa có majorId filter. `/health` và `/student-qualifications/me` trả 401 với request không đăng nhập. Đây là bằng chứng server/contract đang được expose, chưa chứng minh health/DB readiness hoặc lifecycle authenticated. Không thực hiện request ghi lên BE thật.

```powershell
# Chạy trong worktree FE1
pnpm typecheck
pnpm lint
pnpm exec vitest run --maxWorkers=4 --reporter=default --reporter=json --outputFile.json=test-results/cib-v4-fe1/full-suite.json
pnpm build
git diff --check
# Terminal riêng, API fixture dùng origin này và chặn toàn bộ /api/v1
pnpm exec vite --host 127.0.0.1 --port 5189 --strictPort
node scripts/cib-v4-fe1-browser-check.mjs
node scripts/cib-v4-fe1-route-check.mjs
```

## Bàn giao FE2 và BE

1. **BE-02 / staging**: cung cấp tài khoản và dữ liệu cô lập trên runtime để chạy certificate→verify/reject→eligibility→registration/revision→review đa khoa→PRIMARY/mentor→ACTIVE→final exact locked package→own StudentResult→archive. Cổng 5080 không có listener lúc bắt đầu và đã có ở lần kiểm tra cuối; không thử ghi lên DB AI_PMS dùng chung. Cần negative cases khác user/team/major, expired/stale policy, 409 và readback. Fixture không thay bước này.
2. **BE-04 / task list**: `GET /tasks/project/{projectId}` hiện chưa có majorId/discipline filter. FE1 đã nối task creation/detail disciplines và evidence filter, nhưng không thể lọc task list đúng pagination bằng cách tự gom dữ liệu hoặc N+1. BE cần thống nhất server filter + authorization + totalCount/pagination trước khi nối phần task-list view.
3. **BE-04 / own result metadata**: DTO hiện có schemeId/majorId/score/outcome và snapshotJson bị redaction. Nếu cần tên scheme và breakdown cá nhân, cung cấp DTO được phép xem cho chính sinh viên, không buộc FE đọc evaluation schemes quản trị hay tự suy công thức.
4. **FE2-04/05/06**: tiếp tục target assignment/evaluation/publication đã phân tích. Reuse exact final packageId, studentId, majorId, frozen scheme/context và concurrency tokens do BE trả. Màn `/project/result` FE1 sẽ nhận own published DTO qua endpoint hiện có; không cần thêm màn kết quả cá nhân khác.

Review đã rà authority/scope, async race, mutation atomicity, lỗi/duplicate, dữ liệu riêng tư, responsive/accessibility, reuse và phạm vi FE2. Sửa riêng style của shared task form để dùng được ở TaskBoard ngoài collaboration shell; không đổi design system hoặc tạo domain mới.

Delivery đã được user cho phép. Các commit tách qualification, discipline/evidence, own result và test/handoff. CI BE develop `37787168149` xanh tại `3742760582a23e72c878fb61f1dadf225dfbca01`; CI FE develop `37883714470` xanh tại baseline. PR CI và develop post-merge CI phải xanh trước khi báo delivery hoàn tất. Không deploy hoặc ghi DB trong lần delivery này.
