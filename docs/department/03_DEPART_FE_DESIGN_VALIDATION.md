# Báo cáo 3 — Thiết kế FE, thay đổi và kiểm chứng DEPART

> **Cập nhật 08/10/2026:** kết quả mới nhất ở §13 và [05 — Đồng bộ và kết quả hiện tại](05_DEPART_BE_SYNC_FE_INTEGRATION_20261008.md). Các số liệu/blocker ở §1–§12 là lịch sử trước khi nối BE mới.

Ngày: 2026-10-07. Worktree `F:/AI-PMS/ai-pms-frontend-depart-completion`, branch `feat/depart-completion-20261007`.
BE baseline `deb0a54`; FE baseline `e415499`. Trạng thái tổng hợp: **PARTIAL**. Cải thiện FE đã kiểm chứng; lifecycle mutation E2E và các gap BE chưa hoàn tất.

## 1. Thiết kế và công cụ đã dùng

Skill `ui-ux-pro-max` đã đọc và áp dụng; search UX `error summary validation` xác minh focusable summary, inline field error và aria announcement. Design system AI-PMS hiện có được giữ: fonts, primary/status semantic tokens, WorkspacePage, Button, Modal/useActionConfirmation. Không tạo visual system riêng hoặc thêm dependency sản phẩm.

Giao diện dùng ngôn ngữ nghiệp vụ tiếng Việt: workspace → điều kiện sinh viên → đề tài/thẩm định → hướng dẫn/điều phối → đánh giá/bàn giao → kết quả. Navigation không cấp quyền; tất cả API vẫn phân quyền server-side.

## 2. Navigation và màn hình

- Sidebar thêm điều kiện sinh viên và đồ án lưu trữ; tái sử dụng entry học kỳ/kỳ đồ án sẵn có, tránh duplicate route IDs.
- Workspace có lối tắt đến qualification/topic/governance/rubric; đọc review, portfolio và directory độc lập. Metric từ BE aggregate; attention chỉ dữ liệu của trang danh mục đang xem, có nút trang trước/sau.
- DepartmentProjectLayout nối thẩm định, điều phối/hướng dẫn, scheme, evaluator, final requirements/package, result, files và contributions bằng projectId hiện hành. Không tạo projectId từ URL không hợp lệ hoặc trang archive list.
- DepartmentAcademicScopeRoute bao bọc các route DEPART resource trước khi tải page; unavailable scope có retry, inactive scope không thành empty page.
- Qualification đổi bảng rộng thành cards responsive: tên/mã sinh viên, trạng thái đào tạo/xác minh, certificate number, issued/expiry date, file-reference limitation, rejection reason, verified actor/date và actions.
- ResultPublicationPage bỏ form legacy, dẫn vào scheme và người chấm. Project result/preview và student results không phụ thuộc thành công của cùng một Promise.all.
- ProjectGovernancePage có paging cho reporting cycles/action items/evidence, hiển thị tổng từ BE; dropdown nguồn báo cáo/cuộc họp đọc đủ các trang. Assignment/directory discovery và nguồn semester/period/rubric cũng không dừng ở trang đầu.

## 3. Data flow và tương tác

Qualification typed hook gửi server paging/filter; clear stale rows khi tải; request version tránh response cũ ghi đè. Đổi filter reset page 1; nếu sau quyết định trang cuối không còn tồn tại, quay về trang hợp lệ. Khóa thao tác trước khi mở dialog; cancel/Escape không gọi BE; reason được trim. Verify thiếu đào tạo hiển thị precondition cạnh nút và title.

Review thêm mutation lock trong hook; participating approve cũng có dialog như reject. Giữ nguyên phân biệt lead/participating, reason, snapshot/token và refresh sau 409. Không tự thay project state hoặc replay.

Assignment replace chỉ ACTIVE, dùng danh bạ đề xuất thay vì candidate API cho assignment mới; không coi discovery là eligible authority. End chỉ COMPLETED ở giao diện quản trị. Reason confirmation, re-read assignment, server validates capacity/expertise và responsible department; 409 tải lại danh sách. Các thao tác lịch sử trên ARCHIVED vẫn để read-only ở FE.

Project publication cần canPublish + kiểm tra bản preview + dialog. Chụp token cùng request version; reload hoặc route đổi hủy xác nhận. 409 refresh server state, bỏ preview có thể dùng để gửi và yêu cầu kiểm tra lại. 403 preview hiện rõ, không bị swallow. Student publication lấy roster scheme đã công bố, filter department của workflow context, invalidate khi đổi sinh viên/project; không tự tính điểm.

