# G9 — acceptance flags và thực trạng 13 UC AI

Bàn giao **25/10/2026, Asia/Saigon**; dữ liệu browser/network quan sát ngày24–25/10. Bundle giữ tên gốc24/10 để link ảnh ổn định; request bổ sung `2026-10-24T20:58Z` là03:58 ngày25/10 tại Việt Nam. Nhánh `chore/fe2-acceptance-flags`, baseline `b49b3acf05fe2db556963b83f4359f958975e067` (develop đã gồm PR100). G9 thêm profile công khai `.env.acceptance` và bằng chứng; không sửa logic sản phẩm, không xác nhận Checkpoint FE2-A.

**Q6 đã có câu trả lời từ runtime:** các endpoint đã probe đều có response thành công hoặc response nghiệp vụ có cấu trúc; chưa có bằng chứng endpoint thuộc nhóm A/chưa deploy. Tuy nhiên B/endpoint hiện diện **không đồng nghĩa toàn UC đạt**: recommendation bị409 trên DRAFT mới, summary là fallback, predictive ML chưa được chứng minh. Không còn gán13UC là “chưa chạy vì cấu hình”.

## Cấu hình và cách chạy lại

`.env.acceptance` dùng API thật qua proxy staging, `VITE_DATA_MODE=api`, `VITE_USE_MOCK_REVIEW_GATES=false`. Có16 flag mục tiêu true và3 hold false theo DECISIONS Q6. `VIDEO_MEETING=true` giữ baseline ngoài mẫu số19; `AI_ACADEMIC_ASSISTANT=false` thuộc G8 riêng, `WORKFLOW_PREVIEW=false` giữ dữ liệu thật. `AI_ADVISORY` được khai báo rõ dù `.env.example` hiện thiếu biến này, vì thuộc phạm vi13UC đã duyệt.

```powershell
pnpm dev --mode acceptance --host localhost --port 5176
pnpm typecheck
pnpm lint
pnpm test --mode acceptance --maxWorkers 4
pnpm build --mode acceptance
```

Profile đã commit thể hiện cấu hình cuối. Lần probe dùng override tiến trình: bật từng flag, restart Vite sau mỗi lần và giữ các flag đã bật; không phải16 flag cô lập. Khi lặp lại vòng phân loại, bắt đầu16 flag false rồi bật lần lượt AI_ADVISORY → AI_RUN_HISTORY → SUPERVISOR_RECOMMENDATION → các flag còn lại trong bảng. Kiểm tra override tiến trình/`.env.acceptance.local` trước khi diễn giải kết quả; không ghi credential vào profile hay log.

## Kết quả đủ19 flag

Endpoint dưới đây có prefix `/api/v1`; phương thức GET nếu không ghi khác. **B** = endpoint đã xử lý request, **partial** = chưa nghiệm thu hết tính năng. `INERT` = biến env chưa có consumer production; không suy ra flag điều khiển UI từ việc endpoint trả lời.

