# DEPART — Đồng bộ BE, nối FE và kiểm chứng ngày 08/10/2026

> Lần kiểm tra lại sau khi người dùng khởi động dự án và các sửa UI/UX mới nằm ở §6. Số liệu §4 là lần kiểm tra trước đó.

> **Lần rà BE/dữ liệu và hoàn thiện dashboard tiếp theo:** xem [06 — Current data/API review](06_DEPART_CURRENT_DATA_API_REVIEW.md). Bằng chứng mới nhất: 158 files/717 tests, 44 mock checks, 51 live GET/export checks; project legacy hiện UNKNOWN scope.

**Trạng thái tổng thể: PARTIAL.** Contract FE mới đã nối và có kiểm thử; chưa chứng minh toàn bộ lifecycle mutation qua browser với BE thật. Tài liệu này thay thế các nhận định blocker dựa trên baseline cũ trong báo cáo 01–04. Không thay đổi BE/DB, không commit, push, tạo PR hoặc merge nhánh FE.

## 1. Baseline và đồng bộ an toàn

| Repository | Baseline hiện tại | Cách xử lý |
| --- | --- | --- |
| BE `ai-pms-backend` | `3742760582a23e72c878fb61f1dadf225dfbca01`, develop | Fetch rồi fast-forward từ `94a6fcb`; checkout clean sau kiểm tra |
| FE `ai-pms-frontend-depart-completion` | `a6f804bf973e711bb542497b8a9b142a8ad70ca3`, `feat/depart-completion-20261007` | Fetch, stash cả untracked, fast-forward origin/develop, apply lại không conflict |
| FE chính `ai-pms-frontend` | Không sửa checkout đang có thay đổi của người dùng | Giữ nguyên; không reset hoặc chuyển nhánh |

Backup stash `depart-before-sync-20261008` được giữ. Các thay đổi DEPART trước đây vẫn chưa commit, bên cạnh phần nối contract trong lần này. Cài dependency đúng lockfile mới từ upstream; không thêm dependency sản phẩm hoặc sửa package/lockfile cho DEPART.

Nguồn chính: BE `docs/depart-be-db-handoff-implementation.md`, controller/service/DTO và Swagger của BE vừa khởi động tại `http://localhost:5080`; FE tại `http://localhost:5187`. Các PR #102–#105 trong ảnh đã có trong lịch sử develop được đồng bộ. Nội dung ảnh là bằng chứng tham chiếu; quyết định triển khai dựa vào source hiện tại.

## 2. Ma trận nhiệm vụ BE và kết quả FE

| Ticket / nguồn BE | Kết quả BE đã xác minh từ source | FE đã thực hiện | Kết luận và giới hạn |
| --- | --- | --- | --- |
| D01 — ProjectGovernanceService; `Features/Projects/DTOs/ProjectGovernanceDtos.cs` | Scope frozen được xác thực, provenance và readiness từ workflow/result service | Đọc provenance, final/result status, readiness; UNKNOWN khóa thao tác học thuật | **Đã đủ phần nối FE/API**; mutation lifecycle thật chưa kiểm chứng |
| D02 — StudentQualificationsController; `Features/StudentQualifications/DTOs/StudentQualificationDtos.cs` | Metadata chứng chỉ và protected stream theo hồ sơ; upload riêng cho sinh viên | Modal metadata/tải chứng chỉ có auth, retry, bảo vệ khi file thay đổi | **Đã đủ phần DEPART**; upload của sinh viên nằm ngoài phạm vi lần này; stream thật chưa có hồ sơ chứng chỉ fixture phù hợp |
| D03 — SupervisorAssignmentsController; `Features/Supervisors/DTOs/SupervisorAssignmentDto.cs` | allowedActions/reasons từng assignment; ứng viên nested theo assignment, phạm vi và capacity | Bỏ quyền suy diễn từ governance; candidate search/paging, capacity/expertise, dialog lý do, recheck quyền trước gửi | **Đã đủ phần nối FE/API**; participating mentor được xử lý theo quyền của chính assignment; replacement/END thật chưa chạy |
| D04 — qualification DTO và verify/reject handlers | Concurrency token của phiên bản hồ sơ; quyết định kiểm tra expected token | Gửi token đúng bản đang hiển thị; thiếu token khóa quyết định; 409 refresh, không replay | **Đã đủ phần nối FE/API**; kiểm chứng token/payload và stale bằng unit/mock |
| D05 — academic structure/policy authorization | Vẫn AdminOnly; không mở quyền cho DEPART | Giữ màn hình học vụ chỉ đọc và điều hướng theo quyền | **Đã đủ** theo quyền hiện hành, không phải blocker cần mở quyền |
| D06 — result publication authority/preview | Kết quả xuyên khoa cần ADMIN; kết quả sinh viên theo scope | Diễn giải blocker ADMIN_REQUIRED_FOR_CROSS_DEPARTMENT_PUBLICATION; giữ preview và luồng chuyển actor | **Đã đủ phần nối FE/API**; không mở nút công bố dựa riêng vào trạng thái UI |
| D07 — Dashboard export controller/service/validator | CSV/XLSX/PDF, scope/filter server, giới hạn và audit | Chọn định dạng, protected download, đúng phần mở rộng; không gửi page/pageSize vào export | **Đã đủ phần nối FE/API**; mock chỉ chứng minh transport, không chứng minh nội dung PDF/XLSX thật |
| D08 — `scripts/test-depart.ps1` và isolated lifecycle tests | BE báo cáo API lifecycle đơn ngành/liên ngành với DB cách ly | Runner browser mock tách dữ liệu thật; live runner chọn project theo portfolio có quyền | **PARTIAL ở FE lifecycle thật**; cần môi trường/fixtures cách ly để chạy mutation browser |

