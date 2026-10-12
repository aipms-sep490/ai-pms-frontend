# FE2-03B — Chính sách và vòng đời phiên bản

Ngày: 12/10/2026. Nhánh `fix/fe2-03b-scheme-policy-metadata-20261012`, tạo mới từ FE develop `dc3951d58268840b09564901003e13948a736755`. Không lấy code từ các nhánh FE2 chưa merge.

## Nguồn đối chiếu

- Handoff `ai-pms-docs/specs/AI-PMS_CIB_v4_IMPACT_FE2_BE_HANDOFF_2026-10-09.md`, roadmap đã duyệt, `docs/FE_DEVELOPMENT_PROCESS.md` và design-system MASTER hiện tại.
- BE remote develop `e625ee259e165258379d93484652ada77e19a9a2`: `docs/v5-scoring-results.md`, `docs/v5-cold-evaluation.md`, `EvaluationSchemeDtos.cs`, `EvaluationSchemeService.cs`, `VersionedResultCalculator.cs`, `PeriodPolicyService.cs`.
- BE checkout có thay đổi riêng: chỉ đọc remote source; không sửa BE/DB hoặc suy ra deployment từ trạng thái merge.

## Phần đã xử lý

- Typed scheme DTO/input bổ sung `policy`, `lockedAt`, `stage`, `evaluatorWeights`; các trường read có thể vắng/null với dữ liệu cũ. Không tự backfill giai đoạn lịch sử sang DEFENSE. Request mới bỏ stage có default DEFENSE tại BE.
- Panel chỉ đọc phân biệt khóa cấu hình để chấm với phê duyệt học thuật. DEMO kể cả PUBLISHED vẫn là minh họa. Chỉ ghi nhận phê duyệt khi BE trả `isDemo=false`, `APPROVED` và tham chiếu không rỗng; nhãn không cấp quyền hoặc thay readiness/publication checks.
- Hiển thị tham chiếu dưới dạng text, công thức/calculator/rounding/precision, thời điểm khóa, giai đoạn và trọng số từng người chấm. Thiếu policy/stage giữ trạng thái chưa xác định; mã mới được giữ nguyên. Weights bỏ/null là trung bình đều; mảng rỗng có cảnh báo riêng, không tự tạo slots hay chia lại trọng số.
- Save các field cũ giữ nguyên stage/weights BE trả về. Không gửi policy trong editor hiện tại: update giữ provenance, create mặc định DEMO tại BE. COLD tracking được phép 0/0; các giai đoạn khác vẫn bị chặn; các tổng 100% và phạm vi vẫn giữ nguyên. FE không tính tổng điểm chính thức.
- Successor dùng nguyên response BE: DRAFT/DEMO, không mang approvalReference/lockedAt từ nguồn cũ; bản gốc vẫn frozen. Sửa thông báo PROPOSED/confirmation để không hiểu PUBLISHED là academic approval.
- Period policy: test tái hiện được hai lỗi trước sửa (409 vẫn cho gửi token cũ; reload 403 vẫn giữ lịch sử có thể chọn). Sau sửa giữ draft, khóa save/publish, bỏ lịch sử khi load lỗi, bắt chọn draft mới hoặc successor từ dữ liệu vừa tải. Synchronous mutation lock chống gửi chồng. Chặn successor khi latest đã DRAFT theo BE; published history không edit. Không đổi payload lifecycle hoặc quy tắc hiệu lực.
- Rubric: giữ implementation hiện tại và chạy lại các test read-only published, clone/cancel, dirty switch và late response. Không suy ra quyền clone/retire từ `canEdit` của một published rubric.

## Kiểm chứng

Chi tiết số lượng và inventory ở `validation-summary.json`.

- Frozen install, typecheck, lint, build, full Vitest và diff check.
- Focused: 5 files / 33 tests. Before-fix period policy regression: 2 failed / 2 passed; sau sửa 5/5 đạt.
- Browser `node scripts/fe2-03b-policy-browser-check.mjs`: production router với API fixture, 5 dạng metadata ở 375/768/1024/1440; period policy 409 ở cả bốn viewport và fresh-token → reload 403. Tổng 7 flows / 24 viewport checks; không overflow/pageerror/unmapped API. Metadata đọc không gửi scheme mutation; 2 policy PUT fixture có chủ đích dùng old-token rồi fresh-token, không replay tự động.
- Đã xem ảnh mobile official/period conflict và desktop DEMO. Raw JSON/log/screenshots tại `test-results/fe2-03b*` ignored. Lint có 118 warnings hiện hữu, cùng diagnostic signatures với baseline develop dc3951d; không error/warning mới. Build còn warning chunk-size hiện hữu.

## Còn cần tích hợp

**METADATA_VERSION_FE_DONE / AUTHORITY_EDITOR_WAITING_01B / BE_ACCEPTANCE_PENDING**, chưa đánh dấu toàn FE2-03B hoặc FE2 DONE.

- FE2-01B `a86d519` chưa merge: không cherry-pick action gates/CSS hoặc mở UI sửa approval, stage, evaluator slots trước dependency này. Sau integration, làm trên nhánh mới từ develop cập nhật, kiểm capability và stale confirmation cho từng mutation mới.
- BE cho phép Admin hoặc staff có rubric scope tương ứng quản lý period policy; FE route hiện chỉ vào qua department scope. Ghi nhận delta entry riêng để audit router sau integration; không thêm Admin vào toàn department group để vượt guard.
- Browser fixture không xác nhận staging. Còn real actor/negative authorization/409 hai actor/readback/audit với BE/QA và kiểm khả năng thay policy sau khi đã có usage.
- Local commit không đồng nghĩa push/PR/merge/deploy. Roadmap nằm trên nhánh docs riêng; các nhánh task cũ giữ nguyên.
