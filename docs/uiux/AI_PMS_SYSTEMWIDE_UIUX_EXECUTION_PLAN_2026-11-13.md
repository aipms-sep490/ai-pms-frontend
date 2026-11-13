# Kế hoạch nâng cấp UI/UX toàn hệ thống AI-PMS — FAMS × F-Research

**Ngày:** 13/11/2026 · **Nhánh thực hiện:** `feat/fe-fresearch-reference-20261113` · **Baseline nhánh:** `ee227ae857e6fc8d5661cfd2e4a11cd0bfa6fdce` · **Đích bàn giao:** commit và push lên chính nhánh này, không tạo PR/merge/deploy.

## 1. Mục tiêu và phạm vi

Nâng cấp cách tìm thông tin, đọc trạng thái, hiểu bước kế tiếp và hoàn thành tác vụ trên **toàn bộ AI-PMS**. Áp dụng có chọn lọc cách trình bày của FAMS và F-Research vào nhận diện AIPMS của người dùng. Giữ nguyên route nghiệp vụ, mô hình Project Period, vai trò, phân quyền, trạng thái, quy tắc học vụ, API/DTO và nguồn dữ liệu có thẩm quyền. Thay đổi FE phải chia thành các lát cắt nhỏ, có ảnh trước/sau và bằng chứng hành vi.

Phạm vi kiểm kê là mọi route, trang, tab, modal, drawer, bảng, thẻ, biểu mẫu và các trạng thái loading/empty/error/forbidden/readonly. Bản [`ROUTE_INVENTORY.generated.md`](ROUTE_INVENTORY.generated.md) hiện ghi **137 route ở thời điểm sinh file**; nhánh này đã thêm `/project/periods`, nên **không dùng 137 làm số lượng hiện hành**. Tác vụ U01 sẽ sinh lại route census từ router và đối soát route có feature flag, vai trò và deep link. Số màn hình không được suy ra chỉ từ số route.

### Ranh giới nghiệp vụ

- Project Period vẫn là đợt đồ án. Mẫu “lớp học/nhập mật khẩu” của F-Research chỉ gợi ý cách **khám phá đợt và giải thích điều kiện tham gia**; không tạo thực thể lớp học hoặc mật khẩu đợt khi chưa có quyết định BA/BE về membership, lưu trữ, phân quyền và luồng rút/đổi.
- Không chuyển thuật toán điều kiện, điểm, Gate, phân công, công bố, deadline sang FE. FE chỉ biểu diễn kết quả và lý do do BE trả. `PENDING`/thiếu dữ liệu hiển thị `—`, không thành `0`.
- Không thêm CTA có vẻ hoạt động nếu API/permission chưa có. Không tự bật cờ tính năng, không làm mutation trên FAMS/F-Research hoặc hệ thống dùng chung để lấy mẫu.
- Ảnh mẫu là tài liệu tham khảo. Không sao chép logo, mascot, dữ liệu, copywriting, bố cục theo pixel của hệ khác. Logo/mascot AIPMS do người dùng cung cấp là nhận diện sản phẩm.

## 2. Đầu vào và mức bằng chứng

