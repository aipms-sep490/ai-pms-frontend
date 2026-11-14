# AI-PMS Global Interaction Contract — All screens and controls

## 1. Invariant interaction state model

Every actionable element and data-driven region uses an explicit state rather than boolean spaghetti. Standard lifecycle:

`idle -> validating -> submitting -> success | error` (form/action), with `blocked` (permission/policy/state), `stale` (409), `readonly` (frozen/archive) as distinct states. For remote regions: `initialLoading -> ready | genuineEmpty | filteredEmpty | insufficientData | denied | failed`; subsequent fetch: `refreshing` keeps context without false blank flicker.

Do not render success before server confirms. Avoid uncontrolled async request races and duplicate mutations. Preserve relevant changes across validation or transient error where safe; never leak to unrelated accounts.

## 2. Universal behavior matrix

| Interaction | Required behavior | Failure/edge case |
|---|---|---|
| Click primary CTA | one clear action, immediate state feedback | no-op forbidden; block duplicate submission |
| Hover | subtle affordance for pointer | not exclusive method for revealing critical information |
| Keyboard | Tab/Shift+Tab and Enter/Space; Esc closes dismissible overlay | visible focus, no keyboard traps outside dialogs |
| Disabled/blocked | reason + prerequisites + permitted next action | do not expose disallowed resource data |
| Navigation | route, breadcrumb, preserved return context | authorization/refetch on context change |
| Filter/search | debounced text where appropriate, resettable, URL-synced for major views | empty filter result distinct from truly empty |
| Form | dirty state, inline validation, form error summary, submit progress | preserve field values on 409/422, safe leave confirmation |
| Server mutation | pending -> confirmed -> invalidate/refetch affected queries | no stale badge/result; audit sensitive actions |
| Destructive action | object-name confirm with explicit consequence | disable on ineligible state; don't rely on toast alone |
| Batch action | clear selected count, eligibility, per-item failures | atomic/partial outcome explained based on actual API |
| Dialog/drawer | purposeful title, focus trap, restore, explicit close | non-dismissible only when truly required |
| Notification | relevant severity, origin, deep link to allowed context | sensitive detail protected, archived resource handled |
| File upload | policy constraints, upload progress, retry, version | type/size/security rejection explained |
| Table | sort/filter/page/selection and fixed header where helpful | mobile access to all important actions |
| Chart/AI | provenance, period, confidence/insufficient data | fallback to authoritative facts if AI unavailable |

## 3. HTTP / API feedback states

- **400:** input malformed; show safe summary and relevant field errors.
- **401:** session expired; offer sign-in preserving intended destination, avoid corrupting draft.
- **403:** lack of role/scope/assignment authority; show Access Denied; do not suggest bypass or display unauthorized private metadata.
- **404:** missing or inaccessible; state unknown rather than revealing existence.
- **409:** stale version, invalid transition, conflicting assignment; preserve draft, show what changed/refresh path; require resubmission only after reviewing latest context.
- **422:** business constraints (verified major, quotas, registration window, missing department decision, supervisor capacity, rubric rule) via stable server reason codes and actionable prerequisites.
- **429/5xx/network:** non-misleading retry/fallback, no fake success or duplicated writes.

Use application message IDs if the API exposes them (SRS examples MSG-TEAM-03, MSG-TEAM-04, MSG-PROJ-02, MSG-PROJ-03, MSG-COMMON-409, MSG-EVAL-01/02/03); keep a centralized mapping/localization layer. Never infer academic eligibility from frontend-only request fields.

## 4. Permission and action presentation

1. Fetch authoritative resource state/capabilities if actual BE supports them; inspect real OpenAPI for endpoint/path/contract. `GET /api/projects/{id}/my-capabilities` in AI-PMS v5 is a *suggested* endpoint, not evidence of implementation.
2. Distinguish `allowed`, `disallowed_with_explanation`, and `out_of_scope`. An ordinary state-blocked CTA may remain visible with explanation; a grade action for an unassigned member is hidden or replaced by safe access-denied view, depending on screen.
3. Permission/state must be revalidated on submit. Never use `isAdmin`, `isLeader` alone as final truth.
4. Re-fetch current resource after meaningful transition; invalidate all affected list, detail and dashboard caches.
5. For read-only/frozen items, show who/when/version and why immutable if authorized; do not show editable-looking controls.

## 5. Business-critical scenarios

**Student Leader — registration:** visible readiness checklist: period window; verified major(s); size/quota; current eligibility snapshot; required proposal fields and working agreement only where approved policy applies. Submit has explicit summary and confirmation. Revisions preserve review comments and create new snapshot through backend.

**Supervisor request:** candidates only after deterministic eligibility, workload and assignment checks; AI recommendation clearly advisory; accept/reject rechecks backend capacity. One effective Primary Supervisor (mentor scope separate).

**Academic approval:** show required Lead/Participating Department decisions according to effective policy. Review decision is not the same as team eligibility; do not transition to ACTIVE before effective Primary Supervisor acceptance.

