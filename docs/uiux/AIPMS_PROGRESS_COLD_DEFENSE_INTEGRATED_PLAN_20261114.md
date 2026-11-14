# AI-PMS — Kế hoạch tích hợp tiến trình, Cold và Defense

Ngày đối chiếu: 2026-11-14. Phạm vi mã: BE `feat/be-access-audit-20261113` @ `51300c0`; FE `feat/fe-fresearch-reference-20261113` @ `40863af`. Đây là kế hoạch thực thi, **không phải xác nhận nghiệm thu runtime**. Chỉ commit/push đúng hai nhánh này; không PR, merge hoặc tác động hệ thống tham khảo.

Tiến độ sau đối chiếu: FE giữ lối vào Cold/Defense sau Final Package (`802d0f8`); BE chặn Gate 1–3 PASS trực tiếp (`f756221`); FE giữ số thông báo/chat khi lỗi tạm thời và thu gọn dock (commit FE kế tiếp). Các hạng mục T0–T9 còn mở theo `tasks/progress-cold-defense-20261114.md`; không suy nghiệm thu toàn luồng từ các sửa cục bộ.

## 1. Nguồn thẩm quyền và phát hiện

Yêu cầu hiện tại của chủ hệ thống > quy tắc học vụ/DB/BE được phê duyệt > FE > tài liệu tham khảo và ảnh. Tài liệu `AIPMS_INTERDISCIPLINARY_COLD_DEFENSE_COMPREHENSIVE_GUIDE.md` chứa cả mô tả đúng, ví dụ và khẳng định chưa khớp mã. Không lấy tỷ trọng mẫu, số người chấm mẫu hoặc tên trạng thái trong tài liệu làm chính sách chính thức nếu chưa có nguồn học vụ.

| Mã | Phát hiện từ source | Tác động | Việc cần làm |
|---|---|---|---|
| P0-01 | `ReviewGateService.UpdateDecision` cho cán bộ đặt `PASSED` không đợi hai reviewer | Gate 1–3 bị đi vòng | Cấm regular PASS khi thiếu hai quyết định; giữ override riêng có lý do/audit |
| P0-02 | `ColdSubmissionService.Apply` nhận template COMMON nhưng từ chối target COMMON; `MajorId` item là `long` | Checklist liên ngành thiếu phần chung | Bổ sung COMMON xuyên DB/contract/access/FE; migration Database First nếu cần |
| P0-03 | Cold hiện do cán bộ chủ trì khóa; user yêu cầu thành viên hội đồng Defense chấm Cold trước Defense | Sai thứ tự/quyền trong tài liệu | Leader nộp/khóa theo chính sách đã chốt, cán bộ xác nhận; hội đồng xác lập trước Cold, xếp lịch sau Cold |
| P0-04 | `EvaluationDraftWorkflow`/`EvaluationSchemeService` chưa ràng buộc COLD evaluator với `DefenseCommitteeMember`; chỉ chặn primary supervisor | Người ngoài hội đồng có thể được phân chấm Cold | Cả candidate, assign, read, write, finalize đều kiểm tra membership và scope, chặn mọi supervisor/mentor của chính nhóm |
| P0-05 | `AutoScheduleService` và lịch thủ công chỉ xét Gate 3/cửa sổ, chưa xét Cold; `ReviewGateService.DefenseReadiness` cũng chưa xét Cold | Nhóm chưa chấm xong có thể được xếp lịch | Một service readiness duy nhất dùng cho preview/apply/manual/CTA; COLD_READY là điều kiện, có blocker rõ |
| P0-06 | Defense committee chấp nhận 1–20; helper khác nói đúng 4; nhiều committee có thể tồn tại, scheduler lấy bản đầu | Mơ hồ hội đồng có hiệu lực | Chính sách min 3 + chair/secretary và đại diện ngành theo kỳ; định danh active committee/version; đổi thành viên phải tính lại Cold |
| P0-07 | FE route registry chỉ hiện Cold/Defense ở `ACTIVE`; sau Final Submission là `FINAL_SUBMISSION` | Sinh viên mất menu khi cần nhất | Hiện route theo quyền đọc ở cả `ACTIVE`, `FINAL_SUBMISSION`, `COMPLETED` tương ứng; mutation theo BE |
| P1-01 | `AcademicKnowledgeManagementPage` chỉ nhập text; chưa có file mẫu cho sinh viên | Không tải/xem DOCX/PDF mẫu | Kho tài liệu mẫu theo bộ môn/ngành/kỳ, file version, publish/retire, quyền tải |
| P1-02 | `DocumentPreviewModal` chỉ render PDF/ảnh/text; Office là fallback download | DOCX/XLSX chưa xem trước | Readonly preview qua endpoint BE; không đưa tệp riêng lên viewer công cộng |
| P1-03 | Chưa có vòng Excel export → import → diff → chỉnh trên web → re-export | Nhập rubric dài, dễ sai | Workbook versioned từ BE; parse/validate/preview/commit; export luôn đọc dữ liệu mới nhất |
| P1-04 | `TopHeader` xóa số unread khi request lỗi; chat dock 400×640px và badge phụ thuộc lần fetch toàn bộ inbox | Mất số, khung quá lớn | Count có trạng thái known/stale/retry; dock nhỏ gọn, thông báo không chồng, readback |
| P1-05 | 140 actionable FE routes; nhiều trang cùng một đối tượng | Điều hướng rối | Gom bằng tab/subnav cùng context, giữ deep links/redirect, không gộp khác quyền |