| Nguồn | Dùng để làm gì | Giới hạn đã xác minh |
|---|---|---|
| [`design-system/ai-pms/MASTER.md`](../../design-system/ai-pms/MASTER.md) | Rule hiện hành: Academic Light, xanh `#0868B8`, logo AIPMS, tương phản, trạng thái | Chỉ sửa khi token và các consumer được kiểm chứng; [`01-DESIGN-SYSTEM.md`](01-DESIGN-SYSTEM.md) còn là PROPOSED |
| [`UIUX_ROUTE_INVENTORY.md`](UIUX_ROUTE_INVENTORY.md), [`ROUTE_CENSUS.csv`](ROUTE_CENSUS.csv), router | Bắt đầu lập ma trận màn hình × vai trò × state × action | Inventory/generated file có thể cũ; phải chạy lại và đối soát thủ công |
| FAMS catalog và backlog đã thu phạm vi tại `F:\AI-PMS\artifacts\fams-benchmark-20261105\` | Pattern định danh thực thể, bảng, trạng thái, review, cấu hình | FAMS có 249 ảnh nhưng nhiều chức năng ngoài miền ĐATN; không chuyển nguyên module |
| F-Research: trang công khai đã xem chỉ đọc, ảnh 1–4 do người dùng gửi | Tìm/lọc/thẻ/CTA, tài liệu xem trước, nội dung ngắn và loading nhẹ | Không xác nhận được quy tắc nghiệp vụ bằng ảnh; không chạm dữ liệu của họ |
| Báo cáo `06_UI_UX_COMPLIANCE_AUDIT.md` và `07_RESPONSIVE_AND_VISUAL_FINDINGS.md` tại `F:\AI-PMS\audit-reports\2026-11-13_19-00_develop\` | Baseline nhánh hiện tại | Mới xem login ở mobile/desktop; catalog cần kiểm tra với tài khoản thật; không có tỷ lệ chuẩn hóa toàn hệ thống |
| Ảnh loading AIPMS và F-Research người dùng gửi | Định hướng chuyển động và thứ bậc thông tin cuối lộ trình | Ảnh AIPMS là PNG RGBA 1672×941, chứa cả mascot/chữ nền trong suốt; cần tách asset hiển thị khỏi chữ UI khi triển khai |

Ghi chú màu teal trong FAMS catalog là hướng dẫn cũ của tài liệu tham khảo; nhánh hiện tại dùng primary xanh dương theo MASTER. Mọi pattern được ánh xạ sang token AIPMS hiện hành.

Mỗi kết luận ở backlog phải gắn `VERIFIED` (source hoặc browser), `INFERRED`, `PROPOSED` hoặc `OPEN`. Không ghi “đã hoàn thiện” từ việc có code hoặc endpoint.

## 3. Quy tắc UI/UX v2 cần chốt trong U02

1. **Một trang, một câu trả lời chính:** trang đầu nêu đối tượng đang xem, trạng thái có thẩm quyền, việc cần làm tiếp; CTA chính duy nhất theo vai trò/state, hành động còn lại ở ngữ cảnh.
2. **Từ tổng quan đến bằng chứng:** trang danh sách có tìm/lọc/sắp xếp/số kết quả; trang chi tiết có dải định danh, timeline hoặc nguồn dữ liệu, quyết định và lý do; file gắn với đúng phiên bản/evidence.
3. **Trạng thái bằng chữ + biểu tượng + màu:** màu xanh dương cho điều hướng/CTA; xanh lá chỉ trạng thái tốt; cam cho chờ/cần chú ý; đỏ cho lỗi/ngăn chặn. Không dùng màu một mình. Dùng token trong MASTER, không hardcode màu mới.
4. **Canvas sáng AIPMS:** `#F6FAFE`/trắng, mực navy, xanh dương học thuật, cam/xanh lá chỉ điểm nhấn và trạng thái. Logo gốc ở shell/login; mascot dùng có chủ đích ở onboarding/loading/empty, tránh che dữ liệu nghiệp vụ. Không lấy cam FAMS làm màu chủ đạo.
5. **Mật độ theo tác vụ:** card phù hợp khám phá và chọn; bảng phù hợp so sánh nhiều hàng, bulk action và audit; form dài chia section có heading, helper, lỗi cạnh trường; không ép mọi màn thành một kiểu card.
6. **Truthful UX:** nội dung số liệu, hạn, quyền, lý do khóa, kết quả AI và tệp luôn chỉ rõ nguồn/thời điểm nếu cần. Empty khác filtered-empty, chưa công bố, không đủ quyền, lỗi API; loading khác trạng thái chưa có dữ liệu.
7. **Responsive và tiếp cận:** 360/390/768/1024/1440/1920 px, zoom 200%, nhãn tiếng Việt dài, bàn phím/focus, vùng chạm chính ≥44 px, tương phản chữ ≥4.5:1; bảng hẹp có phương án đọc từng bản ghi, không giấu tác vụ chính.
8. **Tương tác có hồi đáp:** mutation hiển thị pending, thành công sau readback phù hợp, lỗi/409/422 giữ dữ liệu form; dialog có Esc và trả focus; hành động không thể đảo ngược nêu phạm vi ảnh hưởng trước khi xác nhận.
9. **Chuyển động tiết chế:** animation chỉ để chỉ ra thay đổi trạng thái và hướng di chuyển; có `prefers-reduced-motion`, không chèn chờ giả, không biến loading thành màn chắn kéo dài.

