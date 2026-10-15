# FE2 completion — contract, route checklist và bàn giao

## Baseline và môi trường

- Nhánh: `feat/fe2-completion`, base FE `1db452881184f2e2c8245ee7cecbb9337f01c1eb`.
- BE source tham khảo: `090f93d`; **không suy ra đây là SHA deploy**. Không chỉnh sửa BE.
- Staging: `https://api-staging.khaidz.com`, Swagger `/swagger/v1/swagger.json` tải được ngày 15/10/2026, OpenAPI 3.0.1 / API v1.
- SHA256 bản JSON đã format tải để đối chiếu: `B4D4B813270C47452B8A02E8CCCA8CA0DE68880B9037E145497321AC2ADBF14F`. Raw snapshot tạm không chứa credential; bảng bên dưới ghi lại các contract sử dụng.
- Browser kiểm tra từ `http://localhost:5173`, dùng BE staging thật. Origin `http://127.0.0.1:5182` không được CORS cho phép; không hạ bảo mật BE hoặc đổi Vite proxy để né.
- Test server bật tạm `VITE_ENABLE_RESULT_CORRECTION`, `VITE_ENABLE_WORKING_AGREEMENT`, `VITE_ENABLE_INDUSTRY` trong process để kiểm tra route. Không bật rollout trên deployment hay sửa `.env.example`/`.env.local`.
- `.env.local` FE vẫn trỏ staging. **vite.config.ts giữ nguyên**.

## Endpoint → DTO → screen → action/reason → test

Mọi API dưới đây có prefix `/api/v1`.