Nguồn nghiệp vụ Report 3, Report 4 và Governance Baseline vẫn được truy vết trong báo cáo 01–04. Các đề xuất `[PROPOSED]` không tự trở thành endpoint hoặc quyền mới. D05/D06 là quyết định phân quyền hiện hành, không phải yêu cầu FE lách quyền.

## 3. Contract quan trọng và hướng dẫn thao tác

### Xác minh điều kiện sinh viên

1. Mở `/department/student-qualifications`, lọc và chọn hồ sơ thuộc khoa.
2. Bấm **Xem chứng chỉ** để đọc metadata; **Tải chứng chỉ** sử dụng stream được xác thực. Không có public storage URL.
3. Xem bằng chứng của phiên bản đang hiển thị rồi xác minh hoặc từ chối kèm lý do.
4. Verify gửi `{ expectedConcurrencyToken }`; reject gửi `{ reason, expectedConcurrencyToken }`. Nếu hồ sơ được nộp lại, BE trả 409: FE tải lại và yêu cầu xem lại, không tự gửi quyết định lần nữa.

API mới dùng: `GET /api/v1/student-qualifications/{id}/certificate` và `GET .../{id}/certificate/download`. DTO token nằm trên StudentQualificationDto. Khi token thiếu, FE khóa quyết định để không dùng compatibility path thiếu kiểm soát phiên bản.

### Điều phối và thay giảng viên

1. Từ portfolio mở **Điều phối đồ án**, xem scope/readiness và danh sách assignment.
2. Mỗi assignment dùng `allowedActions` từ BE. PRIMARY thuộc quyền khoa chủ trì; mentor dùng khoa phụ trách ngành theo frozen scope. Không dùng một boolean chung để cấp quyền tất cả assignment.
3. Bấm **Chọn người thay thế**, tìm và chuyển trang ứng viên; xem sức chứa, chuyên môn, khoa phụ trách.
4. Chọn ứng viên eligible, xác nhận lý do. FE đọc lại assignment trước khi gửi; BE vẫn kiểm tra quyền và sức chứa trong transaction.
5. Khi 409, tải lại assignment/ứng viên qua luồng xem lại; không replay mutation.

API: `GET /api/v1/supervisor-assignments/{id}/replacement-candidates?page=1&pageSize=20&search=...`. Items có `{ candidate, assignmentType, majorId, responsibleDepartmentId, eligible, reasons, expertiseMatch }`, không phải một danh sách SupervisorCandidateDto phẳng.

**BR đã thay đổi so với FE cũ:** chỉ trạng thái ACTIVE được thay/kết thúc assignment khi BE cấp quyền; COMPLETED và ARCHIVED chỉ đọc. Đồ án đóng không chiếm capacity theo BE, nhưng điều đó không cấp quyền sửa phân công.

### Kết quả và export