Rule v2 chỉ thành quy chuẩn sau khi U02 cập nhật MASTER + token test + ví dụ component và đối chiếu 3 luồng khác vai trò. Tài liệu này là kế hoạch, chưa tuyên bố đã áp dụng rule v2 vào mọi trang.

## 4. Ma trận học hỏi, ứng dụng và ranh giới

| Mã | Học từ | Pattern/ảnh | Áp vào AI-PMS và luồng | Bổ sung giá trị | Loại thay đổi / điều kiện |
|---|---|---|---|---|---|
| P01 | F-Research | Thẻ tìm kiếm, lọc, CTA theo item (ảnh 3) | Khám phá Project Period, Topics, danh sách dự án; danh sách → chi tiết → bước hợp lệ | Tìm đúng đối tượng nhanh, biết bước tiếp | Trình bày FE; lọc trên server nếu endpoint hỗ trợ, không giả count |
| P02 | FAMS | Dải định danh thực thể (`image93`, `image146`) | Project, Gate, kỳ, đề tài, người hướng dẫn, bài nộp | Không mất ngữ cảnh khi đi sâu | Trình bày FE từ dữ liệu sẵn có |
| P03 | FAMS | Số liệu + trạng thái (`image43`, `image132`, `image211`) | Dashboard SV/GV/khoa/admin và kết quả | Ưu tiên việc chờ, hiểu `PENDING` | Trình bày FE; counter phải khớp API |
| P04 | FAMS | Bảng/filter/bulk bar (`image100`, `image113`, `image158`) | Quản lý danh mục, phân công, review, audit | Quét nhiều bản ghi, hành động đúng phạm vi | Filter FE nếu đủ dữ liệu; bulk mutation là chức năng mới cần BE/BA nếu chưa có contract |
| P05 | FAMS | View/Edit + impact (`image31`) | Policy, rubric, scheme, templates, AI knowledge | Giảm sửa nhầm cấu hình đang có hiệu lực | Chỉ đổi UI quanh mutation hiện có; kiểm tra dirty state và publish semantics |
| P06 | FAMS | So sánh trước/sau (`image95`) | Revision đề tài, corrections, override, lịch sử | Nhìn rõ giá trị thay đổi trước quyết định | Cần đủ dữ liệu phiên bản; không tự suy đoán diff thiếu field |
| P07 | F-Research | Nhận xét + tài liệu cùng ngữ cảnh (ảnh 1) | Deliverables, Files, Progress Report, Gate evidence | Xem nhận xét cạnh đúng tệp/phiên bản | Hiển thị nếu contract liên kết được; nếu thiếu version/reference thì OPEN, không nối theo tên tệp |
| P08 | F-Research | PDF xem trước/tải (ảnh 2) | `DocumentPreviewModal`, Files, evidence, final submission | Đọc trước khi tải/duyệt | Component đã có; trước tiên kiểm tra role, PDF thật, 403, mobile, filename dài |
| P09 | F-Research | Chỉ dẫn tham gia rõ ràng (ảnh 4) | Project Period → eligibility/nhóm → đăng ký đề tài | Giải thích điều kiện hiện có của đợt | Không thêm password/lớp học; nếu BA muốn mã tham gia, mở RFC BE riêng trước khi code |
| P10 | FAMS + F-Research | Thông báo nhóm theo thời gian, CTA dẫn đến việc | Notifications, Calendar, work queues | Từ thông báo vào đúng hành động | Deep link/permission phải kiểm tra; không dựng News CMS mới |
| P11 | AIPMS + F-Research | Loading nhẹ, mascot + chấm tiến trình (hai ảnh mới) | Bootstrap và chuyển route chậm, **thực hiện cuối** | Nhận diện nhất quán và phản hồi rõ | Dùng mascot AIPMS; không copy mascot/text của F-Research, không giả phần trăm |

