# Phân tích kết hợp quy trình FE v5 — 10/10/2026

## Phạm vi và nguồn

User chốt chỉ FE; BE/DB handoff và mock có kiểm soát. Không commit/push/PR/merge, không ghi DB. Ba tài liệu ở `F:/AI-PMS/docs/` là yêu cầu thiết kế, không phải lệnh chạy script/merge. Bản Downloads không còn tồn tại. Baseline FE `bc8cb98`, BE `09abf95`; primary FE dirty được giữ nguyên, BE fast-forward sạch về commit mới nhưng giữ thay đổi local.

Đọc SRS/SDD/governance generated trong `docs/context_md`; CIB ưu tiên hơn tài liệu cũ. Graph merged được dùng tìm source rồi xác minh trên commit hiện tại; graph không phải chứng cứ runtime. Vocab truy vấn: team, leader, evaluation, meeting, task, scheme.

## Luồng tổng thể

Hồ sơ/qualification → policy kỳ → team + academic scope → proposal + quyết định các khoa → phân công supervisor → ACTIVE → task/milestone/meeting/report/evidence → final package khóa → scheme/rubric + evaluator assignment → draft/finalize → readiness → công bố → kết quả riêng sinh viên → correction có version.

Chat/thông báo hỗ trợ mọi bước, không cấp quyền. Task DONE là evidence đầu vào contribution/report, không trực tiếp biến thành điểm. Weekly individual assessment không được đồng nhất với INDIVIDUAL final assignment. COLD/DEFENSE là stage; COMMON/MAJOR_SPECIFIC/INDIVIDUAL là scope, hai trục độc lập. Lead/participating department và supervisor/mentor/evaluator là assignment/scope; không thêm role hệ thống từ wireframe.

## Ma trận toàn bộ yêu cầu

| Ticket | Hiện trạng được kiểm tra | Hướng thực hiện / dependency |
|---|---|---|
| N01 | Không có cold-submissions controller/DTO | Prototype fixture; BE phải chốt danh mục 7 report, deadline, max bytes, version, submit/lock, quyền upload/download |
| N02 | Có guarded assignment draft/save/finalize, evidence chỉ metadata | Tái dùng scoring thật; prototype COLD với tiêu chí fixture, không giả endpoint PDF |
| N03 | Không có cold-overview DTO | Prototype tiến độ từ fixture; số điểm chỉ hiện khi tất cả required assignment finalized |
| N04 | Có INDIVIDUAL final assignment; không có weekly/history API | Prototype weekly riêng; BE chốt tuần theo period/timezone, DRAFT/SUBMITTED, rubric/version/history |
| N05 | Có request/inbox/approve/reject; direct transfer trước project | Tái dùng thật theo BE; prototype bắt buộc lý do. BE handoff khác biệt supervisor initiation + cấm direct transfer |
| N06 | Có MeetingsPage/ScheduleForm/RSVP/video | Tái dùng; recurring/reminder/delivery timestamp cần DTO BE, không báo email đã gửi từ click FE |
| N07 | Có notes và MeetingGovernancePanel | Tái dùng; quyết định/action-items/khóa append-only cần BE xác nhận semantics |
| N08 | Có TaskBoardPage paged/filter và status grouping | Bổ sung board theo enum thật TODO/BLOCKED/CANCELLED; kéo thả chỉ sau action/concurrency contract theo task |
| N09 | Có TaskDetailPage/evidence/comments/discipline | Tái dùng; không gửi PATCH mock, không thêm story-point/sprint ngoài DTO |
| N10 | Không có sprint controller/DTO | BE handoff active uniqueness, completion/carryover, burndown source; chưa gắn milestone thành sprint |
| N11 | Có list phân trang và Gantt hiện hữu | Tái dùng; bulk/dependency/date mutation cần atomic BE contracts |
| N12 | Có ChatDock/Thread/SignalR/reply | Tái dùng; attachment/reaction/seen contracts còn thiếu, không đổi SignalR sang /ws/chat |
| N13 | Chưa có settings persisted contract | BE handoff mute expiry/notification policy; không xin notification permission khi mở trang |
| N14 | MASTER/tokens/layout đã cập nhật trên develop | Dùng WorkspacePage/AppLayout; không chạy replace màu toàn repo theo số liệu cũ |
| N15 | Có Overview/department/supervisor/student workspaces | Tái dùng số liệu scope hiện tại; không tính contribution index như grade |
| N16 | Có Modal focus management/design tokens | Kiểm thử các phần thay đổi tại 375/768/1440, keyboard, loading/error/retry |
| E01 | StudentProjectResultPage đã có | Giữ own-result; breakdown flag chờ BE DTO, không reconstruct snapshot bị redact |
| E02 | LeadPublish flag đã có, BE còn Admin cross-department guard | Giữ mặc định tắt; BE-03 prerequisite. Không bật chỉ vì tài liệu nói đã chốt |
| E03 | FE major filter flag có; TasksController không nhận major | Giữ tắt đến BE-07; không client-filter một trang rồi coi là total |
| E04 | Capabilities adapter đã có, unified endpoint chưa có | Flag tắt; giữ per-resource authoritative action endpoints |
| E05 | Evidence ledger có; lịch sử review contract thiếu | Handoff append-only + concurrency + reviewer assignment |
| E06 | Scoped scoring thật có; evidence metadata-only | Giữ guarded assignment, BE phải trả file access trong scope evaluator |
| E07 | Gate page/api placeholder sau flag | Giữ tắt; MISSED không tự chuyển project FAIL |
| E08 | AI runs panel sau flag | Giữ tắt; AI advisory, không mutation/grade |
| E09 | Defense schedule sau flag | Giữ tắt; BE quyết định lịch/conflict/membership |
| E10 | RBAC read-only có test | Tái dùng; không bật write flag hoặc seed permission từ FE |