| Endpoint | Wire DTO / field quan trọng | Screen / action | Authority và kiểm tra |
| --- | --- | --- | --- |
| GET `/evaluation-assignments/{id}` | assignment, canScore, legacyReadOnly, denialReason | Guard evaluator detail | Không dùng role Lecturer làm quyền chấm; ID trả về phải khớp URL; 403/404 deny |
| GET `/evaluation-assignments/{id}/evidence` | items[], stage, coldPackageId, finalSubmissionId, isReadOnly | EvaluatorAssignmentDetailPage / ReportPreviewPanel | Adapter giữ item ID khác fileId, deliverableVersionId/versionNumber/coldSubmissionId/SHA; scope và stage riêng |
| GET `/evaluation-assignments/{id}/evidence/files/{fileId}` | Blob | Preview/download | Không có hậu tố `/download`; không chuyển sang project file API; kiểm quyền lại mỗi lần tải |
| GET `/evaluation-assignments/my` | PagedResult<Assignment> | Evaluator workspace / legacy list | Đọc đủ trang trước khi kết luận chưa có phân công |
| GET `/projects/{id}/evaluations` | PagedResult<EvaluationDraft> | Workspace/detail/legacy evaluator | Đọc đủ trang để không bỏ mất draft sau trang 1 |
| POST `/evaluation-assignments/{id}/evaluation`; PUT `/evaluations/{id}/draft`; POST `/evaluations/{id}/finalize` | Draft; concurrencyToken, criterion scores | Start/save/finalize | BE canScore, token, immutable finalize; giữ nháp khi 409, khóa ghi đến khi đối chiếu lại; chống gửi trùng trong cùng thao tác |
| GET `/projects/{id}/evaluation-assignments`; GET `/academic/project-periods` | PagedResult<Assignment/Period> | Assignment management | Đọc đủ trang, không coi 100 mục đầu là toàn bộ; capability manage_evaluators |
| GET/POST `/projects/{id}/result/appeal-policy` | Policy id/projectId/version/approvalReference; POST expectedVersion | AppealManagementPanel | Chỉ frozen lead staff; nguồn phê duyệt có thật do người dùng cung cấp, không tạo approval demo |
| GET/POST `/projects/{id}/result/appeal-windows` | PagedResult<Window>; policyId, opensAt/closesAt, targets[{targetType,studentId,resultVersion}] | Lead mở đợt; student chọn đợt của mình | Không mặc định mở toàn project; target/version lấy kết quả đã công bố |
| POST `.../appeal-windows/{windowId}/close` | concurrencyToken | Lead đóng đợt | Confirmation và token của đúng đợt; stale không replay |
| GET/POST `/projects/{id}/result/correction-requests` | PagedResult<Request>; Create có source/policyId/windowId/targetType/studentId/resultVersion/componentId/reason | StudentAppealPanel; ResultCorrectionsPage; staff correction | STUDENT_APPEAL dùng window; STAFF_CORRECTION windowId=null; selector component từ published breakdown, không current rubric/draft |
| GET `.../correction-requests/{requestId}` | allowedActions[], blockers[], concurrencyToken, source/target/version/scope/files | AppealRequestDetail | Mỗi nút dựa allowedActions; không suy quyền từ status/role; ID/project trả về phải khớp |
| POST `.../{requestId}/reviewer` | concurrencyToken, reviewerId | Lead giao reviewer | BE kiểm scope/ngành và độc lập; chưa có endpoint eligible-reviewers, ID nhập rõ ràng và được BE kiểm tra |
| GET `.../{requestId}/review` | Frozen review context/evaluations/scores/amendments/calculationVersion | Reviewer/lead đọc hồ sơ | Input tiêu chí lấy từ frozen evaluation, không bộ rubric hiện tại |
| PUT `.../{requestId}/review` | concurrencyToken, proposal KEEP/AMEND, reason, amendments[{evaluationId,criterionId,score,reason}] | Reviewer lưu đề nghị | KEEP không amendments; AMEND cần tiêu chí hợp lệ, hỗ trợ điểm 0; không sửa finalized evaluation |
| GET `.../{requestId}/evidence`; GET `.../{requestId}/evidence/{fileId}` | AppealFile[] / Blob | Đọc/tải evidence nguồn đã khóa | Phân biệt endpoint source evidence với file bổ sung của request |
| POST `.../{requestId}/files`; GET `.../{requestId}/files/{fileId}` | multipart File/ConcurrencyToken; request DTO / Blob | Requester bổ sung/tải file | allowedActions UPLOAD, 10 MiB/tệp; giới hạn và quyền kiểm lại ở BE |
| GET `.../{requestId}/preview` | confirmationToken, affectedResults[] | Independent lead xem ảnh hưởng | Không tính tổng điểm ở FE; đổi nội dung quyết định/tải lại/mutation/conflict làm mất preview cũ |
| POST `.../{requestId}/decision` | concurrencyToken, ACCEPTED/REJECTED, reason, confirmationToken | Independent lead quyết định | Xác nhận riêng; allowedActions do BE kiểm reviewer/scorer độc lập; không replay sau 409 |
| GET `.../{requestId}/history` | PagedResult<Event>; action/actor/at/reason/bundle/amendments | Request history | Paging/count server; không tự dựng lịch sử từ trạng thái hiện tại |
| GET `/projects/{id}/result/history`, `/result/versions/{version}` | PagedResult<RevisionSummary> / ProjectResult | ResultHistoryPanel | Version được chọn bất biến, không thay bằng GET latest |
| GET `/projects/{id}/students/{studentId}/result/history`, `/result/versions/{version}` | PagedResult<RevisionSummary> / StudentResult | Student history | Student ID/project/version trả về phải khớp; không đọc protected snapshot để tự tính |
| GET `/industry/assignments`; GET `/industry/assignments/{id}` | PagedResult<IndustryAssignment> / Assignment | Shared Industry auth boundary | Session roles=[] không biến thành Lecturer; quyền expert thực do BE xác minh |
| POST `/auth/industry/google/challenge`, `/google/enroll` | GoogleChallenge; challengeId/idToken/invitationToken → LoginSession | IndustryEnrollmentRoute → GoogleLoginButton → acceptExternalLogin | Fragment `#invitation=...` chỉ ở memory, xóa khỏi URL trước Google script; cookie/nonce/expiry giữ nguyên |

Tests tương ứng: `fe2-completion-routes`, `dual-role-context`, `evaluation-evidence`, `EvaluatorWorkspacePhase5`, `EvaluatorAssignmentManagementPage`, `result-correction-api`, `ResultCorrectionPanel`, `AppealManagementPanel`, `AppealRequestDetail`, `ResultHistoryPanel`, `QualificationPolicyPanel`, `appeal-notification`, `GoogleLoginButton`, `IndustryEnrollmentRoute` và regression FE2 hiện có.

## Route checklist

`PASS` trong cột tests chỉ là unit/component/route/contract; không thay cho acceptance browser/API của workflow có dữ liệu.

