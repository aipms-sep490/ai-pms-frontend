# BÀN GIAO BACKEND — REVIEW GATES: TOÀN BỘ PHẦN CẦN SỬA & BỔ SUNG

**Dự án:** AI-PMS (Academic Capstone Project Management System)
**Người nhận:** BE Developer (ASP.NET Core 9 / EF Core / SQL Server)
**Ngày phát hành:** 2026-10-21 · **Bản sửa:** 2026-10-22 (đối chiếu `origin/develop` @ `cfed325`)
**Mục tiêu:** Đưa Review Gates từ trạng thái **PARTIAL_BE_BLOCKED** → **INTEGRATED_READY** (FE–BE kết nối thật, chạy trọn vòng đời đơn ngành + liên ngành trên staging).
**Phạm vi:** 11 việc `BE-01`…`BE-11` ở §A. **BE-01 ship riêng ngay**; `BE-02`…`BE-11` giao một lần. FE đã sẵn sàng; các mục dưới đây là việc của BE/DBA.

---

## LỜI NHẮN GỬI BE DEV

> Chào bạn, mình gửi file này (bản cập nhật 22/10, đã đối chiếu với `origin/develop` @ `cfed325` — tức là đã tính cả 3 commit bạn vừa push).
>
> Đọc **§A. BẢNG GIAO VIỆC** trước — đủ 11 việc `BE-01`…`BE-11`, mỗi việc có chỗ sửa và tiêu chí hoàn thành. Các mục §1–§6 là chi tiết/bằng chứng để tra khi làm.
>
> **ƯU TIÊN 1 — làm và deploy riêng ngay, đừng gộp với việc khác:**
>
> **BE-01:** trong `ReviewGateService.Access.cs` → `CanReadEvidence`, đổi `"MENTOR"` thành `"DISCIPLINE_MENTOR"`. DB CHECK constraint (`db/schema.sql:598`) chỉ cho phép `('PRIMARY','DISCIPLINE_MENTOR')` nên `"MENTOR"` **không bao giờ khớp** → mentor hiện bị **403 khi đọc minh chứng CHÍNH NGÀNH mình phụ trách**. Bản fix trước của bạn đã **bịt đúng** lỗ hổng bảo mật, chỉ sai đúng hằng số này. **Mình xin lỗi — tài liệu bản đầu của mình ghi sai giá trị đó, bạn làm theo là đúng.**
>
> Bắt buộc thêm **test ca dương**: mentor ngành X đọc minh chứng ngành X → **200**. (Bộ test cũ chỉ có ca âm 403 nên một fix chặn hết vẫn "xanh" — đây là lý do lỗi lọt qua.)
>
> **SAU ĐÓ — `BE-02`…`BE-11` giao một lần**, bạn tự sắp xếp. Gợi ý gom PR theo vùng code để tránh xung đột:
> `BE-04 + BE-05 + BE-10` (cùng hàm `MatrixRow`) · `BE-02 + BE-03` (evidence/feedback) · `BE-08 + BE-09` (calendar DTO) · `BE-06` (DB/deploy).
>
> **CHỐT VỚI MÌNH TRƯỚC KHI CODE:**
> - **BE-10:** đổi `taskProgress` sang nullable sẽ **phá type FE**. Chọn đổi kiểu (FE sửa cùng lúc) hay thêm cờ `HasTasks`? Đợi mình xác nhận, đừng tự quyết.
> - **BE-11:** chỉ làm khi có **văn bản Hội đồng Học vụ**. Hiện **CHƯA CÓ** → bỏ qua, đừng xây chế tài cứng.
>
> **LƯU Ý QUAN TRỌNG:**
> - Xem bảng **"Việc KHÔNG giao BE"** ở cuối §A — đừng sửa những chỗ đó. Đặc biệt: `academicProgress` sẽ **luôn `null` tới khi FE gửi `weight`** → **không phải lỗi BE**, đừng đi "sửa". Lịch giảng viên cũng là việc FE (BE đã có sẵn `GET /api/v1/calendar` hỗ trợ Lecturer).
> - **Đừng thêm giá trị enum nào ngoài bảng §2.1** — FE dùng union type TypeScript nên một giá trị lạ sẽ làm **vỡ render**.
> - **Mọi hằng số trạng thái/loại: đối chiếu `db/schema.sql` CHECK constraint trước khi dùng**, đừng suy từ giá trị `default` của model. (Chính chỗ này gây ra BE-01.)
> - Giữ **mô hình tư vấn (Advisory)** cho OD-01…OD-06 ở §6 — không tự biến đề xuất thành chế tài học vụ.
>
> **CẦN BÀN GIAO LẠI KHI XONG:**
> 1. SHA/image đã deploy + bằng chứng migration/schema.
> 2. **BE-06:** project ID/code, leader/member, period ID của **P1/P2/P3**, template đã `PUBLISHED`, reviewer assignment có scope đúng. *(Đây là điều kiện để phía FE chạy live acceptance 3 kịch bản — thiếu nó thì không thể kết luận `INTEGRATED_READY`.)*
> 3. Kết quả test: **mỗi rule phân quyền phải có cả ca âm (403) và ca dương (200)**.
>
> Có chỗ nào trong file chưa rõ thì nhắn mình — **đừng tự suy đoán nghiệp vụ**. Cảm ơn bạn.

---

## A. BẢNG GIAO VIỆC — LÀM THEO ĐÚNG THỨ TỰ NÀY

Đây là **danh sách công việc duy nhất**. Mỗi dòng là một việc độc lập, có chỗ sửa và tiêu chí hoàn thành rõ ràng. Các mục §1–§6 phía dưới là chi tiết/bằng chứng để tra khi làm.

| ID | Việc | Mức | Sửa ở đâu | Xong khi nào |
|---|---|---|---|---|
| **BE-01** | Đổi `"MENTOR"` → `"DISCIPLINE_MENTOR"` (đang chặn sai mentor đúng ngành) | 🔴 P0 | `ReviewGateService.Access.cs` → `CanReadEvidence` | Mentor đúng ngành tải được (200), ngoài ngành vẫn 403. Chi tiết §3.1 |
| **BE-02** | Cho nộp minh chứng **không phải tệp** (liên kết ngoài) | 🔴 P1 | `ReviewGateContracts.cs` + `ReviewGatesController.cs` + `ReviewGateService.cs` | Requirement `EXTERNAL_LINK` nộp được; URL validate `https://`; template `422` nếu loại không hỗ trợ. Chi tiết §3bis MISSING-01 |
| **BE-03** | Endpoint **ghi** nhận xét GVHD + sửa `gateCode` bị gán cứng `"GENERAL"` | 🔴 P1 | `ReviewGatesController.cs`, `ReviewGateService.cs:533` | GVHD gửi được nhận xét gắn đúng gate; mentor chỉ nhận xét ngành mình. Chi tiết §3bis MISSING-02 |
| **BE-04** | Trả **lý do chặn** cho ma trận bộ môn (hiện luôn rỗng) | 🔴 P1 | `ReviewGateService.cs` → `MatrixRow` | Trưởng bộ môn thấy được vì sao gate bị chặn. Chi tiết §5ter BE-04 |
| **BE-05** | Trả **tên ngành** cho `hybridScopes` (hiện chỉ có id số) | 🔴 P1 | `ReviewGateContracts.cs` + `MatrixRow` | UI hiện "Kỹ thuật phần mềm" thay vì "Chuyên ngành 12". Chi tiết §5ter BE-05 |
| **BE-06** | Nạp & bàn giao **dữ liệu staging** cho tài khoản demo | 🔴 P1 | DB/seed + deploy | Chạy được trọn vòng đời trên staging. Chi tiết §4 |
| **BE-07** | SignalR realtime khi gate đổi trạng thái | 🟡 P2 | `NotificationHub` + handler | Phát **sau commit**; deep-link re-check quyền. Chi tiết §5 ADD-02 |
| **BE-08** | Thêm **hạn nộp báo cáo tiến độ** vào DTO | 🟡 P2 | `ProgressReportDto` + cấu hình kỳ | Lịch tạo được sự kiện hạn báo cáo. Chi tiết §5bis CAL-01 |
| **BE-09** | Thêm `DueAt` cho **phân công đánh giá** | 🟡 P2 | `EvaluationAssignmentDto` | Lịch tạo được sự kiện hạn đánh giá. Chi tiết §5bis CAL-02 |
| **BE-10** | Phân biệt "chưa có task" với "0% hoàn thành" | 🟡 P2 | `MatrixRow` → `taskProgress` | Dự án không có task **không** hiện 0%. Chi tiết §5ter BE-10 |
| **BE-11** | Override cấp bộ môn có lý do + audit | ⚪ Chờ | `ReviewGatesController.cs` | **Chỉ làm khi OD-01 được duyệt.** Chi tiết §5 ADD-03 |

