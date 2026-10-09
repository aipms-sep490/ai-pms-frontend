# FE gap completion và nhiệm vụ bàn giao DEV BE

Ngày 09/10/2026. Phạm vi: hoàn thiện phần FE còn thiếu đã có contract hiện hành theo audit FE1/FE2; cập nhật code BE/FE rồi tạo nhánh riêng từ remote develop. **Không push/open PR/merge/deploy hoặc sửa BE/DB trong lượt này.**

## Baseline và nhánh

- BE đã `pull --ff-only` lên `4c61c98791d2934a75374a7456707b59c0b8c579`.
- FE remote develop `3426d70e5f7f0320ee5c057ade39aca267cb0434`; pull thành công. Checkout FE chính có commit test local `42a3ed2` ahead 1 và `.env.example` sửa dở, được giữ nguyên.
- Nhánh `feat/fe-cib-v4-gap-completion-20261009`, worktree `F:/AI-PMS/ai-pms-frontend-cib-v4-gap-completion`, base đúng remote FE develop `3426d70`.
- Thay đổi local BE `.gitignore` và các file untracked có sẵn được giữ nguyên khi fast-forward; không sửa contract BE.
- Nguồn nghiệp vụ: `F:/AI-PMS/docs/AI-PMS_CIB_v4_IMPACT_FE2_BE_HANDOFF_2026-10-09.md` §7–8; audit `F:/AI-PMS/docs/audits/AI_PMS_FE1_FE2_DEVELOP_PR_COMPLETENESS_2026-10-09.md`.

## Phần FE đã hoàn thiện

| Ticket | Thay đổi | Ranh giới |
|---|---|---|
| FE2-01 | Admin portfolio có links scheme/result; Admin routes cho scheme, evaluator management, locked submission và result; resource navigation/breadcrumb đúng workspace | Admin không được mở thêm department review, qualification decisions hoặc archive từ thay đổi này. Endpoint BE vẫn quyết định resource authority |
| FE2-04/05/06 | Tái sử dụng pages và APIs hiện có trên Admin routes; result roster không bị giới hạn vào linked department khi ở Admin workspace | Không tạo bản sao scoring UI, không chấm từ global ADMIN, không bỏ assignment guards của evaluator |
| FE2-03 | Draft threshold để trống, weights khởi tạo 0 để yêu cầu cấu hình có chủ ý; nhãn draft/academic approval rõ; published scheme read-only | 0 là trạng thái chưa cấu hình, không phải policy; validate tổng trọng số 100% và phạm vi theo current contract |
| FE2-03 | 409 giữ nội dung nhập để đối chiếu, tải danh sách server, khóa stale writes tới khi chọn lại phiên bản mới; ref lock ngăn duplicate mutations | Không replay save/publish/delete. Sau read error/403 không giữ editable authority từ dữ liệu cũ |
| FE2-03 / GAP-04 | README phân biệt foundation pending cũ với production scheme/evaluator/result routes đang hoạt động | Foundation vẫn không mount; không bật tính năng future bằng boolean local |
| FE2-08 | Production-router API fixture browser script, tests về Admin routes, negative roles, navigation, explicit defaults, immutable scheme và stale writes | Fixture chứng minh FE contract/UX; không chứng nhận BE/DB lifecycle thật |

FE1-02 upload, FE1-05 task creation/evidence filters, FE1-07 own result đã có trong PR #52, giữ nguyên. Các phần REUSE của FE1/FE2 tiếp tục dùng source develop; không tạo lại chức năng chỉ vì có ticket trong tài liệu.

## Contract mapping được FE dùng

Nguồn authority BE hiện tại: `EvaluationSchemeService.Manage/ComponentAuthority`, `EvaluationSchemeService.Results.PreviewAsync/GetStudentAsync`, `EvaluationDraftRepository`, `FinalSubmissionRepository.CanReadAsync/CanManageAsync`.