Phân biệt 401, 403, 404, 405/501, network/5xx và 409. Mã MSG từ SRS dùng trong traceability, không thêm mã giả vào UI/DTO. Error summary focus được; loading/status dùng role=status; dialogs có keyboard/Escape qua primitive hiện có; controls mới dùng target tối thiểu 44px.

## 4. Acceptance và bằng chứng

| Tiêu chí | Kiểm tra | Kết quả |
| --- | --- | --- |
| Scope hợp lệ/inactive/unavailable | DepartmentAcademicScopeRoute unit tests; mocked browser direct resource | PASS (unit/fixture; không suy ra mutation BE thật) |
| Request cũ không ghi đè context mới | useDepartmentSection race test | PASS (unit/fixture; không suy ra mutation BE thật) |
| 401/403/404 khác unsupported/unavailable | Parameterized section error tests | PASS (unit/fixture; không suy ra mutation BE thật) |
| Queue paging/reset/filter và certificate metadata | Qualification page tests + browser | PASS (unit/fixture; không suy ra mutation BE thật) |
| Confirmation cancel/reject reason/training guard/409 no replay | Qualification tests + keyboard browser | PASS (unit/fixture; không suy ra mutation BE thật) |
| Đơn ngành/đa ngành, lead/participating, snapshot/token | Existing ProjectReviewPage/useProjectReview tests, added approve confirmation | PASS (unit/fixture; không suy ra mutation BE thật) |
| Semester/period CRUD không mở cho staff qua generic action | Academic governance hook regression test | PASS (unit/fixture; không suy ra mutation BE thật) |
| Assignment closing/replace và conflict | AssignmentManagementPanel tests + governance predicate tests | PASS (unit/fixture; không suy ra mutation BE thật) |
| Legacy form bị bỏ, scheme links, preview403, published read | ResultPublicationPage tests | PASS (unit/fixture; không suy ra mutation BE thật) |
| Current token, confirm cancel, conflict invalidation | Project/student result tests + browser | PASS (unit/fixture; không suy ra mutation BE thật) |
| No page horizontal overflow 375/768/1024/1440 | Playwright workspace/qualification/result screenshots + scrollWidth | PASS (unit/fixture; không suy ra mutation BE thật) |
| Typecheck/lint/build/diff/full suite | Commands + machine-readable result | Kết quả mới nhất tại §12; §7–§11 lưu lịch sử các lần kiểm chứng trước |

## 5. Lệnh tái kiểm chứng

```powershell
pnpm install --frozen-lockfile --store-dir F:/AI-PMS/.pnpm-store
pnpm typecheck
pnpm lint
pnpm build
pnpm exec vitest run --maxWorkers=2 --reporter=json --outputFile=.cache/depart-full-vitest.json
git diff --check
```

Browser chạy standalone với Playwright runtime đã có; không thêm vào dependencies sản phẩm:

```powershell
# Terminal 1, trong worktree
pnpm exec vite --host 127.0.0.1 --port 5187 --strictPort
# Terminal 2; dùng package Playwright đã cài ở FE chính hoặc runtime tương đương
$env:PLAYWRIGHT_MODULE = 'F:/AI-PMS/ai-pms-frontend/node_modules/@playwright/test'
node scripts/department-browser-check.mjs
```

`e2e/department.html`/harness không được import từ entry production. Browser fixture cung cấp context tổng hợp trong memory và intercept mọi `/api/v1/**`; unknown endpoint hoặc pageerror làm fail. Không dùng credentials thật, không gửi mutation tới backend. Báo cáo kết quả/16 screenshots/trace nằm ở `test-results/department/` (ignored, không chứa secret).

## 6. Giới hạn, rollout và trạng thái

- Đã được cung cấp môi trường local. Ban đầu phiên tại 5187 là STUDENT; kiểm tra actor guard đã đưa direct DEPART URL về student overview. Sau khi người dùng chuyển tài khoản, phiên worktree 5187 đã được BE xác nhận là DEPARTMENT_STAFF; kết quả cập nhật ở §8. Chưa có fixture/ID được chỉ định để xác minh mutation DEPART. Browser fixture là MOCKED_COMPONENT_AND_APP_BROWSER; không đại diện cho authorization thực tế hay đồng bộ state giữa actors.
- Các trang topic, scheme, evaluator, final package, archive, directory đã có được tái sử dụng; regression suite hỗ trợ FE, chưa đủ kết luận toàn bộ lifecycle runtime.
- Nguồn form đọc tuần tự toàn bộ các trang; nếu BE trả trang rỗng trước tổng đã công bố, FE báo lỗi thay vì coi danh sách là đầy đủ. Server vẫn revalidate lựa chọn ở thời điểm lưu.
- Mentor replacement capability và canonical governance lead cần BE cải thiện; FE giữ guard thận trọng. Primary management yêu cầu lead của ProjectDto academicScope khớp actor và allowed action.
- Không deploy/commit/push/PR/merge. Khi bàn giao giữ worktree để review; BE đã pull fast-forward, không có local BE code changes.
- Dữ liệu browser traces/screenshot dùng fixture; khi chạy live sau này phải dùng môi trường dữ liệu thử nghiệm được phép và không lưu credentials trong bằng chứng.

