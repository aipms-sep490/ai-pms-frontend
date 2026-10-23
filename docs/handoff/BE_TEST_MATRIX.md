# MA TRẬN KIỂM THỬ BACKEND (BE TEST MATRIX & ACCEPTANCE SUITE)

**Dự án:** AI-PMS (Academic Capstone Project Management System)  
**Tài liệu tham chiếu:** `01_ANTIGRAVITY_MASTER_PROMPT.md`, `05_E2E_ACCEPTANCE_MATRIX.md`.  
**Chuẩn Framework kiểm thử BE:** xUnit, FluentAssertions, Moq, Testcontainers (SQL Server 2022).

---

## 1. MA TRẬN KIỂM THỬ 24 KỊCH BẢN NGHIỆM THU (E2E ACCEPTANCE SUITE)

| Mã test | Kịch bản kiểm thử (Scenario) | Điều kiện đầu vào (Given) | Hành động (When) | Kết quả mong đợi (Then) | Loại kiểm thử |
|---|---|---|---|---|---|
| **TC-BE-01** | Tạo và lưu nháp Template Cổng | User là `DEPARTMENT_STAFF`, periodId hợp lệ | `POST /api/v1/academic/review-gates/templates` | `201 Created`, bản ghi có status `DRAFT` | Unit / Integration |
| **TC-BE-02** | Chặn Khoa khác sửa Template (IDOR Guard) | User là Giáo vụ Khoa Kinh tế | `PUT /api/v1/academic/review-gates/templates/tmpl-it-2026` | `403 Forbidden`, không thay đổi dữ liệu | Security / Authorization |
| **TC-BE-03** | Xác thực điều kiện Ban hành Template | Template có tổng trọng số 90% (thiếu 10%) | `POST /templates/{id}/publish` | `422 Unprocessable Entity`, báo lỗi tổng trọng số | Business Invariant |
| **TC-BE-04** | Đóng băng Snapshot khi Project ACTIVE | Project chuyển trạng thái `ACTIVE` | ProjectStateChange Domain Handler | Tạo bản ghi `ProjectProcessSnapshots` bất biến | Transaction / Integration |
| **TC-BE-05** | Chống nộp bài trái quyền (Member Submit Guard) | User là Thành viên thường (`isLeader === false`) | `POST /review-gates/R2/revisions` | `403 Forbidden`, thông báo chỉ Trưởng nhóm được nộp | Security / Role Guard |
| **TC-BE-06** | Trưởng nhóm nộp bài không làm tăng tiến độ | Project đang có tiến độ học vụ 20% | Leader nộp `SDD_v3.pdf` | `200 OK`, Cổng sang `WAITING_REVIEW`, tiến độ vẫn là 20% | Business Invariant |
| **TC-BE-07** | Phát hiện xung đột phiên bản nộp (Concurrency 409) | Client gửi `expectedVersion = 1` nhưng server đã có `version = 2` | `POST /review-gates/R2/revisions` | `409 Conflict`, không ghi đè file | Concurrency / Optimistic |
| **TC-BE-08** | Thẩm định viên xác minh từng minh chứng | User là Thẩm định viên được phân công | `POST /reviews/evidence/verify` với status `ACCEPTED` | `200 OK`, bản ghi minh chứng chuyển sang `ACCEPTED` | Integration / State |
| **TC-BE-09** | Chặn duyệt ĐẠT Cổng khi thiếu minh chứng | 1 tiêu chí bắt buộc vẫn ở trạng thái `REJECTED` | Reviewer bấm duyệt `decision: 'PASSED'` | `422 Unprocessable Entity`, thông báo còn minh chứng chưa đạt | Business Invariant |
| **TC-BE-10** | Phê duyệt Cổng thành công & Tăng tiến độ chính xác | Toàn bộ minh chứng bắt buộc đã `ACCEPTED` | Reviewer bấm duyệt `decision: 'PASSED'` | `200 OK`, Cổng sang `PASSED`, tiến độ tăng từ 40% lên 75% | Transaction / Audit |
| **TC-BE-11** | Chống duyệt ĐẠT trùng lặp (Double Increment Guard) | Cổng R2 đã ở trạng thái `PASSED` | Reviewer gửi lại request `decision: 'PASSED'` | `409 Conflict` hoặc giữ nguyên tiến độ 40% (Idempotent) | Idempotency / Concurrency |
| **TC-BE-12** | Khóa Cổng Tích hợp Liên ngành khi thiếu ngành | Ngành Marketing hoặc Design chưa đạt `PASSED` | Lead Dept duyệt Cổng tích hợp liên ngành | `422 Unprocessable Entity`, báo lỗi ngành thành viên chưa đạt | Interdisciplinary Guard |
| **TC-BE-13** | Khối chung (Common) chỉ được tính đúng 1 lần | Đồ án liên ngành IT + Marketing + Design | Hệ thống tính toán tiến độ toàn thể | Trọng số Common 40% chỉ cộng 1 lần, tổng trọng số các nhánh = 100% | Golden Calculation |
| **TC-BE-14** | Thẩm định viên ngoài phân công bị từ chối | User là Giảng viên không có trong bảng phân công | Gửi request xác minh hoặc duyệt cổng | `403 Forbidden` | Security / Authorization |
| **TC-BE-15** | Phát sinh sự kiện Outbox chỉ sau khi Commit DB | Giao dịch lưu quyết định bị lỗi SQL exception | `DbContext.SaveChangesAsync()` throw error | Rollback toàn bộ, KHÔNG có sự kiện nào được ghi vào Outbox | Transactional Outbox |
| **TC-BE-16** | Xác thực lại quyền hạn tại Deep-Link thông báo | Reviewer đã bị khoa thu hồi phân công | Click link `/review/gate-assignments` | `403 Forbidden` khi truy cập trang chi tiết | Deep-Link Reauthorization |
| **TC-BE-17** | Phân tách rạch ròi Tiến độ Task và Tiến độ Học vụ | Task Board hoàn thành 100% | Đồ án chưa được duyệt Cổng nào | Task Progress = 100%, Academic Progress = 0% | Metric Separation |
| **TC-BE-18** | Đủ điều kiện bảo vệ mang tính tư vấn (Advisory) | Đồ án chưa đạt Cổng R4 | Kiểm tra API `GET /defense-readiness` | Trả về `isReady: false`, KHÔNG tự động khóa nút nộp cuối | Governance Boundary |

