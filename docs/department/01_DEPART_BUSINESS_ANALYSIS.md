# Báo cáo 1 — Nghiệp vụ DEPART và phạm vi hoàn thiện

> **Cập nhật 08/10/2026:** đã đồng bộ BE `3742760` và FE `a6f804b`, nối các contract DEPART mới. Xem [05 — Đồng bộ và kết quả hiện tại](05_DEPART_BE_SYNC_FE_INTEGRATION_20261008.md). Các baseline/blocker phía dưới là lịch sử 07/10; kết luận mới và cách thao tác ở báo cáo 05 có ưu tiên. Assignment COMPLETED/ARCHIVED chỉ đọc; END/REPLACE chỉ ACTIVE và phải có capability BE.

Ngày: 2026-10-07. Actor trong code: `DEPARTMENT_STAFF` (DEPART là tên gọi nghiệp vụ, không thêm role mới).
BE baseline: `deb0a54d2e235b13c794dbaab19925a1dcf2319c`.
FE baseline: `e415499d060873e2764771bdc931fe3939a9f929`.
Branch: `feat/depart-completion-20261007`; chỉ sửa FE, không commit/push/PR/merge.

## 1. Nguồn và cách giải quyết khác biệt

- Report 3: `F:/AI-PMS/docs/context_md/03_srs_requirements.md`, từ DOCX SRS trong workspace; đặc biệt §3.4–3.8, §3.16–3.17, bảng BR/MSG và traceability.
- Report 4: `F:/AI-PMS/docs/context_md/04_sdd_design.md`, từ DOCX SDD; đặc biệt §3.3–3.7, §3.15–3.16.
- Governance Baseline: `F:/AI-PMS/docs/context_md/governance_baseline.md`, §2, §6–§9, §12, §15 và phụ lục quyết định D1–D12.
- BE: controller → handler/service → scope/state validation tại `F:/AI-PMS/ai-pms-backend/src/`.
- FE: route → API adapter → hook → page và tests tại worktree này; design system `design-system/ai-pms/MASTER.md`.

SRS mô tả mục tiêu nghiệp vụ; SDD mô tả phân tách trách nhiệm và lưu snapshot. Contract BE hiện hành quyết định hành động FE có thể thực hiện. Phần `[PROPOSED]` không phải chức năng đã vận hành. Các schema/migration có trong repo không chứng minh DB đang chạy đã có dữ liệu hoặc migration tương ứng; phiên này không sửa DB; sau khi người dùng cung cấp kết nối, metadata/tài khoản/trạng thái fixture đã được đối chiếu bằng SELECT-only (Báo cáo 3 §9).

## 2. Mục tiêu nghiệp vụ

DEPART điều hành tính hợp lệ học thuật của đồ án trong phạm vi khoa: kiểm tra điều kiện sinh viên, quản lý đề tài, thẩm định, điều phối nguồn lực, theo dõi thực hiện, tổ chức đánh giá, công bố kết quả và lưu trữ. Màn hình phải nối được các bước bằng cùng một project/snapshot, có thông tin đủ để ra quyết định và chỉ thực hiện thao tác được server chấp nhận.

Đánh giá thành công dựa trên: truy cập đúng phạm vi, quyết định đúng phiên bản, không bỏ sót dữ liệu do phân trang, không có form gọi API legacy bị cấm, thao tác có xác nhận và phản hồi rõ ràng, thiết kế thống nhất và có bằng chứng kiểm thử.

## 3. Actor, scope và trách nhiệm

| Actor/scope | Trách nhiệm | Ranh giới thực thi |
| --- | --- | --- |
| DEPARTMENT_STAFF có scope đang hoạt động | Điều hành nghiệp vụ của khoa | Role không thay thế scope; BE kiểm tra lại từng resource |
| Khoa chủ trì | Thẩm định cuối, điều phối theo contract | Lấy lead từ academic scope do BE trả, không lấy khoa đầu tiên theo thứ tự ID |
| Khoa tham gia | Quyết định học thuật cho snapshot liên quan; quản trị phần được cấp | Không tự chuyển trạng thái chung hoặc thay quyền khoa chủ trì |
| ADMIN | Cấu trúc kỳ/học kỳ và thao tác xuyên khoa theo BE | Không hiển thị form ADMIN cho DEPART chỉ vì generic academic action được allowed |
| Student Leader | Đăng ký, resubmit, gửi yêu cầu hướng dẫn, bàn giao | DEPART không giả lập thao tác thay sinh viên khi service yêu cầu leader |
| Supervisor/mentor/evaluator | Hướng dẫn hoặc chấm theo assignment | Không tạo global role SUPERVISOR/MENTOR/EVALUATOR |
| AI | Tóm tắt, cảnh báo, gợi ý | Không approve, assign, chấm điểm hay publish |

