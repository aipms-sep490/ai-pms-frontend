# BÀN GIAO BACKEND — REVIEW GATES: LỖI CONCURRENCY TOKEN Ở HAI ENDPOINT QUYẾT ĐỊNH MATRIX

**Dự án:** AI-PMS (Academic Capstone Project Management System)
**Người nhận:** BE Developer (ASP.NET Core 9 / EF Core / SQL Server)
**Ngày phát hành:** 2026-10-23 · đối chiếu `origin/develop` BE @ `225cfcc`
**Phát sinh từ:** code review FE (PR #96 Review Gates) đối chiếu trực tiếp mã BE. **Không phải yêu cầu tính năng mới.**
**Mức độ:** 🔴 CHẶN — tính năng "Bộ môn ghi nhận kết luận thẩm định trên ma trận" **không bao giờ chạy được** khi FE chạy API thật (không mock).

---

## LỜI NHẮN GỬI BE DEV

> Chào bạn. File này sửa lại một nhận định **sai** ở bàn giao trước ([BE_HANDOFF_2026-10-21.md](BE_HANDOFF_2026-10-21.md) §dòng 159) — chỗ đó mình ghi "concurrency đã khóa an toàn", **nhưng thực tế không phải vậy** cho hai endpoint matrix. Mình xin lỗi vì nhận định cũ.
>
> Lỗi nằm **hoàn toàn ở BE** (FE đang gọi đúng theo hợp đồng mà BE tự khai báo). Chỉ cần sửa **một hàm** `CheckToken` theo §2 là xong cả hai endpoint. **Không cần FE đổi gì.**
>
> Làm được ngay, không phải chờ chốt gì thêm.

---

## 1. HIỆN TRẠNG LỖI (bằng chứng)

Hai endpoint cho cán bộ bộ môn ghi đè trạng thái gate trên ma trận giám sát:

| Endpoint | FE gọi tại | Body FE gửi |
|---|---|---|
| `POST /api/v1/projects/{id}/review-gates/{gateCode}/decision` | `src/features/review-gates/api/review-gates-api.ts:56` (`updateGateDecision`) | `{ newStatus }` — **không có `concurrencyToken`** |
| `POST /api/v1/projects/{id}/review-gates/scopes/{scope}` | `src/features/review-gates/api/review-gates-api.ts:65` (`updateHybridScopeDecision`) | `{ newStatus }` — **không có `concurrencyToken`** |

**BE khai báo `ConcurrencyToken` là tùy chọn** (`string?`):

- `ReviewGateContracts.cs:53` → `UpdateReviewGateDecisionRequest(string NewStatus, string? ConcurrencyToken)`
- `ReviewGateContracts.cs:54` → `UpdateReviewGateScopeRequest(string NewStatus, string? ConcurrencyToken)`

**Nhưng BE lại kiểm tra token vô điều kiện**, và `CheckToken` ném `409` khi token null/không parse được:

```csharp
// ReviewGateService.cs:626
private static void CheckToken(Guid current, string? input) {
    if (!Guid.TryParse(input, out var value) || value != current)
        throw new ConflictException("The review gate changed; reload before retrying.");
}
```

- `UpdateDecision` — `ReviewGateService.cs:477` gọi `CheckToken(gate.ConcurrencyToken, input.ConcurrencyToken)` **luôn luôn**. Token `null` → `Guid.TryParse(null)` = false → **409 mọi lần gọi**.
- `UpdateScope` — `ReviewGateService.cs:497` (nhánh `else`, khi scope **đã** có quyết định) gọi `CheckToken(row.ConcurrencyToken, input.ConcurrencyToken)`. Lần đầu mỗi scope (nhánh `if`, tạo mới) **chạy được**; mọi lần quyết định lại cùng scope → **409**.

**Vì sao FE không thể tự vá:** DTO trả về cho ma trận — `ProjectReviewMatrixRowDto` (`ReviewGateContracts.cs:59`) — **không có field token nào** cho từng gate/scope. FE không có nguồn token để gửi, nên "tải lại rồi thử lại" cũng vô ích.

**Vì sao test BE cũ vẫn xanh:** mock adapter FE (`updateProjectGateDecision(projectId, gateCode, newStatus)` — 3 tham số, không token) che lỗi ở dev/staging-non-prod; chỉ build production (`reviewGatesMockEnabled=false`) mới lộ.

---

## 2. CÁCH SỬA (chọn PHƯƠNG ÁN A — khuyến nghị)

### PHƯƠNG ÁN A — Tôn trọng tính tùy chọn của token (ít rủi ro nhất, không đụng FE)

`ConcurrencyToken` đã là `string?` ⇒ ý nghĩa đúng phải là: **null/rỗng = "không yêu cầu kiểm tra optimistic-lock lần này"**. Chỉ cần nới `CheckToken` bỏ qua khi input rỗng:

```csharp
// ReviewGateService.cs:626 — thay thế
private static void CheckToken(Guid current, string? input) {
    if (string.IsNullOrWhiteSpace(input)) return;   // token tùy chọn: không gửi = không kiểm tra
    if (!Guid.TryParse(input, out var value) || value != current)
        throw new ConflictException("The review gate changed; reload before retrying.");
}
```

**Lưu ý phạm vi:** `CheckToken` còn được các luồng khác dùng (submit evidence, verify, decision của reviewer, publish…), nhưng những luồng đó **luôn gửi token thật** (FE lấy từ DTO có token: `StudentGateInstance.concurrencyToken`, `AssignedReviewItem.concurrencyToken`). Vì vậy nới "null = bỏ qua" **không làm yếu** các luồng đó — chúng vẫn gửi token và vẫn bị kiểm tra như cũ. Chỉ hai endpoint matrix (vốn không có token) được hưởng đường đi mới. Nếu muốn an toàn tuyệt đối, tách một helper riêng chỉ cho hai endpoint matrix thay vì sửa `CheckToken` dùng chung — nhưng về hành vi là tương đương.

### PHƯƠNG ÁN B — Phơi token ra matrix rồi bắt FE gửi (nặng hơn, cần phối hợp 2 phía)

Thêm token vào `ProjectReviewMatrixRowDto` cho từng gate/scope, FE đọc và gửi kèm. **Không khuyến nghị** vì (1) đổi shape DTO → phá type FE, cần sửa FE đồng thời; (2) ma trận là bảng nhiều dự án × nhiều gate, nhồi token làm DTO phình và vẫn dễ stale giữa 2 lần tải. Chỉ chọn B nếu nghiệp vụ **bắt buộc** optimistic-lock cho thao tác ghi đè của bộ môn — nếu vậy **báo mình trước** để FE sửa cùng lúc.

---

## 3. TIÊU CHÍ HOÀN THÀNH (Phương án A)

1. `POST /projects/{id}/review-gates/{gateCode}/decision` với body `{ "newStatus": "PASSED" }` (không token) → **200**, trả `ProjectReviewMatrixRowDto` cập nhật; `gate.ConcurrencyToken` được xoay mới như hiện tại.
2. `POST /projects/{id}/review-gates/scopes/{scope}` đổi trạng thái **lần thứ hai** cùng một scope (không token) → **200** (hiện tại đang 409).
3. Test hiện có cho luồng gửi **có** token (submit evidence sai version, verify, reviewer decision) vẫn **giữ nguyên 409 khi token sai** — chứng minh không nới lỏng ngoài phạm vi.
4. Thêm test: gọi `decision`/`scopes` không token hai lần liên tiếp → cả hai 200, trạng thái cuối đúng.

---

## 4. VIỆC KHÔNG THUỘC HANDOFF NÀY

- FE **không đổi** (`updateGateDecision`/`updateHybridScopeDecision` giữ nguyên — đang đúng với hợp đồng `ConcurrencyToken?`).
- Không liên quan BE-11 (override gate có audit/`reason`) ở bàn giao trước — đó là nghiệp vụ chế tài, chờ văn bản Hội đồng. Mục này chỉ sửa lỗi kỹ thuật concurrency.