### Việc KHÔNG giao BE (để BE không làm trùng/làm thừa)

| Việc | Ai làm | Lý do |
|---|---|---|
| Gửi `weight` khi lưu template | **FE** | BE đã nhận `Weight` rồi. Nhưng FE **chưa gửi** ⇒ `academicProgress` sẽ **luôn null** tới khi FE ship. **Đây không phải lỗi BE** — BE đừng đi "sửa" chỗ này. |
| Nối lịch cho giảng viên | **FE** | BE **đã có** `GET /api/v1/calendar` hỗ trợ Lecturer. FE chỉ chưa gọi. Xem §5bis. |
| Hiển thị `weight`/`academicProgress` trên UI | **FE** | Type FE chưa có chỗ nhận. |
| Dọn `EvaluatorFoundationPage` | **FE** | Code chết, không router nào dùng. |
| `minCount` / `evidenceType` của requirement | **Không ai** | FE chủ động không gửi. BE **không cần** thêm. Xem §2.1. |

---

## 0. QUY ƯỚC & NGUYÊN TẮC BẤT BIẾN (đọc trước khi sửa)

1. **Không tự biến đề xuất thành chế tài.** Không được tự ý biến một đề xuất kỹ thuật / wireframe / giá trị mock thành quy chế học vụ bắt buộc. Mọi tính năng mang tính chế tài hoặc phân loại tốt nghiệp phải căn cứ quyết định chính thức bằng văn bản của Hội đồng Học vụ (xem §5).
2. **Mô hình đọc tư vấn (Advisory Read Model).** BE đang (đúng) chạy theo Option B: không hard-block nộp cuối kỳ, không auto-fail theo % đóng góp, không auto-hủy đồ án khi quá số lần revision. **Giữ nguyên.** Chỉ bật chế tài cứng qua feature flag khi có văn bản (xem §5).
3. **Không bịa số.** Tiến độ thiếu dữ liệu phải trả `null` + mã `NOT_CONFIGURED` / `INSUFFICIENT_DATA`, tuyệt đối không giả `0%` hay `100%`.
4. **Backend là authority cuối cùng.** FE đã fail-closed; FE ẩn/vô hiệu nút chỉ là UX, không phải bảo mật. Mọi kiểm tra quyền phải nằm ở BE.

---

## 1. BASELINE & HIỆN TRẠNG

| Thành phần | Giá trị |
|---|---|
| FE branch | `feat/uiux-master-redesign` (baseline kiểm chứng `2f0501d`) |
| BE branch | `develop` @ `aee0dc0` |
| Staging | `https://api-staging.khaidz.com/api/v1` — Swagger có **377 paths**, 16 path chứa `review-gates` |
| FE adapter thật | `src/features/review-gates/api/review-gates-api.ts` (API mode, `reviewGatesMockEnabled=false`) |

**Kết luận hiện trạng:** `PARTIAL_BE_BLOCKED`. Contract FE↔BE đã khớp 1:1 ở phần đã triển khai; vòng đời cơ bản (minh chứng dạng **tệp**) chạy được trên API + DB riêng. Chưa đạt `INTEGRATED_READY` vì 4 nhóm việc:

### Trạng thái cập nhật theo `origin/develop` @ `cfed325` (rà soát lúc 21/10, sau 3 commit BE vừa push)

| Hạng mục | Trạng thái |
|---|---|
| §3 BUG-01 — lỗ hổng tải file ngoài ngành | ✅ **ĐÃ FIX** (`e8521e3`), cách làm tốt hơn đề xuất (frozen snapshot, `RequireActiveActor`, chặn staff ngoài khoa) |
| §3.1 REGRESSION-01 — `"MENTOR"` sai hằng số, chặn luôn mentor đúng ngành | 🔴 **MỚI — P0, phải sửa ngay** |
| §3bis MISSING-01 — minh chứng không phải tệp (liên kết ngoài) | ❌ Chưa có (`SubmitReviewGateEvidenceRequest` vẫn không có `LinkUrl`, không có route `evidence/link`) |
| §3bis MISSING-02 — nhận xét GVHD | ⚠️ Mới có **phần đọc**; **chưa có endpoint ghi** + `gateCode` bị gán cứng `"GENERAL"` |
| §4 DATA-01/02/03 — fixtures staging | ⏳ Chưa xác nhận được từ source; chờ bàn giao |
| §5 ADD-01 — tiến độ học vụ có trọng số | ✅ **XONG** — `Weight` + migration `20261021_add_review_gate_weights.sql`, `AcademicProgress` null-safe, `DisciplineProgress`, `TaskProgress`, công thức đúng, validate weights tổng 100 |
| §5 ADD-02 — aggregator | ✅ **XONG** 3 endpoint (`students/me/next-actions`, `supervisors/me/triage-queue`, `departments/{id}/urgent-actions`); ❌ **SignalR realtime chưa có** |
| §5 ADD-03 — override có lý do + audit | ❌ Chưa có (chờ OD-01) |
| §5bis CAL-01/CAL-02 — thiếu hạn nộp báo cáo & hạn đánh giá | 🆕 Mới phát hiện khi quét các domain khác |
| §5ter BE-04 — ma trận bộ môn luôn trả `BlockingReasons` rỗng | 🆕 Mới phát hiện khi rà `MatrixRow` |
| §5ter BE-05 — `hybridScopes` chỉ có major id, UI hiện "Chuyên ngành 12" | 🆕 Mới phát hiện |
| §5ter BE-10 — `taskProgress` trả 0 khi chưa có task | 🆕 Mới phát hiện |