| Flag `VITE_ENABLE_…` | Giá trị | Role · route | Endpoint / HTTP | Kết luận thật |
|---|---|---|---|---|
| AI_ADVISORY | true | Leader · `/project/ai`, report40003 | POST `/projects/50004/ai/assistant/ask`200 COMPLETED; POST `/projects/50004/ai/progress-analysis`200; ask50005 insufficient200; summary report40003 fallback200 | B, partial; không chứng minh ML |
| AI_RUN_HISTORY | true | Leader · `/project/ai` | `/projects/50004/ai/runs?page=1&pageSize=20`200; `/projects/50004/ai/runs/2`200 | B, list/detail persisted; chưa phủ paging/quyền mọi role |
| SUPERVISOR_RECOMMENDATION | true | Leader · project50004 ACTIVE,50005 DRAFT | `/projects/50005/supervisor-recommendations?assignmentType=PRIMARY&page=1&pageSize=20`409 `ACADEMIC_SCOPE_UNKNOWN` | B, chưa đạt ranking/explanation: frozen scope guard trên DRAFT; ACTIVE50004 có state guard riêng |
| GATES | true | Leader · `/project/gates` | `/projects/50004/checkpoints`200 | B, legacy checkpoint list/empty state; không gộp core Review Gates |
| WORKING_AGREEMENT | true | Leader · `/project/agreement` | `/projects/50004/working-agreement`**204**; `/history`200 rỗng | B, chưa có agreement; chưa kiểm sửa/chấp thuận |
| UNIFIED_CAPABILITIES | true | Leader · `/project/overview` | `/projects/50004/my-capabilities`200 | B endpoint; INERT flag, không khẳng định toggle mở UI |
| TASK_MAJOR_FILTER | true | Leader · `/project/tasks?major=20003&role=PRIMARY`, chọn Marketing20003/PRIMARY rồi Áp dụng | UI GET `/tasks/project/50004?page=1&pageSize=20&majorId=20003&disciplineRole=PRIMARY`200, trả1 item20004 | B, G9-28 chụp sau khi settle:1 Marketing task, SE task20005 không hiện. G9-24 loading giữ làm dấu vết; chưa phủ mọi filter/role |
| DEFENSE | true | Leader · `/project/defense` | `/projects/50004/defense-sessions`200 | B, list/empty smoke; chưa tổ chức/chốt bảo vệ |
| COLD_REPORT | true | Leader · `/project/cold-reports`; Department · `/department/cold-templates` | Package50004 checklist/progress404 `ColdPackage ... was not found.`; UI GET `/cold-report-templates?majorId=20002&projectPeriodId=30006&page=1&pageSize=50`200 items[] | B, package thiếu resource; template search rỗng hợp lệ (G9-26), chưa tạo/áp dụng package/template |
| WEEKLY_ASSESSMENT | true | Supervisor · `/supervisor/projects/50004/weekly-assessments` | `/projects/50004/weekly-assessments/weeks`, `/rubrics`200 | B, đọc lịch/tiêu chí; chưa chấm/công bố |
| LEAD_PUBLISH | true | Department · `/department/projects/50003/result` | `/projects/50003/result-policy`204 | B endpoint; INERT flag; chưa công bố kết quả chính thức |
| RBAC_WRITE | true | Admin · `/admin/access/rbac` | `/security/roles`, `/security/permissions`, `/security/permissions/matrix`200 | B, đọc matrix/UI; chưa mutation đổi quyền |
| MEETING_COLLABORATION | true | Leader · `/project/meetings/50003` | `/meetings/50003/collaboration`, `/notes/history`200 | B, đọc fixture meeting đã hủy; chưa live multi-user/mutations |
| CHAT | true | Leader · `/messages` | `/chat/conversations`, `/chat/recipients`200; conversations mới nhất items[]/hasMore=false | B, list/route rỗng hợp lệ; không có conversation sẵn trong phiên đã kiểm, chưa live delivery và không gửi tin ra ngoài |
| CHAT_ATTACHMENTS | true | Leader · `/messages` | `/chat/conversations`200 items[] | B companion endpoint; không có conversation sẵn nên chưa upload/download attachment; không tạo bằng chứng bằng gửi tin ra ngoài |
| JIRA_SPRINT | true | Leader · `/project/tasks`, mở “Sprint & Backlog” | `/projects/50004/sprints`, `/task-board`200; panel tạo sprint/backlog render (G9-25) | B, chỉ đọc/mở panel; chưa sprint lifecycle. View hiện cả20004/20005 dù filter Marketing còn chọn, không khẳng định filter áp dụng view này |
| PEER_EVAL | false | Không probe | Hold theo Q6 | Chờ chính sách học vụ, không gán A |
| RESULT_CORRECTION | false | Không probe | Hold theo Q6 | Chờ chính sách phúc khảo, không gán A |
| INDUSTRY | false | Không probe | Hold theo Q6 | Chờ điều kiện CORS/Google client/InvitationUrl, không gán A |

Hai flag inert được kiểm source: `unifiedCapabilitiesEnabled` chỉ khai báo/export env; `leadDepartmentPublishEnabled` chỉ khai báo/export env và test stub, không có consumer production. Không sửa authority hoặc capability để tạo hiệu ứng cho flag.

## Kết luận13 UC

“Partial/chưa đạt toàn UC” là giới hạn nghiệm thu thực tế, không phải chưa chạy do cấu hình. Mọi timestamp/request/ảnh chi tiết nằm trong bundle local bên dưới.