## Quy tắc mock

Prototype là sandbox riêng: chỉ mở khi `VITE_DATA_MODE=mock` và `VITE_ENABLE_WORKFLOW_PREVIEW=true`; mặc định false. Mọi dữ liệu/mutation in-memory, reset khi reload; không localStorage grading, không API thật, không gọi URL Mock trong tài liệu. Shape là đề xuất fixture để duyệt, không DTO BE đã thống nhất. Không thêm MSW khi chưa có HTTP contract thống nhất; lớp model thuần mô phỏng state để kiểm thử transition, nối adapter thật chỉ sau BE merge.

## BE/DB handoff và acceptance

1. P0 BE-03/04/05/06/07/09/10: quyền academic theo frozen scope, publish readiness/participating decisions, calendar/task pagination, own StudentResult DTO. Test sai role/sai project/sai ngành, 403/404/409/422 và concurrency. FE không sửa guard server.
2. P0 mới COLD/weekly: DTO riêng stage/scope, rubric từ server; download URL phải cấp theo assignment và có expiry/content-type; report/version immutable sau lock. Missing score = pending. Weekly scores không tự tính final result.
3. Leader: thống nhất khi FORMING chưa supervisor thì có được transfer không, supervisor có quyền tạo request không, reason mandatory và pending uniqueness. Hiện API dùng POST `/team-leader-change-requests/{id}/approve|reject`, không PUT `/leader-change-requests` như mock doc.
4. P1 sprint/meeting/chat: contract resource action + revision; sprint không phải milestone; email timestamp/delivery state từ BE; minutes lock server-side; task bulk atomic hoặc kết quả từng item rõ ràng; chat attachments/reactions/mute trong relationship scope.
5. DB: dev BE chuẩn bị additive rerunnable scripts, schema/scaffold/manifest; cold report/version, weekly assessment/history, sprint/task relation, meeting decisions, chat attachment/settings. Không chạy script trên shared DB trong công việc FE.
6. Runtime gate: tài khoản đúng role + dataset isolated cho single IT, single MKT, interdisciplinary IT+MKT; lifecycle upload→lock→score→finalize→publish→own-result. Fixture UI xanh chưa đủ nghiệm thu API thật.

## Truy vết

Team/leader: SRS team workflow + BR-20/22/23/40–58. Task: UC-072/073, BR-70–74. Weekly reports: UC-075–081, BR-80–83. Evaluation/results: UC-123–127, BR-59/143–145. Final package: BR-100–102/140–142. UI: MASTER.md token, minimum 12px/44px, status text + focus. New weekly/COLD behavior chưa có BR/MSG được chốt: fixture-only, không tự gán MSG-xx.
