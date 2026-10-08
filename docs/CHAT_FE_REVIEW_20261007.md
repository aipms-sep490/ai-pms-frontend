# Chat in app — audit và nâng cấp, 2026-10-07

Trạng thái: **FE_DONE_BE_PENDING** đối với API mặc định 5080. Dock đã kiểm chứng với BE/DB thật qua API tạm 5090.

## A. Phân tích prompt và audit

Prompt yêu cầu chat toàn ứng dụng: bubble unread, mở list/thread trong workflow, mobile toàn màn hình, giữ `/messages`, một nguồn realtime và quyền BE. Đã reuse chat-api.ts, ChatProvider, ChatThread, auth session, Button và semantic theme. Skill UI/UX Pro Max hỗ trợ thiết kế; Playwright/Vitest kiểm chứng. Không thêm dependency runtime; Playwright là dev dependency regression.

Nghiệp vụ BE: TEAM chứa sinh viên hiện thuộc team; PROJECT chứa sinh viên và giảng viên đang được phân công PRIMARY/DISCIPLINE_MENTOR; DIRECT cần quan hệ chung hợp lệ được BE cho phép. Role không tự cấp quyền chat mọi người. OPEN/canSend và canEdit/canRecall từ BE quyết định UI; sửa/thu hồi yêu cầu concurrency token và BE giới hạn tin chính mình trong 15 phút. Mock runtime không gọi chat API/hub; fixture chỉ trong test.

## B. Kiến trúc

AppLayout → ChatDock → shared ChatConversations/ChatThread. Một ChatProvider và SignalR connection mỗi session. Dock giữ state closed/list/conversation/minimized; Thread giữ draft/history/pending. Minimize giữ draft nhưng ngừng fetch/watch/read; AccessRevoked vẫn xóa nội dung. Logout/đổi account reset theo session. Dock ẩn/deactivate tại `/messages` để tránh hai cửa sổ xử lý cùng hội thoại.

Realtime dedup version bằng bigint; batch invalidation 150ms theo conversation; REST refresh coalesced, tuần tự. Reconnect/visibility catch-up đối soát BE. Chưa có endpoint tổng unread: duyệt toàn bộ summary cursor được phép, dedup theo version rồi tính tổng, UI hiển thị 30 dòng/lần. Read chỉ khi active, tab visible, window focus và marker tin cuối hiển thị; badge đối soát sau REST read thành công.

## C. File tạo mới

- src/features/chat/ChatDock.tsx: state, dialog, focus, viewport, route lifecycle.
- ChatLauncher.tsx: bubble và badge 0/1–99/99+.
- ChatMessageContent.tsx: text và URL http/https an toàn.
- chat-view.ts: ngày/giờ và tổng unread; chat-events.ts: envelope/version dedup.
- ChatDock.test.tsx, ChatProvider.test.tsx, ChatThread.test.tsx, chat-events.test.ts: regression cần thiết.
- e2e/chat/realtime.spec.ts, playwright.chat.config.ts: một browser scenario hai client.
- design-system/ai-pms/pages/chat.md và báo cáo này.

## D. File sửa

- ChatProvider.tsx: toàn bộ inbox cursor, session ownership, unread/read reconciliation, scoped refresh.
- ChatPage.tsx: shared list, title filter debounce, người nhận/nhóm chính thức.
- ChatThread.tsx: active lifecycle, history window, read, retry/dedup, typing, reply/edit/recall, scroll.
- chat.css, AppLayout.tsx, Sidebar.tsx: dock và chat badge độc lập notification.
- Button.tsx: khai báo optional ref để trả focus về launcher, reuse component hiện hữu.
- .env.example, vite.config.ts: chat flag và proxy hub cùng API.
- package.json/pnpm-lock.yaml: Playwright dev dependency và test commands.

## E. API hiện hữu

Không sửa BE/schema. Contract: BE docs/chat-api-contract.md và realtime contract. Các path dưới `/api/v1/chat`:

| API | Mục đích |
| --- | --- |
| GET /conversations, /recipients | Inbox cursor và người nhận hợp lệ |
| POST /conversations/direct, /teams/{id}/conversation, /projects/{id}/conversation | Mở phòng chính thức |
| GET /conversations/{id}, /members, /messages?before=... | Quyền, thành viên/read và lịch sử |
| POST /messages | Gửi UUID clientMessageId và reply ID |
| PATCH /messages/{id}, POST /messages/{id}/recall | Sửa/thu hồi concurrency token |
| PUT /read | Read receipt thật |

Members/messages/read ở bảng nằm dưới `/conversations/{id}`. Hub `/hubs/chat`: Watch/Unwatch, SetTyping, Ping và các event MessagesChanged/ConversationChanged/ReadStateChanged/TypingChanged/PresenceChanged/AccessRevoked. Reuse auth refresh, student journey và own ACTIVE supervisor assignments.