## 4. Luồng thực hiện và điều kiện cần bảo toàn

| Chặng | Use case / nguồn | Quy tắc và đầu ra |
| --- | --- | --- |
| Học vụ | UC-018–UC-030; SDD §3.3–3.4 | Department/Major trong scope; cấu trúc semester/period CRUD đang AdminOnly; policy version có scope riêng theo rubric của kỳ |
| Điều kiện sinh viên | BE StudentQualificationWorkflow; extension có contract | Queue theo Organization + Department; chỉ pending mới quyết định; verify yêu cầu TRAINING_COMPLETED; reject có reason; ghi audit |
| Đề tài | SRS Topic management; SDD §3.5 | DRAFT → publication/close theo TopicWorkflow; policy, mode, required majors, nội dung và scope phải hợp lệ |
| Thẩm định | UC-048–UC-051, BR-52–BR-56 | Queue scoped; reason bắt buộc cho revision/reject; quyết định dùng token hiện hành; đa khoa dùng submission snapshot |
| Hướng dẫn | UC-052–UC-059, BR-57, BR-60–BR-63 | Primary duy nhất; mentor theo ngành; deterministic candidate/capacity trước recommendation; request/accept do actor đúng thực hiện |
| Theo dõi | UC-061, UC-065, UC-071, UC-073; BR-70–BR-74 | Department xem dữ liệu/evidence theo scope; không trở thành task owner; cảnh báo từ trang nào phải ghi rõ trang đó |
| Bàn giao | UC-120–UC-122, BR-140–BR-142 | Đọc package đã khóa, checklist và phiên bản; leader là actor mặc định submit |
| Đánh giá | UC-123–UC-126, BR-59, BR-143–BR-145 | Published scheme + assignments theo COMMON/MAJOR_SPECIFIC/INDIVIDUAL; evaluator chấm; server tính điểm |
| Kết quả | UC-127, BR-145, BR-160 | Preview chứa blockers và confirmation token; staff công bố sinh viên thuộc khoa; project liên khoa có rubric xuyên khoa cần ADMIN |
| Lưu trữ | UC-134, BR-160–BR-161 | Archive qua action/precondition của BE; xem hồ sơ lịch sử; không có mutation thông thường sau archive |

## 5. SINGLE_MAJOR và INTERDISCIPLINARY

Cùng lifecycle, khác scope và dữ liệu kiểm tra. SINGLE_MAJOR có primary major và một khoa học thuật tương ứng. INTERDISCIPLINARY phải xem required majors, quota/responsibility, frozen roster và ý kiến các khoa trong cùng snapshot. Ý kiến APPROVED của một khoa không phải phê duyệt cuối. REJECTED của khoa tham gia không cho phép FE tự đổi project sang REJECTED. Resubmit tạo snapshot mới, không kế thừa tùy tiện quyết định cũ.

Điểm đồ án và sinh viên khác nhau: project dùng component có project weight; student dùng common + đúng major + individual của sinh viên đó. FE không tự tính hoặc thêm contribution/AI factor. Không hardcode tỷ trọng 50/30/20 từ đề xuất Governance.

## 6. Những phát hiện cần quyết định kỹ thuật