> ⚠️ **Tài liệu lỗi thời — KHÔNG dùng làm yêu cầu hiện hành:**
> `docs/fe-to-be-handoff/03_FE_BE_GAP_MATRIX.md`, `docs/fe-to-be-handoff/11_BACKEND_DEVELOPER_TASKS.md`, `docs/handoff/BE_IMPLEMENTATION_PACKAGE.md` được viết ở baseline cũ (`606773e` / `090f93d`) khi BE **chưa** có Review Gates. Chúng mô tả "thiếu `ReviewGatesController`, thiếu bảng, cần CQRS/MediatR, cần scoring engine `OVERRIDDEN_PASSED`…" — **không còn đúng**. BE đã triển khai bằng `ReviewGatesController` + `ReviewGateService` theo mô hình verify-evidence + reviewer-decision. File hiện hành duy nhất là tài liệu này + `docs/review-gates/INTEGRATION_2026-10-21.md`.

---

## 2. PHẦN ĐÃ KHỚP — KHÔNG CẦN LÀM LẠI

Đã đối chiếu từng endpoint FE gọi với route BE: **khớp hoàn toàn.** Đừng tái cấu trúc.

| FE adapter gọi | BE route (`ReviewGatesController.cs`) |
|---|---|
| `GET /academic/gate-templates`, `/{id}`, `POST`, `PUT /{id}`, `POST /{id}/publish` | ✅ dòng 16–24 |
| `GET /projects/{id}/review-gates/timeline` · `/students/me/review-gates/timeline` | ✅ dòng 26,30 |
| `POST /projects/{id}/review-gates/{gateCode}/evidence` · `/evidence/file` | ✅ dòng 32,35 |
| `POST /projects/{id}/review-gates/{gateCode}/submit-for-review` | ✅ dòng 46 |
| `GET /reviewers/me/gate-assignments` · `/review-gates/my-assigned-reviews` | ✅ dòng 48,50 |
| `POST /review-gates/assignments/{id}/evidence/{reqId}/verify` | ✅ dòng 52 |
| `POST /review-gates/assignments/{id}/decision` · `/assignments` · `/{id}/revoke` | ✅ dòng 54,56,58 |
| `POST /projects/{id}/review-gates/{gateCode}/decision` · `/scopes/{scope}` | ✅ dòng 60,62 |
| `GET /departments/review-gates/matrix` · `/{deptId}/review-gates/matrix` | ✅ dòng 64,66 |
| `GET /projects/{id}/defense-readiness` · `/{projectKey}/defense-readiness` | ✅ dòng 68,70 |
| `GET .../requirements/{reqId}/evidence/{version}/download` | ✅ dòng 72 |

### 2.1 Enum trạng thái — ĐÃ KHỚP, TUYỆT ĐỐI KHÔNG THÊM GIÁ TRỊ MỚI

Đã đối chiếu từng giá trị BE phát ra với union type FE. **Khớp 100%.** FE dùng union TypeScript nên **bất kỳ giá trị lạ sẽ làm vỡ render**.

| Đối tượng | BE phát ra | FE chấp nhận |
|---|---|---|
| Gate status | `PLANNED` (`:592`), `LOCKED`, `IN_REVIEW` (`:159`), `PASSED`, `REVISION_REQUIRED` | `PLANNED \| IN_REVIEW \| PASSED \| REVISION_REQUIRED \| LOCKED` ✅ |
| `reviewEligibility` | `READY`, `BLOCKED` | `READY \| BLOCKED \| NOT_READY` ✅ |
| Evidence `verificationStatus` | `PENDING`, `SUBMITTED` (`:156`), `ACCEPTED`, `REJECTED` | giống ✅ |
| Assignment status | `PENDING_REVIEW` (`:363`), `DECIDED`, `REVOKED` | `PENDING_REVIEW \| IN_REVIEW \| DECIDED \| REVOKED` ✅ |
| Template status | `DRAFT` (`:87`), `PUBLISHED` (`:114`) | `DRAFT \| PROPOSED \| PUBLISHED` ✅ |
| Requirement scope | chỉ validate `COMMON \| MAJOR_SPECIFIC \| INDIVIDUAL` (`:67–68`) | FE cũng chỉ gửi 3 giá trị này ✅ |

> Ghi chú: `minCount` / `evidenceType` trên type FE là **field hiển thị nội bộ, FE chủ động KHÔNG gửi** (xem `review-gates-contract.ts` → `toTemplateRequest`). BE **không cần** thêm 2 field này.

**Rủi ro cũ đã được giải quyết (không cần làm):**
- Concurrency: BE đã có `ConcurrencyToken` trên gate/assignment + ném `409 REVIEW_QUEUE_BUSY`; FE đã nhận diện theo business code và khóa an toàn.
- Đa ngành: BE đã dùng `ProjectMajors` (nhiều ngành / dự án), không còn ràng buộc một `DepartmentId`.
- `ProjectReviewMatrixRowDto` (`TaskProgress`, `GateStatuses`, `BlockingReasons`, `HybridScopes`) khớp đúng FE `ProjectReviewMatrixRow`.

---

## 3. LỖI PHẢI SỬA (BLOCKER)

### BUG-01 — Mentor/Supervisor tải được minh chứng NGOÀI ngành (P0, lỗi phân quyền)

**File:** `src/AIPMS.Infrastructure/Services/Projects/ReviewGateService.cs`
**Hàm:** `DownloadEvidence(long projectId, string gateCode, long requirementId, int version, …)` — **dòng 247–277**.

**Tái hiện (đã xác nhận trên `aee0dc0`, DB riêng, dự án liên ngành SE + DS):**
1. Leader nộp file cho requirement `MAJOR_SPECIFIC` thuộc **SE** ở R1.
2. Đăng nhập mentor chỉ được phân công **DS**, không có review assignment SE.
3. `GET /api/v1/projects/{id}/review-gates/R1/requirements/{seRequirementId}/evidence/1/download`.
4. **Kỳ vọng `403`, thực tế trả `200` + file.**

**Nguyên nhân gốc (trace theo dòng):**
- `isMember` (dòng 256) = false, `isSupervisor` (dòng 257) = true, `assigned` (dòng 258–262) = false → vào nhánh `if (!assigned)`.
- Dòng **267** `if (evidence.Requirement.Scope == "MAJOR_SPECIFIC" && isMember)` — kiểm tra khớp ngành **chỉ áp cho thành viên nhóm**, bỏ qua supervisor/mentor.
- Dòng **272** `if (!isMember && !isSupervisor && !CanReadProjectScope(...))` — điều kiện `!isSupervisor` khiến **mọi supervisor/mentor được miễn** kiểm tra scope. `CanReadProjectScope` chỉ chứng minh quyền đọc dự án, **không đủ** làm authority đọc từng evidence theo ngành.
- Kết quả: mentor DS rơi khỏi mọi nhánh chặn → nhận file SE.

**Dữ liệu sẵn có để fix đúng:** `SupervisorAssignment` (trong `src/AIPMS.Infrastructure/Persistence/Generated/Models/SupervisorAssignment.cs`) có:
- `AssignmentType` = **`"PRIMARY"` | `"DISCIPLINE_MENTOR"`** (giá trị bị ràng buộc bởi DB CHECK — xem §3.1); `IsPrimary` (bool); `MajorId` (long?, bắt buộc non-null cho mentor, bắt buộc null cho Primary).

> 🔴 **ĐÍNH CHÍNH — lỗi của tài liệu bản đầu:** bản handoff phát hành sáng 21/10 ghi sai giá trị này là `"MENTOR"`. Giá trị `"MENTOR"` **không tồn tại** trong hệ thống. Bản fix đã ship theo bản sai đó nên phát sinh regression — **bắt buộc sửa theo §3.1**.