- Trang kết quả giữ preview, blockers và actor công bố. Xuyên khoa phải chuyển ADMIN; khoa không tự công bố toàn bộ bằng quyền local.
- Portfolio: chọn bộ lọc → chọn CSV/Excel/PDF → Xuất. Export dùng scope/filter BE; không giới hạn ở trang đang xem. Không tự tổng hợp toàn khoa từ trang đầu.
- `GET /api/v1/dashboards/portfolio/export?format=csv|xlsx|pdf`; vượt giới hạn server phải hiển thị lỗi để người dùng thu hẹp bộ lọc.

## 4. Acceptance và bằng chứng ngày 08/10/2026

| Kiểm tra | Kết quả | Phạm vi |
| --- | --- | --- |
| Full Vitest | **157 files / 707 assertions PASS**, failed=0, pending=0, success=true, 0 file không passed | `.cache/depart-full-vitest.json` nonempty; đã đối chiếu tổng assertions, không chỉ exit code |
| Contract/component liên quan | **10 files / 36 tests PASS** | `.cache/depart-contract-tests.json`; payload token, protected paths, candidates/actions, conflict, format/filter |
| Typecheck, lint, build, diff-check | Đạt | Lint có warning Fast Refresh từ chat upstream; build có warning chunk ứng dụng/LiveKit >500 kB |
| Mock Playwright | **38 checks PASS** | `test-results/department/browser-results.json`, screenshots, trace.zip; API intercepted, realBackend=false |
| Live Playwright | **47 checks PASS**, domainMutations=0 | `test-results/department/live-playwright/results.json`; 16 routes, responsive 375/768/1024/1440, keyboard/navigation/validation; realBackend=true |

Mock cover: reviewed token, chứng chỉ protected stream và file thay đổi, participating mentor actions, candidate paging/expertise/capacity, conflict không replay, download transport Excel/PDF, responsive/dialog/keyboard và khóa harness khi mở trực tiếp. Fixture chỉ mount khi runner cấp flag; ứng dụng production không import harness, API mode không tự fallback sang mock.

Lệnh mock: `node scripts/department-browser-check.mjs`. Live runner: `node scripts/department-live-browser-check.mjs`, yêu cầu `AIPMS_TEST_PASSWORD` trong process environment; không ghi password, token, storage state, HAR hoặc trace live. Có thể chỉ định `DEPART_TEST_PROJECT_ID`, nếu không runner lấy project từ portfolio có quyền. Tất cả domain write bị chặn, auth riêng được phép.

Live runtime hiện tại: coordinator thuộc khoa #1; project có quyền hiện thấy #1 ACTIVE. Lần chạy đầu dùng project #2 cũ nhận 404/403 và đã bị đánh dấu thất bại; không xem đó là endpoint thiếu. Runner được sửa chọn fixture theo scope rồi chạy lại đạt. Số liệu scope/kỳ/project chỉ là snapshot ngày kiểm tra, không được hardcode vào UI.

BE handoff báo cáo 994 unit tests, 539 distinct integration tests và 45/45 schema checks. Đây là **bằng chứng do BE cung cấp**, không phải bộ kiểm thử BE được chạy lại trong phiên FE này. Không dùng nó để tuyên bố FE browser mutation đã đạt.

## 5. DB và phần còn lại trước merge/release

BE xác nhận **NO_DB_CHANGE**: tái sử dụng concurrency/certificate FK, private file, snapshot, assignment và evaluation/result tables. Không cần đề xuất thêm EF migration chỉ để hiển thị FE; không chạy DDL, seed hoặc sửa DB dùng chung. Schema claim 45/45 là báo cáo BE, chưa kiểm tra SQL độc lập lại trong phiên này.

Chưa đóng acceptance toàn DEPART: browser mutation xuyên actor/khoa, sinh viên nộp lại chứng chỉ giữa review, quyết định đa khoa/revision-resubmit, assignment có capacity cạnh tranh, scoring-preview-publication và archive thật. D08 hỗ trợ fixture BE cách ly nhưng chưa đồng nghĩa đã cung cấp môi trường để FE browser sử dụng. Cần BE/QA cấp URL, account/actor và per-run IDs của môi trường cách ly; sau đó chạy lifecycle browser, không dùng DB shared AI_PMS.