Source chính: `ReviewGateService.cs`, `ColdSubmissionService.cs`, `ColdSubmissionService.Versions.cs`, `ColdSubmissionService.Progress.cs`, `AcademicTrackingService.Defense.cs`, `AutoScheduleService.cs`, `EvaluationSchemeService.cs`, `EvaluationDraftWorkflow.cs`, `workspace-route-registry.ts`, `DocumentPreviewModal.tsx`, `TopHeader.tsx`, `ChatDock.tsx`. Danh mục đầy đủ: `docs/uiux/ROUTE_CENSUS.csv` (140 route).

## 2. State machine và thứ tự nghiệp vụ đích

```text
Bộ môn: kỳ/chính sách → rubric & yêu cầu Gate đã duyệt → template tài liệu đã công bố
Nhóm: đăng ký/phê duyệt đa bộ môn → ACTIVE → Gate 1 → Gate 2 → Gate 3
Nhóm: Sprint/task/milestone/evidence theo yêu cầu Gate; Final Package khóa trước khi phân công chấm chính thức
Bộ môn: lập và chốt hội đồng Defense (chưa xếp lịch); mỗi thành viên đúng ngành, không là supervisor/mentor nhóm
Bộ môn: áp checklist Cold COMMON + MAJOR_SPECIFIC (+ INDIVIDUAL nếu chính sách yêu cầu)
Nhóm: thành viên nộp đúng scope → leader rà soát và khóa gói; BE ghim file/version/hash
BE: tạo phân công Cold chỉ cho thành viên hội đồng phù hợp rubric; thông báo/deep link đến đúng bài
Hội đồng: xem đúng file đã khóa → chấm Cold theo phần chung/ngành/cá nhân được phân → finalization
BE: COLD_READY = đủ file bắt buộc + đủ kết quả Cold + không còn blocker học vụ
Bộ môn: preview/apply lịch Defense; BE kiểm tra lại COLD_READY, Gate 3, Final Package, cửa sổ, phòng, người
Hội đồng: chấm Defense theo assignment riêng nhưng cùng active committee → duyệt/công bố kết quả → phúc khảo
```

Luồng này tránh vòng phụ thuộc: **lập hội đồng trước Cold, xếp lịch sau Cold**. Phân biệt `COMMITTEE_CONFIRMED`, `COLD_PACKAGE_LOCKED`, `COLD_REVIEW_COMPLETE`, `DEFENSE_SCHEDULED` bằng capability/derived status; không cần biến tất cả thành trạng thái `Project` mới. Chính sách hiện hành có thể cho Cold là tùy chọn theo kỳ/ngành; khi bắt buộc, readiness phải fail closed. Nếu đổi hội đồng sau phân công Cold: lưu phiên bản/audit, thu hồi assignment chưa bắt đầu; điểm đã chốt phải có quyết định xử lý có thẩm quyền, không xóa âm thầm; readiness quay về BLOCKED tới khi hoàn tất phân công hợp lệ.

### Quyền và trách nhiệm