| Hành trình | Existing API / payload | Quyền/version/lỗi |
|---|---|---|
| Scheme list/detail | GET `/api/v1/evaluation-schemes?projectId=…`, GET `/{id}` | Admin hoặc staff đúng project scope; list không phải quyền chấm |
| Scheme create/update | POST `/api/v1/evaluation-schemes`, PUT `/{id}`; projectId, periodId, threshold, components; update concurrencyToken | Đúng final lock/period/snapshot/rubric scope. Published immutable; 409 cần chọn version mới |
| Scheme publish/version/delete | POST `/{id}/publish`, POST `/{id}/versions`; body concurrencyToken. DELETE `/{id}?concurrencyToken=…` | BE freeze scheme/policy/roster và audit; technical publication khác academic sign-off |
| Assignment management | GET `/api/v1/projects/{id}/evaluation-assignments`, existing candidate/assign/revoke APIs | Component/major/student/period targets theo scheme; Admin quản lý không tự được score |
| Locked submission | GET `/api/v1/projects/{id}/final-submission`, existing protected locked-file download | Exact package/items/files; không dùng generic upload mới thay submitted version |
| Project results | GET `/api/v1/projects/{id}/result`; GET `/result/preview`; POST `/result` với confirmationToken | Cross-department publication yêu cầu Admin; UI chỉ dùng canPublish/blockers từ BE |
| Student results | GET `/api/v1/projects/{id}/students/{studentId}/result`, GET `/result/preview`, POST `/result` với confirmationToken | Admin dùng authorized frozen scheme roster; staff theo department; student chỉ own published result |

Chưa tuyên bố OpenAPI freeze có phê duyệt của BE: đây là mapping source hiện hành, DEV BE cần xác nhận version/examples/error matrix. Không đổi URL/status để khớp ví dụ proposal.

## Nhiệm vụ giao DEV BE tiếp theo

### BE-FE-01 — Task-list discipline filter (FE1-05 / BE-04)

**Hiện trạng:** `GET /api/v1/tasks/project/{projectId}` chưa có majorId/discipline filter; task creation/detail disciplines và evidence filters đã có.

**DEV BE thực hiện:** freeze query model, semantics PRIMARY/SUPPORTING, authorized project/major scope, paging/totalCount và error examples; lọc trước pagination/count. Reuse `tasks/task_disciplines`, không tạo task/project riêng theo ngành. FE sẽ thêm selector/list view sau khi contract có thật.

**Acceptance:** cùng project đúng SINGLE/INTERDISCIPLINARY; wrong project/major/assignment denied; paging nhiều trang và count đúng; không N+1/client-side lọc trang đầu; UNKNOWN/LEGACY không bị mở quyền. Readiness trên source mới không được giả làm dữ liệu runtime hợp lệ.

### BE-FE-02 — Assignment-scoped evidence/file projection (FE2-05 / BE-04)

**Hiện trạng:** assignment evidence DTO chỉ có assignment/project/scope/major/student/finalSubmission/submittedAt/itemCount/isReadOnly. FE detail có summary và existing locked-package viewer, chưa có full assignment-target projection.

**DEV BE thực hiện:** xác nhận release cần projection đến mức nào, freeze DTO/items/file access và protected download mapping; exact final package/version, source cùng project và đúng component/major/student target. Reuse existing evidence/files/final submission entities. Không dùng broad project file access thay assignment authorization.

**Acceptance:** wrong/revoked assignment denied; scope của target và file source không vượt quyền; final locked version không bị upload mới thay thế; finalized inputs read-only; metadata/download/readback đúng cùng package/version. Không mở evidence verification command từ status list khi chưa có approved workflow.

### BE-FE-03 — Own StudentResult metadata/breakdown (FE1-07 / BE-04)

**Hiện trạng:** owner student nhận SnapshotJson `{}`; FE hiển thị own published score/outcome, major label từ authorized project metadata và scheme ID. Không parse privileged snapshots hoặc tự tính điểm.