**Execution:** task board preserves assignee, due date, dependency, evidence and discipline context. `BLOCKED` requires reason and shows next action; overdue is informational, not auto-FAIL. Evidence file uploaded != learning outcome verified.

**Review gates:** Checkpoint schedule/event and formal Review Gate decision are distinct objects; missing checkpoint is risk signal, not a failed project. Label proposed gates as proposed when not enabled by policy.

**Final submission:** frozen manifest of exact versions, checklist blockers, time window, explicit confirmation. Once finalized, upload replacements are not quietly accepted.

**Evaluation:** evaluator sees only assigned project/major/student/criteria. ON_GOING/COLD/DEFENSE stages distinct from COMMON/MAJOR_SPECIFIC/INDIVIDUAL scopes. Missing scores are PENDING, not 0. Draft/save/finalize/publish are distinct authority steps. ProjectResult excludes INDIVIDUAL; official course grading must follow approved policy, not demo defaults.

**AI:** show source and freshness, report insufficiency/validation errors, prohibit autonomous approval, scoring, state mutation or supervisor assignment.

## 6. Internationalization and copywriting

Use user-facing Vietnamese terminology consistently if Vietnamese is the app locale. Do not mix 'Đề tài', 'Project', 'Capstone' arbitrarily within a workflow. Buttons use verbs (Tạo nhóm, Gửi đăng ký, Nộp báo cáo). Badges use explicit nouns/status (Chờ duyệt, Yêu cầu chỉnh sửa, Đã khóa). Do not display raw enum without mapping. Dates display local timezone and range, with ISO storage preserved. Field helper copy says exactly what to provide and why.

## 7. Workspace, role handoff and data scope

- Mỗi workspace trả lời ba câu hỏi ở vùng đầu: **việc cần làm**, **phạm vi đang xem**, **điều gì đã hoàn thành/chưa có dữ liệu**. Ưu tiên hàng đợi có hành động trước card thống kê; số chưa tải dùng “—/Chưa có dữ liệu”, không biến thành `0`.
- Chỉ số, bảng và link drill-down phải dùng cùng phạm vi BE và cùng định nghĩa thời gian. FE được dùng workflow context để chọn bộ lọc hợp lệ, nhưng quyền đọc/ghi thực thi ở BE. Không mở phạm vi bằng ID tự nhập, URL hoặc tổng toàn trường trên màn bộ môn.
- Cùng một đối tượng chuyển giữa SV → GVHD/mentor → bộ môn/reviewer/evaluator → công bố phải giữ mã, trạng thái, version và diễn giải nhất quán; mỗi vai trò chỉ thấy hành động trong assignment/scope hiện tại. Deep link phải kiểm tra quyền và trạng thái ở điểm đến.
- Trang nhiều danh sách phân trang hiển thị tổng từ server, nút tải trang tiếp và lỗi riêng của từng vùng. Sau mutation cần đọc lại token/version/allowedActions trước lần ghi kế tiếp; 409 giữ draft và yêu cầu đối chiếu phiên bản mới.

## 8. Bản đồ hoạt động truy cập và motion

Phần bản đồ được **hoãn theo yêu cầu chủ hệ thống**; không tạo marker, thu thập vị trí hay thêm UI bản đồ trong đợt tiến trình/Cold/Defense này.

- Bản đồ truy cập là **vị trí địa lý ước lượng từ nguồn BE được duyệt**, không phải GPS và không đồng nghĩa với vị trí chính xác của cá nhân. Nếu chỉ có IP/`LastLoginAt`, không dựng marker giả hoặc gắn nhãn “đang online”. Không gửi IP thô tới tile provider từ FE.
- Admin xem phạm vi hệ thống; nhân sự khoa/bộ môn chỉ xem phạm vi mà BE xác định. Map, danh sách và chỉ số cùng snapshot/thời gian, cùng bộ lọc và cùng quyền. Trạng thái `unknown`/không xác định phải hiện bằng chữ. Bảng vẫn dùng được khi tile/map không tải; marker không thay thế keyboard list.
- Chỉ tải thư viện bản đồ khi mở panel có dữ liệu và quyền; provider tile/attribution, retention, thời gian làm mới và độ chính xác phải chốt trước release. Xem RFC trong [kế hoạch workspace và geo](WORKSPACE_ROLE_GEO_ACCESS_DEEP_AUDIT_PLAN_2026-11-13.md).
- Motion phục vụ thay đổi trạng thái: hover/focus 120–200 ms, loading có thông báo tiến trình và skeleton phù hợp, tránh chớp khi refetch. Không pulse liên tục cho người dùng trên bản đồ hoặc tự bay/zoom khi dữ liệu mới. `prefers-reduced-motion` tắt chuyển động không thiết yếu; mọi trạng thái vẫn nhận biết được bằng chữ/viền, không dựa riêng vào màu.