Trạng thái cuối được chốt ở phần kết quả kiểm chứng bên dưới; mọi blocker nghiệp vụ được liệt kê cụ thể trong Báo cáo 2.


## 7. Kết quả kiểm chứng đã hoàn tất

- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `git diff --check`: exit 0. Build có cảnh báo chunk >500 kB (application/LiveKit), không có build error; chưa xử lý performance ngoài phạm vi.
- Full Vitest: **150 test files**, **315 suites** (bao gồm nested suites), **667/667 assertions**, 0 failed/pending; `success=true`. JSON `.cache/depart-full-vitest.json` non-empty, testResults có đủ 150 files, tổng assertion khớp 667; không kết luận chỉ từ exit code.
- Nhóm DEPART/academic/projects/evaluations/results/router/paging: 46 files, 193 tests đạt trước full run. Bao gồm request race, scope, đơn/đa ngành, confirmation, khóa gửi trùng, token và conflict.
- Playwright: **23 checks PASS**, 0 pageerrors, 0 unknown fixture endpoints. 16 screenshots: 12 màn hình workspace/qualification/result và 4 workspace trong AppLayout/router thật. Viewports 375/768/1024/1440 không tràn ngang. File `test-results/department/browser-results.json`, `trace.zip`, `app-workspace-375.png` và các ảnh cùng thư mục (ignored).
- Đã xem ảnh qualification/workspace/result ở 375 px: controls/cards đọc được, navigation wrap, không có bảng rộng bắt buộc kéo ngang; sửa search field qualification thành full-width trên mobile. Harness nạp cùng Google fonts/Material Symbols với entry chính, không lấy ảnh thiếu font làm bằng chứng UI hoàn tất.
- Actual mocked app login → DEPART workspace → sidebar qualification qua router thành công; credentials hoàn toàn synthetic. Các mutation fixture được intercept, không gọi BE.

### Kiểm tra BE thật chỉ đọc

Ngày 2026-10-07, origin `http://localhost:5173`, phiên `DEPARTMENT_STAFF`, department 2 active. Không lưu token/session/credentials trong report/evidence.

| API | HTTP | Quan sát |
| --- | --- | --- |
| `/api/v1/auth/me/context` | 200 | DEPART, active department scope; selected semester FA26 |
| `/api/v1/projects/review-queue?page=1&pageSize=20` | 200 | totalCount 0; không có hồ sơ để thử quyết định |
| `/api/v1/student-qualifications/verification-queue?page=1&pageSize=20` | 200 | totalCount 0; không có pending hồ sơ để thử verify/reject |
| `/api/v1/dashboards/department?page=1&pageSize=5` | 200 | totalCount 4; ACTIVE/APPROVED projects |
| `/api/v1/supervisors?page=1&pageSize=20` | 200 | totalCount 3; danh bạ đọc được |
| `/api/v1/projects/2`, `/projects/2/governance` | 200 | Project/governance DTO đọc được bằng DEPART |
| Project 2 `/reporting-cycles`, `/action-items`, `/evidence` (page 1, size 20) | 200 | Paged shape đúng contract; totalCount 0 ở cả ba |
| `/api/v1/evaluation-schemes?projectId=2` | 200 | Chưa có scheme |
| `/api/v1/projects/2/result/preview` | 409 | BE yêu cầu published scoped evaluation scheme; legacy results chỉ đọc |

Đây là runtime API smoke trên FE hiện có ở cổng 5173, không phải chứng minh bản worktree đã hoàn tất live DEPART E2E. Kiểm tra trước khi chuyển tài khoản: cổng `http://localhost:5187` phục vụ worktree mới, direct `/department/workspace` với phiên STUDENT chuyển về `/project/overview`, xác nhận actor guard ở runtime. GET `/api/v1/auth/me/context` trả `STUDENT`; GET review queue trả HTTP 403 với yêu cầu Admin hoặc Department Staff, xác nhận BE từ chối đúng actor. Chưa gửi quyết định học thuật, thay giảng viên, công bố hoặc archive vào dữ liệu thật.