**Chức năng đang có trên nhánh cần kiểm chứng:** `/project/periods` là trang đọc Project Period, không phải lớp học hay tham gia bằng mật khẩu. U04 kiểm tra scope BE của danh sách, phân trang và điều hướng với account thật; nếu policy visibility chưa rõ thì giữ ở trạng thái cần xác minh, không gọi là luồng tham gia hoàn chỉnh. PDF modal đã tồn tại trước nhánh này; đây là QA/hoàn thiện trình bày, không phải feature mới.

**Ứng viên chức năng mới, tách khỏi nâng cấp giao diện:** mã tham gia Project Period, bình luận gắn version/file, bulk mutation, xuất ZIP evidence, rút đơn, override Gate. Mỗi ứng viên cần hồ sơ riêng: vấn đề thực tế, nguồn tham khảo, actor/state, sơ đồ trước/sau, API/DTO/permission/audit, negative cases và quyết định BA/BE. Không triển khai trong các task FE-only trước khi hồ sơ được chốt.

## 5. Coverage theo hành trình và màn hình

Tất cả cụm dưới đây phải được đối soát với route census mới và module feature flag. Mỗi cụm gồm màn danh sách/tổng quan, chi tiết, biểu mẫu, modal/drawer, empty/loading/error/forbidden/readonly nếu có. Route chỉ là điểm vào; các trạng thái bên trong mới là đơn vị QA.

| Cụm | Vai trò và màn đại diện | Thứ phải rõ sau nâng cấp | Pattern | Ưu tiên |
|---|---|---|---|---|
| C00 Shell & identity | `/login`, forgot/reset, profile/security, sidebar, navigation | Logo AIPMS, vai trò, breadcrumb, phiên làm việc, trợ giúp | P02, P10 | P1 |
| C01 Khởi tạo đồ án | SV: `/project/periods`, `/projects/lifecycle`, `/team`, `/topics`, `/project/source`, `/project/register`, `/project/status`, `/project/supervisor` | Kỳ/đợt hợp lệ, điều kiện, trạng thái hồ sơ, ai cần quyết định, bước tiếp | P01–P03, P09 | P0 |
| C02 Thực thi nhóm | SV/GV: workspace, milestones, tasks/detail, Gantt, reports/detail, meetings/detail/video, agreement, contributions | Mốc, người chịu trách nhiệm, hạn, blocker, bản ghi phản hồi | P02–P04, P07 | P0 |
| C03 Tệp & minh chứng | Files, Deliverables, Evidence Ledger, final submission/viewer | Tệp nào thuộc version nào, quyền xem/tải, trạng thái xác nhận | P02, P07–P08 | P0 |
| C04 Gate → bảo vệ → kết quả | Review timeline/gates, cold/peer, defense, result, appeal/correction | Gate hiện tại, điều kiện chặn, chấm theo scope, `PENDING`, công bố/kháng nghị | P02–P03, P06 | P0 |
| C05 Giảng viên | Supervisor dashboard/workspace/projects/progress, mentor, reviewer, evaluator assignment/rubric | Hàng việc cần duyệt, project được giao, lý do đủ/không đủ điều kiện | P02–P06 | P0 |
| C06 Khoa/bộ môn | Department workspace/portfolio/review, progress matrix, supervisor monitoring, qualifications, topics, publication/corrections | Cohort nào tắc, bản ghi nào cần quyết định, hậu quả phê duyệt | P02–P06 | P0 |
| C07 Quản trị học vụ | Academic structure/governance, Project Period policy, Gate config, rubrics, schemes, templates, knowledge | View/Edit, phiên bản, thời điểm hiệu lực, phạm vi tác động | P02, P05–P06 | P0 |
| C08 Admin, tích hợp & hỗ trợ | Access/RBAC/user detail, admin portfolio, industry, notifications, calendar, chat, AI assistant/risk | Quyền, nguồn dữ liệu, trạng thái dịch vụ, deep link, lịch sử | P03–P04, P10 | P1 |
| C09 Chế độ phụ và trạng thái hiếm | Feature-flag routes, archived/frozen, 401/403/404, empty, filtered empty, 409/422, session expiry | Không lộ CTA trái quyền, không mất dữ liệu, không nhầm lỗi với rỗng | Quy tắc v2 | P0 xuyên suốt |