| UC | Kết quả | Bằng chứng và phần chưa chứng minh |
|---|---|---|
| 054 — gợi ý GVHD | Chưa đạt, guard409 | DRAFT50005 trả `ACADEMIC_SCOPE_UNKNOWN`, `Frozen academic scope is required.`; chưa có candidate ranking thành công |
| 055 — giải thích gợi ý | Chưa đạt, cùng guard409 | Bị chặn trước explanation/confidence; không gọi đây là config-blocked |
| 110 — phân tích tiến độ | Partial, analysis200 | Project50004 có1 milestone/2 task TODO, risk/data/trend INSUFFICIENT_DATA, riskScore null; không ép thiếu dữ liệu thành thấp |
| 111 — tóm tắt báo cáo | Partial, FALLBACK200 | Draft report40003 có1 evidence, run4; deterministic fallback từ report fields, không chứng minh provider generation |
| 112 — feature snapshot | Partial, quan sát snapshot | Run2 có unassigned ratio1, nhiều metric null; chưa chứng minh tái lập trên bộ dữ liệu đủ |
| 113 — rule baseline/delay | Partial, RULE_BASED | `PROVISIONAL_RULE_BASELINE_1.0`, `FEATURE_SET_1.0`; chưa phủ mọi rule/boundary/delay |
| 114 — predictive risk/ML | Chưa chứng minh | Model hiện quan sát là RULE_BASED; không có bằng chứng ML/version/evaluation chạy thành công |
| 115 — yếu tố rủi ro/khuyến nghị | Partial, advisory | `UNASSIGNED_TASKS`, observed1, severityMEDIUM, lời khuyên giao người; chưa phủ factor khác, không quyết định học vụ tự động |
| 116 — engine xếp hạng GVHD | Chưa đạt, frozen-scope guard | Endpoint hiện diện nhưng chưa nhận engine score/rationale; không suy diễn xếp hạng từ guard |
| 117 — assistant theo đồ án | Đạt nhánh trả lời có evidence; toàn UC partial | Ask50004 COMPLETED200, run1,2 task evidence; trả lời nêu giới hạn thay vì bịa ưu tiên. Chưa đủ mọi prompt/role/provider failure |
| 118 — lịch sử AI | Đạt nhánh lưu/đọc; toàn UC partial | List200 có run1; lưu analysis run2 rồi mở detail200. Chưa phủ paging/quyền ngoài project/mọi loại run |
| 119 — insufficient/failure/output validation | Đạt nhánh insufficient; toàn UC partial | Project50005 chưa task/milestone: ask200 `INSUFFICIENT_EVIDENCE`, evidence[], insufficientEvidence=true, run3; UI hiện đúng. Chưa cố ý thử timeout/5xx/malformed |
| 131 — phân bố risk | Đạt nguồn engine trên portfolio/CSV; toàn UC partial | Department dashboard200 có5 project:4 INSUFFICIENT_DATA,1 LOW; G9-23 và labels khớp `analysis.riskLevel`/`riskLevels`. UI XuấtCSV → GET `/dashboards/portfolio/export?format=csv`200, file5 dòng cùng riskLevel, insufficient riskScore blank (G9-27). Đều RULE_BASED; chưa Excel/PDF hoặc stored trend proof |

UX ghi nhận, chưa sửa trong G9: portfolio thẻ “Cần chú ý theo rủi ro” cộng mọi nhóm khác LOW nên4 project thiếu dữ liệu cũng được tính; tag insufficient dùng màu thành công. Không diễn giải4 là4 project MEDIUM/HIGH. `/system` trả200 với name/version/status nhưng không có deployed commit SHA; không khẳng định staging chạy đúng một BE revision chỉ từ status này.

## Fixture giữ lại, không chứa thông tin xác thực

Các fixture mới được thao tác qua UI thật; GET bổ sung chỉ đọc bằng phiên role đang đăng nhập.

| Đối tượng | ID / trạng thái |
|---|---|
| Semester | 30002, DST active |
| Team | 50004, code `DSTG920261024`, tên `DST-G9-20261024 Kiểm thử AI theo flag`, rosterLocked/ELIGIBLE |
| Thành viên | 60002 Leader,50006 Member; không tạo user mới hoặc đổi mật khẩu |
| Project | 50005, code `PRJ-471AD626`, SINGLE_MAJOR20002; DRAFT→SUBMITTED→REVIEWING→APPROVED→ACTIVE |
| Supervisor request | 20006, primary IT1/Profile20002, ACCEPTED qua UI |
| Report | 40003, WEEKLY24–30/10, DRAFT; không nộp/công bố kết quả |
| AI runs | Project50004 run1 ask/run2 analysis; project50005 run3 insufficient/run4 summary fallback |

Department start-review có một response Cloudflare502; đã đọc lại trạng thái SUBMITTED, chờ rồi retry UI200. Không gọi lần đầu thành công hoặc quy transient502 thành lỗi FE. Giữ fixture prefixDST để tái hiện; chưa khẳng định cleanup khi chưa xóa. Không thay đổi DB, role authority, điểm chính thức, RBAC hoặc gửi chat.