### Trạng thái bàn giao

| Hạng mục | Trạng thái | Căn cứ |
| --- | --- | --- |
| Đồng bộ BE/FE, worktree và 3 báo cáo | DONE | Baseline SHA và Git status đã ghi; BE sạch; checkout FE chính giữ thay đổi có trước |
| FE cải thiện có contract (queue, paging, navigation, guards, confirmation, result, assignment) | DONE trong phạm vi code/fixture | Full tests và browser ở trên |
| Secure certificate/canonical governance lead/mentor capability và quyền cấu trúc DEPART | FE_DONE_BE_PENDING | DEPART-BE-01…04 trong Báo cáo 2; không sửa BE |
| Các luồng đã có: topic, evaluator, scheme, final package, archive | PARTIAL | Contract/code/regression được đối chiếu; thiếu mutation live lifecycle evidence |
| Mutation E2E DEPART thật | BLOCKED | Đã có phiên DEPART ở 5187; còn cần ID/data được phép cho mutation; pending queues thật đang rỗng |
| Toàn bộ DEPART | PARTIAL | Không đánh dấu DONE khi gap BE và lifecycle E2E còn tồn tại |


## 8. Cập nhật sau khi người dùng đăng nhập DEPART trên FE mới

Ngày 2026-10-07, origin `http://localhost:5187`. GET auth context xác nhận `sep490.coordinator@fpt.edu.vn`, role `DEPARTMENT_STAFF`, department 2, active scope. Không còn blocker đăng nhập DEPART.

- Kiểm tra đọc UI qua **Chrome DevTools** với BE thật trên 16 route: workspace, qualification, review queue, portfolio, governance project 2, result project 2, academic governance, supervisors, topics, archives, scheme, evaluators, final requirements, final submission, files, contributions. Không gửi mutation. Route governance đã đợi tải hoàn tất để kiểm tra dữ liệu, không lấy loading làm bằng chứng thành công.
- Workspace hiển thị 4 projects/3 profiles; qualification/review queue empty đúng BE. Academic governance không mở structure CRUD cho DEPART. Project 2 governance hiển thị assignments PRIMARY/DISCIPLINE_MENTOR và precondition không end trên ACTIVE; không mở quyền khi thiếu canonical lead.
- Project 2 result giữ thông báo BE `A published scoped evaluation scheme is required. Legacy results remain read-only.`; không còn form ghi legacy. Scheme roster/evaluation periods/final locked package chưa sẵn sàng được thể hiện bằng empty/precondition, không giả lập thành công.
- Kho tệp đọc được 6 files; contribution đọc 5 thành viên. Không tải file hoặc lưu snapshot/mutation.
- **20 kiểm tra responsive live**: workspace, qualification, portfolio, governance, result × 375/768/1024/1440. Dùng device viewport emulation và xác nhận `innerWidth` khớp width yêu cầu trước khi so `scrollWidth`; không coi resize cửa sổ bị Chrome giới hạn minimum width là kiểm tra 375px. Tất cả không overflow, không còn loading ở thời điểm đo. Workspace/result mobile được xem ảnh inline; text/cards/navigation đọc được. Workspace console cuối không có error/warn.
- Evidence local (ignored): `test-results/department/live/live-results.json`, mode `LIVE_READ_ONLY_CHROME_DEVTOOLS`, `mutations=0`. Tool DevTools từ chối ghi ảnh vào worktree theo access roots của tool; đã xem ảnh inline, không báo đã lưu live screenshots. Bộ ảnh/trace Playwright fixture trước đó vẫn nằm riêng ở `test-results/department/`.
- Đây là **live read-only UI smoke**, không gắn nhãn Playwright live E2E. Playwright 23 fixture checks và full Vitest 667 assertions vẫn là bằng chứng riêng. Không sửa product source trong lần cập nhật này; chỉ thêm kết quả kiểm chứng/báo cáo, `git diff --check` vẫn đạt.

Trạng thái tổng hợp vẫn **PARTIAL**: runtime đọc trên FE mới đã kiểm chứng, nhưng verify/reject, revision/resubmit, quyết định đa khoa, assignment replacement, publication và archive live cần fixture/IDs được phép và trạng thái nghiệp vụ phù hợp. Đăng nhập thành công không cấp phép thử mutation trên mọi dữ liệu của khoa.


## 9. Tra cứu tài khoản và fixture trong DB do người dùng cung cấp