1. Generic `manage_academic_structure` không đủ cấp semester/period CRUD: controller hiện AdminOnly. Đã sửa gating FE; policy version vẫn theo service riêng.
2. `ProjectResultWorkflow.Configure` luôn từ chối legacy writes. Đã bỏ form ghi legacy policy, dùng scheme/preview/publication; kết quả cũ vẫn đọc được.
3. Staff không được công bố project có rubric xuyên khoa; student result chỉ trong department của frozen roster. UI lọc theo department đã xác minh, server vẫn quyết định cuối.
4. Queue qualification đã có paging trong BE nhưng FE cũ không mở trang tiếp. Đã bổ sung và reset trang khi đổi filter; hiển thị certificate metadata, dates, rejection/verification context.
5. `certificateFileId` không đủ tạo secure certificate download: Files workflow hiện kiểm tra project parent. Không ghép URL tệp hoặc giả định chứng chỉ là project file.
6. Workspace attention chỉ lấy 5 đồ án đầu. Đã ghi rõ phạm vi trang và cho chuyển trang; metric toàn khoa dùng summary từ BE.
7. Assignment replace yêu cầu ACTIVE; end yêu cầu COMPLETED/ARCHIVED. FE cho end ở COMPLETED, không đưa end độc lập trên ACTIVE; archived giữ giao diện đọc.
8. Governance aggregate chọn lead bằng thứ tự department ID; FE đối chiếu thêm `ProjectDto.academicScope.leadDepartmentId` trước khi mở quản trị chủ trì. Thiếu lead canonical thì giữ read-only.
9. API supervisor-candidates phục vụ chọn hướng dẫn mới, từ chối ACTIVE có assignment. Luồng thay thế đã đổi sang danh bạ như nguồn đề xuất; BE replacement kiểm tra eligibility thực tế, không hiển thị danh bạ như danh sách đủ điều kiện.
10. Mentor replacement của khoa tham gia chưa có capability riêng đủ chính xác trong aggregate; không mở rộng bằng MANAGE_GOVERNANCE chung. Ghi blocker để BE cung cấp action/scope cho từng assignment.

## 7. Message và tình huống lỗi

SRS có MSG-COMMON-401/403/404/422, MSG-PROJ-02, MSG-SUP-02, MSG-RESULT-01, MSG-ARCH-02. Đây là traceability với tài liệu; không khẳng định BE trả các mã này trong mọi response. FE giữ detail thực tế khi phù hợp và không bịa message code cho qualification hoặc xung đột token.

- 401: session hết hạn; 403: thiếu quyền/scope; 404: không tìm thấy dữ liệu, không tự kết luận endpoint chưa có.
- 405/501: thao tác chưa hỗ trợ; network/5xx: dịch vụ không khả dụng, không đổi thành denied permission.
- 409: tải dữ liệu mới, hủy xác nhận cũ, không tự replay mutation; người dùng phải kiểm tra và quyết định lại.
- Loading/error không hiển thị thành số 0 đã xác minh; dữ liệu về muộn từ context cũ không được thay context mới.

## 8. Ngoài khả năng triển khai FE độc lập

Bị chặn bởi BE: quyền DEPART tạo/sửa cấu trúc semester/period và qualification policy; secure certificate file retrieval; assignment capability theo lead/mentor scope; aggregate governance lead chính xác. Đề xuất chưa có contract đầy đủ đã xác minh: Working Agreement bắt buộc, review gate policies, industry weighted evaluation, peer scoring và những lựa chọn D1–D12 chưa freeze. Export PDF/XLSX không tự giả lập từ API CSV.

Các luồng sẵn có được tái sử dụng, không viết lại backend hay dựng rule ở FE. Trạng thái E2E với BE thật phụ thuộc tài khoản và dữ liệu thử nghiệm được phép; chưa có bằng chứng runtime thì không đánh dấu DONE toàn bộ DEPART.


## 9. Chức năng hiện có và hướng dẫn thao tác DEPART

Tách **đã có contract + code FE** khỏi **đã kiểm chứng mutation BE thật**. Các màn hình đọc đã được kiểm tra live; các mutation còn cần fixture cách ly. Luồng bắt đầu tại `/department/workspace`; với chức năng theo đồ án, vào `/department/portfolio`, chọn đúng project rồi chọn nghiệp vụ. ID đồ án được giữ nguyên khi chuyển màn hình; trên mobile dùng combobox, desktop dùng tabs, Back giữ lịch sử.