## 6. Thứ tự thực hiện và task nhỏ

Mỗi task là một lát cắt đủ nhỏ để bàn giao một lần. Sau **mỗi 2–3 task**: typecheck/lint/build + test liên quan, duyệt diff và ảnh trước/sau. Không chờ hoàn tất toàn bộ mới kiểm thử. Ước lượng dưới đây là **đơn vị phiên làm việc tập trung**, sẽ chỉnh sau U01; không phải cam kết ngày lịch.

| Task | Việc và đầu ra cụ thể | Phụ thuộc | Hoàn tất khi | Cỡ |
|---|---|---|---|---|
| U01 | Sinh lại route census; lập bảng `route × role × feature flag × state × API/action × ảnh baseline × P0/P1/P2`, kiểm kê modal/form dùng chung | Không | 100% route từ router có dòng; route alias/flag được đối soát; khoảng trống có nhãn `NOT VERIFIED` | 2–3 phiên |
| U02 | Chốt Rule v2 trong MASTER: token, logo/mascot, typography, density, responsive, focus, copy, feedback và pattern theo loại trang | U01 | Token test/contrast đạt; 3 mẫu khác vai trò chứng minh rule dùng được; không mâu thuẫn contract/MASTER | 2 phiên |
| U03 | Nâng shell + primitives dùng chung: PageHeader, EntityIdentityStrip, FilterBar, StatusBadge, Empty/Error/Blocked/Readonly, StatTile, bảng và dialog theo nhu cầu thực | U02 | Component có ví dụ 3 trạng thái; keyboard/mobile/contrast đạt; không làm route/guard đổi | 2–3 phiên, chia commit theo primitive |
| U04 | C01: khám phá Period → nhóm → đề tài → đăng ký → GVHD, kiểm tra riêng `/project/periods` với account/scope hợp lệ | U03 | SV hiểu đúng bước hợp lệ; status/permission BE giữ nguyên; catalog có bằng chứng API+browser hoặc ghi blocker | 3–4 phiên, tách theo 2–3 màn |
| U05 | C02: workspace, tiến độ, task/Gantt, báo cáo, họp, thỏa thuận, đóng góp | U03–U04 | Mỗi trang có định danh/trạng thái/next action; dữ liệu deadline/blocker khớp BE | 4–6 phiên, nhiều commit nhỏ |
| U06 | C03: tệp, deliverables, evidence, PDF preview và final submission | U03 | Quyền xem/tải và version rõ; 403/404/PDF thật/mobile; không nối feedback sai tệp | 3–4 phiên |
| U07 | C04–C05: Review Gates/bảo vệ/kết quả và màn GVHD/mentor/evaluator | U03, U05–U06 | Duyệt/chấm/khóa/công bố thể hiện đúng actor và state; `PENDING` không thành 0 | 4–6 phiên |
| U08 | C06–C07: work queue khoa, review, portfolio, policy, rubric, scheme, templates | U03, U07 | Thay đổi cấu hình có view/edit + ảnh hưởng; quyết định có lý do, history; không mở quyền mới | 4–6 phiên |
| U09 | C08–C09: admin/industry/AI/notification/calendar/chat + route flag, session và trạng thái hiếm | U03, U04–U08 | Mọi route còn lại được kiểm; AI nêu advisory/nguồn; direct link trái quyền bị chặn | 3–5 phiên |
| U10 | Harmonization: rà lại 100% census, thiết bị/kích thước, accessibility, visual regression, contract/E2E trọng yếu | U04–U09 | Không còn P0; P1 có bằng chứng fix hoặc blocker rõ; bảng coverage có tử số/mẫu số theo route và state | 3–4 phiên |
| **U11** | **Loading AIPMS**: tách asset mascot từ ảnh người dùng, thiết kế bootstrap/route/section loading và error/retry, cập nhật rule motion | **U10** | **Đúng nhận diện AIPMS, không chặn vô cớ, có reduced motion và screen reader; test ở mobile/desktop** | **1–2 phiên, cuối cùng** |