| Chủ thể | Nhìn thấy | Ghi/chốt |
|---|---|---|
| Bộ môn chủ trì | Toàn tiến trình trong phạm vi đồ án | Template chung, scheme, hội đồng, lịch, quyết định công bố |
| Bộ môn tham gia | Nhánh ngành mình và thông tin chung cần duyệt | Template/rubric ngành, ý kiến ngành; không sửa phần của ngành khác |
| Leader | Yêu cầu Gate, checklist và toàn tiến trình nhóm | Kế hoạch nhóm, hồ sơ Gate/Final, khóa Cold khi đủ điều kiện |
| Thành viên | Phần chung và ngành/cá nhân được phép | Task/evidence/báo cáo/tệp đúng phần được giao |
| Primary/Mentor | Đồ án phụ trách trong scope | Phản hồi, đánh giá tuần; không chấm Gate/Cold/Defense của nhóm mình |
| Hai Gate evaluator | Gói Gate 1–3 được phân | Verify/decision; cùng đúng hai người trên ba Gate |
| Thành viên Defense committee | Hồ sơ Cold/Defense đã được phân | Cold trước, Defense sau; chỉ rubric đúng ngành/phạm vi; không tự cấp quyền từ role toàn cục |

Global role tài khoản vẫn là ADMIN/DEPARTMENT_STAFF/LECTURER/STUDENT; leader/supervisor/mentor/evaluator/committee là quan hệ ngữ cảnh. Admin không mặc nhiên thay cán bộ học vụ để chấm/duyệt.

## 3. Tiến trình: điều kiện, thông tin, thao tác

1. **Bộ môn cấu hình Gate**: mỗi Gate có mục tiêu, cửa sổ, deadline, yêu cầu minh chứng, scope, tiêu chí rubric, loại file/link, cách thẩm định HUMAN/SYSTEM, tính bắt buộc, lý do chặn và phiên bản đã công bố. Tạo summary đọc được cho sinh viên; mọi sửa bản đã công bố dùng phiên bản mới.
2. **Leader lập kế hoạch**: nhìn trước yêu cầu Gate theo kỳ/ngành; gắn milestone/task/evidence với `gateCode` và `requirementId` khi BE đã có binding được duyệt. Liên kết kế hoạch không tự đánh dấu minh chứng đạt; người chấm xác minh riêng. Hiện rõ số task thiếu chủ, trễ hạn, thiếu minh chứng, Gate đang bị chặn.
3. **Nhóm thực thi**: task có người phụ trách, ngày, dependency, discipline; báo cáo tuần, họp, deliverable và evidence hiển thị theo nguồn/phiên bản/ngành. Mỗi khối có trạng thái loading/empty/blocked/stale/error; quyền ghi dựa BE capability.
4. **Gate 1–3**: submit chỉ leader; supervisor phản hồi; hai reviewer cố định, độc lập và không là supervisor. Mọi quyết định PASS phải đi qua hai lượt hoặc override có lý do và audit. Nhánh ngành chưa đạt có thể sửa đúng scope, không xóa kết quả ngành đã đạt nếu hợp đồng BE cho phép.
5. **Cold/Defense**: checkpoint hiển thị riêng `chưa có hội đồng`, `thiếu mẫu`, `chưa khóa`, `chờ n người chấm`, `cần sửa`, `đủ điều kiện`, `đã xếp lịch`. Blocker phải chỉ rõ actor và hành động kế tiếp. Không suy COLD_READY từ chỉ số tiến độ hoặc trạng thái Gate đơn thuần.
6. **Kết quả**: điểm chính thức chỉ từ BE published snapshot; tách stage COLD/DEFENSE, scope, trọng số, trạng thái người chấm, nhận xét được phép công bố. Phúc khảo liên kết đúng version và thời hạn; không lộ điểm nháp.

## 4. Excel tiêu chí và file mẫu

Workbook `.xlsx` **được BE sinh cho một bản nháp cụ thể**, gồm `Hướng dẫn`, `Bộ tiêu chí`, `Tiêu chí`, `Mức chất lượng`, `Yêu cầu Gate`, `Danh mục hợp lệ` (sheet sau cùng có thể ẩn). Cột khóa: template schema version, rubric/template ID và concurrency token chỉ đọc; dòng tiêu chí dùng code ổn định và parent code, scope/major/stage, learning outcome, evidence guidance, max score, weight; mức chất lượng có min/max/descriptor; Gate requirement có gate code, scope, type, verification, required, blocksNext/blocksDefense và hướng dẫn minh chứng. Ví dụ được đánh dấu rõ, không tự publish hay áp điểm chính thức.