| Chức năng | Cách thao tác trên FE | Điều kiện / actor tiếp theo | Mức hoàn thiện hiện tại |
| --- | --- | --- | --- |
| Workspace và portfolio | Xem khoa/kỳ → số liệu tổng hợp → lọc tên/trạng thái/ngành → chuyển trang → mở hồ sơ | Cảnh báo workspace chỉ trang đang xem; tổng đồ án lấy aggregate BE | Đã có; live đọc đạt |
| Cấu trúc và chính sách học vụ | Cấu trúc đào tạo / Học kỳ và kỳ đồ án → chọn kỳ → Các phiên bản chính sách → xem effective policy hoặc chỉnh sửa khi API cho phép | CRUD semester/period AdminOnly; sửa policy theo rubric/scope service, không suy ra từ generic action | Đã có phần theo quyền BE; quyền CRUD DEPART bị chặn |
| Hồ sơ học vụ | Xác minh hồ sơ học vụ → lọc pending → đối chiếu khoa/ngành → Xác minh hoặc Yêu cầu bổ sung → dialog lý do | Hồ sơ về khoa/ngành, không phải chứng chỉ; thiếu khoa/ngành thì không verify | Đã có FE/API; mutation live chưa kiểm chứng |
| Điều kiện tham gia | Điều kiện sinh viên → tìm/lọc/paging → xem đào tạo, chứng chỉ, ngày cấp/hết hạn → Xác minh hoặc Từ chối kèm lý do → xác nhận | Verify cần TRAINING_COMPLETED và pending theo BE; file chứng chỉ chưa có secure retrieval contract | FE đã hoàn thiện metadata/queue/decision; download bị chặn |
| Đề tài | Quản lý đề tài → Tạo đề tài mới → chọn kỳ đăng ký, mã, tên, mode/ngành và đề cương → thêm các yêu cầu ngành/số lượng/trách nhiệm → Tạo bản nháp → mở đề tài → Lưu bản nháp → Công bố qua dialog; Đóng cần lý do | Khoa chủ trì lấy context; chỉ kỳ đăng ký đúng organization/chưa kết thúc, scope và policy hợp lệ được BE chấp nhận. Liên ngành cần nhiều requirements, không có primary major | Gap title-only/hardcoded requirement đã sửa; cần mutation fixture để kiểm chứng live |
| Thẩm định đơn ngành | Thẩm định đề cương → tìm project → mở hồ sơ → xem nội dung/scope/snapshot/history → bắt đầu review khi có action → yêu cầu sửa/phê duyệt/từ chối → lý do và dialog theo thao tác | Chỉ current actions; revision/reject cần reason. Nhóm sinh viên sửa và resubmit, DEPART không nộp thay | Đã có FE/API; queue thật đang rỗng |
| Thẩm định liên ngành | Mở cùng submission snapshot → xem ngành và khoa tham gia → khoa tham gia ghi Đồng ý/Từ chối → khoa chủ trì xem đủ quyết định và action cuối | Ý kiến khoa tham gia không tự đổi state chung; resubmit có snapshot mới; token/snapshot cũ bị 409 → đọc lại và quyết định lại | Đã có FE/API; thiếu actor/fixture multi-department live |
| Giảng viên / hướng dẫn | Giám sát giảng viên → lọc chuyên môn/sẵn sàng → hồ sơ/workload; trong project chọn Điều phối và hướng dẫn → assignment → đề xuất người thay thế → reason + dialog | ACTIVE dùng replace; danh bạ không phải eligibility. Leader gửi request, lecturer chấp nhận; DEPART không impersonate. End chỉ closing operation | Primary replace đã nối; mentor capability theo từng assignment còn gap BE |
| Theo dõi thực hiện | Portfolio → Điều phối và hướng dẫn → chuyển trang lịch báo cáo/action/evidence; mở Kho tệp/Đóng góp để đối chiếu nguồn | Chủ trì đủ canonical scope + action mới chỉnh sửa; thiếu canonical lead được giải thích là thiếu scope, không mặc định thành thiếu quyền | Đã có FE/API; một số legacy project thiếu frozen scope nên chỉ xem |
| Bàn giao | Yêu cầu bàn giao → chọn hạng mục cần nộp → lưu nếu API cho phép; Hồ sơ bàn giao → xem package đã khóa và tệp | Leader chuẩn bị và submit/lock package theo BE. DEPART xem/kiểm tra, không submit thay leader | Đã có FE/API; DB chưa có locked package |
| Rubric và scheme | Bộ tiêu chí đánh giá → quản lý phiên bản rubric; trong project chọn Phương án đánh giá → bản nháp → kỳ/component/phạm vi/trọng số/ngưỡng → kiểm tra → công bố | COMMON/MAJOR_SPECIFIC/INDIVIDUAL, frozen roster và scheme validation do BE; published version dùng versioning thay sửa trực tiếp | Đã có FE/API; DB chưa có scheme |
| Người chấm | Phân công người chấm → chọn kỳ/component đã công bố → chọn eligible evaluator → vai trò → phân công; xem/revoke theo quyền | Candidates lấy server, không toàn bộ danh bạ; lecturer/evaluator thực hiện chấm | Đã có FE/API; cần fixture để kiểm chứng assignment/scoring |
| Kết quả | Kết quả → kiểm tra hồ sơ bàn giao, scheme và người chấm → tải preview → xử lý blockers → tích đã kiểm tra → dialog → công bố; phần sinh viên chọn roster thuộc khoa, preview rồi công bố | BE tính điểm và quyết định canPublish/token; cross-department project result có thể cần ADMIN. Project result publication thành công chuyển COMPLETED tại repository; không FE tự đổi state | Đã sửa legacy form/token/conflict/student scope; thiếu fixture publication live |
| Lưu trữ và CSV | Danh mục lọc COMPLETED → Lưu trữ nếu action cho phép → xác nhận → xem Kho lưu trữ; Xuất CSV theo bộ lọc | Archive dùng fresh Project concurrency token; không archive ACTIVE. CSV không phải Excel/PDF | Đã có FE/API; thiếu completed fixture; PDF/XLSX chưa có contract |