### Lát cắt triển khai trong các work package

Các `Uxx` là **work package**, không phải một commit khổng lồ. Từng lát cắt dưới đây làm tối đa một luồng hoặc 2–3 màn liên quan, có test/ảnh/commit riêng. Cụm C09 được kiểm cùng mỗi lát cắt, rồi rà tổng ở U09/U10.

| ID | Work package | Màn/luồng cụ thể | Pattern trọng tâm | Kết quả quan sát được |
|---|---|---|---|---|
| S01 | U03 | Shell, sidebar, topbar, breadcrumb, role context | P02 | Vào đúng vùng theo vai trò; nhãn/brand không lẫn PMS cũ |
| S02 | U03 | Header/list toolbar/status + Empty/Error/Blocked dùng chung | P01–P04 | Ba màn mẫu có state khác nhau, không phải màn trắng |
| S03 | U03 | Dialog, feedback, bảng/mobile record, form field | P04–P05 | Keyboard, focus, lỗi cạnh field, action không bị mất ở mobile |
| S04 | U04 | Period catalog, lifecycle và điều kiện kỳ | P01, P03, P09 | Chỉ hiển thị Period BE cho phép, không có lời hứa “tham gia lớp” |
| S05 | U04 | Team/create, qualification, invitation | P02–P03 | Thấy ai đủ điều kiện, ai chờ, lỗi từ BE có lý do |
| S06 | U04 | Topics, source, registration/edit, review status | P01–P03, P06 | Tìm/so sánh đề tài, đọc trạng thái hồ sơ và lịch sử revision |
| S07 | U04 | Supervisor selection/profile/assignment | P01–P03 | Hiểu vì sao gợi ý/không thể chọn, chỉ CTA hợp lệ |
| S08 | U05 | Student workspace, milestones, Gantt | P02–P03 | Bối cảnh project/hạn/blocker nhìn thấy ngay |
| S09 | U05 | Task board/detail, sprint, contribution | P02–P04 | Bộ lọc và trạng thái nhất quán, thao tác vẫn theo quyền cũ |
| S10 | U05 | Progress report list/create/detail và phản hồi GVHD | P02, P07 | Báo cáo, phiên bản và nhận xét liên kết đúng |
| S11 | U05 | Meetings list/create/detail/video, working agreement | P02, P06 | Họp, biên bản, chấp nhận cam kết có timeline/owner rõ |
| S12 | U06 | Project Files và DocumentPreviewModal | P07–P08 | Xem/tải PDF thật đúng quyền, filename dài/mobile dùng được |
| S13 | U06 | Deliverables, Evidence Ledger | P02, P07–P08 | Tệp, evidence, version, nhận xét không bị ghép sai |
| S14 | U06 | Final submission/checklist/viewer | P02–P03, P08 | Blocker trước nộp và trạng thái khóa sau nộp rõ |
| S15 | U07 | Student review timeline/gates, assigned gate review | P02–P03, P06–P07 | Biết gate mở/khóa và evidence nào cần xác minh |
| S16 | U07 | Cold/peer evaluation, defense schedule/readiness | P02–P03 | Phân biệt loại đánh giá; không biến lịch thành quyền dự thi |
| S17 | U07 | Student result/appeal và final corrections | P03, P06 | PENDING/weight/window/old→new rõ, không tự tính điểm |
| S18 | U07 | Supervisor dashboard/workspace/progress queue | P02–P03, P05 | Việc cần duyệt theo project và lý do đủ điều kiện |
| S19 | U07 | Mentor workspace, evaluator workspace/assignment/rubric | P02–P03, P07–P08 | Phân công, scope chấm và tài liệu đúng actor |
| S20 | U08 | Department workspace, portfolio, progress matrix | P02–P04 | Thấy cohort, việc trễ/chờ theo dữ liệu nguồn |
| S21 | U08 | Project/topic review, qualification, supervisor monitoring | P02–P04, P06 | Xem hồ sơ, diff, quyết định, history trong đúng ngữ cảnh |
| S22 | U08 | Result publication/corrections/evaluator assignment | P03–P06 | Ranh giới xem trước→công bố và ảnh hưởng trước lưu rõ |
| S23 | U08 | Academic governance, Period policy, Review Gate config | P02, P05–P06 | View/Edit, hiệu lực, phạm vi ảnh hưởng, validation |
| S24 | U08 | Rubric, evaluation schemes, milestone/cold templates, knowledge | P05–P06 | Phiên bản và publish/retire không bị nhầm với save nháp |
| S25 | U09 | Admin access/users/RBAC/portfolio/industry | P02–P05 | Quyền và audit dễ đọc; không bật RBAC write hay bulk API mới |
| S26 | U09 | Notifications, calendar, chat | P10 | Từ thông báo vào đúng việc, trạng thái đã đọc/hạn đúng |
| S27 | U09 | Academic assistant, project AI, risk, AI dock | P03, P10 | Advisory, citation, độ tươi/khả dụng thật; unavailable rõ |
| S28 | U09 | Industry expert, archived/frozen, flags, forbidden/session | P02–P03 | Chỉ đúng route và action cho vai trò/trạng thái |
| S29 | U10 | Cross-role E2E + responsive/accessibility + census closeout | Toàn bộ | Báo cáo coverage có tử số/mẫu số và blockers thực |
| S30 | **U11** | **Bootstrap, route/section loading, PDF loading** | **P11** | **Mascot AIPMS, motion/reduced motion/error/retry đạt nghiệm thu** |