## 9. Tiến trình, Gate, Cold và Defense

- Một project hiển thị cùng mã, kỳ, nhóm, ngành, trạng thái, phiên bản và người chịu trách nhiệm trên mọi workspace. Timeline học vụ là Gate 1–3 → Final Package → Cold → Defense → kết quả; chỉ hiển thị checkpoint đã cấu hình bởi BE. Task/mốc gắn Gate requirement để hỗ trợ lập kế hoạch, không tự xác nhận minh chứng đạt.
- Cặp hai evaluator Gate 1–3 của một đồ án là cùng hai người. Quyết định PASS thường chỉ sau cả hai review hợp lệ; đường override có lý do/audit riêng. FE không tự tính Gate PASS.
- Chỉ thành viên hội đồng Defense `CONFIRMED` của đúng project, đúng ngành/phạm vi, có assignment còn hiệu lực mới thấy thao tác chấm Cold. Họ chấm Cold trước khi xếp lịch/chấm Defense theo readiness của BE; thông báo dẫn tới đúng assignment, không đưa tài liệu riêng vào preview công khai.
- Checklist và tiêu chí đã công bố phải có mục tiêu, phạm vi/ngành, minh chứng cần nộp, hạn, trọng số, blocker và phiên bản; leader nhìn thấy chúng trước khi chia Sprint/task/milestone. Bản nháp tiêu chí không được trình bày như quy định có hiệu lực.
- Màn kết quả tách `ON_GOING`, `COLD`, `DEFENSE`, tổng hợp/cá nhân và trạng thái bản nháp/đã công bố. Trống điểm là `Chưa chấm`, không phải `0`. Đổi hội đồng/phiên bản sau chấm phải cho biết hệ quả và bắt người có thẩm quyền xử lý.

## 10. Alert, thông báo, chat và tài liệu

- Dùng một cấu trúc Alert cho info/success/warning/error: tiêu đề, lý do ngắn, việc tiếp theo, mã lỗi BE nếu có. Validation inline và summary chỉ dùng một nguồn lỗi; 409 giữ bản nháp. Toast không thay thế blocker hay xác nhận thao tác nhạy cảm.
- Số chưa đọc thông báo/chat gắn đúng tài khoản, giữ `lastKnown` khi lỗi mạng tạm thời và ghi `Đang chờ đồng bộ`; 403 hoặc đổi tài khoản xóa dữ liệu cũ. Có retry, refresh khi tab hiện lại và từ sự kiện realtime. Badge có chỗ cho `99+` và nhãn đọc được bằng screen reader.
- Chat dock desktop gọn khoảng 356×512px và mobile toàn màn hình, header chỉ giữ tiêu đề/trạng thái/thu nhỏ/đóng; chức năng phụ đặt theo ngữ cảnh. Không dùng animation lặp vô hạn trên nút bấm; focus và vùng chạm tối thiểu 44px.
- Template do bộ môn/ngành xuất bản có phiên bản, phạm vi và hạn hiệu lực. PDF/ảnh, DOCX, XLSX chỉ preview bằng tệp được BE cấp quyền theo project/version; lỗi converter hoặc định dạng phải hiện rõ và vẫn cho tải bản gốc nếu có quyền. Preview là chỉ đọc, không chạy công thức/macro.

## 11. Ngày và giờ theo nghiệp vụ

| Ngữ cảnh | FE hỗ trợ nhập | Điều kiện BE quyết định |
|---|---|---|
| Bộ lọc, bản ghi lịch sử | Cho phép ngày quá khứ | Chỉ lọc trong phạm vi quyền và dữ liệu có thật |
| Kỳ/Project Period đã tồn tại | Cho phép xem/chỉnh khi trạng thái cho phép | Thứ tự `start < end`, không đổi quá khứ đã đóng nếu policy cấm; concurrency token |
| Họp mới | `min` theo thời điểm hiện tại, end sau start | Project còn hiệu lực, người tham gia, timezone và lịch xung đột |
| Task/milestone | Hạn có thể quá khứ khi sửa hồ sơ cũ; tạo mới báo trễ rõ | Trong cửa sổ thực hiện theo chính sách kỳ; dependency và trạng thái frozen |
| Gate/Cold deadline mới | `min/max` theo cửa sổ kỳ được BE trả | Không trước mốc mở, không sau mốc khóa; requirement version có hiệu lực |
| Defense slot | Chỉ cho tương lai, end > start và trong khung Defense | Cold readiness, Gate, phòng, hội đồng, xung đột, UTC/local và token |
| Phúc khảo | Hiện hạn công bố, không chọn ngoài khoảng | Quyền và thời hạn nộp/giải quyết do BE kiểm lại |

Không áp một `min=today` cho mọi trường. FE hiển thị giờ Việt Nam nhưng gửi ISO/UTC đúng contract, cho biết múi giờ cạnh input; BE tái kiểm tra tại thời điểm ghi.