### Những phần còn thiếu và ưu tiên

1. **BE/data correctness:** canonical lead trong governance, action theo từng mentor assignment và certificate-scoped retrieval. FE chưa thể làm đầy đủ các phần này chỉ bằng mở thêm nút.
2. **Quyết định phân quyền:** nếu DEPART cần tạo/sửa semester/period/qualification policy, cần chốt BE permission thay vì dùng UI để vượt AdminOnly.
3. **Runtime fixture:** reviewable projects, qualification pending, published scheme, locked final package, scores/results và actor nhiều khoa. Không có fixture không đồng nghĩa thiếu màn hình; chưa được tuyên bố mutation E2E đạt.
4. **Ngoài contract hiện hành:** mandatory Working Agreement, review gates/industry weighted evaluation và PDF/XLSX. Giữ PROPOSED/backlog, không ép vào workflow hiện tại.

### Chuỗi vận hành cần kiểm chứng đầy đủ

Học vụ → hồ sơ học vụ → điều kiện tham gia → đề tài/registration do nhóm → thẩm định → revision/resubmit hoặc approve → request/accept hướng dẫn do đúng actor → ACTIVE → theo dõi → final package do leader → scheme + evaluator + scoring → preview/publication → COMPLETED → archive.

Một lỗi 409 phải quay lại đọc trạng thái/token và xem xét thao tác; không tự lặp quyết định. 403 là thiếu quyền ở resource, không đổi thành empty. Hồ sơ liên ngành giữ cả scope chủ trì/tham gia và frozen snapshot xuyên suốt chuỗi.

## 10. Kết luận rà soát và phần chỉnh tiếp theo

Không cần dựng thêm role DEPART hoặc một workflow song song: route/API cho các chặng chính đã có. Lần rà soát này đã hoàn thiện các gap FE còn có contract: portfolio đủ trạng thái SUBMITTED/REVISION_REQUIRED/REJECTED/SUPERVISOR_PENDING; response cũ không ghi đè bộ lọc mới; dialog lưu trữ ghi rõ đồ án, hỗ trợ hủy và 409 không tự gửi lại; form đề tài có lỗi tại trường/summary focus links và khóa công bố khi còn chỉnh sửa chưa lưu. Thao tác đề tài là sửa → **Lưu bản nháp thành công** → kiểm tra phiên bản → Công bố.

Đừng gộp mọi giới hạn thành “thiếu chức năng”: upload/download chứng chỉ theo qualification, canonical governance lead/readiness và capability mentor là gap BE cần xử lý; expected qualification token là hardening contract cần phối hợp. Quyền CRUD kỳ, công bố xuyên khoa và staff gửi request thay leader phải được BA chốt; không mở ở FE trước. PDF/XLSX và Governance PROPOSED là mở rộng, không tự đưa vào baseline mandatory.

[Bàn giao BE/DB](04_DEPART_BE_DB_HANDOFF.md) tách 8 tickets với BR, API hiện hành/đề xuất, quyết định migration, acceptance, test cases và DoD. Chưa có bằng chứng cần thêm schema cho các sửa FE này; existing snapshot/token/assignment/files/scheme tables phải được tận dụng và target readiness phải kiểm tra lại. Runtime mutation lifecycle vẫn cần fixture cách ly.