Ngày 2026-10-07. Kết nối SQL Server bằng `ApplicationIntent=ReadOnly`; chỉ SELECT metadata và dữ liệu liên quan tới account/role/scope/fixture. Không ghi connection string, mật khẩu, password hash hoặc token vào file/báo cáo; không UPDATE/INSERT, đặt lại mật khẩu, chạy seed hay tạo DB. `ApplicationIntent` là ý định kết nối; tính chỉ đọc của lần kiểm tra được bảo đảm thêm bằng danh sách câu lệnh SELECT đã thực thi, không coi login quyền cao tự trở thành read-only.

| ID | Account | Role DB | Scope DB / quyết định |
| --- | --- | --- | --- |
| 5 | `sep490.coordinator@fpt.edu.vn` | DEPARTMENT_STAFF | ACTIVE, department 2; API auth context/phiên UI đã xác minh, dùng làm baseline DEPART |
| 30003 | `test.staff@aipms.test` | DEPARTMENT_STAFF | ACTIVE, department 2; account test riêng; login preflight với mật khẩu chung không thành công, không đổi hash hoặc dò thêm mật khẩu |
| 30002 | `test.admin@aipms.test` | ADMIN | Không dùng để chứng minh quyền DEPART |
| 30004 | `test.lecturer@aipms.test` | LECTURER | Actor bổ trợ supervisor/evaluator; chưa thử API login |
| 30005 | `test.student@aipms.test` | STUDENT | Major thuộc department 2, academic profile PENDING; chưa đủ chứng minh eligible participant |

BE `PasswordHashingService` sử dụng ASP.NET Identity PasswordHasher. Cột `users.password_hash` không cung cấp mật khẩu gốc để đăng nhập; không decode/crack hoặc đổi hash. Không tìm thấy cấu hình credential của `test.staff@aipms.test` trong workspace được tìm kiếm. DB access không thay thế application login.

| Dataset trong DB | Số bản ghi tại thời điểm kiểm tra | Hệ quả kiểm thử |
| --- | --- | --- |
| student_qualifications | 0 | Không có pending hồ sơ cho verify/reject |
| Projects SUBMITTED/UNDER_REVIEW/REVISION_REQUIRED | 0 | Không có fixture cho quyết định/revision/resubmit hiện hành |
| evaluation_schemes | 0 | Không có scheme published/roster để publication |
| final_submissions | 0 | Không có locked package cho chuỗi evaluation/publication |
| project_results | 0 | Chưa có kết quả để kiểm chứng publication/archive |

DB có 4 projects (2 ACTIVE, 2 APPROVED); một project gắn `[TEST] Video Meeting Integration` phục vụ scenario khác, không mặc định chuyển sang fixture DEPART hoặc thay state. Có 2 tài khoản DEPARTMENT_STAFF với active department scope; chưa có account staff của khoa tham gia/ngoài khoa để chứng minh chuỗi multi-department bằng actor thật.

Repository `ai-pms-backend/docs/remediation-e2e.md` ghi: “Never point mutation tests at the shared `AI_PMS` database.” Bootstrap cách ly có sẵn tại `scripts/new-e2e-database.ps1` dùng DB `AI_PMS_E2E_<guid>` và owner marker, runtime password hash, aliases và actors nhiều khoa. Chưa chạy bootstrap hoặc đổi cấu hình BE trong phạm vi FE này. Nếu cần tiếp tục mutation E2E, cần fixture cách ly hợp lệ và credentials ứng dụng; không xem việc cấp DB connection là cho phép sửa account/password/role hoặc chạy mutation trên mọi đồ án.

Kết quả: account discovery **DONE**, live DEPART read-only **DONE**, mutation lifecycle **BLOCKED bởi fixture/credentials**, tổng thể **PARTIAL**. Các bằng chứng FE và blocker BE ở §7–§8 vẫn giữ nguyên.


## 10. Playwright với BE thật sau khi người dùng cung cấp mật khẩu ứng dụng

Người dùng cung cấp mật khẩu chung qua chat; mật khẩu không được ghi trong source, `.env`, report hoặc artifacts. Login `sep490.coordinator@fpt.edu.vn` thành công HTTP 200; auth context HTTP 200 xác nhận DEPARTMENT_STAFF, không có ADMIN, department 2 active. Không cần thử fallback Admin để chứng minh DEPART.

Runner mới: `scripts/department-live-browser-check.mjs`. Credentials lấy từ process environment `AIPMS_TEST_EMAIL`/`AIPMS_TEST_PASSWORD`; không ghi trace/HAR/storageState cho session thật. Browser context được đóng sau kiểm tra. Chỉ cho phép auth requests và GET/HEAD/OPTIONS; domain writes bị chặn và làm fail khi xuất hiện. Không ghi request body, headers/token hoặc raw Playwright errors có thể chứa entered values.