Các màn/route mới phát hiện ở U01 phải được gán vào một `Sxx` hoặc thêm lát cắt có ID mới; không loại khỏi mẫu số vì “ít dùng”. Ưu tiên triển khai P0 theo luồng dọc, sau đó P1; S01–S03 chỉ tạo primitive khi đã có consumer thực.

### Checkpoint theo chiều dọc

- **CP-A sau U01–U03:** route census mới, Rule v2, primitives có ảnh mobile/desktop; chọn 3 màn mẫu để chứng minh không làm đổi behavior.
- **CP-B sau U04–U06:** hành trình sinh viên từ Period đến nộp, file/preview có quyền và version rõ; E2E thật chỉ ghi PASS khi có account/BE/readback, fixture ghi riêng.
- **CP-C sau U07–U09:** luồng GVHD → reviewer → khoa → admin và mọi route có flag được audit; không có quyền/điểm/hạn dựng từ FE.
- **CP-D sau U10:** thống kê `đã kiểm / tổng` route, state và viewport; danh sách blocker có owner/điều kiện tháo gỡ. Sau checkpoint này mới bắt đầu U11.

## 7. Đặc tả loading cuối lộ trình (U11)

**Dựa trên:** nhịp trình bày gọn và ba chấm của ảnh F-Research; mascot cáo học thuật và logo AIPMS trong ảnh người dùng. Giao diện mới trên canvas sáng AIPMS, không hiển thị nguyên PNG chứa cả chữ vì chữ cần responsive, semantic và dịch được. Kiểm tra quyền sử dụng asset người dùng đã cung cấp; tạo bản tách mascot giữ nguyên tạo hình, tối ưu kích thước, logo dùng `BrandLogo` hiện hành.