## F. Khả năng BE thiếu

**Backend support required:** attachments có quyền upload/download; reactions; server-persisted mute/pin/mark-unread; tìm nội dung tin toàn lịch sử. Không có nút làm việc giả. Title filter chỉ lọc tên hội thoại được phép.

BE đã có REST/SignalR chat. API mặc định 5080 có system status 200 nhưng chat negotiate 503; Development secrets trỏ DB video test cũ thiếu 6 object chat. DB AI_PMS có đủ 6/6. API tạm 5090 dùng DB đúng và bật Chat/Realtime qua process environment, không thay secrets/appsettings lâu dài. Cần đồng bộ cấu hình BE mặc định và kiểm chứng lại sau restart.

## G. Tính năng triển khai

Bubble global 56px, badge tổng unread riêng Notification Center; mở dock không chuyển trang; minimize/reopen giữ draft khi đổi route; expand `/messages`. Desktop tối đa 400×640; mobile native modal theo visualViewport/safe area, scroll lock, focus/Escape/restore. Dock controls >=44×44, không tràn ngang trong viewport kiểm thử.

List có avatar chữ/nhóm, preview, giờ, scope, unread, debounce title filter và loading/empty/error/retry/offline. Composer autosize, 4000 ký tự, Enter gửi/Shift+Enter xuống dòng, IME an toàn. Optimistic pending và UUID retry giữ nguyên payload, echo không nhân bản tin. History cursor, tối đa 10 trang/500 tin memory, giữ anchor khi prepend/sliding; đọc lịch sử không bị kéo xuống cuối, có chỉ báo và jump mới nhất.

Typing/presence/read dùng BE. Reply quote, edit/recall concurrency và quote unavailable sau recall. Text không chạy HTML, link chỉ http/https. AccessRevoked và REST 401/403/404 xóa messages/draft/pending.

## H. Chủ động hoãn

Các mục F đến khi có contract. Multi-window, browser push, emoji picker, shortcut workspace theo actor là P1 chưa triển khai; dùng route/sidebar hiện hữu, không đoán quyền hay route từ role. Không thay Notification Center, thêm API fake hoặc state library.

## I. Kiểm thử

- Chat focused: **22/22**, 4 file. Session/mock isolation, paginated unread, reconnect, focus/draft/state, UUID retry, XSS, hidden read, revocation, scoped refresh, lịch sử dài 500 tin.
- Browser fixture: **1/1 passed**, desktop 1440×1000/mobile 375×812; mất response/retry, echo dedup, unread/read, route/draft, revoked access, expanded page, touch target và overflow. Đã xem ảnh. Fixture không thay nghiệm thu BE thật.
- BE/DB thật 5090: student/supervisor login 200, cả hai hub connected. Student → supervisor **1470ms** trong lần đo (gồm thao tác UI, không phải SLA); reply ngược, minimize badge1, reopen giữ draft, visible read về0, sửa/thu hồi và quote unavailable đều passed. SELECT-only: tin10002 edited/recalled, tin10003 reply10002, 36 outbox SUCCEEDED.
- Hai student và supervisor PROJECT cùng student/student DIRECT đã test thật ở bước trước. Dock mới trực tiếp kiểm chứng student/supervisor PROJECT; supervisor DIRECT, membership revocation và read-only transition live chưa có nghiệm thu mới. Unit/fixture kiểm tra ranh giới này.
- Full FE suite: **664/664 passed**, **150/150 test files**, reporter JSON **319/319 suites**, zero failure; output đã hoàn tất, không rỗng và success=true.
- Typecheck/build passed; lint không lỗi với3 Fast Refresh mixed-export warning; diff check passed.

Evidence JSON/ảnh runtime trong test-results được Git ignore. Live JSON chỉ actor alias/status, không lưu password/token. Không thêm runner theo môi trường/file credentials. Giữ regression cần thiết, đã bỏ helper/test live dư thừa. Tin tổng hợp kiểm thử còn trong DB; không xóa business data.

## J. Nợ kỹ thuật

Endpoint total unread và snapshot xuyên cursor phía BE sẽ giảm tải/đảm bảo nhất quán tốt hơn khi hoạt động đồng thời. Refresh trang history đang đọc vẫn cần load test BE cho quy mô lớn. Presence không đại diện attendance/quyền học vụ. Bàn phím mobile được kiểm tra viewport thu nhỏ và composer visibility, chưa chạy thiết bị iOS/Android vật lý. Còn3 lint warnings và build warning chunk>500kB. API5080 cần cấu hình đúng trước nghiệm thu môi trường mặc định. Ngày 2026-10-07, người dùng đã cho phép push và merge chức năng vào develop. Delivery qua PR có CI và kiểm tra đúng head; không triển khai ứng dụng hoặc sửa DB trong bước merge.