**LIVE_READ_ONLY_PLAYWRIGHT: 40/40 checks PASS**:

- 1 kiểm tra login bằng UI + auth scope thật;
- 16 route thực tế tải được heading và dữ liệu/empty/precondition, không redirect sai actor, không có unexpected alert;
- 20 kiểm tra responsive: 5 màn hình × 375/768/1024/1440;
- 3 kiểm tra readonly academic structure, scheme prerequisite/no legacy write form và sidebar navigation.

Evidence: `test-results/department/live-playwright/results.json` (ignored), 20 screenshots cùng thư mục. JSON xác nhận `realBackend=true`, `domainMutations=0`, 0 pageerrors và 0 blocked domain writes. Ảnh screenshot chốt trạng thái CSS transitions bằng `animations: disabled`; ảnh governance/workspace 375px đã được xem, cards và navigation đọc được, không tràn ngang. Đây là Playwright runtime thật, không dùng API fixture. Ba HTTP lỗi có ý nghĩa nghiệp vụ: final-submission 404 (chưa khóa package), result 404 (chưa công bố), result preview 409 (chưa có published scheme); UI thể hiện đúng empty/precondition.

Sau thêm runner: lint và diff-check đạt. Product code không thay đổi so với full suite 150 files/667 tests trước đó; không lặp full suite để thay thế bằng chứng lifecycle còn thiếu.

Credential blocker cho baseline DEPART đã được gỡ. Tài khoản `test.staff` chưa đăng nhập được; bộ actor đa khoa/sinh viên eligible và fixture mutation vẫn thiếu. Tổng thể vẫn **PARTIAL**, mutation lifecycle cần môi trường E2E cách ly theo repository guidance; chưa tạo DB, sửa BE hoặc gửi mutation nghiệp vụ vào `AI_PMS`.

## 11. Rà soát chức năng và cách thao tác — cập nhật 07/10/2026

Báo cáo 1 §9 mô tả 14 nhóm chức năng, từng bước vận hành, actor tiếp theo và giới hạn contract; báo cáo 2 §4 ghi các gap FE đã sửa. Mục này cập nhật bằng chứng sau các cải thiện mới, thay cho số lượng kiểm thử lịch sử ở §7–§10.

### Thay đổi FE và acceptance

| Thay đổi | Acceptance đã kiểm tra | Giới hạn |
| --- | --- | --- |
| Đề tài: form toàn bộ đề cương, danh mục kỳ/ngành, nhiều requirements và trách nhiệm | Tạo payload đúng DTO; SINGLE_MAJOR đúng primary requirement; INTERDISCIPLINARY ít nhất hai ngành không trùng; sửa toàn bộ nội dung; publish bản đã lưu; close có reason/confirmation | Không gửi mutation live; BE kiểm tra thời gian kỳ, scope, policy và điều kiện công bố cuối |
| Topic hooks | 409 tải lại hồ sơ, không replay; khóa request trùng; bỏ response cũ sau đổi topic | Bằng chứng unit/fixture, chưa lifecycle BE thật |
| Điều hướng theo project | Mobile combobox giữ project ID và Back; desktop tabs; 375/768/1024/1440 không tràn ngang | Route guards phục vụ UX, API kiểm tra quyền |
| Hướng dẫn vòng đời ở workspace | Disclosure mở bằng bàn phím, links đến màn hình sẵn có | Hướng dẫn không cấp quyền hoặc thay action BE |
| Kỳ học vụ | UPCOMING không bị ghi thành đóng; ACTIVE ngoài thời gian mở được phân biệt; ngày theo Asia/Ho_Chi_Minh | Status và window vẫn từ BE |
| Governance và kết quả | Lý do chỉ đọc phân biệt thiếu canonical lead/mismatch/scope/state; có link kiểm tra hồ sơ bàn giao trước preview | Legacy project thiếu scope vẫn chỉ đọc; không giả lập điểm/token |

### Bằng chứng mới nhất