Phần nối các contract mới: **DONE theo source + unit/mock**. Live màn hình đọc: **DONE với fixture hiện tại**. Toàn lifecycle DEPART: **PARTIAL**. Không còn coi D01–D07 là contract chưa tồn tại; những gap ngoài khả năng/quyền BE hiện hành vẫn giữ kết luận riêng trong ma trận, không tự mở rộng quyền FE.

## 6. Kiểm tra lại bản đang chạy và sửa UI/UX

Ngày 08/10/2026, theo yêu cầu dùng skill test sau khi khởi động dự án. Dùng `ui-ux-pro-max`, design-system AI-PMS, Playwright và Chrome DevTools. Không thêm dependency, không sửa BE/DB hoặc thực hiện remote delivery.

### Lỗi phát hiện và sửa FE

| Quan sát | Sửa | Acceptance |
| --- | --- | --- |
| Assignment ngoài scope hiện mã kỹ thuật khó hiểu | Dịch 6 reason codes thực sự có trong SupervisorAssignmentWorkflow sang tiếng Việt; code chưa biết giữ nguyên, không đoán quyền | Unit và browser mock xác nhận lý do ngoài khoa bằng tiếng Việt và không có action |
| Export gom lỗi auth/permission/service thành một thông báo chung | Dùng departmentError cho 401/403/503, giữ thông báo giới hạn 422 | Unit kiểm tra đúng từng loại, không báo thành công khi thất bại |
| Export chỉ khóa bằng React state và nút cao 40px | Thêm synchronous ref lock, target 44px và focus-visible theo MASTER | Unit ngăn request trùng; Chrome đo nút 44px |
| Mock assignment dùng reason không có trong workflow hiện tại | Đổi fixture sang OUTSIDE_ASSIGNMENT_SCOPE từ BE | Fixture không được dùng để phát minh contract |

Skill search `touch target size` trả guideline Touch Target Size/Target Size Minimum. 44px là lựa chọn theo MASTER của dự án; không tuyên bố đó là ngưỡng WCAG phổ quát. Tìm “plain language” không cho match đủ sát, nên dịch reason codes theo source BE và nhãn nghiệp vụ thay vì lấy kết quả search không phù hợp.

### Bằng chứng mới

- **2 files / 17 focused tests PASS**, `.cache/depart-ux-focused.json`.
- Full suite sau sửa: **157 files / 713 assertions PASS**, reporter `.cache/depart-ux-full-vitest.json` 261222 bytes, assertions=passed=713, failed=0, pending=0, badFiles=0, success=true, exit 0 đã đối chiếu. Typecheck, lint, production build và diff-check đạt; 3 warning Fast Refresh của chat và cảnh báo chunk lớn vẫn giữ từ upstream. BE checkout vẫn clean.
- **39 mock browser checks PASS**, không pageerror/unknown endpoint, trace và ảnh tại `test-results/department/`; ảnh assignment 375px đã xem: lý do tiếng Việt, controls/capacity/paging đọc được, không tràn ngang. Có các viewport 375/768/1024/1440.
- **50 live browser checks PASS**, `realBackend=true`, `domainMutations=0`, zero pageerrors/blocked writes. 3 checks mới tải export thật bằng nút FE: CSV 461 bytes, XLSX 1794 bytes, PDF 23658 bytes trong snapshot hiện tại; kiểm extension, file nonempty, PDF `%PDF-`, XLSX `PK`, workbook/content-type entries. Không lưu nội dung export vào report; xóa download artifact sau kiểm tra. Đây là kiểm transport/header/packaging, chưa kiểm nội dung từng ô hoặc render toàn bộ PDF.
- Chrome DevTools trên phiên DEPART thật: governance/portfolio không có unexpected alert, governance không có console error/warning, export button đo 44px. Chrome resize có giới hạn cửa sổ trên máy; bằng chứng viewport đúng 375px dùng Playwright, không dùng chiều rộng cửa sổ Chrome để khẳng định mobile.

Phần FE sửa trong lần này **DONE** theo focused/browser evidence. Lifecycle mutation thật toàn DEPART vẫn **PARTIAL**; kiểm auth/GET/export không thay cho verify/revision/assignment/publication/archive trên fixture cách ly. Export GET có thể tạo audit server theo contract; “domainMutations=0” không có nghĩa server tuyệt đối không ghi audit/auth.