**Cách sửa (áp policy đọc file theo scope thật — đúng tiền lệ BE-AW-011 của lịch: Mentor major-scoped, Primary toàn dự án):**

Trong nhánh `if (!assigned)`, thay vì miễn trừ mọi supervisor, phân biệt vai trò và ngành của chính supervisor đó:

```
// Lấy các assignment supervisor đang hiệu lực của Actor trên project (một lần)
var supAssignments = await db.SupervisorAssignments.AsNoTracking()
    .Where(x => x.ProjectId == projectId && x.EndedAt == null && x.SupervisorProfile.UserId == Actor)
    .Select(x => new { x.AssignmentType, x.MajorId })
    .ToArrayAsync(ct);
var isPrimary = supAssignments.Any(a => a.AssignmentType == "PRIMARY");
var mentorMajors = supAssignments.Where(a => a.AssignmentType == "MENTOR" && a.MajorId != null)
                                 .Select(a => a.MajorId!.Value).ToHashSet();

switch (evidence.Requirement.Scope)
{
    case "COMMON":
        // thành viên nhóm, bất kỳ supervisor hiệu lực, hoặc CanReadProjectScope → OK
        if (!isMember && !isSupervisor && !await CanReadProjectScope(projectId, scope, ct))
            throw new ForbiddenException("The evidence is outside the review assignment scope.");
        break;

    case "MAJOR_SPECIFIC":
        if (isMember)
        {
            var actorMajor = await db.Users.Where(x => x.Id == Actor).Select(x => x.MajorId).SingleOrDefaultAsync(ct);
            if (actorMajor != evidence.Requirement.MajorId)
                throw new ForbiddenException("The evidence is outside the student's major scope.");
        }
        else if (isSupervisor)
        {
            // Primary: toàn dự án. Mentor: chỉ ngành được phân công.
            if (!isPrimary && !mentorMajors.Contains(evidence.Requirement.MajorId!.Value))
                throw new ForbiddenException("The evidence is outside the supervisor's major scope.");
        }
        else if (!await CanReadProjectScope(projectId, scope, ct))
            throw new ForbiddenException("The evidence is outside the review assignment scope.");
        break;

    case "INDIVIDUAL":
        if (isMember && evidence.Requirement.TargetStudentId != Actor)
            throw new ForbiddenException("Individual evidence is restricted to the target student and authorized reviewers.");
        if (!isMember)
        {
            // Primary toàn dự án; Mentor chỉ ngành của requirement; người ngoài phải có quyền đọc project scope
            var reqMajor = evidence.Requirement.MajorId;
            var mentorOk = reqMajor != null && mentorMajors.Contains(reqMajor.Value);
            if (!isPrimary && !mentorOk && !await CanReadProjectScope(projectId, scope, ct))
                throw new ForbiddenException("Individual evidence is restricted to the target student and authorized reviewers.");
        }
        break;
}
```

> Ghi chú: giữ nguyên các nhánh ưu tiên phía trên (`isAdmin` → cho qua; `assigned` reviewer đúng scope → cho qua). Chỉ thay logic bên trong `if (!assigned)` (dòng 263–274) như trên. `MajorId!` chỉ dereference khi `Scope == MAJOR_SPECIFIC` nên luôn non-null; vẫn nên guard null phòng dữ liệu bẩn.

**Acceptance cho BUG-01 (bắt buộc đạt hết):**
- [ ] Mentor ngoài ngành tải `MAJOR_SPECIFIC` ngành khác → **403**.
- [ ] Mentor đúng ngành tải `MAJOR_SPECIFIC` ngành mình → **200**.
- [ ] Primary tải mọi `MAJOR_SPECIFIC`/`COMMON`/`INDIVIDUAL` của dự án → **200**.
- [ ] Thành viên nhóm tải `COMMON` → 200; tải `MAJOR_SPECIFIC` khác ngành mình → 403; tải `INDIVIDUAL` của người khác → 403.
- [ ] Reviewer được assign đúng scope → 200; reviewer `REVOKED` → 403.
- [ ] Admin → 200. Ẩn danh → 401.
- Case tái hiện có sẵn trong `e2e/review-gates/live.spec.ts` (giữ assertion 403). COI, reviewer ngoài ngành, target cá nhân ngoài team, tải cá nhân đúng/sai quyền đã qua trong cùng run.

---

---

### 3.1 🔴 REGRESSION-01 — Bản fix BUG-01 chặn luôn mentor ĐÚNG ngành (P0, phải sửa ngay)

**Trạng thái:** BUG-01 đã được fix trên `origin/develop` @ `cfed325` (commit `e8521e3`) — lỗ hổng bảo mật **đã bịt đúng**, và cách làm còn tốt hơn đề xuất ban đầu (dùng frozen snapshot `FrozenMemberMajor` thay vì `Users.MajorId` sống, thêm `RequireActiveActor`, chặn staff ngoài khoa). **Nhưng bản fix dùng sai hằng số nên sinh lỗi mới.**

**File:** `src/AIPMS.Infrastructure/Services/Projects/ReviewGateService.Access.cs` → `CanReadEvidence`.

```
return requirement.Scope == "COMMON" || assignments.Any(x => x.AssignmentType == "PRIMARY" && x.IsPrimary)
    || assignments.Any(x => x.AssignmentType == "MENTOR" && x.MajorId.HasValue && x.MajorId == requirement.MajorId);
                                         ^^^^^^^^ giá trị không bao giờ tồn tại
```

**Bằng chứng giá trị `"MENTOR"` là bất khả thi** — `db/schema.sql:598–600`:
```sql
CONSTRAINT ck_supervisor_assignments_assignment_type CHECK (assignment_type IN ('PRIMARY','DISCIPLINE_MENTOR')),
CONSTRAINT ck_supervisor_assignments_assignment_slot CHECK ((assignment_type = 'PRIMARY' AND major_id IS NULL)
    OR (assignment_type = 'DISCIPLINE_MENTOR' AND major_id IS NOT NULL AND is_primary = 0)),
```
Thống kê toàn bộ source BE: `AssignmentType == "PRIMARY"` 33 lần, `AssignmentType == "DISCIPLINE_MENTOR"` **22 lần**, `AssignmentType == "MENTOR"` **1 lần — chính là dòng trên**. Tiền lệ đúng: `CalendarService.cs:118` dùng `AssignmentType == "DISCIPLINE_MENTOR"`.

**Hệ quả:** nhánh mentor **chết hoàn toàn**. Mentor xin minh chứng `MAJOR_SPECIFIC` **đúng ngành mình**: `Scope != COMMON` → false; không phải PRIMARY → false; `"MENTOR"` không khớp → false ⇒ **403**. Tức là mentor **không đọc được minh chứng ngành mình phụ trách** → không thể hướng dẫn. Đổi một lỗ hổng bảo mật thành một lỗi chặn nghiệp vụ.

**Cách sửa:** đổi `"MENTOR"` → `"DISCIPLINE_MENTOR"`. Vì DB đã bảo đảm `DISCIPLINE_MENTOR ⇒ major_id IS NOT NULL`, có thể giữ `MajorId.HasValue` cho an toàn. Rà soát thêm **mọi** so sánh `AssignmentType` mới thêm trong 3 commit vừa push để không còn chỗ nào dùng `"MENTOR"`.