- Typecheck, lint, build và `git diff --check`: đạt. Build vẫn cảnh báo chunk ứng dụng/LiveKit trên 500 kB; chưa thêm dependency hoặc thay cấu trúc bundle trong phạm vi này.
- Full Vitest: **151 file / 676 tests PASS**; reporter đã hoàn tất exit 0. JSON `.cache/depart-full-vitest.json` không rỗng, đã đối chiếu tổng 676 assertions, 676 passed, 0 failed, 0 pending, 0 file không passed và `success=true`.
- Mock Playwright: **23 checks PASS**, mode `MOCKED_COMPONENT_AND_APP_BROWSER`; API intercepts nên không dùng làm bằng chứng mutation thật.
- Live Playwright: **46/46 checks PASS**, 0 pageerrors, 0 blocked writes, `realBackend=true`, `domainMutations=0`; thêm mobile navigation/Back, keyboard disclosure và form đề tài liên ngành ở bốn viewport. Chỉ nhập/chọn dữ liệu form, không bấm lưu/công bố; domain mutation bị chặn trong runner. Kết quả đã lưu tại `test-results/department/live-playwright/results.json` và ảnh `topic-form-*.png`.
- Nhãn accessible của các select được đặt rõ ràng, tránh tên điều khiển bị nối với toàn bộ option text khi tìm bằng nhãn hoặc dùng công cụ hỗ trợ.

Trạng thái bàn giao: **PARTIAL**. FE và các màn hình đọc có bằng chứng; chưa chứng minh trọn chuỗi verify → review/revision → assignment → scoring → publication → archive bằng mutation BE thật vì fixture cách ly và actor nhiều khoa chưa đủ. Các blocker BE trong ma trận vẫn giữ nguyên. Không sửa BE/DB, không commit/push/PR/merge.

## 12. Bàn giao phân tích ba báo cáo và nhiệm vụ BE/DB

Tài liệu mới [04_DEPART_BE_DB_HANDOFF.md](04_DEPART_BE_DB_HANDOFF.md) phân tích cả ba báo cáo và chia 8 tickets: canonical governance scope/readiness, certificate scope, assignment capability/candidates, qualification expected token, authority học vụ, publication xuyên khoa/legacy, optional export và isolated lifecycle fixtures. Mỗi ticket có BR/nguồn, API hiện có vs đề xuất, DB decision, AC, TC và DoD. Chưa có endpoint đề xuất nào được FE gọi; chưa chạy DDL hoặc thay đổi BE.

### FE đã hoàn thiện thêm

| Gap | Thay đổi | Acceptance và bằng chứng |
| --- | --- | --- |
| Portfolio thiếu trạng thái của BE | Bổ sung SUBMITTED/REVISION_REQUIRED/REJECTED/SUPERVISOR_PENDING, nhãn trạng thái tiếng Việt | Unit xác nhận lựa chọn và filter/page=1 gửi BE, không lọc giả trên trang đầu |
| Portfolio response cũ/error | Request version + clear old rows, dùng typed error classification | Unit deferred response cũ không thay dataset; direct API paging giữ nguyên |
| Archive native confirm không đồng bộ | Modal/useActionConfirmation có code/title, khóa mutation trước dialog, hủy hoặc filter đổi không gửi; fresh project token adapter giữ nguyên | Unit cancel/409 reload/no replay; Playwright mock keyboard Enter/Escape, responsive dialog bốn viewport và fresh token payload |
| Topic chỉ summary chung và công bố khi edits chưa lưu | Inline errors aria-invalid/describedby + summary field links/focus; publish disabled đến khi save thành công | Unit invalid inter mode/fields + unsaved publish; live empty form validation không phát sinh domain write |

Kiểm tra liên quan: **2 files / 12 tests PASS**; typecheck đạt sau sửa. Skill search `error summary validation` trả đúng guideline Forms/Accessibility: summary focus/link invalid field và inline error. Screenshot archive dialog 375px đã xem: nội dung/định danh, buttons và focus đọc được, không tràn ngang; primitive modal phục vụ Escape/focus containment.

- **Mock Playwright 28/28 checks PASS**, gồm 5 checks archive mới; trace/screenshot và `browser-results.json` ở `test-results/department/`. Domain writes ở đây bị API fixture intercept, không đại diện BE thật.
- **Live Playwright 47/47 checks PASS**, `realBackend=true`, `domainMutations=0`, zero pageerrors/blocked writes; thêm validation summary focus link trên form đề tài với BE thật. Chỉ empty submit bị FE chặn và nhập/chọn form, không quyết định nghiệp vụ thật.
- Full Vitest sau toàn bộ sửa FE: **151 files / 680 tests PASS**, reporter exit 0. `.cache/depart-full-vitest.json` nonempty, assertions sum=680, passed=680, failed=0, pending=0, zero file không passed, success=true đã được đối chiếu. Typecheck, lint, build và diff-check đạt; build vẫn có cảnh báo chunk ứng dụng/LiveKit >500 kB.

Giới hạn: chưa chứng minh các ticket BE/DB đã được thực hiện; live mutation lifecycle thiếu fixture cách ly. Tổng thể **PARTIAL**, các capability/contract chưa có **FE_DONE_BE_PENDING**; optional policy/export/PROPOSED phải chốt scope trước khi thành tiêu chí release. Vite FE cổng 5187 đã được khởi động lại để review. Không thêm dependency, không commit/push/PR/merge, BE checkout vẫn clean tại baseline.

