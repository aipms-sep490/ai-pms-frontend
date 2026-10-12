# FE2-01B — Quyền học thuật theo contract BE đã merge

Ngày: 12/10/2026. Trạng thái: **FE_DONE_BE_PENDING**, chưa nghiệm thu staging.

## Baseline và phạm vi

- Nhánh mới `fix/fe2-01b-academic-capabilities-20261012`, tạo trực tiếp từ `develop`/`origin/develop` `dc3951d58268840b09564901003e13948a736755`. Không lấy code từ các nhánh FE2 local chưa merge.
- BE đối chiếu từ `origin/develop` `e625ee259e165258379d93484652ada77e19a9a2`, qua `git show`; không đổi checkout BE, không ghi DB hoặc gọi mutation API thật.
- Entry Admin, layout và contextual links đã có trên develop qua PR #53. Task này sửa delta contract/authority còn thiếu, không tạo lại routes hoặc mở department review cho Admin.
- Phạm vi: capability DTO/client/hook và ba trang scheme, evaluator assignment, project result publication. StudentResultPublicationPanel tiếp tục dùng quyền/bản xem trước riêng của BE; không dùng project readiness để cấp hoặc chặn quyền công bố từng sinh viên.

## Contract được sử dụng

Nguồn BE tại SHA nêu trên:

- `src/AIPMS.Api/Controllers/ExecutionCapabilitiesController.cs`.
- `src/AIPMS.Application/Features/ExecutionCapabilities/DTOs/ExecutionCapabilityDtos.cs`.
- `src/AIPMS.Infrastructure/Services/ExecutionCapabilities/ProjectCapabilityService.cs`.
- `docs/v5-academic-authority.md`, `docs/contracts/cib-v4/permission-matrix.md`, `docs/contracts/cib-v4/error-semantics.md`.

`GET /api/v1/projects/{projectId}/my-capabilities` trả `actions[]` gồm `code`, `allowed`, `reasons[]`, kèm project/scheme tokens và frozen scope metadata. FE cũ đọc map `capabilities`/`blockedReasons`, khác contract đã merge. Ba code sử dụng là `manage_evaluation_scheme`, `manage_evaluators`, `publish_project_result`.

Admin đơn thuần chỉ đọc/audit. Khoa chủ trì theo frozen snapshot quản lý toàn scheme và công bố khi BE xác nhận sẵn sàng. Khoa tham gia quản lý phân công trong phạm vi thành phần được giao; không công bố kết quả toàn đồ án. Mutation BE vẫn kiểm tra actor, component/target, workflow và token; capability chỉ biểu diễn quyền theo ngữ cảnh.

Tài liệu contract tổng còn metadata SHA từ snapshot trước; evidence này ghi chính xác source SHA đang đọc. Không coi metadata cũ là xác nhận deployment hoặc freeze toàn bộ v5. Các tỷ trọng/approval policy không được tự duyệt bằng FE.

## Thay đổi

- Đọc đúng DTO mới; payload thiếu/sai `actions`, sai project, kiểu quyền không phải boolean hoặc action trùng bị từ chối.
- Chưa có phiên, ID không hợp lệ, đang tải, contract cũ hoặc request lỗi đều không cấp quyền. Đổi project/session hoặc retry làm quyền cũ mất hiệu lực ngay; hủy request và bỏ response đến muộn.
- Scheme chỉ cho mutation khi có action tương ứng; khi quyền lỗi/thu hồi vẫn giữ draft để đọc. Sau success/error mutation đều xác minh lại quyền. Không replay write.
- Assignment chỉ mở form/candidates và thu hồi khi có `manage_evaluators`; danh sách đọc vẫn sử dụng API/guard hiện có. Khóa gửi trùng và cập nhật quyền sau mutation.
- Project publication cần đồng thời action BE, `preview.canPublish`, confirmation token hiện tại và xác nhận của người dùng. Hộp xác nhận cũ không được gửi khi identity/capability snapshot thay đổi, kể cả actor mới cũng được cấp quyền. URL Admin/Department và feature flag không cấp quyền.
- Thông báo quyền dùng component chung, có tải lại và focus bàn phím. CSS `.collaboration-shell` hiện tự tham chiếu `--color-primary`; khôi phục token qua root motion token sẵn có trong phạm vi ba trang FE2 để nút/màu focus hiển thị. Không sửa stylesheet FE1 hoặc palette toàn ứng dụng.

## Validation

Kết quả và inventory chính xác: [validation-summary.json](validation-summary.json).

- Focused Vitest: **6 files, 47 tests PASS** — contract malformed/foreign, unknown code/reason, 403/404/503/retry, project/session changes, late responses, Admin-only denial, lead/dual-role capability, draft preservation, scoped assignment và confirmation invalidation.
- Full Vitest: **210 files, 1008 tests PASS**, zero failed/pending; mọi file trong inventory thuộc `src/`. Lượt đầu ChatThread long-history timeout khi chạy nhiều luồng; file đó chạy riêng đạt 20 tests. Lượt cuối full suite dùng `--maxWorkers=4` đạt, không sửa/skip test chat.
- Typecheck và production build PASS. Build còn cảnh báo chunk >500 kB hiện có.
- Oxlint: **0 errors, 118 warnings**; đối chiếu snapshot source `dc3951d` theo file/rule/severity/count cho kết quả giống nhau, không thêm warning hoặc tắt rule.
- Browser production router + intercepted API fixture: **7 checks / 28 viewport checks** (375/768/1024/1440), không overflow/pageerror/unmapped request. Keyboard đọc scheme, focus/cancel/publish và token kiểm tra đạt. Fixture mutation gồm một scheme PUT trả 409 và một result POST; không gửi write trong các case denied.
- `git diff --check` PASS. Không thay package/lockfile, BE hoặc DB.

Lệnh tái chạy:

```text
npm run typecheck
npm run lint
npm test -- --maxWorkers=4 --reporter=json --outputFile=test-results/fe2-01b/vitest-full.json
npm run build
npm run dev -- --host 127.0.0.1 --port 5193 --strictPort
node scripts/fe2-01b-capabilities-browser-check.mjs
git diff --check
```

Browser fixture cố ý trả preview dương trong case denied để chứng minh `canPublish` riêng lẻ không vượt capability; BE thật có thể từ chối preview bằng 403. Các capability mask browser là fixture kiểm tra hành vi component trên production router, không xác nhận grant thật cho Admin. Unit fixture có actor Department staff và actor dual-role khi server cho phép. Ảnh/raw reports ở `test-results/fe2-01b/` (ignored), không đưa credentials/storage state vào artifact.

## Handoff và còn chờ

- Cần staging cách ly đã deploy contract trên, tài khoản Admin-only, lead, participating, wrong-scope/legacy và đồ án có final package/evaluation window đúng trạng thái. Kiểm persisted readback/audit cùng BE/QA theo BE-02.
- Đặc biệt chạy negative mutation 403, stale scheme/preview 409, Admin preview access và việc chuyển role/identity thực. Không coi fixture PASS là nghiệm thu quyền BE thật.
- FE2-03B kiểm metadata approval/DEMO/successor/stage/weights theo DTO mới; FE2-04 xử lý paging, retired SUPERVISOR/D17 và coverage. Những delta này chưa được đánh dấu DONE trong task hiện tại.
- CSS token cycle ngoài ba trang FE2 ghi nhận để owner khung giao diện xử lý sau; không đổi FE1 trong task này.
- Delivery: commit local trên nhánh task; chưa push/PR/merge/deploy. Roadmap được cập nhật riêng trên nhánh tài liệu `docs/fe2-roadmap-20261009`.