**Acceptance bổ sung (đang thiếu — chính vì thiếu nên regression lọt qua):**
- [ ] Mentor ngành DS tải `MAJOR_SPECIFIC` **của DS** → **200** ← *ca này chưa có test, phải thêm*
- [ ] Mentor ngành DS tải `MAJOR_SPECIFIC` của SE → **403** (ca đã có)
- [ ] Mentor tải `COMMON` → 200; Primary tải mọi scope → 200.
- [ ] Mentor tải `INDIVIDUAL` thuộc ngành mình → theo policy đã duyệt (ghi rõ kỳ vọng vào test).

> ⚠️ **Bài học cho acceptance:** bộ test chỉ phủ **ca âm** (403 ngoài ngành) mà thiếu **ca dương** (200 đúng ngành), nên một fix làm chặn hết vẫn "xanh". Mọi rule phân quyền phải có **cả hai chiều**.

---

## 3bis. CHỨC NĂNG FE ĐANG BỊ CHẶN CỨNG VÌ BE CHƯA CÓ (BLOCKER nghiệp vụ)

Hai mục dưới đây **không phải lỗi** mà là **năng lực BE còn thiếu**. FE đã fail-closed (ném lỗi tường minh, không giả lập thành công), nên hiện là **đường cụt nghiệp vụ**: người dùng không có cách nào hoàn thành.

### MISSING-01 — Minh chứng KHÔNG phải tệp (liên kết ngoài / demo / metric) không thể nộp

**Bằng chứng FE:** `src/features/review-gates/api/review-gates-api.ts` → `submitRevision()`:
```
if (req.mode === 'link') throw new Error('API chưa hỗ trợ nộp liên kết ngoài; vui lòng tải tệp minh chứng.')
if (!req.file) throw new Error('Vui lòng chọn tệp minh chứng thực tế.')
```
**Vì sao là đường cụt:** `RequirementType` cho phép bộ môn tạo requirement loại **`EXTERNAL_LINK`, `LINK`, `DEMO`, `METRIC`, `PREVIOUS_GATE`, `MANUAL_DECISION`** (types dòng 1–10, và BE `ReviewGateRequirementInput.Type` nhận tự do). Nhưng BE **chỉ có đường nộp dạng tệp**: `SubmitReviewGateFileRequest` (multipart) và `SubmitReviewGateEvidenceRequest(RequirementId, ArtifactName, Notes, ExpectedVersion, ConcurrencyToken)` — **không có field URL**. ⇒ Trưởng bộ môn tạo requirement `EXTERNAL_LINK` thì **sinh viên không thể hoàn thành gate**, gate treo vĩnh viễn.

**Cần BE làm:**
1. Bổ sung đường nộp minh chứng dạng liên kết: thêm `LinkUrl` (string?) vào `SubmitReviewGateEvidenceRequest` (hoặc endpoint riêng `POST .../evidence/link`), lưu vào `GateEvidence` cùng cơ chế version/concurrency như tệp.
2. **Validate URL ở BE:** chỉ `https://` (chặn `javascript:`, `data:`, `file:`), độ dài hợp lý, chuẩn hóa; đây là dữ liệu người dùng sẽ được render thành link ⇒ không được tin FE.
3. `ReviewGateArtifactDto` khi là link: `DownloadUrl` = URL ngoài, `ContentType`/`SizeBytes`/`Sha256` để rỗng/0 — **không bịa** giá trị.
4. **Chặn ở đầu vào template:** validate `Type` theo danh sách đóng; nếu BE không hỗ trợ loại nào thì `422` ngay khi lưu template, để bộ môn không tạo được requirement bất khả thi.
5. Làm rõ `PREVIOUS_GATE` / `MANUAL_DECISION` / `METRIC`: đây là loại **hệ thống tự xác minh**, không phải sinh viên nộp. BE cần tự set `verificationStatus` cho chúng (hoặc loại khỏi danh sách cho phép tạo).

### MISSING-02 — GVHD không thể gửi nhận xét tại Review Gate

**Bằng chứng FE:** cùng file, `submitSupervisorFeedback()`:
```
throw new Error('API chưa hỗ trợ nhận xét hướng dẫn tại Review Gate.')
```
Test `review-gates-api.test.ts:94` khẳng định hành vi chặn này. Field `supervisorFeedbacks?` trên `StudentReviewTimelineDto` **chỉ hoạt động ở chế độ mock** (`review-gates-mock-adapter.ts:1047–1056`) — tức là **demo được nhưng production không có**.

**Cập nhật theo `cfed325`:** BE đã thêm **phần đọc** (`SupervisorFeedbackDto`, trả trong timeline) nhưng **chưa có endpoint ghi**, và phần đọc có lỗi dưới đây.

🔴 **Kèm lỗi dữ liệu:** `ReviewGateService.cs:533` gán **`gateCode` cứng là `"GENERAL"`** cho mọi nhận xét (đọc từ bảng `SupervisorFeedback` dùng chung, không gắn gate):
```
.Select(x => new SupervisorFeedbackDto("GENERAL", x.FeedbackText, x.CreatedAt, ...))
```
FE nhóm nhận xét **theo `gateCode`** (`R1`, `R2`…) nên không khớp gate nào ⇒ nhận xét **không bao giờ hiển thị đúng chỗ**. Cần lưu nhận xét **gắn với gate thật** (cột `gate_code`/FK tới gate instance) thay vì tái dùng bảng feedback chung, hoặc lọc + map đúng gate.

**Cần BE làm:**
1. Endpoint: `POST /api/v1/projects/{projectId}/review-gates/{gateCode}/supervisor-feedback`, body `{ feedback: string, concurrencyToken? }`; lưu kèm `gateCode`.
2. **Phân quyền:** chỉ supervisor đang hiệu lực của dự án. **Mentor chỉ được nhận xét gate/nhánh thuộc ngành mình** (dùng `AssignmentType == "DISCIPLINE_MENTOR"` + `MajorId` — cùng nguyên tắc §3.1, **không dùng `"MENTOR"`**); Primary toàn dự án. Không phải supervisor → `403`.
3. **Ranh giới nghiệp vụ (quan trọng):** nhận xét của GVHD là **tư vấn**, KHÔNG phải quyết định cổng. Tuyệt đối không cho đổi `Status`/`VerificationStatus` của gate. Quyền chốt `PASSED`/`REVISION_REQUIRED` chỉ thuộc reviewer được phân công (giữ nguyên guard COI hiện có: supervisor không được review dự án mình — `ReviewGateService.cs:292`).
4. Trả danh sách nhận xét trong `StudentReviewTimelineDto.supervisorFeedbacks`: `{ gateCode, feedback, submittedAt, supervisorName? }` (đúng shape FE dòng 158–163).
5. Ghi audit; validate độ dài feedback; `IN_REVIEW`/`PASSED` đều cho nhận xét (không chặn theo trạng thái gate).

---

## 4. DỮ LIỆU STAGING PHẢI BÀN GIAO (BLOCKER acceptance — không phải code)

E2E liên ngành chưa xanh hết do staging **chưa có dữ liệu Review Gates** cho bộ tài khoản demo: 3 sinh viên đầu nhóm nhận `404 ActiveProject` tại `/students/me/review-gates/timeline`; admin đọc template trả `[]`; staff/lecturer đọc queue trả `items=[]`. (Bộ tài khoản demo: domain `@demo.aipms.invalid`; P1 = đơn ngành IT/SE, P2 = đơn ngành Marketing/MKT, P3 = liên ngành SE+MKT+Design.)