## Validation và phụ thuộc G7

| Check | G9 baseline/profile acceptance | G7 worktree riêng, cùng b49b3ac |
|---|---|---|
| Typecheck | PASS, root chạy lại `pnpm typecheck` xác nhận exit0 | PASS |
| Lint | PASS,0error/206warning | PASS,0error/206warning; normalized warning set không đổi |
| Build acceptance | PASS; bundle >500kB warning hiện có | PASS; cùng loại warning |
| Full suite acceptance | **263 file:258pass/5fail;1457 test:1419pass/38fail;6 unhandled** | **264 file/1468 test PASS**, không báo unhandled |

38 failure baseline gồm32 test ở4 Gate page/scenario fixtures và6 CollaborationWorkspace test phụ thuộc Gate transport mặc định. G7 chuyển mock thành opt-in, bổ sung test opt-in rõ ràng cho các fixture và kiểm default real/dev/prod. Rerun xanh là **của nhánh `fix/fe-review-gates-real-api-default`**, không biến nhánh G9 trước tích hợp thành acceptance xanh. **Depends on [G7 PR #101](https://github.com/aipms-sep490/ai-pms-frontend/pull/101)** trước khi coi acceptance profile được xác thực trên develop. G7 có một dòng jsdom `Not implemented: navigation to another Document`, không phải Vitest failure.

Plan yêu cầu4 file `.claude/rules/ai-pms-ui-ux.md`, `ai-pms-human-crafted-ui.md`, `ai-pms-product-experience.md`, `ai-pms-collaboration-overlays.md`. Đã tìm local workspace/user roots và lịch sử Git nhưng không có; không khẳng định đã đọc. Các giới hạn AI advisory/traceability và FE2 ownership trong plan/AGENTS vẫn được áp dụng.

## Bundle bằng chứng và trạng thái checkpoint

Bundle **không thuộc Git của PR**: `E:/DOANTOTNGHIEP/output/fe2-plandev2-2026-10-24/`. Các link dưới chỉ hoạt động khi clone FE nằm cạnh `output` theo cấu trúc local; **GitHub không chứa/cung cấp các PNG/log này**. Người review từ xa cần nhận cả bundle để mở ảnh/log, còn bảng kết quả và cấu hình nằm trong PR.

- [G9 OBSERVATIONS — chi tiết19flag/13UC, request timestamps, giới hạn](../../../output/fe2-plandev2-2026-10-24/g9/OBSERVATIONS.md).
- [G9 network responses](../../../output/fe2-plandev2-2026-10-24/g9/network/requests.json), [flag probes](../../../output/fe2-plandev2-2026-10-24/g9/flag-probes.json), [ảnh G9](../../../output/fe2-plandev2-2026-10-24/g9/screenshots).
- [CSV risk download thật](../../../output/fe2-plandev2-2026-10-24/g9/exports/portfolio-risk.csv):5 project,4 insufficient/1low, được đối chiếu với portfolio/engine; không thay dữ liệu thiếu bằng0.
- [G9 test baseline](../../../output/fe2-plandev2-2026-10-24/g9/tests-acceptance.log), [G7 rerun](../../../output/fe2-plandev2-2026-10-24/g7/tests-acceptance.log), [G7 implementation notes](../../../output/fe2-plandev2-2026-10-24/g7/agent-implementation-notes.md).

Lưu ý chất lượng log: response HTTP thật ưu tiên hơn fallback200 của probe ban đầu; agreement đã xác minh và sửa summary204. `browser-errors.json` chỉ thu pageerror, không chứng minh toàn bộ console/SignalR sạch. CSV export đã kiểm; chưa có bằng chứng mọi breakpoint, Excel/PDF export, attachment upload/download hoặc các mutation đã nêu đạt. Task filter có ảnh kết quả cuối G9-28 sau khi chờ Marketing task render, chỉ1 kết quả và không hiện SE task; G9-24 loading giữ làm dấu vết. Không gộp smoke GET thành full E2E.

**Checkpoint FE2-A chưa được duyệt.** `plandev2/PLAN (1).md:205` yêu cầu “Checkpoint cần người review xác nhận, không tự tick”; `FE_DEV_2_TASKS.md:349` yêu cầu review trước task code tiếp. Diff G7 đã được review độc lập; browser đã xác nhận true→false ở4route, chỉ báo mẫu vừa khung390/768/1280/1440px và real Gate GET200. G9/G7 được bàn giao bằng PR riêng. Không tự merge hoặc bật auto-merge, không chuyển G1+ trước xác nhận checkpoint.