| Route / surface | Tests | Browser/API staging | Phần còn thiếu |
| --- | --- | --- | --- |
| `/academic/governance` | PASS | PASS: Admin vào trực tiếp + refresh, thấy tạo học kỳ/kỳ; staff chỉ xem cấu trúc | Chưa có học kỳ/kỳ để thử mutation nghiệp vụ |
| `/academic/project-periods/:periodId/policy` | PASS | BLOCKED | Cần kỳ thật; qualification AdminOnly tách scoped period policy |
| `/academic/rubrics` | PASS regression | NOT_RUN | Cần dữ liệu rubric/policy và scope cụ thể |
| `/project/agreement` | PASS: ngoài ACTIVE guard | BLOCKED | Tài khoản sinh viên chưa có project; FE1 authoring/history cần tích hợp |
| `/evaluator/workspace` | PASS | NOT_RUN browser; API giảng viên IT trả 200/items=[] | Cần assignment/published scheme/locked evidence |
| `/evaluator/assignments/:assignmentId` | PASS | BLOCKED positive workflow | Ca deny/revoked/stale/version có test; cần fixture cho browser scoring |
| `/evaluator/evaluations`, `/evaluator/evaluations/:evaluationId` | PASS regression/source paging | NOT_RUN | Legacy entry giữ tương thích, redirect guarded assignment |
| `/evaluator/projects/:projectId/final-submission` | Existing route giữ nguyên | NOT_RUN | Evidence detail không dùng đường này để né assignment scope |
| `/department/projects/:projectId/evaluation-schemes` | PASS regression | BLOCKED | Cần final package/period/frozen scope |
| `/department/projects/:projectId/evaluators` và `/evaluations` | PASS regression | BLOCKED | Cần eligible target/assignment |
| `/department/projects/:projectId/result` | PASS regression | BLOCKED | Cần published results; history component đã nối |
| `/admin/projects/:projectId/{evaluation-schemes,evaluators,final-submission,result}` | PASS route/regression | BLOCKED positive workflow | Admin không tự có academic mutation |
| `/review/projects/:projectId/corrections?request=:id` | PASS | PASS ca âm: project 9 không có → 404, UI unavailable, không có protected data/action | Positive workflow BLOCKED vì không có published target/policy/window |
| `/department/projects/:projectId/corrections` | PASS route | BLOCKED | Cùng workflow; department scope guard vẫn giữ |
| Student `ResultCorrectionPanel` / `/project/result` | PASS component | BLOCKED | FE1 sở hữu trang; component vẫn nhận projectId như trước, không sửa chồng file |
| `/industry/enroll` | PASS: fragment, shared auth, nonce/expiry path | NOT_RUN Google thật | Cần thư mời/email/Google account thật và deployment cookie/origin phù hợp |
| `/industry/workspace`, `/industry/assignments/:id` | PASS route boundary | PASS ca âm: academic session không nhận quyền expert | Full evidence/feedback/revoke portal thuộc FE3 |
| Notification APPEAL_* → correction/result | PASS | NOT_RUN event thật | BE hiện gửi project ID, link mở danh sách theo project |
| Dual Admin+Lecturer / Admin+Student | PASS | NOT_RUN role kép thật | Không thay role ưu tiên trang chủ; tải context theo membership của mọi role |
| Mobile/direct refresh/keyboard | PASS cho route correction unavailable tại 390px, không tràn ngang; Tab focus được | PASS ca âm | Form có dữ liệu/dialog/download mobile chưa có fixture |

## Evidence staging đã quan sát

- Admin test được người dùng sửa email sang `test.admin@aipms.test`: login/API/browser thành công. Không ghi password/token trong repo.
- Sinh viên P1/P3, lecturer IT1–IT4, staff IT đã đăng nhập API; lecturer assignments trả 200 với count=0; sinh viên/staff vào evaluator/my trả 403 đúng identity boundary.
- Admin đọc `/projects`, `/academic/semesters`, `/academic/project-periods`: 200, totalCount=0. Staff/sinh viên đã đọc projects cũng count=0.
- Browser staff: học vụ chỉ xem; browser Admin: học vụ có nút Thêm học kỳ/Thêm giai đoạn, reload vẫn giữ đúng route.
- Browser correction project 9: `/projects/9/my-capabilities` và `/projects/9/result/correction-requests?page=1&pageSize=20` trả 404; UI hiển thị unavailable. Chrome request refs lần kiểm tra: 737/738; không lưu header Authorization.
- Mobile correction unavailable: viewport 390×844, document width=390; Tab focus vào nút mở menu; không lộ dữ liệu khi BE trả 404.
- Không tạo policy approval giả, không sửa/reset dữ liệu chung, không tạo kết quả chính thức để ép acceptance.

## Blocker / dependency còn mở