**DEV BE thực hiện khi release cần nhãn/breakdown:** bổ sung typed redacted metadata về scheme/version và thành phần BE đã tính; freeze null/missing, calculationRule, resultVersion/attempt nếu scope hiện hành có. Không bắt FE đọc endpoint quản trị để lấy tên scheme.

**Acceptance:** own published only; wrong student 403/404; dữ liệu đối tác/student khác/private audit không lộ; historical result không tính lại bằng policy hiện tại; missing không thành 0; hai student cùng major có individual khác nhau nhận đúng DTO của BE.

### BE-FE-04 — Contract confirmation + isolated lifecycle environment (BE-01/02, FE1-08/FE2-08)

**DEV BE/QA bàn giao:** runtime URL cách ly, actor accounts qua kênh an toàn, per-run IDs/reset/readback runbook, SINGLE_MAJOR và INTERDISCIPLINARY có frozen registration snapshot/policy/roster, valid scheme/rubric versions, exact locked package và storage access. Xác nhận mapping trên với OpenAPI/examples/version và scope/action/reason/error/token matrix.

**Joint acceptance:** certificate submit → verify/reject/resubmit → team eligibility/roster freshness → registration/revision/resubmit → required department decisions → primary/mentor → ACTIVE tasks/evidence → exact final lock → component targets/coverage → draft/finalize → preview/project/student publish → COMPLETED/ARCHIVED. Có wrong role/department/student/assignment, missing score/coverage, stale409, duplicate và concurrent writes; đối chiếu UI với persisted state/history/audit do BE/QA readback.

**Không seed/mutate shared AI_PMS cho browser acceptance.** SQL schema readiness hoặc BE isolated API tests không thay thế FE browser mutation evidence. Acceptance fixture phải có nguồn snapshot hợp lệ, không tự giả backfill lịch sử từ cấu hình hôm nay.

### Ngoài release hiện hành

WorkingAgreement/Checkpoint/ReviewGate, industry identity/feedback/weighting, stages/evaluator weights/pass gates, appeals/corrections/revisions/attempts: giữ PROPOSED/DECISION PENDING đến khi approved scope/policy và versioned BE contract có thật. Không tạo global role, điểm/tỷ lệ hoặc privileged authority từ proposal. Các task BE-FE-01..04 không phải yêu cầu tạo đồng loạt 13 bảng DBX.

## Kiểm chứng và tái chạy

Evidence final tại `test-results/cib-v4-gap/`; tracked tổng hợp `docs/validation/cib-v4-gap-evidence.json` được tạo từ reporter final sau kiểm tra inventory. Không lưu credentials, token thật hoặc storage state.

```powershell
pnpm install --frozen-lockfile --offline --store-dir F:/AI-PMS/.pnpm-store
pnpm typecheck
pnpm exec oxlint --format json
pnpm exec vitest run --maxWorkers=4 --reporter=json --outputFile.json=test-results/cib-v4-gap/full-suite.json
pnpm build
git diff --check
# Terminal riêng: pnpm exec vite --host 127.0.0.1 --port 5191 --strictPort
node scripts/cib-v4-gap-browser-check.mjs
```

Browser fixtures sử dụng router/page/auth infrastructure của ứng dụng và intercept toàn bộ `/api/v1`; kiểm Admin không có department scope, 403,409, preview token và wrong identity direct URLs. Viewports 375/768/1024/1440; ảnh 375/1440 được kiểm tra trực quan. Đọc fixture success không có nghĩa score engine hay DB lifecycle đã đạt.

**Trạng thái:** FE changes theo current contract hoàn thiện; toàn integration **FE_DONE_BE_PENDING** cho BE-FE-01..04 và real lifecycle acceptance. Nhánh local để review; remote delivery cần yêu cầu riêng.