## 13. Nối BE mới và kiểm chứng ngày 08/10/2026

BE baseline mới `3742760`, FE base mới `a6f804b`, branch DEPART giữ nguyên. [Báo cáo 05](05_DEPART_BE_SYNC_FE_INTEGRATION_20261008.md) ghi ma trận D01–D08, API cụ thể, thao tác và acceptance còn lại; nó thay các blocker cũ ở §12.

- FE đã nối qualification expected token; modal chứng chỉ và authenticated stream; assignment allowedActions và nested replacement candidates; governance provenance/readiness; CSV/Excel/PDF; blocker công bố xuyên khoa. Assignment COMPLETED/ARCHIVED chỉ đọc theo BE mới.
- Full Vitest **157 files / 707 assertions PASS**. Reporter nonempty, success=true, failed=0, pending=0, không thiếu assertions hoặc file failed; contract/component liên quan **10 files / 36 tests PASS**.
- Mock Playwright **38 checks PASS**, API intercept, `realBackend=false`; trace và screenshots gồm assignment ở 375/768/1024/1440. Mock file Excel/PDF chỉ kiểm transport/filename, không chứng minh parser-valid files.
- Live Playwright **47 checks PASS**, `realBackend=true`, `domainMutations=0`; tài khoản thật khoa #1/project #1 theo scope hiện tại. Lần đầu dùng ID cũ #2 thất bại 404/403; runner đã chọn fixture theo portfolio có quyền rồi chạy lại đạt. Không diễn giải mọi 404 là API thiếu.
- Typecheck/lint/build/diff-check đạt. Warning chat Fast Refresh và build chunk lớn từ upstream vẫn còn; không thêm dependency DEPART.
- Harness chỉ được runner mount khi có flag fixture. Kiểm mở trực tiếp xác nhận heading khóa và không gọi API nghiệp vụ. Không dùng fake actor gọi BE thật; production không import harness.

Trạng thái contract FE **DONE theo source/unit/mock**, live màn hình đọc **DONE với fixture hiện tại**, tổng lifecycle **PARTIAL**. BE có isolated acceptance riêng không thay thế FE browser mutation. Cần môi trường cách ly cho quyết định/thay phân công/chấm/công bố/archive thật; không gửi domain mutation vào shared AI_PMS. Không sửa BE/DB hoặc thực hiện remote delivery.

## 14. Kiểm tra lại UI/UX trên bản đang chạy

Xem [Báo cáo 05 §6](05_DEPART_BE_SYNC_FE_INTEGRATION_20261008.md#6-kiểm-tra-lại-bản-đang-chạy-và-sửa-uiux) cho sửa nhãn lý do assignment, error category/duplicate lock/focus và kích thước nút export. Bằng chứng mới: **17 focused tests**, **39 mock browser checks**, **50 live browser checks**, không domain mutation. Export CSV/XLSX/PDF đã tải qua UI với BE thật và kiểm header/cấu trúc đóng gói cơ bản; không tuyên bố validation toàn nội dung tài liệu.

Full suite sau sửa **157 files / 713 tests PASS**, nonempty JSON, 0 failed/pending/badFiles; typecheck, lint, build, diff-check đạt. Chi tiết reporter/warnings tại báo cáo 05 §6. Không sửa BE/DB, không commit/push/merge.

## 15. Rà BE/dữ liệu và dashboard DEPART

[Báo cáo 06](06_DEPART_CURRENT_DATA_API_REVIEW.md) ghi snapshot qua API có scope: 1 project ACTIVE, qualification queue rỗng, governance ACADEMIC_SCOPE_UNKNOWN/READ_GOVERNANCE và assignments không cho END/REPLACE. FE bổ sung dashboard scope/blockers/readiness/next steps hiện đại và giữ requirements chỉ đọc ngoài DRAFT/REVISION_REQUIRED theo ProjectRequirementsService.

Acceptance mới: 11 focused tests; **158 files/717 tests full suite**, **44 mock browser checks**, **51 live read/export checks**; typecheck/lint/build/diff-check đạt. Reporter nonempty, 0 failed/pending/badFiles; ảnh overview bốn viewport đã lưu và 375px đã xem. Readiness không cấp quyền mutation; mọi links giữ project ID. Không sửa BE/DB, không push/merge. Full lifecycle vẫn PARTIAL vì fixture valid scope/mutation cách ly chưa có.
