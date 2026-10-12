# FE2-03A — Scheme conflict reconciliation

Ngày 09/10/2026. **FE_DONE_BE_PENDING**: implementation và regression FE hoàn tất; concurrency acceptance trên API thật chờ BE-02. Nhánh `fix/fe2-03a-scheme-conflict-20261009` tạo mới từ develop `3426d70e5f7f0320ee5c057ade39aca267cb0434` sau fetch. Không sửa BE/DB/authority/math.

## Hành vi trước / sau

Trước: scheme mutation gặp 409 thì load cập nhật list nhưng selected/form/token vẫn cũ. Delete còn bỏ selection trước khi server xác nhận, nên 409 có thể mất form đang sửa.

Sau: giữ đầy đủ draft, hiển thị comparison với bản server, khóa mutation cho đến khi người dùng chọn. Chỉ cho tiếp tục draft nếu server vẫn DRAFT; lần lưu kế tiếp dùng token mới và cần thao tác mới. Bản published/retired không bị ghi đè; bản bị xóa giữ snapshot để người dùng xem trước khi bỏ. Reload thất bại giữ khóa và cho retry. Không replay save/publish/delete/version. Mutation pending khóa selection/draft creation và chặn double write. Đổi project remount editor; response cũ không cập nhật context mới, confirmation cũ được hủy.

## Source / tests

- [Page](../../../../src/features/evaluations/EvaluationSchemeManagementPage.tsx), [17 behavior tests](../../../../src/features/evaluations/EvaluationSchemeManagementPage.test.tsx).
- [Browser fixture](../../../../e2e/fixtures/fe2-scheme-conflict.tsx), [browser runner](../../../../scripts/fe2-scheme-conflict-check.mjs).
- Mapping source FE2-01A hoàn tất ở commit `f8a94bd` trên nhánh `docs/fe2-01a-contract-mapping-20261009`; chưa freeze BE-01 và chưa merge. Không cherry-pick code/docs từ nhánh đó để tạo task này; source được kiểm lại trực tiếp.

## Validation

| Check | Kết quả |
| --- | --- |
| Focused scheme Vitest | 17/17 PASS |
| Evaluation + result regression | 10 files / 54 tests PASS |
| Full Vitest JSON | 171/171 source test files xuất hiện trong report; 792/792 tests PASS, failed/pending=0, success=true |
| Browser mock API | 8/8 cases PASS ở 375/768/1024/1440; errors=[]; focus/keyboard/draft/token/no overflow |
| pnpm typecheck | PASS |
| pnpm lint | PASS; repo có warnings, page còn existing set-state-in-effect pattern; không refactor ngoài task |
| pnpm build | PASS; existing chunk-size warnings |
| git diff --check | PASS |

Machine-readable summary: [validation-summary.json](validation-summary.json). Raw full report và browser results/screenshots ở `test-results/fe2-scheme-conflict/` (ignored local artifacts). Đã xem ảnh conflict 375px để kiểm bố cục; so sánh hiển thị tên kỳ/rubric/ngành, không bắt người dùng đọc ID kỹ thuật.

Lệnh chạy lại:

```powershell
pnpm exec vitest run src/features/evaluations/EvaluationSchemeManagementPage.test.tsx --maxWorkers=4
pnpm exec vitest run --maxWorkers=4 --reporter=json --outputFile=test-results/fe2-scheme-conflict/vitest-full.json
pnpm typecheck
pnpm lint
pnpm build
pnpm exec vite --host 127.0.0.1 --port 5199 --strictPort
# Trong terminal khác khi Vite sẵn sàng:
node scripts/fe2-scheme-conflict-check.mjs
```

Runner dùng production page + intercepted API; không đi qua application role router và không chứng nhận authorization/persistence/deployed BE. Không dùng mock success thay readback thật.

Delivery: local commit của task riêng; chưa push/PR/merge khi ghi evidence. develop giữ nguyên baseline. Roadmap đã duyệt ở nhánh `docs/fe2-roadmap-20261009`; task kế tiếp tiếp tục tạo nhánh mới từ develop và kiểm dependency, không dùng nhánh này làm gốc.