Import là **hai bước**: upload/parse với giới hạn byte, row, sheet và công thức → BE trả lỗi theo sheet/ô, tổng trọng số, trùng code, cây sai, major ngoài scope, window sai, level thiếu, diff với draft hiện tại → người có quyền xác nhận commit bằng token. Lỗi/409 giữ file và bản nháp FE. Chỉ sửa `DRAFT`; bản đã công bố tạo version mới. Sau chỉnh trên web, download luôn tạo lại từ dữ liệu BE hiện tại; không lưu/đọc một workbook cũ làm nguồn chính. Reuse `ClosedXML` đã có ở BE; không thêm parser FE để quyết định nghiệp vụ. [ClosedXML docs](https://docs.closedxml.io/en/latest/index.html).

Kho mẫu học vụ là chức năng khác rubric import: cán bộ upload DOCX/PDF/XLSX mẫu cho bộ môn/ngành/kỳ, nhập tên/loại/phiên bản/hiệu lực, kiểm tra file và publish. Sinh viên thấy phiên bản có hiệu lực, xem trước và tải bản gốc. Không đưa file mẫu vào Academic AI text index như thể đó là nguồn phát hành nếu chưa có mapping rõ.

Preview: PDF/ảnh giữ `DocumentPreviewModal` hiện có; DOCX chuyển thành bản xem PDF bằng worker cô lập với quota và timeout, hoặc nếu hạ tầng không có converter thì trả trạng thái `PREVIEW_UNAVAILABLE` + download có lý do (không báo “đã hỗ trợ”). XLSX hiển thị grid chỉ đọc theo sheet, giới hạn dòng/cột, không chạy macro/formula; giá trị/format an toàn từ BE ClosedXML; có bản gốc download. Mọi preview phải kiểm tra quyền theo project, Cold target hoặc template scope, đọc đúng file version/hash, MIME thật, `Content-Disposition` và không cache công khai. Hiện máy local không có LibreOffice; triển khai DOCX preview cần hạ tầng worker đã kiểm chứng. LibreOffice có CLI chuyển PDF theo [tài liệu chính thức](https://help.libreoffice.org/latest/en-US/text/shared/guide/start_parameters.html).

## 5. Giao diện và gom màn hình

Giữ 140 URL/deep link hiện có để không phá bookmark và thông báo. Hợp nhất **khung điều hướng**, không xóa nghiệp vụ:

| Vai trò | Một khu vực chính | Tab/subview gợi ý | URL cũ |
|---|---|---|---|
| Sinh viên | Tiến trình đồ án | Tổng quan, Gate/điều kiện, kế hoạch (Sprint/task/milestone/Gantt), nộp bài (deliverable/Cold/Final), Defense/kết quả | Redirect hoặc render tab tương ứng, preserve project context |
| Supervisor/Mentor | Hồ sơ nhóm phụ trách | Tiến độ, task/mốc, họp/báo cáo, phản hồi tuần, minh chứng, Gate | Khác scope mentor vẫn là guard BE riêng |
| Evaluator/Hội đồng | Hàng đợi được phân | Gate review, Cold, Defense, điểm nháp/chốt | Chỉ hiện assignment thực tế; không gộp với quyền supervisor |
| Bộ môn | Điều hành học vụ | Đề cương, rubric/Gate, mẫu tài liệu, phân công, readiness/lịch, kết quả | Một project detail shell với tab và blocker counter |
| Admin | Vận hành hệ thống | Tài khoản/role, kỳ, phòng, audit | Không thay màn ra quyết định học thuật của bộ môn |

Không gộp `Rubric` với `EvaluationScheme` thành một form; chỉ dùng cùng trang có bước/tabs vì rubric là thang chấm còn scheme là chính sách kết hợp điểm. Không gộp `Gate review` với `Cold/Defense` vì assignment và thời điểm khác nhau. Trên mỗi project giữ `EntityIdentityStrip`, breadcrumb, một CTA chính, summary trạng thái, blocker/action owner, timeline, rồi chi tiết theo tab. Kiểm tra từng route trong `ROUTE_CENSUS.csv` với vai trò, flag, loading/empty/403/409/5xx/mobile/keyboard.

### Rule UI chung

- Một `Alert` theo mức info/success/warning/error, có title, mô tả, hành động sửa/làm mới; inline field error và form summary dùng chung mã lỗi BE. Không dùng `window.alert`; confirm có tên đối tượng và hệ quả.
- Form giữ dữ liệu khi 400/409/network; 409 cho so sánh phiên bản và nạp lại; success sau readback. Loading/empty/filtered empty/access denied được phân biệt.
- Notification count không chuyển thành “0” hoặc biến mất khi fetch lỗi: giữ giá trị `lastKnown` cho đúng tài khoản, đánh dấu đang đồng bộ/cũ, refresh theo event + reconnect + polling có giới hạn. Badge đủ chỗ cho `99+`, kiểm tra mobile/zoom; thông báo Cold có deeplink tới assignment.
- Chat dock desktop dùng kích thước mục tiêu khoảng 340–360 × 480–520px, danh sách và thread riêng, header chỉ title/trạng thái/thu nhỏ/đóng, phần đính kèm và thao tác phụ thu gọn trong menu. Mobile giữ full-screen; 44px hit area, reduced motion, focus/keyboard. Giữ tính năng gửi, đọc, tệp, reaction/reply nếu BE hỗ trợ; bỏ phần lặp thị giác, không xóa dữ liệu/chức năng.
- Ngày theo ngữ cảnh: create meeting/defense/Cold deadline không chọn trước “hiện tại” hay ngoài kỳ; end > start; Gate window và kỳ được BE tái kiểm tra. Chỉnh sửa hồ sơ cũ, bộ lọc lịch sử và ngày học kỳ quá khứ không bị chặn bừa. FE `min/max` là gợi ý UX; BE validate timezone Việt Nam, DST/UTC, giới hạn kỳ, conflict và concurrency.

## 6. Thứ tự thi công và điều kiện chấp nhận

| Lát cắt | Phụ thuộc | Kết quả/acceptance | Kiểm chứng |
|---|---|---|---|
| T0. Contract và fixture | Không | State/role/capability matrix; snapshot DB read-only, API contract; 2 đồ án mẫu đơn/liên ngành cô lập | Review nguồn thẩm quyền, không đụng DB chung |
| T1. Gate và Final | T0 | PASS thường cần đúng cặp cố định; Final gate prerequisite theo policy; override audit | Unit/integration 2 reviewer, supervisor, 409, override |
| T2. Cold COMMON và quyền khóa | T0 | COMMON + mỗi major áp được; leader chỉ khóa khi đủ, frozen/hash; phân quyền read/write đúng scope | Unit/integration leader/member/staff, tamper, version |
| T3. Committee ↔ Cold assignment | T2 | Active committee xác định; chỉ member được assign/read/write/finalize Cold; mỗi member có việc theo scope; thông báo đủ ngữ cảnh | Unit/integration đổi hội đồng, supervisor, đa ngành, notification recipient |
| T4. Readiness và lịch | T1–T3 | Một readiness service cho manual/auto/preview; Cold chưa đạt luôn chặn lịch; double booking vẫn chặn | Integration cả 3 entrypoint và race |
| T5. Kho mẫu và Excel | T0, T2 | Upload/publish/download version; workbook roundtrip, diff, import errors, re-export cập nhật | File malformed/oversize/formula/duplicate/100%/stale |
| T6. Preview an toàn | T2, T5 | PDF/ảnh/DOCX/XLSX xem được bằng quyền thật; không lộ tệp ngoài scope | Browser + API quyền, format, limit, worker failure |
| T7. FE tiến trình/route | T1–T6 | Màn theo role, blockers/owner, task-Gate links, Cold/Defense sau FINAL_SUBMISSION, deep links cũ | Playwright 4 role × trạng thái trọng yếu, 375/768/1440 |
| T8. UI/notification/chat/date | T0, T3 | Alert/form chung, unread không mất, dock gọn, date theo nghiệp vụ | Component + Playwright focus/mobile/zoom/reconnect |
| T9. Full acceptance | T1–T8 | Một đồ án đơn ngành + một liên ngành chạy đề cương → 3 Gate → Final → Cold → lịch → Defense → công bố → phúc khảo | BE integration DB cô lập, FE browser authenticated; báo cáo test và giới hạn |

Mỗi lát cắt có commit riêng trên đúng nhánh BE/FE; chỉ push hai nhánh sau khi check contract, build và test liên quan. Không mở PR hoặc merge. Nếu không có DB cô lập/converter DOCX, ghi `BLOCKED` cho runtime tương ứng, không ghi `DONE` vì test giả lập.
