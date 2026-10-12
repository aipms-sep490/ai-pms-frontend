# FE2 integration checkpoint — 12/10/2026

Nhánh `feat/fe2-integration-audit-20261012`, tạo từ origin/develop `dc3951d58268840b09564901003e13948a736755`. Người dùng yêu cầu gộp phần đã làm vào một nhánh, push và tạo PR để tự audit/merge. Không merge PR vào develop hoặc bật auto-merge.

## Nội dung tích hợp

| Phần | Source branch / commit | Kết quả |
| --- | --- | --- |
| Quay lại / báo cáo tiến độ | feat/fe2-navigation-report-fixes-20261009 · d0d50fb, 7b6f17f | Back dùng history, direct entry dùng fallback an toàn; hàng báo cáo là một link, bỏ CTA trùng và giữ hover/focus rõ |
| Roadmap + quy tắc nhánh | docs/fe2-roadmap-20261009 · 55a007a | File roadmap/AGENTS và các checkpoint nằm trong cùng nhánh audit |
| FE2-01A | docs/fe2-01a-contract-mapping-20261009 · f8a94bd | Giữ mapping/evidence lịch sử, gắn cảnh báo nguồn authority ngày 09/10 đã được thay bởi v5 hiện hành |
| FE2-03A | fix/fe2-03a-scheme-conflict-20261009 · 9318d23 | Tái tích hợp comparison/reconcile với BE action gates, blank defaults, contextual paths và schema mới; không khôi phục Admin academic writes hoặc default 5/100 cũ |
| FE2-01B | fix/fe2-01b-academic-capabilities-20261012 · a86d519 | `actions[].code/allowed/reasons`, fail-closed, scheme/evaluator/result gates và stale confirmation giữ nguyên |
| FE2-03B | fix/fe2-03b-scheme-policy-metadata-20261012 · e310fcb | DEMO/approval/calculator/stage/weights, COLD tracking và period-policy 409/successor giữ nguyên |

Các source branches đều là ancestors của nhánh tích hợp. Merge conflict được giải quyết theo hành vi và contract hiện tại, không lấy toàn bộ file cũ để ghi đè develop.

## Quyết định khi giải conflict

- CSS báo cáo giữ token và cỡ chữ tối thiểu 12px trên develop, thêm hover/focus cho toàn hàng và underline tiêu đề; bỏ các rule của CTA đã xóa. Không đưa lại palette/cỡ chữ cũ từ nhánh ngày 09/10.
- Mapping 01A là snapshot lịch sử. Quyền academic hiện hành dựa trên capability BE, không dùng mô tả Admin cũ làm authority.
- Scheme editor giữ ngưỡng trống/weights 0 khi tạo, Admin/scoped routes và toàn bộ action gates của 01B. Sau 409: hiển thị bản nhập và bản BE; chỉ cho giữ nội dung khi BE còn cho quản lý và bản server còn DRAFT, nhận token mới nhưng không tự replay. Published/deleted hoặc reload lỗi không mở write.
- Pending writes khóa selection/creation. Đổi project hủy confirmation và bỏ response cũ. Delete lỗi giữ selection; delete thành công mới bỏ selection. Form PUBLISHED không gửi update kể cả bị submit trực tiếp.
- Thêm test giao thoa: revoked capability sau 409 không được phục hồi bằng keep-draft; frozen scheme vẫn chặn submit dù actor có academic management.
- Fixtures/browser scripts cập nhật capability DTO và font giống trang production. Browser fixture vẫn không phải nghiệm thu BE thật.

## Kiểm chứng bản tích hợp

Số lượng và inventory chính xác được lưu tại [validation-summary.json](validation-summary.json). Evidence các nhánh trước là lịch sử; số liệu checkpoint này là lần kiểm tra source đã tích hợp.

- Frozen install, typecheck, lint, full Vitest (`--maxWorkers=4`), production build và `git diff --check`.
- Lint: 118 warnings hiện hữu, diagnostic signatures khớp baseline develop dc3951d; 0 errors/warnings mới. Build giữ warning chunk-size hiện hữu.
- Browser navigation/report: 9 checks; quay lại đúng nguồn/filtered list, direct fallback, hover, keyboard Enter và 4 viewport sizes.
- Scheme reconciliation: 8 cases trên 375/768/1024/1440; locked commands, error focus, keyboard details, comparison, explicit keep + token mới, không replay.
- Academic capabilities: 7 flows / 28 viewport checks; Admin read-only, scoped writes, refresh failure, revoked draft và server-confirmed publication.
- Metadata/period policy: 7 flows / 24 viewport checks; 0 scheme mutations trên reader fixture, 2 policy conflict PUT có chủ đích với token cũ rồi token mới sau reselect.
- Đã xem ảnh nhỏ và lớn. Một số ảnh fixture sau tích hợp được lưu trong [screenshots](screenshots/); raw logs/JSON/screenshots ở `test-results/` ignored. Chỉ dùng tài khoản/dữ liệu synthetic qua API interception, không ghi BE/DB.

## Phần còn pending

- PR là checkpoint code để người dùng audit và merge; staging đúng role, negative authorization, concurrency hai actor, readback/audit và golden math vẫn chờ BE/QA.
- UI mới để sửa approval/stage/evaluator slots chưa triển khai trong checkpoint này. Dependency code 01B đã tích hợp **trong nhánh audit**, chưa nằm trên develop; sau user merge, task tiếp theo vẫn tạo nhánh mới từ develop cập nhật.
- Period-policy Admin entry vẫn cần audit router riêng. Không mở cả department route group để vượt scope guard.
- FE2-02/04/05A/06/07/08 chưa được coi là đã làm chỉ vì contracts có trong source. Không đánh dấu toàn FE2 DONE và không deploy từ checkpoint này.