**DATA-01 — Xác nhận & bàn giao định danh dự án demo.** Với P1/P2/P3: project **ID + code**, leader + members, trạng thái cho phép nộp, frozen scope (ngành), period ID.
**DATA-02 — Nạp dữ liệu Review Gates cho dự án demo.** Template đã `PUBLISHED` cấp kỳ học/bộ môn; gate instances đã tạo; `GateReviewerAssignments` có scope đúng (COMMON / MAJOR_SPECIFIC theo ngành / INDIVIDUAL). **Giới hạn tác động chỉ vào dự án test** theo cơ chế BE hỗ trợ (đừng chạm dự án thật khác).
**DATA-03 — Deploy bản đã fix BUG-01 và bàn giao bằng chứng.** SHA/image container, evidence migration/schema, danh sách IDs để chạy authenticated `upload → submit → revision/resubmit → PASS/next gate → download/revoke` trên staging.

> `GET timeline` của BE có thể lazy-initialize gate instance khi có template — lưu ý khi seed để không tạo gate ngoài ý muốn trên dự án không phải test.

---

## 5. BỔ SUNG ĐỂ ĐÚNG CHUẨN NGHIỆP VỤ ĐẦY ĐỦ

> FE đã khai báo các field dưới đây là **optional/nullable** nên hiện không vỡ (hiển thị dạng tư vấn / `NOT_CONFIGURED`). Nhưng để khớp đúng đặc tả nghiệp vụ, BE cần bổ sung. Giao luôn cùng đợt này.

### ADD-01 — Tiến độ học vụ có trọng số trên timeline sinh viên (P1)

**Hiện trạng:** `StudentReviewTimelineDto` của BE (`src/AIPMS.Application/Features/ReviewGates/ReviewGateContracts.cs`, dòng 22–24) chỉ có:
`ProjectId, ProjectCode, ProjectName, ProjectMode, Major, EffectivePolicyVersion, CurrentGateCode, Gates[], Capabilities`.
**FE chờ thêm** (xem `src/features/review-gates/types/review-gates.types.ts`, `StudentReviewTimelineDto`, dòng 144–170): `taskProgress?`, `academicProgress? (number|null)`, `academicProgressSource?`, `isDefenseReady? (bool|null)`, `defenseReadinessStatus?`, `disciplineProgress?`, `supervisorFeedbacks?`.

> ⚠️ **Lưu ý phối hợp FE:** `weight` hiện **chỉ tồn tại trên `DisciplineBranchProgress`** (dòng 136–142), **KHÔNG** có trên `StudentGateInstance` (dòng 121–134) cũng không có trên `ReviewGate` của template (dòng 37–51). Vì vậy ADD-01 cần **cả thay đổi phía FE** (thêm `weight` vào type gate + hiển thị) — phần FE do FE team làm, BE chỉ cần trả thêm field. BE **đừng chờ** FE có sẵn chỗ nhận.

**Yêu cầu nghiệp vụ (bất biến — xem BE_IMPLEMENTATION_PACKAGE §3, giữ lại phần công thức):**
1. Thêm trường **`Weight`** (decimal) vào template gate → freeze vào `ProjectGateInstance` khi dự án ACTIVE (snapshot bất biến; sửa template sau đó không đổi dự án đang chạy).
2. Công thức: `academicProgress = 100 × Σ(Weight gate PASSED) / Σ(Weight toàn bộ gate đã frozen)`.
3. **Nộp ≠ hoàn thành cổng:** gate ở `IN_REVIEW` (trạng thái BE đặt khi leader nộp — `ReviewGateService.cs:159`) KHÔNG tăng `academicProgress`; chỉ tăng khi reviewer chốt `PASSED`. **Không tạo status mới** như `WAITING_REVIEW` (xem §2.1 — sẽ làm vỡ enum FE).
4. **Tách biệt task vs học vụ:** `taskProgress` (đã có) phản ánh task board; `academicProgress` phản ánh gate — hai số độc lập.
5. **Thiếu dữ liệu:** dự án chưa cấu hình template → `academicProgress = null`, `academicProgressSource = "NOT_CONFIGURED"`; không giả `0/100`.
6. `disciplineProgress`: với dự án liên ngành, trả tiến độ theo từng nhánh (COMMON + mỗi ngành) dựa trên gate/scope-decision của nhánh đó.

**Golden sample kiểm thử (đơn ngành IT, weight R1:20 R2:20 R3:35 R4:25):** PASS R1+R2 → 40%; đang nộp R3 (`IN_REVIEW`) → vẫn 40%; reviewer duyệt R3 → 75% (tăng đúng một lần); task board 100% → vẫn 75%.

### ADD-02 — Endpoint tổng hợp (aggregator) + realtime (P2)

Hiện FE phải gọi nhiều round-trip để dựng các widget. Bổ sung endpoint trả một lần:
- `GET /api/v1/students/me/next-actions` — stage dự án + deadline sắp tới + hàng việc khẩn.
- `GET /api/v1/supervisors/me/triage-queue` — gộp proposals + weekly review đang chờ + meeting sign-off.
- `GET /api/v1/departments/{id}/urgent-actions` — override đang chờ + reviewer chưa phân công + appeal mở.
- **SignalR**: phát sự kiện đổi trạng thái gate qua `IHubContext<NotificationHub>` để FE cập nhật realtime (toast + refresh timeline). Chỉ phát **sau khi transaction commit**; deep-link phải **xác thực lại quyền** (reviewer bị thu hồi → 403).

### ADD-03 — Override cấp bộ môn có lý do bắt buộc + audit (P2, điều kiện)

Chỉ triển khai khi §5/OD-01 được duyệt hard-block. Khi đó: endpoint override transition gate với `reason` bắt buộc (≥ 50 ký tự), ghi bản ghi bất biến vào bảng audit (`ReviewGateAudits`/`GateAuditLogs`), và trạng thái override phân biệt rõ với PASSED thường. Hiện `/projects/{id}/review-gates/{gateCode}/decision` chỉ nhận `{newStatus}`.

---

## 5bis. CÁC DOMAIN KHÁC — KẾT QUẢ QUÉT TOÀN FE (đối chiếu BE `cfed325`)

Đã quét toàn bộ `src/` tìm mẫu "FE chặn cứng vì BE chưa có" và verify từng ca trên BE mới nhất. Kết quả: **chỉ domain Calendar còn thiếu thật**, 2 hạng mục — và đều là **thiếu field, không phải thiếu endpoint**.

### CAL-01 — `ProgressReportDto` không có hạn nộp báo cáo (P2)
FE: `src/features/calendar/calendar-data.ts:57` → nguồn `progress-report-deadline` ở trạng thái `unsupported`, thông báo *"API hiện trả kỳ báo cáo, không trả hạn nộp báo cáo."*
**Verify BE:** `ProgressReportDto` chỉ có `PeriodStart`/`PeriodEnd` — **không có** `DueAt`/`SubmissionDeadline`. ⇒ FE đúng, không thể tạo sự kiện lịch "hạn báo cáo".
**Cần BE:** thêm hạn nộp vào kỳ báo cáo (cấu hình theo `ProjectPeriod`) và expose `dueAt` trên DTO.