| ID | Điều kiện | Cách mở khóa |
| --- | --- | --- |
| DATA-01 | Không có semester/period/project trong phạm vi các tài khoản test; chưa có evaluator/final package/result | Bộ fixture FE-ACCEPT riêng do nhóm chuẩn bị, có single-major và IT+Marketing+Design frozen scope |
| DATA-02 | Chưa có published target và appeal policy có nguồn phê duyệt hợp lệ | Cung cấp fixture/result/policy/window phù hợp; không dùng DEMO làm approval học thuật |
| FE1-01 | Agreement/Peer/Weekly pages mới và student result integration đang làm song song | Dùng component contract bên dưới; xử lý khác biệt ở lượt merge FE2 sau FE1 |
| FE3-01 | COLD/defense/Industry evidence-sharing/feedback portal hoàn chỉnh chưa nằm ở baseline | FE3 gắn page vào boundary đã chuẩn bị; kiểm revoked share/version và end-to-end sau merge FE3 |
| PROVIDER-01 | Chưa có thư mời/expert Google thật để kiểm enrollment | Chạy HTTPS/same-site cookie/origin hợp lệ, không nới SameSite/HTTPS để test localhost |
| RESULT-01 | Chưa kiểm được latest revision giữa result/governance/dashboard/export trên dữ liệu thật | Sau DATA-02, đọc lại cùng project/student/version ở mọi surface; lỗi resolver BE ghi ticket riêng |

Golden 8,10 / 7,90 / 7,40 / project 7,67, positive file IDOR/revocation, hai tab trên staging và quyết định độc lập toàn workflow: **BLOCKED/NOT_RUN**, không gọi là DONE dựa trên tests.

## Handoff FE1 / FE3

- FE1: `ResultCorrectionPanel({projectId})` giữ API props hiện tại; đọc shared session để xác định own student. Xuất thêm `StudentAppealPanel({projectId, studentId})` và `ResultHistoryPanel({projectId, studentId?})`. Không sửa `StudentProjectResultPage.tsx`; FE1 cần gắn history độc lập nếu muốn xem history ngay cả lúc correction flag off, và refresh result surface khi quay lại sau revision.
- FE1 agreement: route không còn ACTIVE-only; navigation vẫn cần project/context. Các thao tác author/publish/accept dùng BE capability/readiness trong module FE1.
- FE3: public `/industry/enroll` dùng fragment `#invitation=...`; auth shared xử lý challenge → Google → enroll → acceptExternalLogin. Không dùng luồng Google LOGIN/LINK học thuật cho enroll.
- FE3: `/industry` protected layout không có AcademicWorkflowGate/StudentJourneyProvider. Workspace/detail hiện là projection chỉ đọc để xác minh identity boundary; FE3 bổ sung portal evidence/feedback/revisions trên scope này, không thêm role học thuật cho expert.
- Feature correction/Industry tiếp tục off trên môi trường mặc định cho đến khi có acceptance; test-server override không phải rollout.
- Một nhánh FE2; merge thẳng vào develop sau FE1 theo yêu cầu. Không merge/rebase develop trở lại nhánh này; phải chạy lại kiểm tra trên cây tích hợp khi xử lý conflict.

## Validation

- Build (bao gồm typecheck): PASS; có cảnh báo chunk >500 kB.
- Lint: exit 0, 144 warnings, 0 errors; chưa mở rộng sang dọn cảnh báo toàn repo.
- Nhóm regression liên quan: 171/171 PASS trước lượt toàn bộ cuối.
- Toàn bộ tests trên source đã chốt: **1196/1196 PASS**, 464 suites, `npm test -- --maxWorkers=4`. Không chỉnh source trong lượt chạy cuối.
- Các contract test cũ giả định base `/api/v1`, vì vậy lệnh tests đặt `VITE_API_BASE_URL=/api/v1` trong process. Không sửa `.env.local` staging của người dùng.
- ChatThread suite từng timeout ở lượt tải cao; chạy riêng 10/10 PASS và lượt toàn bộ cuối đã PASS. Không sửa module chat của FE1.

Chưa tuyên bố hoàn tất acceptance B1–B4 khi các blocker trên còn mở.

## Checkpoint bàn giao

- Implementation SHA: `14d30a0ba569d9c2846026f094842f9951c6abde`.
- Commit theo chặng trên cùng nhánh: roadmap `98a04d2`, evaluator/evidence `ab14994`, appeal/revision `503f455`, routing/identity `14d30a0`.
- [Tóm tắt validation máy đọc được](evidence/FE2_COMPLETION_VALIDATION_2026-10-15.json).
- Code đã commit local; chưa push, chưa tạo PR, chưa merge develop. Nghiệm thu có dữ liệu vẫn BLOCKED theo bảng trên.
- Browser public `/industry/enroll` không có fragment hiển thị invalid invitation đúng; chưa thực hiện enrollment thật.
