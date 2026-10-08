# DEPART FE — Kiểm chứng và bàn giao develop

Ngày 08/10/2026. Người dùng đã yêu cầu kiểm tra, push và merge an toàn lên develop, sau đó nhóm dự án chạy lifecycle test. Phạm vi bàn giao là FE dùng contract BE hiện hành; không triển khai BE/DB, không tạo seed/migration và không deploy.

## Kết luận phạm vi

FE đã triển khai các nhóm được đối chiếu trong báo cáo 01–06: workspace/navigation, học vụ chỉ đọc, qualification/evidence/versioned decision, đề tài/thẩm định, assignment/candidates/capacity, governance/reporting/evidence, đánh giá/bàn giao/result preview/student publication/archive và export CSV/XLSX/PDF. API/quyền/trạng thái giữ theo BE; không triển khai endpoint hoặc quyền chỉ có trong PROPOSED.

**FE/API integration: DONE theo source, unit và browser fixture. Toàn lifecycle thật: PARTIAL, chờ nhóm dự án test trên fixture cách ly.** D01–D07 BE đã có contract, D05/D06 giữ ranh giới ADMIN. D08 có isolated BE acceptance nhưng chưa chứng minh FE browser lifecycle nhiều actor.

Runtime hiện tại có 1 project ACTIVE với ACADEMIC_SCOPE_UNKNOWN, qualification queue rỗng. Không dùng FE để mở các thao tác BE đang khóa hoặc sửa dữ liệu legacy. Cần fixture valid scope, sinh viên/chứng chỉ, khoa IT/BA, actor tương ứng, policy/kỳ và scheme/bàn giao/điểm để nhóm kiểm đủ lifecycle.

## Gate bàn giao

- BE prerequisite: PR #105 đã merge thành `3742760582a23e72c878fb61f1dadf225dfbca01`, Backend CI của develop success. Không sửa checkout BE.
- FE base khi chuẩn bị: origin/develop `a6f804bf973e711bb542497b8a9b142a8ad70ca3`, không behind; checkpoint trước delivery giữ nguyên checkout FE chính đang dirty.
- Frozen install, typecheck, lint, full Vitest, production build, diff-check, Playwright mock/live read phải đạt. Machine-readable full-suite cần nonempty, đủ mọi test file, zero failed/pending và success=true.
- Không upload credentials/token/storage state/HAR/trace live. Mock trace dùng synthetic data; artifact runtime không đưa vào Git.
- PR CI phải success trên đúng head, mergeable, không review đang chặn hoặc unresolved thread, recheck develop ngay trước merge. Dùng normal merge commit và exact-head guard, không force/bypass protection.
- Sau merge: xác minh develop SHA và post-merge Frontend CI. Không reset, stash hoặc đổi nhánh checkout FE chính của người dùng.

Bằng chứng sẽ được ghi tại `docs/department/validation/release-evidence.json`, với commit source được kiểm tra, danh sách test file/count/status và browser check counts. Các con số trước delivery ở báo cáo 06 là lịch sử; dùng evidence mới và CI của PR khi đánh giá bàn giao.

## Kết quả local trên commit source

Commit source `7f85fdf042a9e76200248cd6033b41d724705ef0` đã được kiểm tra sau khi commit: frozen install/typecheck/lint/build/diff-check PASS; full suite 158/158 test files, 717/717 tests PASS, failed=0, pending=0, success=true. Danh sách test files trong reporter được đối chiếu với toàn bộ inventory src, không thiếu hoặc thừa suite. Playwright 44 mock checks và 51 live read/export checks PASS, zero pageerrors/unknown endpoints/blocked domain writes. Warning chat Fast Refresh/chunk lớn từ upstream giữ nguyên; không đổi package hoặc lockfile.

[Machine-readable release evidence](validation/release-evidence.json) không chứa credential/token, nội dung cá nhân của export hoặc trace live. Commit bổ sung evidence/tài liệu không đổi source so với commit đã test; PR CI sẽ kiểm tra chính head cuối. Review/PR CI/post-merge CI được kiểm tra riêng khi delivery; không dùng local PASS để thay gate CI.

## Checklist nhóm dự án chạy sau merge

1. Dùng develop FE cùng BE có D01–D08; cài đúng lockfile, đăng nhập từng actor trên môi trường cách ly.
2. Qualification có chứng chỉ: verify/reject, resubmit, stale token 409 và không replay.
3. Đồ án đơn ngành/liên ngành: submit, revision/resubmit, quyết định từng khoa, approve/reject.
4. Assignment chính/mentor: đúng phạm vi khoa, capacity/chuyên môn, recheck và thay/kết thúc thật.
5. Báo cáo/evidence/bàn giao/scheme/evaluator: kiểm scope và transition thực tế.
6. Chấm, preview, kết quả project/sinh viên, công bố xuyên khoa bằng ADMIN, archive và terminal readonly.
7. Direct URL ngoài khoa, hết phiên, quyền bị thu hồi, hai actor cùng quyết định và gửi trùng; xác minh trạng thái/audit cuối từ BE.

Không xem trạng thái FE_DONE hoặc việc merge là chứng nhận lifecycle thật đã đạt. Nếu acceptance thật thất bại, phân loại FE bug, contract/service bug hoặc dữ liệu fixture; sửa theo nguồn, không dùng mock để che lỗi BE.