### CAL-02 — `EvaluationAssignmentDto` không có hạn đánh giá (P2)
FE: `calendar-data.ts:96` → nguồn `evaluation-assignments` `unsupported`, *"DTO hiện không có hạn đánh giá; không tạo sự kiện lịch."*
**Verify BE:** `EvaluationAssignmentDto` có `AssignedAt`, `RevokedAt` — **không có** `DueAt`. (Đối chiếu: `AssignedReviewItemDto` của Review Gates **đã có** `DueAt` → nên làm tương tự cho nhất quán.)
**Cần BE:** thêm `DueAt` (nullable) cho phân công đánh giá, lấy từ window của kỳ/hội đồng.

### Không phải việc của BE — đã loại sau khi verify

| Dấu hiệu | Kết luận |
|---|---|
| `calendar-data.ts:102` *"Lịch đa đồ án — chưa cung cấp projection theo actor và khoảng thời gian"* | ❌ **Nhận định FE đã cũ.** BE **CÓ** `GET /api/v1/calendar?from&to` scope theo actor, và `CalendarService` **đã xử lý Lecturer** (PRIMARY + `DISCIPLINE_MENTOR` major-scoped, `CalendarService.cs:90–132`). FE chỉ gọi nó ở nhánh sinh viên ⇒ **việc của FE**, không giao BE. |
| `calendar-data.ts:121` *"Lịch tổng hợp chưa hỗ trợ tài khoản quản trị"* | ⚠️ Đúng — `CalendarService` chỉ nhận Student/Lecturer/Staff, không có nhánh ADMIN. Nhưng đây là **quyết định sản phẩm** (admin có cần lịch toàn nền tảng?), chưa phải lỗi. Chờ chốt scope. |
| `LayeredEvaluationFoundation.tsx:12` *"Chưa hỗ trợ chấm điểm"* | ❌ **Code chết.** Chỉ được dùng bởi `EvaluatorFoundationPage`, mà page này **không router nào import** ⇒ không tới được. Việc dọn dẹp của FE. |
| `useDepartmentSection.ts:12`, `useExecutionActionCapabilities.ts:22` map `404/405/501` → `unsupported` | ✅ Fail-closed phòng ngự đúng chuẩn, không phải thiếu năng lực. |
| `MeetingVideoPreflight.tsx:52`, `LiveKitRoomAdapter.tsx:25` | ✅ Kiểm tra năng lực **trình duyệt** (WebRTC/camera), không liên quan BE. |
| `useTeamEligibility.ts:25` `UNSUPPORTED_HYBRID_POLICY` | ✅ Là **reason code do BE trả về** — đang hoạt động đúng thiết kế. |
| `CurriculumImportDialog`/`StudentImportDialog` `IMPORT_*_UNSUPPORTED` | ✅ Mã lỗi validate Excel của BE, hoạt động đúng. |
| `ProjectProgressAnalysisPanel.tsx:34` *"Trạng thái chưa hỗ trợ"* | ✅ Guard cho enum lạ — phòng ngự đúng. |

**Kết luận domain khác:** meetings/video, chat, notifications, tasks/sprints, milestones, deliverables, appeals, evaluations (chấm bảo vệ), import — **không phát hiện lỗ hổng kiểu "FE chặn cứng vì BE thiếu"**. Chỉ Calendar còn CAL-01/CAL-02.

---

## 5ter. PHÁT HIỆN MỚI TRONG MA TRẬN BỘ MÔN (rà soát `cfed325`)

Cả 3 mục dưới đây nằm trong **cùng một hàm**: `ReviewGateService.cs` → `MatrixRow(long projectId, …)`. Nên sửa chung một lần.

Nguyên văn dòng `return` hiện tại:
```csharp
return new(project.Id.ToString(), project.Title, majors.Length > 1 ? "INTERDISCIPLINARY" : "SINGLE_MAJOR",
    string.Join(" + ", majors), string.Join(" + ", project.ProjectMajors.Select(x => x.Major.Department.Name).Distinct()),
    taskProgress,
    gates.ToDictionary(x => x.Code, x => x.Status),
    new Dictionary<string, IReadOnlyList<string>>(),   // ← BE-04: luôn rỗng
    scopes);                                           // ← BE-05: key là id số, không có tên
```

### BE-04 — `BlockingReasons` của ma trận luôn rỗng (P1)

**Vấn đề:** tham số `BlockingReasons` được truyền **`new Dictionary<...>()` cứng** — không bao giờ có dữ liệu.

**Vì sao là lỗi thật, không phải field dự phòng:** FE **đã có UI render nó** — `src/features/review-gates/components/ProjectProgressMatrix.tsx:233–236`:
```tsx
{inspectingProject.blockingReasons && (
  ... Object.entries(inspectingProject.blockingReasons).map(([code, reasons]) => (
```
⇒ Trưởng bộ môn mở panel soi một đồ án thì **mục "lý do chặn" luôn trống**, không biết gate đang tắc vì đâu. Đây là chức năng giám sát cốt lõi của vai trò này.

**Cách sửa:** tái dùng helper `Blocking(g)` đã có (dùng cho timeline sinh viên và **đang hoạt động đúng**), map theo mã gate:
```csharp
gates.ToDictionary(
    x => x.Code,
    x => (IReadOnlyList<string>)Blocking(x).Select(b => b.Message).ToArray())
```
Khóa dictionary phải là **mã gate** (`R1`, `R2`…) để khớp `gateStatuses` — FE đối chiếu hai dict theo cùng khóa. Gate không bị chặn thì bỏ khỏi dict hoặc để mảng rỗng (đừng trả `null`).

### BE-05 — `hybridScopes` chỉ có major id dạng số, không có tên ngành (P1)

**Vấn đề:** `scopes` lấy từ `ProjectGateScopeDecisions` với khóa `x.Scope`, mà giá trị lưu là `"COMMON"` **hoặc major id dạng chuỗi số** (xem `UpdateScope` dòng 423–426: `normalized = … majorId.Value.ToString()`). BE **không trả tên ngành** kèm theo.

**Hệ quả trên UI:** `InterdisciplinaryGatePanel.tsx:146` tra tên bằng bảng cứng `scopeMeta` có khóa `COMMON`/`IT`/`Marketing`/`Design` (di sản thời mock). Với dữ liệu thật:
- `"COMMON"` → hiện đúng.
- `"12"` → không khớp bảng nào → fallback hiện **`"Chuyên ngành 12"`** — phơi **id thô của DB** cho trưởng bộ môn, và không thể biết đó là ngành gì.

**Cách sửa (ít phá vỡ nhất — thêm field song song, KHÔNG đổi shape `HybridScopes`):**
1. Thêm vào `ProjectReviewMatrixRowDto`:
   ```csharp
   IReadOnlyDictionary<string, string>? HybridScopeLabels = null
   ```
2. Trong `MatrixRow`, dựng nhãn cho đúng các khóa đang có trong `scopes`:
   ```csharp
   var labels = scopes.Keys.ToDictionary(k => k, k => k == "COMMON"
       ? "Tích hợp chung"
       : project.ProjectMajors.FirstOrDefault(pm => pm.MajorId.ToString() == k)?.Major.Name ?? $"Ngành {k}");
   ```
   (`project` đã `Include(ProjectMajors).ThenInclude(Major)` nên không thêm truy vấn.)
3. Giữ nguyên `HybridScopes` để FE hiện tại không vỡ; FE sẽ đọc `hybridScopeLabels` khi có.