| Tình huống | Hiển thị | Quy tắc |
|---|---|---|
| Bootstrap phiên/app lần đầu | Mascot nhỏ vừa phải, logo AIPMS, “Đang chuẩn bị không gian đồ án” + mô tả ngắn, 3 chấm xanh dương/cam/xanh lá | Chỉ xuất hiện khi bootstrap thật đang chờ; không ép thời gian tối thiểu, không giả tiến độ % |
| Chuyển route chậm | Khung loading gọn tại vùng nội dung; giữ shell và ngữ cảnh | Không phủ toàn màn khi dữ liệu cũ còn an toàn để đọc |
| Tải bảng/card/PDF | Skeleton đúng hình nội dung hoặc trạng thái “Đang mở tài liệu” | Giữ kích thước để tránh layout shift; không dùng mascot lặp trên mọi card |
| Lỗi/timeout/403 | Error/forbidden state đúng nguyên nhân, retry khi hợp lệ | Không quay chấm vô hạn; không ghi “đang khởi tạo” khi request đã lỗi |

Motion chấm nhẹ, chỉ animate `opacity`/`transform`; `prefers-reduced-motion` hiển thị chấm tĩnh. Nội dung loading có `role="status"`/`aria-live="polite"`, không giành focus. Có alt phù hợp hoặc mascot trang trí `aria-hidden`, bảo đảm nội dung text độc lập ảnh. Kiểm tra 360/390/768/1440/1920, zoom 200%, mạng chậm, lỗi, route nhanh và không phát sinh Cumulative Layout Shift thấy rõ.

## 8. Chuẩn nghiệm thu và báo cáo

Với từng task: ghi route/component, ảnh tham khảo, lý do chọn pattern, dữ liệu thật, action/permission/state, file thay đổi, ảnh trước/sau với **cùng fixture**, test và giới hạn. Một màn chỉ được đánh dấu `VERIFIED` khi có kiểm tra browser theo vai trò và trạng thái tương ứng; unit test riêng không chứng minh E2E thật. Đối chiếu [`04-AUDIT-ACCEPTANCE.md`](04-AUDIT-ACCEPTANCE.md) cho 401/403/409/422, frozen, dữ liệu chưa công bố, readback và responsive.

Mỗi commit phải qua `npm run typecheck`, `npm run lint`, test liên quan, `npm run build`, `git diff --check`; chạy toàn bộ test ở checkpoint hoặc khi thay đổi primitive. Browser QA ở 360/390/768/1024/1440/1920, zoom 200%, bàn phím, dialog, nhãn dài, bảng nhiều dòng, reduced motion. Không dùng điểm tổng UI/UX để che P0. Phần chưa thể kiểm do account/BE/fixture được ghi `BLOCKED` và không suy diễn là PASS.

**Quản lý thay đổi:** thực hiện trên nhánh đã push ở đầu tài liệu, commit nhỏ và push; không tạo PR. Nếu một đề xuất cần BE/DB hoặc thay đổi quyền/nghiệp vụ, dừng riêng đề xuất đó ở `OPEN` và tiếp tục các task FE-only độc lập. Không động tới `tasks/plan.md`/`tasks/todo.md` của FE1 đang có việc chưa hoàn tất.