---

## 2. KỊCH BẢN KIỂM THỬ TÍNH TOÁN TIẾN ĐỘ CHUẨN (GOLDEN PROGRESS TESTS)

```csharp
[Fact]
public void CalculateProgress_SingleMajor_ShouldReflectOnlyPassedGates()
{
    // Arrange: 4 gates weights [20, 20, 35, 25]
    var gates = new List<GateInstanceDto>
    {
        new() { Code = "R1", Weight = 20, Status = "PASSED" },
        new() { Code = "R2", Weight = 20, Status = "PASSED" },
        new() { Code = "R3", Weight = 35, Status = "WAITING_REVIEW" }, // Submitted, not passed
        new() { Code = "R4", Weight = 25, Status = "PLANNED" }
    };

    // Act
    var progress = ProgressCalculator.ComputeAcademicProgress(gates);

    // Assert: Exactly 40%, WAITING_REVIEW gives 0%
    progress.Should().Be(40.0m);
}

[Fact]
public void CalculateProgress_Interdisciplinary_CommonCountedOnce()
{
    // Arrange: Common (40%), IT (20%), Marketing (20%), Design (20%)
    // Common: 50% done (20%), IT: 100% done (20%), Marketing: 50% done (10%), Design: 0% done (0%)
    var hybridProgress = ProgressCalculator.ComputeHybridProgress(
        commonPercent: 50,
        itPercent: 100,
        marketingPercent: 50,
        designPercent: 0
    );

    // Assert: (40*0.5) + (20*1.0) + (20*0.5) + (20*0.0) = 20 + 20 + 10 + 0 = 50%
    hybridProgress.Should().Be(50.0m);
}
```