> Nếu muốn giải pháp sạch hơn về sau: đổi `hybridScopes` thành danh sách `[{ scope, name, status }]`. **Đừng làm trong đợt này** — sẽ phá type FE đang chạy. Chốt sau với FE.

### BE-10 — `taskProgress` trả `0` khi đồ án **chưa có task nào** (P2)

**Vấn đề:** `var taskProgress = taskCount == 0 ? 0m : Math.Round(doneCount * 100m / taskCount, 2);`
Đồ án chưa tạo task nào sẽ hiện **"0%"** — trông y như "đã có task nhưng chưa làm gì". Vi phạm nguyên tắc bất biến §0.3 (*không bịa số; phân biệt "không có dữ liệu" với "giá trị 0"*) — cùng loại lỗi mà `academicProgress` đã xử lý đúng bằng `null` + `NOT_CONFIGURED`.

**Cách sửa:** đổi `TaskProgress` trên `ProjectReviewMatrixRowDto` thành `decimal?` và trả `null` khi `taskCount == 0`.
⚠️ **Phối hợp FE bắt buộc:** FE đang khai báo `taskProgress: number` (**không nullable**) ở `ProjectReviewMatrixRow`. Đổi sang nullable là **breaking change** → BE **thông báo trước** để FE sửa type cùng lúc, hoặc tạm thời thêm cờ `HasTasks: bool` thay vì đổi kiểu. **Chọn một và nói rõ với FE trước khi ship.**

---

## 6. QUYẾT ĐỊNH HỌC VỤ CÒN TREO — CẦN HỘI ĐỒNG DUYỆT (không tự quyết)

BE giữ **Option B (tư vấn)** cho tất cả, chỉ bật chế tài khi có **feature flag + văn bản** (`sourceDecisionReference`). KHÔNG hardcode.

| ID | Vấn đề | Đang áp dụng | Bật cứng khi có văn bản |
|---|---|---|---|
| OD-01 | Cổng chưa PASS có khóa nộp cuối kỳ? | Cảnh báo `NOT_READY`, không khóa cứng | `ENABLE_OFFICIAL_DEFENSE_BLOCKING` + endpoint override giáo vụ |
| OD-02 | Trọng số nhánh đồ án liên ngành | Cấu hình động theo template/kỳ (ADD-01) | — (không hardcode 40/20/20/20) |
| OD-03 | % đóng góp cá nhân có auto cấm bảo vệ? | Chỉ số tham khảo, không auto-fail | Chỉ theo văn bản QA |
| OD-04 | Chuyên gia DN có quyền chốt PASS? | Chỉ `FEEDBACK`, không chốt | Theo văn bản HĐ Khoa |
| OD-05 | Giới hạn số lần revision | Max 2 trong khung, vượt → escalate giáo vụ (không auto-hủy) | Theo văn bản Khoa |
| OD-06 | Đồ án khóa cũ chưa có gate | `NOT_CONFIGURED`, không giả % | Bất biến — giữ nguyên |

---

## 7. CHECKLIST BÀN GIAO (Definition of Done)

**Bắt buộc (blocker):**
- [x] BUG-01 đã fix (`e8521e3`) — lỗ hổng ngoài ngành đã bịt.
- [ ] **REGRESSION-01: đổi `"MENTOR"` → `"DISCIPLINE_MENTOR"`** + thêm **ca dương** (mentor đúng ngành → 200); rà mọi so sánh `AssignmentType` trong 3 commit vừa push.
- [ ] Toàn bộ acceptance §3 **và** §3.1 PASS; `e2e/review-gates/live.spec.ts` giữ 403 ngoài ngành và xanh.
- [ ] CAL-01/CAL-02: bổ sung `dueAt` cho kỳ báo cáo và cho phân công đánh giá.
- [ ] MISSING-01: nộp minh chứng dạng liên kết hoạt động (URL validate `https://` ở BE); template `422` với loại BE không hỗ trợ; loại hệ thống tự xác minh được xử lý rõ.
- [ ] MISSING-02: endpoint nhận xét GVHD hoạt động, major-scoped cho Mentor, **không** đổi được trạng thái gate; `supervisorFeedbacks` trả đúng shape trong timeline.
- [ ] Không phát sinh giá trị enum mới ngoài bảng §2.1.
- [ ] DATA-01/02/03: staging có dữ liệu demo; đã bàn giao IDs + SHA/image + evidence migration.
- [ ] Chạy trọn vòng đời trên staging (đơn ngành P1/P2 + liên ngành P3): `upload → submit → revision → PASS → next gate → download/revoke`, revoke → 403, ẩn danh → 401.
- [ ] BE build 0 lỗi/0 warning; unit/OpenAPI test xanh; OpenAPI khớp contract FE (§2).

**Bổ sung (giao cùng đợt):**
- [x] **BE (ADD-01)**: `Weight` + freeze snapshot + `academicProgress` null-safe + `disciplineProgress` — **đã xong** `cfed325`. Đạt golden sample §5 sau khi FE gửi weight.
- [x] **BE (ADD-02 phần aggregator)**: 3 endpoint — **đã xong**.
- [ ] **BE-04**: `MatrixRow` trả `BlockingReasons` thật (khóa = mã gate), dùng lại helper `Blocking(g)`.
- [ ] **BE-05**: thêm `HybridScopeLabels` để UI không hiện "Chuyên ngành 12".
- [ ] **BE-07**: SignalR push (phát sau commit, deep-link re-check quyền).
- [ ] **BE-08 / BE-09**: `dueAt` cho kỳ báo cáo và cho phân công đánh giá.
- [ ] **BE-10**: `taskProgress` phân biệt "chưa có task" — **chốt cách làm với FE trước khi ship** (nullable = breaking).
- [ ] **BE-11**: override có `reason` ≥ 50 ký tự + audit — **chỉ khi OD-01 được duyệt**.

**Quy tắc chung khi ship (tránh lặp lại sự cố REGRESSION-01):**
- [ ] Mọi rule phân quyền phải có **cả ca âm (403) và ca dương (200)** trong test.
- [ ] Mọi hằng số trạng thái/loại phải **đối chiếu DB CHECK constraint** trong `db/schema.sql` trước khi dùng, không suy từ giá trị default của model.
- [ ] Không thêm giá trị enum ngoài bảng §2.1; đổi kiểu field đang dùng (nullable…) phải **thông báo FE trước**.

**Nghiệp vụ:**
- [ ] Giữ Advisory Model (Option B) cho OD-01..06; chế tài cứng chỉ qua feature flag + `sourceDecisionReference`.
- [ ] Không bịa `0/100%`; thiếu dữ liệu → `null` + mã lý do.

---

## 8. THAM CHIẾU

- Kiểm chứng runtime hiện trạng: `docs/review-gates/INTEGRATION_2026-10-21.md`.
- FE adapter thật: `src/features/review-gates/api/review-gates-api.ts`, types: `src/features/review-gates/types/review-gates.types.ts`.
- BE: `src/AIPMS.Api/Controllers/ReviewGatesController.cs`, `src/AIPMS.Infrastructure/Services/Projects/ReviewGateService.cs`, `src/AIPMS.Application/Features/ReviewGates/ReviewGateContracts.cs`, `src/AIPMS.Infrastructure/Persistence/Generated/Models/SupervisorAssignment.cs`.
- Quyết định học vụ: `docs/handoff/OPEN_DECISIONS.md`.
- Regression: `e2e/review-gates/live.spec.ts`, `e2e/review-gates/README.md`.
