# NHIỆM VỤ FRONTEND — DEV 1 (FE1) · AI-PMS · giao ngày 24/10/2026

> **Đọc hết mục 0 trước khi sửa dòng nào.** File viết để một AI coding agent thực thi được mà không cần hỏi lại. Mỗi task có bằng chứng (file:dòng + code thật), nghiệp vụ, cách sửa, tiêu chí nghiệm thu.
>
> **Phạm vi của bạn (FE1):** student · team · qualification · execution (task/milestone/deliverable/report/meeting) · profile · supervisor & mentor execution routes.
>
> **KHÔNG thuộc phạm vi của bạn:** `src/app/router/*`, sidebar, shared guards, evaluation/result publication, notifications, academic governance. Những phần đó là của **FE Dev 2**. Xem mục 0.6 — chạm vào file của người kia sẽ gây xung đột ghi.

---

## 0. NGỮ CẢNH BẮT BUỘC ĐỌC

### 0.1 Dự án là gì

AI-PMS là hệ thống **quản trị đồ án học thuật** cho một trường đại học, **không phải** task manager. Hai phương thức đồ án dùng **chung một lifecycle**:

- `SINGLE_MAJOR` — một ngành, một GVHD chính (PRIMARY).
- `INTERDISCIPLINARY` — liên ngành, một GVHD chính **cộng** một Mentor cho **mỗi ngành** (`DISCIPLINE_MENTOR`).

Vai trò: `STUDENT` (Leader / Member) · `LECTURER` (Supervisor / Mentor / Evaluator) · `DEPARTMENT_STAFF` · `ADMIN`.

### 0.2 Luật tối cao của FE trong dự án này

**BE là authority cuối cùng** về quyền, phạm vi, trạng thái, điểm, lưu trữ. FE **fail-closed**: chỉ hiển thị cái BE cho phép, không tự suy luận quyền.

Điều này có nghĩa:

- ❌ Không bao giờ "nới quyền ở FE cho chạy được". Nếu BE chặn, hoặc guard đúng, hoặc là lỗi BE → báo lên, không vá ở FE.
- ❌ Không tự tính điểm, không tự suy ra công thức, không tự quyết trạng thái hợp lệ.
- ❌ Không biến policy `PROPOSED`/`OPEN` thành chính thức bằng code FE.
- ✅ Đọc `capabilities`/`reason code` do BE trả và hiển thị đúng.

### 0.3 Repo và baseline

| | |
|---|---|
| Repo | `https://github.com/aipms-sep490/ai-pms-frontend` |
| Nhánh gốc | `develop` |
| Baseline SHA | `a486f7fc6d09d7b183e5ec61545d9e9e04874976` |
| PR đang mở | **#99** `test/developer-self-test-2026-10-24` — CI xanh, chờ merge. **Đợi #99 merge rồi hãy tạo nhánh**, nếu không bạn sẽ sửa lại những chỗ #99 đã sửa. |

### 0.4 Quy tắc làm việc — `AGENTS.md` của repo

Đọc `AGENTS.md` ở gốc repo. Trích phần bắt buộc:

1. **Mỗi task = một nhánh mới từ `develop` đã cập nhật = một PR.** Không code/commit trực tiếp trên `develop`.
2. Trước khi sửa file: `git status`, xác định nhánh và commit gốc, `git fetch`. **Quan trọng:** chạy `git log origin/develop..develop --oneline` — repo này từng có commit local chưa push, nếu branch off mà không kiểm thì PR bị lẫn commit lạ.
3. Chỉ cập nhật `develop` bằng fast-forward khi an toàn. **Không** reset/stash/ghi đè thay đổi của người khác để ép checkout sạch.
4. Task trước chưa merge **không** phải lý do dùng tiếp nhánh cũ. Có phụ thuộc thì ghi `depends on #<PR>` trong mô tả PR.
5. Khi bắt đầu task: báo tên nhánh + baseline. Khi bàn giao: ghi validation đã chạy + trạng thái commit/push/PR.
6. Không tự merge PR vào `develop`, không bật auto-merge.

Ngoài ra đọc 4 file rule trong `.claude/rules/`:

- `ai-pms-ui-ux.md` — luật UI/UX không thương lượng
- `ai-pms-human-crafted-ui.md` — chống thẩm mỹ AI-generated
- `ai-pms-product-experience.md` — IA và hợp đồng tương tác
- `ai-pms-collaboration-overlays.md` — chat/video/floating UI

### 0.5 Lệnh kiểm chứng

```bash
npm run typecheck     # tsc -b --pretty false
npm run lint          # oxlint
npm run test          # vitest run — TOÀN BỘ, 261 file test
npm run build         # tsc -b && vite build
```

Chạy một file test cụ thể:

```bash
npm run test -- src/features/teams/hooks/useTeamManagement.test.ts
```

CI (`.github/workflows/frontend-ci.yml`) chạy `lint` → `test` → `build`. Vì `build` là `tsc -b && vite build`, typecheck được bao trong CI.

### 0.6 Phân chia với FE Dev 2 — ĐỌC KỸ ĐỂ KHÔNG XUNG ĐỘT

| | FE Dev 1 (bạn) | FE Dev 2 |
|---|---|---|
| Sở hữu | `features/teams`, `features/supervisors`, `features/mentors`, `features/reports`, `features/tasks`, `features/deliverables`, `features/milestones`, `features/execution`, `features/auth/pages/ProfilePage.tsx`, `features/progress`, `features/meetings` | `app/router/*`, `features/results`, `features/evaluations`, `features/notifications`, `features/academic`, `features/review-gates`, `features/projects/pages` (thẩm định), `features/ai` |
| File chung | **Bạn sở hữu** `features/execution/execution-utils.ts` (task F7) | Dev 2 **đọc, không sửa** file này |
| File chung | `components/ui/*` — **phải hỏi nhau trước khi sửa** | như trên |

**Nguyên tắc:** nếu task của bạn cần sửa file thuộc Dev 2, **dừng lại và báo**, đừng tự sửa. Hai người ghi cùng file sẽ mất việc của nhau.

### 0.7 Môi trường dev

```
.env.local → VITE_API_PROXY_TARGET=https://api-staging.khaidz.com
FE dev server chạy ở http://localhost:5175
```

⚠️ `npm run dev` **không** tự dựng backend. Nếu không có `VITE_API_PROXY_TARGET`, proxy fallback về `localhost:5080` nơi **không có gì lắng nghe** → mọi request lỗi mạng. Luôn xác nhận `.env.local` có proxy target.

⚠️ `.env.local` hiện bật gần hết feature flag và có `VITE_USE_MOCK_REVIEW_GATES=true`. **Review Gates ở dev mặc định dùng dữ liệu mock**, không phải API thật. Việc tắt mock là task của **FE Dev 2**, bạn không cần quan tâm, nhưng đừng kết luận gì về Review Gates từ môi trường dev.

### 0.8 Bối cảnh: luồng thật đã chạy tới đâu

Đợt self-test 24/10/2026 chạy FE local + BE staging thật. **92 ca: 82 PASS · 9 FAIL · 1 BLOCKED.** Luồng đơn ngành đi được ~90%:

```
Admin tạo account + học kỳ + giai đoạn
 → Leader tạo nhóm → mời → Member nhận → đủ điều kiện        ✅ (nhưng FUNC-03 báo lỗi quyền sai)
 → đề cương → mời GVHD → GVHD nhận → nộp                     ✅
 → Bộ môn thẩm định 2 vòng                                   ✅
 → workspace + mốc + task → Member đổi trạng thái            ✅ (nhưng FUNC-06 GVHD không giao được việc)
 → nộp báo cáo tiến độ                                       ❌ VỠ (FUNC-05)
 → deliverable → GVHD accept → họp → biên bản                ✅
 → rubric → phân công evaluator → khóa gói → chấm            ✅
 → sau FINAL_SUBMISSION, GVHD đọc lịch sử                    ❌ VỠ (FUNC-09)
```

**5 trong 9 ca FAIL thuộc phạm vi của bạn** (LEC-23, STU-13, STU-15, EXE-16, EXE-20, LEC-30 — EXE-16 phụ thuộc quyết định nghiệp vụ BE-06). Và trong **8 vấn đề mức HIGH** đang OPEN của cả dự án, bạn giữ **4**: FUNC-03, FUNC-04, FUNC-05, FUNC-09.

Bạn là người gỡ các vết đứt của xương sống hệ thống.

### 0.9 Phụ thuộc BE — biết trước để không bị kẹt

| Task của bạn | Chờ BE task | Có thể bắt đầu ngay? |
|---|---|---|
| F1 FUNC-06 roster | **không** — BE đã cho phép đọc team | ✅ bắt đầu ngay |
| F2 FUNC-03 invitations | **không** | ✅ bắt đầu ngay |
| F3 FUNC-09 read-only | **không** | ✅ bắt đầu ngay |
| F4 FUNC-05 report cycle | **không** — BE đã nhận đủ field | ✅ bắt đầu ngay |
| F5 FUNC-04 profile | **BE-05** (`AuthUserDto` thêm `Title`/`Phone`) | ⚠️ phần chặn-mất-dữ-liệu làm ngay, phần prefill chờ BE-05 |
| F6 UX-02 tên nhóm | **BE-22** (`TeamInvitationDto` thêm tên) | ❌ chờ BE-22 |
| F7 UX-04 + UX-05 lỗi | **không** | ✅ bắt đầu ngay |
| F8 kiểm thử liên role | sau tất cả | ❌ cuối cùng |

**Tin tốt về kịch bản liên ngành trong F8:** BE-01 (FUNC-08) đã được chẩn đoán lại và **nhỏ hơn nhiều** so với dự kiến ban đầu — không phải xây mô hình slot mới, chỉ là một chỗ capability viết sai luật mà enforcement đã làm đúng (scope S/M, không L). Nghĩa là kịch bản 2 của F8 có khả năng mở sớm hơn kế hoạch. Theo dõi thông báo khi BE-01 merge.

---

## 1. THỨ TỰ THỰC HIỆN

```
Tuần 1  F1 → F2 → F3 → F7        (4 PR nhỏ, tổng < 60 dòng, rủi ro gần 0, lấy đà)
        ✅ CHECKPOINT A
Tuần 1-2 F4                       (1 PR lớn nhất — mở 5 UC)
        ✅ CHECKPOINT B
Tuần 2  F5 → F6                   (chờ BE-05 và BE-22)
        ✅ CHECKPOINT C
Tuần 2-3 F8                       (nghiệm thu liên role end-to-end)
        ✅ CHECKPOINT D — HOÀN THÀNH
```

---

# TASK F1 · Supervisor và Mentor không có roster để giao việc

**Nhánh:** `fix/fe-execution-team-roster`
**Mã lỗi:** FUNC-06 · MEDIUM · OPEN
**UC:** UC-066 "Assign / Reassign Task" (`PARTIAL_WITH_FAILURE`)
**Ca test FAIL:** LEC-23 "Danh sách thành viên khi GVHD phân công task"
**Scope: S** (~10 dòng + test)

## Bằng chứng — và tại sao Student PASS mà Supervisor FAIL cùng một màn hình

Ba route execution cung cấp context qua `ExecutionAccessProvider`. Chỉ một trong ba truyền `team`:

| File:dòng | Có truyền `team`? | Ca test |
|---|---|---|
| `src/features/projects/components/ActiveStudentProjectRoute.tsx:20` | ✅ `team: journey.team` | EXE-01 **PASS** |
| `src/features/supervisors/components/SupervisorExecutionRoute.tsx:48` | ❌ **không có** | LEC-23 **FAIL** |
| `src/features/mentors/components/MentorExecutionRoute.tsx:49` | ❌ **không có** | **chưa test — lỗi tiềm ẩn y hệt** |

Code thật tại `SupervisorExecutionRoute.tsx:48`:

```tsx
return <ExecutionAccessProvider value={{ project: data.project, supervisor: data.assignment,
  currentUserId: session?.user.id, actor: 'supervisor', canManageStructure: false,
  executionCapabilities, routeBase: `/supervisor/projects/${id}` }}>
```

→ **không có key `team`**.

Hệ quả ở hai nơi tiêu thụ:

`src/features/tasks/pages/TaskBoardPage.tsx:105`

```tsx
const members = team?.members ?? []
```

dòng 136 — select người phụ trách chỉ render khi có member:

```tsx
{members.length > 0 && <label>Người phụ trách<select ...>}
```

→ `team` undefined → `members = []` → **select không render** → không chọn được người nhận việc.

`src/features/tasks/pages/TaskDetailPage.tsx:80-81`

```tsx
const candidates = team?.members.map(member => ({ userId: member.userId, fullName: member.fullName })) ??
  [...new Map(allTasks.flatMap(item => item.assignees).map(person => [person.userId, person])).values()]
```

→ rơi vào fallback suy ra từ `allTasks` → **chỉ thấy người đã từng nhận việc**. Leader chưa từng nhận task nào sẽ không xuất hiện. Đúng như báo cáo quan sát.

## BE đã sẵn sàng — không cần chờ gì

Tôi đã kiểm `src/AIPMS.Infrastructure/Persistence/Repositories/TeamRepository.cs:339-361` (`CanUserViewTeamAsync`):

```csharp
if (user.Lecturer)
{
    var isInvitedOrAssigned = await context.Projects.AnyAsync(p => p.TeamId == teamId && (
        p.SupervisorAssignments.Any(a => a.SupervisorProfile.UserId == userId && a.EndedAt == null)
        || p.SupervisorRequests.Any(r => r.SupervisorProfile.UserId == userId
            && (r.Status == "ACCEPTED" || (r.Status == "PENDING" && (r.ExpiresAt == null || r.ExpiresAt > now))))
```

→ **Lecturer có assignment đang hoạt động ĐƯỢC đọc team.** Và `ProjectDto` (`src/AIPMS.Application/Features/Projects/DTOs/ProjectDtos.cs:8`) **có `TeamId`**.

Vậy đường đi là: `getProject(projectId)` → `project.teamId` → `GET /teams/{teamId}`. 100% FE, không phụ thuộc BE.

## Nghiệp vụ

UC-066 cho Supervisor và Student Leader giao/đổi người nhận việc cho **mọi thành viên đang hoạt động** của nhóm. Mentor giao việc trong **phạm vi ngành được phân công** (Mentor không giao việc toàn project).

Quan trọng: **FE không được tự quyết ai được giao việc.** Danh sách người nhận = roster BE trả về. Quyền giao việc = capability BE trả về (`assign_task` / `manage_task_disciplines`). FE chỉ render.

## Cách sửa đề xuất

1. Trong `SupervisorExecutionRoute.tsx`, sau khi đã có `data.project`, gọi thêm `services.team.getTeam(data.project.teamId)`. Thêm vào `Promise.all` hiện có để **không** tạo thêm một vòng chờ tuần tự:

```tsx
const [project, assignments] = await Promise.all([...])   // hiện tại
// → đổi thành: lấy project trước, rồi team song song với phần còn lại,
//   hoặc gọi team sau khi biết teamId (cần project.teamId nên không thể song song hoàn toàn)
```

2. Truyền `team` vào `ExecutionAccessProvider value`.
3. Làm **y hệt** cho `MentorExecutionRoute.tsx:49`.
4. **Xử lý lỗi đúng cách — đây là phần dễ sai nhất:** nếu `getTeam` lỗi (403/404/500), **không** được làm cả route chết. Project vẫn phải mở được, chỉ là không có select assignee. Dùng `catch` riêng cho lời gọi team, set `team: undefined`, và **hiển thị lý do** ở chỗ đáng ra có select:

> "Chưa tải được danh sách thành viên nhóm. Bạn vẫn xem được công việc nhưng chưa giao được người phụ trách." + nút Thử lại

5. **Không** đổi fallback `candidates` ở `TaskDetailPage.tsx:80-81`. Giữ nó làm lưới an toàn cho trường hợp team không tải được.
6. **Không** thêm quyền. Nút giao việc vẫn phải phụ thuộc capability BE như hiện tại.

## Tiêu chí nghiệm thu

- [ ] Supervisor (PRIMARY) mở TaskBoardPage → select "Người phụ trách" hiện **đủ** thành viên nhóm, kể cả Leader chưa từng nhận task.
- [ ] Supervisor mở TaskDetailPage → editor assignee hiện đủ thành viên.
- [ ] Mentor mở hai màn tương ứng → cũng có roster.
- [ ] `getTeam` trả 403 → route **vẫn mở**, hiện thông báo có nút Thử lại, không trắng trang, không redirect.
- [ ] Student Leader (đường cũ) **không thay đổi hành vi** — ca EXE-01 vẫn PASS.
- [ ] Nút giao việc vẫn bị disable khi capability BE nói không được, với lý do như cũ.

## Kiểm chứng

- [ ] Test mới cho `SupervisorExecutionRoute`: team load OK → provider có team; team lỗi 403 → provider không có team nhưng vẫn render Outlet.
- [ ] Test tương tự cho `MentorExecutionRoute`.
- [ ] Test `TaskBoardPage` với `team` có member → select render; không có team → hiện thông báo thay vì im lặng.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` — tất cả xanh.

## File dự kiến

- `src/features/supervisors/components/SupervisorExecutionRoute.tsx`
- `src/features/mentors/components/MentorExecutionRoute.tsx`
- `src/features/tasks/pages/TaskBoardPage.tsx` (chỉ thêm thông báo khi không có team)
- test tương ứng (4 file)

---

# TASK F2 · Member gia nhập nhóm thành công nhưng trang nhóm báo lỗi quyền

**Nhánh:** `fix/fe-team-invitations-scope`
**Mã lỗi:** FUNC-03 · HIGH · OPEN
**UC:** UC-033, UC-036 (`PARTIAL_WITH_FAILURE`)
**Ca test FAIL:** STU-13 "Member: role guard và controls theo quyền"
**Scope: S** (~6 dòng + test)

## Bằng chứng

`src/features/teams/hooks/useTeamManagement.ts:89-104`:

```tsx
const refreshInvitations = useCallback(async () => {
  setIsLoadingInvitations(true)
  try {
    const [sent, received] = await Promise.all([
      team ? services.team.getInvitations(team.id) : Promise.resolve(emptyPage<TeamInvitationDto>()),
      services.team.getInvitations(),
    ])
    setSentInvitations(sent.items)
    // The backend scopes this collection to the authenticated recipient. Do not re-authorize it in the browser.
    setReceivedInvitations(received.items)
  } catch (reason) {
    setError(classifyError(reason))
  } finally {
    setIsLoadingInvitations(false)
  }
}, [team])
```

`services.team.getInvitations(teamId)` map tới (`src/services/api/teams.api.ts:306-309`):

```
teamId ? `/teams/invitations?teamId=${teamId}&...` : `/teams/invitations?...`
```

## Nguyên nhân gốc — hai lỗi cộng lại

**Lỗi 1:** khi `team` tồn tại, hook **luôn** gọi `getInvitations(team.id)` — là danh sách "đã gửi", chỉ Leader được đọc. Member có nhóm thì cũng gọi → BE trả `403` (đúng).

**Lỗi 2:** `Promise.all` — một promise reject thì **cả cụm** reject. Nên `received` (danh sách Member được phép đọc, đã tải xong) bị **bỏ luôn**, và `setError` bật lên.

Kết quả quan sát trong đợt test: **cùng một màn hình vừa báo "Gia nhập thành công" vừa báo "không có quyền"** — người dùng không biết mình đã vào nhóm hay chưa.

## Nghiệp vụ

- Danh sách **đã gửi** (`?teamId=`) là của **Leader** — để quản lý lời mời mình gửi.
- Danh sách **đã nhận** (không có `teamId`) do **BE tự scope theo người đang đăng nhập** — comment ở dòng 97 đã nói rõ, **không re-authorize ở FE**.
- Member là thành viên hợp lệ. Việc Member không đọc được danh sách đã-gửi là **đúng**, không phải lỗi. Lỗi là FE **gọi** thứ không được phép rồi **hiểu nhầm** 403 thành "Member không có quyền vào trang nhóm".

## Cách sửa đề xuất

1. Chỉ gọi danh sách đã-gửi khi người dùng **là Leader**. Hook đã có `permissions` — dùng cờ quyền sẵn có (ví dụ quyền mời/hủy lời mời), **không** tự so sánh `userId === team.leaderId` (đó là re-authorize ở FE, trái luật mục 0.2).
2. Đổi `Promise.all` → `Promise.allSettled`. Xử lý từng nhánh:
   - `received` fulfilled → set. `received` rejected → set lỗi (đây mới là lỗi thật).
   - `sent` rejected → set `sentInvitations = []`, **không** set lỗi toàn trang. Nếu muốn, log debug.
3. **Không** nới quyền, **không** ẩn lỗi thật. Nếu `received` lỗi thì vẫn phải báo.
4. Kiểm luôn `refreshLeaderChanges` ngay dưới (dòng 106) — có cùng mẫu lỗi không? Nếu có thì sửa cùng task này (cùng một concern).

## Tiêu chí nghiệm thu

- [ ] Member đã có nhóm mở `/team` → thấy roster + eligibility, **không** có banner lỗi quyền.
- [ ] Member mở tab "Lời mời đã nhận" → thấy danh sách đã nhận.
- [ ] Leader mở `/team` → thấy **cả** danh sách đã gửi và đã nhận, hành vi không đổi.
- [ ] Member chấp nhận lời mời → thông báo thành công, **không** kèm lỗi quyền.
- [ ] Nếu API "đã nhận" thật sự lỗi (mô phỏng 500) → **vẫn** báo lỗi cho người dùng, có nút thử lại.
- [ ] Không có lỗi 403 nào bị "nuốt" im lặng mà không ghi dấu vết.

## Kiểm chứng

- [ ] Test: mock `getInvitations(teamId)` reject 403 + `getInvitations()` resolve → component hiện danh sách nhận, **không** hiện error.
- [ ] Test: cả hai reject → hiện error.
- [ ] Test: Leader → gọi đủ 2 request.
- [ ] Test: Member → **không** gọi request `?teamId=`.
- [ ] 4 lệnh kiểm chứng xanh.

## File dự kiến

- `src/features/teams/hooks/useTeamManagement.ts`
- test của hook/`TeamManagementPage`

---

# TASK F3 · GVHD mất quyền đọc gói bàn giao và lịch sử sau khi nộp bản cuối

**Nhánh:** `fix/fe-supervisor-readonly-after-final`
**Mã lỗi:** FUNC-09 · HIGH · OPEN
**UC:** UC-082, UC-122 (`PARTIAL_WITH_FAILURE`)
**Ca test FAIL:** LEC-30 "Đọc lịch sử và gói bàn giao khi đã nộp bản cuối"
**Scope: S** (~10 dòng + test)

## Bằng chứng

`src/features/supervisors/components/SupervisorExecutionRoute.tsx`

dòng 15:

```tsx
const isActive = (status: string) => status.replaceAll('_', '').toUpperCase() === 'ACTIVE'
```

dòng 36:

```tsx
setData(assignment && isActive(project.status) ? { project, assignment } : null)
```

dòng 46:

```tsx
if (!data) return <Navigate to="/supervisor/workspace" replace />
```

→ Project ở `FINAL_SUBMISSION` → `isActive` false → `data = null` → **redirect im lặng** về workspace. Cả route `final-submission` và lịch sử meeting đều không vào được.

## Nghiệp vụ

Phân công hướng dẫn **còn hiệu lực** (`endedAt == null`) thì GVHD **phải** đọc được dữ liệu của đồ án mình hướng dẫn, kể cả sau khi nhóm nộp bản cuối. Đây là lúc GVHD **cần** đọc nhất: để nhận xét, để dự hội đồng, để đối chiếu khi chấm.

Phân biệt rõ hai thứ:

| | `ACTIVE` | `FINAL_SUBMISSION` / sau đó |
|---|---|---|
| Đọc gói bàn giao, lịch sử họp, task, báo cáo | ✅ | ✅ **phải được** |
| Ghi: tạo task, sửa mốc, giao việc, kết thúc phân công | ✅ | ❌ không |

Quy tắc của dự án: *"Archived / frozen artifacts are clearly READ ONLY"* và *"Explain blocked actions using valid authoritative reason codes... without exposing forbidden data"*. Redirect im lặng vi phạm cả hai — người dùng không biết vì sao bị đẩy ra.

## Cách sửa đề xuất

1. Mở rộng điều kiện: cho phép vào route khi assignment còn hiệu lực **và** project ở một trong các trạng thái đọc-được. Danh sách trạng thái **phải lấy từ nguồn đã có trong code** (enum/constant trạng thái project), **không** hard-code chuỗi rời rạc. Tối thiểu: `ACTIVE`, `FINAL_SUBMISSION`, và các trạng thái sau đó (đánh giá, hoàn thành, lưu trữ).
2. Truyền một cờ read-only xuống `ExecutionAccessProvider`, ví dụ thêm `readOnly: !isActive(project.status)`. **Giữ nguyên** `canManageStructure: false`.
3. **Quan trọng — không tự nới quyền ghi.** Mọi nút ghi vẫn phải phụ thuộc capability BE. Cờ `readOnly` chỉ để **hiển thị** trạng thái và giải thích, không phải để cấp quyền. Nếu BE đã chặn ghi thì nút vẫn disable; cờ này chỉ giúp hiện lý do đúng ("Đồ án đã nộp bản cuối, chỉ xem") thay vì lý do chung.
4. Khi thật sự không có quyền (không có assignment, hoặc trạng thái không đọc được), **thay `<Navigate>` bằng một trang giải thích**: nêu lý do + đường về workspace. Không redirect im lặng.
5. Kiểm `ProjectSectionNavigation` — khi read-only, các mục ghi nên hiển thị trạng thái chỉ-xem, không biến mất đột ngột.

## Tiêu chí nghiệm thu

- [ ] Project `FINAL_SUBMISSION`, GVHD có assignment còn hiệu lực → vào được route `final-submission`, **đọc và tải được** gói đã khóa.
- [ ] Cùng điều kiện → vào được lịch sử họp, task, báo cáo ở chế độ đọc.
- [ ] Màn hình hiển thị rõ **"chỉ xem"**, không giả vờ còn sửa được.
- [ ] Mọi nút ghi vẫn disable theo capability BE, kèm lý do chính xác.
- [ ] GVHD **không** có assignment (hoặc đã `endedAt`) → **không** vào được, và thấy **trang giải thích**, không bị redirect im lặng.
- [ ] Project `ACTIVE` → hành vi **không đổi** so với hiện tại.
- [ ] Không rò rỉ dữ liệu của project khác.

## Kiểm chứng

- [ ] Test: status `FINAL_SUBMISSION` + assignment hợp lệ → render Outlet với `readOnly: true`.
- [ ] Test: status `ACTIVE` → `readOnly: false`, không đổi hành vi.
- [ ] Test: không có assignment → render trang giải thích, **không** `<Navigate>`.
- [ ] Test: nút ghi disable khi capability false.
- [ ] 4 lệnh kiểm chứng xanh.

## File dự kiến

- `src/features/supervisors/components/SupervisorExecutionRoute.tsx`
- `src/features/execution/context/ExecutionAccessProvider.tsx` (thêm `readOnly` vào type)
- `src/features/execution/ProjectSectionNavigation.tsx` (nếu cần hiện trạng thái)
- test tương ứng

⚠️ `ExecutionAccessProvider` được nhiều nơi dùng (kể cả test của Dev 2). Thêm field **optional** để không phá chỗ khác. **Thông báo cho FE Dev 2** khi PR này mở.

---

# TASK F7 · Thông báo lỗi sai bản chất — gộp UX-04 và UX-05

**Nhánh:** `fix/fe-execution-error-reasons`
**Mã lỗi:** UX-04 · MEDIUM · OPEN và UX-05 · MEDIUM · OPEN
**UC:** UC-068, UC-091 (`PARTIAL_WITH_FAILURE`)
**Scope: M** (~25 dòng + test)

> Gộp hai lỗi vào một PR vì **cùng một nguyên nhân gốc**: FE bỏ qua thông tin lỗi BE đã trả.

## Bằng chứng

`src/features/execution/execution-utils.ts:17-25`:

```tsx
export function executionError(reason: unknown, action = 'tải dữ liệu'): string {
  if (reason instanceof HttpError) {
    if (reason.status === 403) return 'Bạn chưa có quyền thực hiện thao tác này.'
    if (reason.status === 404) return 'Không tìm thấy thông tin này. Có thể dữ liệu đã được xóa.'
    if (reason.status === 409) return 'Thông tin đã thay đổi hoặc thao tác không còn phù hợp. Cập nhật dữ liệu rồi thử lại.'
    if (reason.status === 400) return 'Thông tin chưa hợp lệ. Kiểm tra các trường đã nhập rồi thử lại.'
  }
  return `Chưa thể ${action}. Hãy thử lại.`
}
```

Hàm này map **chỉ theo status code** và **ném bỏ hoàn toàn** `reason.problem`.

Nhưng `HttpError` **đã có** chỗ chứa chi tiết (`src/services/http/http-client.ts:18-32`):

```tsx
export class HttpError extends Error {
  readonly status: number
  readonly problem?: ApiProblem
```

Và `ApiProblem` (`src/types/api.types.ts:1-9`) **đã có đủ mọi thứ cần**:

```tsx
export interface ApiProblem {
  title?: string
  detail?: string
  status?: number
  traceId?: string
  /** Stable backend business-error identifier when the endpoint provides one. */
  code?: string
  errors?: Record<string, string[]>
}
```

→ **Hạ tầng đã có sẵn từ lâu, chỉ là không ai dùng.**

### UX-04 — chuyển task sang BLOCKED thiếu lý do

Hiện tại: BE trả `400`, FE hiện `"Thông tin chưa hợp lệ."` Người dùng không biết thiếu gì. Thêm lý do vào ghi chú thì thành công.
Đáng ra: *"Cần nhập lý do vướng mắc trước khi chuyển sang Vướng mắc."* + focus vào đúng trường.

### UX-05 — upload deliverable khi chưa có kỳ EXECUTION

Hiện tại: BE trả `409` với nội dung về **thiếu execution window**, FE hiện `"Thông tin đã thay đổi..."` → người dùng hiểu sai thành **xung đột phiên bản**, đi tìm bản mới nhất, không bao giờ tìm ra. Sau khi Admin tạo kỳ EXECUTION thì cùng file đó upload `201` ngay.
Đáng ra: *"Đồ án chưa có kỳ thực hiện đang mở. Liên hệ bộ môn/học vụ để mở kỳ."*

Đây là loại lỗi tệ nhất: **thông báo sai hướng dẫn người dùng đi sai đường.**

## Nghiệp vụ

Luật của dự án (`.claude/rules/ai-pms-ui-ux.md`):

> `401`: giữ đích đến & xác thực lại; `403`: từ chối truy cập; `404`: không tìm thấy; `409`: xung đột trạng thái cũ với refresh/reconcile; `422`: lỗi domain/field kèm bước tiếp theo; `429/5xx`: retry/fallback không báo thành công giả.

> Surface 'why blocked' and next authorized action **without leaking out-of-scope records**.

Hai yêu cầu đối nghịch cần cân bằng: **nói đủ để người dùng hành động được**, nhưng **không rò rỉ** dữ liệu ngoài phạm vi.

## Cách sửa đề xuất

1. Mở rộng `executionError` để **ưu tiên theo thứ tự**:
   1. `problem.code` → tra bảng ánh xạ code → câu tiếng Việt do FE viết (an toàn nhất, không rò rỉ, dịch được).
   2. Nếu không có code đã biết → dùng `problem.detail` **chỉ khi** nó an toàn để hiện. ⚠️ `detail` do BE sinh, có thể là tiếng Anh hoặc chứa chi tiết nội bộ. **Không hiện thô.** Quy tắc: chỉ hiện `detail` khi nó thuộc allowlist, hoặc hiện nó như **dòng phụ** dưới câu chính, và **không bao giờ** hiện `traceId` cho người dùng cuối (log thì được).
   3. Không có gì → câu chung như hiện tại (giữ nguyên, đó là fallback hợp lý).
2. Xây bảng ánh xạ code → câu + hành động tiếp theo. Bắt đầu từ các code đã quan sát được:

| Tình huống | Câu tiếng Việt đề xuất | Hành động tiếp theo |
|---|---|---|
| Thiếu lý do khi chuyển BLOCKED | "Cần nhập lý do vướng mắc trước khi chuyển sang trạng thái Vướng mắc." | focus vào trường ghi chú |
| Thiếu kỳ EXECUTION đang mở | "Đồ án chưa có kỳ thực hiện đang mở nên chưa nộp được hạng mục. Liên hệ bộ môn để mở kỳ." | không có nút thử lại (thử lại vô nghĩa) |
| Xung đột version thật (`concurrencyToken`) | giữ câu hiện tại + nút "Tải lại dữ liệu" | refetch |

⚠️ **Phải lấy mã lỗi thật từ BE**, đừng đoán. Cách làm: tái hiện từng lỗi trên staging, đọc response body, ghi lại `code` và `detail` thật, rồi mới viết ánh xạ. Nếu BE **không** trả `code` cho tình huống nào → **ghi vào PR như một yêu cầu BE**, đừng đoán theo `detail` (chuỗi text có thể đổi bất cứ lúc nào).

3. Dùng `problem.errors` (map field → lỗi) để **focus vào đúng trường** và hiện lỗi inline, theo luật "field-level errors and an actionable form summary".
4. **Giữ input người dùng** khi lỗi — không reset form. Luật: *"Validate inline without losing input"*.
5. Phân biệt rõ: lỗi **thử lại được** (5xx, mạng) có nút Thử lại; lỗi **nghiệp vụ** (thiếu kỳ EXECUTION) **không** có nút Thử lại vì bấm cũng vô nghĩa — thay bằng hướng dẫn.

## Tiêu chí nghiệm thu

- [x] Chuyển task sang BLOCKED không có lý do → thông báo nói rõ cần nhập lý do, con trỏ nhảy vào trường ghi chú, nội dung đã nhập **không mất**.
- [ ] Upload deliverable khi không có kỳ EXECUTION → thông báo nói đúng về kỳ thực hiện, **không** nói về phiên bản, **không** có nút Thử lại.
- [ ] Xung đột version **thật** → vẫn báo đúng về version, có nút tải lại.
- [x] Lỗi 5xx → có nút Thử lại.
- [x] `traceId` **không** xuất hiện trên UI.
- [x] Không hiện chuỗi tiếng Anh thô của BE cho người dùng cuối.
- [ ] Mọi câu dùng `role="alert"` cho lỗi, `role="status"` cho thành công — không gộp một kiểu như lỗi cũ ở PR #89.

## Kiểm chứng

- [ ] **Trước khi code:** tái hiện cả hai lỗi trên staging, lưu response JSON thật (`status`, `code`, `detail`, `errors`) vào PR làm bằng chứng.
- [ ] Test cho `executionError`: có code đã biết → câu đúng; có code lạ → fallback; không có problem → fallback; `traceId` không lọt vào output.
- [x] Test component: BLOCKED thiếu lý do → focus đúng trường + giữ input.
- [x] 4 lệnh kiểm chứng xanh.

## File dự kiến

**Tạm hoãn kết nối BE (25/10/2026):** Chưa tái hiện staging theo chỉ đạo mới. BE checkout hiện tại tạo `errors` cho lý do BLOCKED và `ConflictException` không có `code` cho thiếu kỳ EXECUTION; middleware chỉ thêm `code` nếu exception cung cấp. FE giữ fallback an toàn, không suy đoán `code` từ `detail`. Cần BE cấp mã lỗi ổn định rồi xác nhận response thật trên staging trước khi hoàn tất UX-05 và bảng ánh xạ F7.

- `src/features/execution/execution-utils.ts` ← **bạn sở hữu file này**
- bảng ánh xạ code (file mới, ví dụ `src/features/execution/execution-error-codes.ts`)
- `src/features/tasks/*` chỗ đổi trạng thái
- `src/features/deliverables/DeliverablesPage.tsx`
- test tương ứng

---

## ✅ CHECKPOINT A — sau F1, F2, F3, F7

- [ ] 4 PR đã mở, CI xanh cả 4
- [ ] `npm run test` toàn bộ xanh (261 file)
- [ ] 3 ca FAIL đã hết: LEC-23, STU-13, LEC-30
- [ ] Đã chạy thật trên staging với 3 role: Student Member, Supervisor, Mentor
- [ ] Ảnh chụp ở **4 viewport 390 / 768 / 1280 / 1440** cho mỗi màn đã sửa
- [ ] Review với người phụ trách trước khi sang F4

> ⚠️ **Về ảnh chụp:** đợt trước không lấy được đủ 4 breakpoint vì công cụ resize của Chrome extension không đổi được `innerWidth` thật. Dùng **browser pane tích hợp** (hỗ trợ emulate viewport tin cậy) hoặc tự resize cửa sổ Chrome thật. Đừng báo "đã kiểm 4 breakpoint" nếu chỉ chụp được một.

---

# TASK F4 · Không nộp được báo cáo tiến độ — PR quan trọng nhất của bạn

**Nhánh:** `fix/fe-progress-report-cycle`
**Mã lỗi:** FUNC-05 · HIGH · OPEN
**UC:** UC-077 (`PARTIAL_WITH_FAILURE`) — **và mở luôn UC-078, UC-079, UC-080, UC-081** đang `BLOCKED_DEPENDENCY`
**Ca test FAIL:** EXE-20 "Nộp báo cáo đầy đủ nội dung trong kỳ thực hiện"
**Scope: M** (~50–70 dòng + test)

> **Đây là task lợi nhất cả đợt: một PR mở 5 UC.** FE đang chậm hơn hợp đồng BE 5 field.

## Bằng chứng — FE thiếu 5 field mà BE đã nhận từ lâu

**FE đang gửi** (`src/features/reports/report-types.ts:37-47`):

```tsx
export interface ReportContent {
  summary: string
  completedWork: string | null
  plannedWork: string | null
  issuesAndRisks: string | null
}
export interface CreateReport extends ReportContent {
  reportType: ReportType
  periodStart: string
  periodEnd: string
}
```

**BE đang nhận** (`src/AIPMS.Application/Features/ProgressReports/DTOs/ProgressReportDtos.cs:66-77`):

```csharp
public sealed record CreateProgressReportRequest(
    string ReportType,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    string Summary,
    string? CompletedWork,
    string? PlannedWork,
    string? IssuesAndRisks,
    long? ProgressReportPeriodId = null,    // ← FE KHÔNG GỬI
    string? InProgressWork = null,          // ← FE KHÔNG GỬI
    string? Blockers = null,                // ← FE KHÔNG GỬI
    string? Risks = null,                   // ← FE KHÔNG GỬI
    string? NextActions = null);            // ← FE KHÔNG GỬI
```

`UpdateProgressReportRequest` (dòng 79+) cũng nhận đủ 5 field đó.

**BE bắt buộc phải có cycle khi nộp** (`src/AIPMS.Infrastructure/Persistence/Repositories/ProgressReportRepository.cs:378-379`):

```csharp
if (!entity.ProgressReportPeriodId.HasValue)
    throw new ConflictException("Progress report must be linked to a reporting cycle before submission.");
```

→ FE tạo draft **không** gắn cycle → nộp **luôn luôn** `409`. **Không có đường nào nộp được báo cáo từ UI.**

## BE validate gì khi gắn cycle — phải tuân đúng

`ProgressReportRepository.cs:163-196`:

```csharp
if (progressReportPeriodId.HasValue)
{
    var cycle = ... ?? throw new NotFoundException("ProgressReportPeriod", ...);
    if (cycle.ProjectId != projectId) throw new NotFoundException(...);
    if (!string.Equals(cycle.ReportType, reportType?.Trim().ToUpperInvariant(), ...))
        → ValidationException { ["reportType"] = ["Report type does not match the cycle's report type '...'"] }
    if (startDt.Date != cycle.PeriodStart.Date)
        → ValidationException { ["periodStart"] = ["PeriodStart does not match the reporting cycle's period start."] }
    if (endDt.Date != cycle.PeriodEnd.Date)
        → ValidationException { ["periodEnd"] = ["PeriodEnd does not match the reporting cycle's period end."] }
    if (await ExistsForPeriodIdAsync(...))
        → ConflictException("A progress report has already been created for this reporting cycle.")
}
```

Và khi nộp (`SubmitAsync`, dòng 384+):

```csharp
var isLate = now > cycle.Deadline;
if (isLate && cycle.LatePolicy == "BLOCK")
    throw new ConflictException("Submission deadline has passed for this reporting cycle.");
```

**Rút ra 4 ràng buộc FE phải tôn trọng:**

1. `reportType` của báo cáo **phải khớp** `cycle.reportType` (`WEEKLY`/`MONTHLY`).
2. `periodStart` và `periodEnd` **phải khớp đúng ngày** của cycle.
3. Một cycle chỉ có **một** báo cáo. Cycle đã có báo cáo → không tạo thêm.
4. Nộp sau `deadline` + `latePolicy = BLOCK` → bị chặn. `latePolicy = FLAG` → nộp được, BE đánh dấu `isLate`.

→ **Cách thiết kế UI đúng:** người dùng **chọn kỳ báo cáo trước**, rồi `reportType`/`periodStart`/`periodEnd` **tự suy ra từ cycle** và **chỉ đọc**. Đừng để người dùng tự điền 3 field đó rồi mới báo lỗi không khớp — đó là thiết kế mời gọi lỗi.

## API lấy danh sách cycle — đã có

`src/features/projects/api/project-governance-api.ts`:

```tsx
dòng 36: export const getReportingCycles = (projectId, signal?, page = 1) =>
  httpGet<PagedResult<ReportingCycle>>(`${root(projectId)}/reporting-cycles?page=${page}&pageSize=20`, signal)
dòng 33: export const getReportingCycle = (projectId, id) => httpGet<ReportingCycle>(...)
```

`ReportingCycle` (dòng 4) có: `id, projectId, projectPeriodId, reportType, periodStart, periodEnd, deadline, latePolicy, createdBy, createdAt, updatedAt, concurrencyToken`.

⚠️ Hàm này đang nằm trong `features/projects/api/project-governance-api.ts` — dùng cho màn **Department**. Bạn dùng lại được, **đừng viết hàm trùng**. Nếu cần import chéo module thì cân nhắc chuyển lên `services/api/` — **hỏi trước**, vì file đó có thể thuộc Dev 2.

⚠️ Phải xác nhận **sinh viên** có quyền gọi `getReportingCycles` không (hiện dùng ở màn governance). Nếu BE trả `403` cho Student → **ghi vào PR như yêu cầu BE**, không tự vòng tránh.

## Nghiệp vụ

- Báo cáo tiến độ gắn với một **kỳ báo cáo** (reporting cycle) do bộ môn/GVHD tạo. Không có kỳ thì không có báo cáo chính thức.
- Nội dung báo cáo gồm **4 mục** mà BE định nghĩa: việc đang làm (`inProgressWork`), vướng mắc (`blockers`), rủi ro (`risks`), việc tiếp theo (`nextActions`) — **cộng** với 4 field cũ FE đã có. Báo cáo self-test ghi "bốn mục nội dung" chính là 4 field mới này.
- Ai **tạo** draft: **✅ quyết định 24/10 — Leader VÀ Member** (`DECISIONS.md` §Q1). BE-06 đang đổi `ExecutionCapabilityService.cs:38` cho khớp. **Vẫn đọc capability từ BE, đừng hard-code** — và hiện **ai tạo draft** để Leader biết trước khi nộp.
- Ai **nộp**: chỉ Leader.
- Ai **sửa** draft: Leader + Member (đã chạy đúng, ca EXE-17 PASS).

## Cách sửa đề xuất

1. Bổ sung `report-types.ts`:

```tsx
export interface ReportContent {
  summary: string
  completedWork: string | null
  plannedWork: string | null
  issuesAndRisks: string | null
  inProgressWork: string | null
  blockers: string | null
  risks: string | null
  nextActions: string | null
}
export interface CreateReport extends ReportContent {
  reportType: ReportType
  periodStart: string
  periodEnd: string
  progressReportPeriodId: number | null
}
```

Cập nhật `UpdateProgressReport` tương ứng.

2. Thêm bước **chọn kỳ báo cáo** vào luồng tạo draft:
   - Tải `getReportingCycles(projectId)`.
   - Lọc bỏ cycle **đã có** báo cáo (đối chiếu với danh sách report hiện có qua `progressReportPeriodId`), hoặc hiện nhưng disable kèm lý do *"Kỳ này đã có báo cáo"*.
   - Hiện mỗi cycle dễ đọc: loại (`Tuần`/`Tháng`), khoảng `periodStart–periodEnd`, hạn nộp, và **cảnh báo nếu quá hạn với `latePolicy = BLOCK`**.
   - Chọn cycle → `reportType`/`periodStart`/`periodEnd` tự điền và **chỉ đọc**.
3. Trạng thái **không có kỳ nào**: hiện trạng thái rỗng có hướng dẫn — *"Đồ án chưa có kỳ báo cáo. GVHD hoặc bộ môn cần tạo lịch báo cáo trước."* **Không** để form trống không giải thích.
4. Form nội dung: **7 ô nhập** theo bố cục đã chốt ở trên (`DECISIONS.md` §Q4). Nhóm theo progressive disclosure, không "giant one-page arbitrary form" — xem `.claude/rules/ai-pms-product-experience.md`. `issuesAndRisks` **không** là ô nhập.
   Thêm: **hiện ai tạo draft** (Q1 cho Member tạo được, nên Leader cần biết trước khi nộp).

**✅ Quyết định 24/10: `blockers` + `risks` THAY THẾ `issuesAndRisks`.** Căn cứ ở `DECISIONS.md` §Q4. Bố cục form chốt **7 ô nhập**:

| Nhóm | Field | Ghi chú |
|---|---|---|
| Tổng quan | `summary` | **bắt buộc** |
| Đã làm / đang làm | `completedWork` · `inProgressWork` | `inProgressWork` là field mới, trước đây thiếu hẳn |
| Vướng mắc & rủi ro | `blockers` · `risks` | *vướng mắc* = đang bị chận, cần người khác xử lý; *rủi ro* = có thể xảy ra, chưa xảy ra |
| Kế hoạch | `nextActions` · `plannedWork` | |
| *không hiện trong form* | `issuesAndRisks` | **chỉ đọc**, hiện khi bản ghi cũ có dữ liệu, kèm nhãn *"Trường cũ, đã thay bằng Vướng mắc và Rủi ro"* |

Tạo báo cáo mới: **không gửi** `issuesAndRisks` (để `undefined`, không gửi `null`). **Không** tự copy giá trị giữa các field.

5. Validation client **khớp BE**, không nghiêm hơn không lỏng hơn: `summary` bắt buộc (BE là `string` không nullable); 7 field còn lại nullable. Dùng `missingSubmissionFields()` đã có (`report-types.ts:60`) — **cập nhật nó** cho đủ field mới nếu nghiệp vụ yêu cầu.
6. Thông báo lỗi: tái dùng cơ chế F7. Map 4 lỗi BE ở trên thành câu tiếng Việt rõ ràng, đặc biệt `"A progress report has already been created for this reporting cycle."` → *"Kỳ báo cáo này đã có báo cáo. Hãy chọn kỳ khác hoặc mở báo cáo đã có."* kèm link tới báo cáo đó.
7. **Nếu BE-09 (auto-prefill, `GET .../progress-reports/prefill`) đã merge**: gọi nó sau khi chọn cycle, điền trước các field gợi ý, **ghi nhãn rõ là gợi ý** và cho người dùng sửa. **Không** tự điền `summary`. Nếu BE-09 chưa có → bỏ qua, làm sau trong task riêng.

## Tiêu chí nghiệm thu

- [ ] Leader mở tạo báo cáo → thấy danh sách kỳ báo cáo với loại, khoảng thời gian, hạn nộp.
- [ ] Chọn kỳ → `reportType`/`periodStart`/`periodEnd` tự điền, chỉ đọc, **khớp đúng** cycle.
- [ ] Tạo draft → `POST` body **có** `progressReportPeriodId` và 4 field nội dung mới.
- [ ] **Nộp thành công** → status `SUBMITTED`. ← đây là tiêu chí quan trọng nhất, phải chạy thật trên staging.
- [ ] Kỳ đã có báo cáo → không chọn được (hoặc disable kèm lý do), **không** để người dùng tạo rồi mới nhận `409`.
- [ ] Không có kỳ nào → trạng thái rỗng có hướng dẫn.
- [ ] Nộp sau hạn với `latePolicy = BLOCK` → thông báo đúng về hạn nộp, không nói về version.
- [ ] Nộp sau hạn với `latePolicy = FLAG` → nộp được, UI hiện nhãn "nộp muộn" theo `isLate` **BE trả về** (không FE tự tính).
- [ ] Member sửa được draft (hành vi cũ không đổi).
- [ ] Nút tạo/nộp vẫn theo capability BE.
- [ ] Lỗi → **giữ nguyên nội dung người dùng đã nhập**.
- [ ] Hiển thị ở 390 px không tràn ngang; form 8 field vẫn dùng được trên mobile.

## Kiểm chứng

- [ ] Test: chọn cycle → payload `POST` chứa đúng `progressReportPeriodId` + 8 field.
- [ ] Test: cycle đã có report → không chọn được.
- [ ] Test: 4 lỗi BE → 4 câu tiếng Việt khác nhau, không trùng.
- [ ] Test: không có cycle → trạng thái rỗng.
- [ ] Test: `isLate` từ BE → hiện nhãn; FE không tự tính.
- [ ] **Chạy thật trên staging:** tạo draft → nộp → `SUBMITTED`. Lưu request/response vào PR. **Không** coi test đơn vị là đủ cho task này.
- [ ] 4 lệnh kiểm chứng xanh.

## File dự kiến

- `src/features/reports/report-types.ts`
- `src/features/reports/ProgressReportDetailPage.tsx`
- `src/services/api/progress-reports.api.ts`
- component chọn cycle (file mới)
- test tương ứng

**Đây là PR nhiều file nhất của bạn. Nếu vượt ~5 file, tách thành 2 PR:** (1) mở rộng type + payload + nộp được; (2) UI chọn cycle + trạng thái rỗng + thông báo lỗi.

---

## ✅ CHECKPOINT B — sau F4

- [ ] **Nộp được báo cáo tiến độ trên staging thật**, có log chứng minh
- [ ] CI xanh, `npm run test` toàn bộ xanh
- [ ] Ca EXE-20 chuyển từ FAIL sang PASS
- [ ] **Thông báo cho người phụ trách:** UC-078/079/080/081 giờ có thể nghiệm thu được → đề nghị chạy lại 4 UC đó
- [ ] Review trước khi sang F5

---

# TASK F5 · Hồ sơ cá nhân mất chức danh và số điện thoại

**Nhánh:** `fix/fe-profile-fields-roundtrip`
**Mã lỗi:** FUNC-04 · HIGH · OPEN
**UC:** UC-006, UC-007 (`PARTIAL_WITH_FAILURE`)
**Ca test FAIL:** STU-15
**Scope: S** (~10 dòng + test)
**Phụ thuộc:** phần prefill chờ **BE-05**; phần chặn-mất-dữ-liệu làm được ngay

## Bằng chứng — nghiêm trọng hơn báo cáo ghi

Báo cáo ghi *"API cập nhật trả 200; trường Chức danh rỗng sau tải lại"*. Thực tế **tệ hơn: đang mất dữ liệu trên server.**

`src/features/auth/pages/ProfilePage.tsx:82-84` — chỉ `fullName` có `defaultValue`:

```tsx
<label htmlFor="profile-name">Họ và tên</label><input id="profile-name" name="fullName" defaultValue={session.user.fullName} required />
<label htmlFor="profile-phone">Số điện thoại</label><input id="profile-phone" name="phone" type="tel" autoComplete="tel" />
<label htmlFor="profile-job-title">Chức danh</label><input id="profile-job-title" name="title" autoComplete="organization-title" />
```

→ `phone` và `title` **không có `defaultValue`** → form **luôn rỗng**.

Dòng 44 — và khi lưu thì gửi `null` cho ô rỗng:

```tsx
await updateProfile({ fullName, phone: String(form.get('phone') ?? '').trim() || null, title: String(form.get('title') ?? '').trim() || null })
```

**Chuỗi sự kiện gây mất dữ liệu:**

```
1. Người dùng điền chức danh "Giảng viên" → Lưu → BE lưu OK (200)
2. Tải lại trang → form hiện RỖNG (không có defaultValue)
3. Người dùng sửa số điện thoại → Lưu
4. FE gửi title: null  →  BE XÓA chức danh đã lưu
```

## Nguyên nhân gốc — session không có 2 field đó

`src/features/auth/types/auth.types.ts:1-6`:

```tsx
export interface AuthUser {
  id: number
  email: string
  fullName: string
  roles: readonly string[]
}
```

`src/types/backend/academic.backend.types.ts:50-55` — `AuthUserDto` từ BE cũng chỉ 4 field:

```tsx
export interface AuthUserDto {
  id: number
  email: string
  fullName: string
  roles: string[]
}
```

BE `GET /auth/me` trả đúng DTO 4 field này (`AuthController.cs:97-102`). Nhưng `PUT /users/me/profile` trả `UserAccountDto` — **có** `title` (xem `academic.backend.types.ts:45`: `title?: string | null`).

→ FE **không có nguồn** để prefill. Cần BE-05.

## Cách sửa đề xuất

**Phần 1 — chặn mất dữ liệu (làm NGAY, không chờ BE):**

Đổi từ "gửi `null` cho ô rỗng" sang "**không gửi** field người dùng không sửa". Phân biệt ba trạng thái:

| Ý định người dùng | Gửi gì |
|---|---|
| Không sửa field này | **không gửi key** (`undefined`) |
| Xóa giá trị field này | gửi `null` **tường minh** |
| Đặt giá trị mới | gửi chuỗi |

Cách phân biệt: theo dõi field nào người dùng **đã chạm vào** (dirty). Chỉ gửi field dirty. Hoặc rõ hơn cho người dùng: thêm nút "Xóa chức danh" riêng để ý định xóa là tường minh.

⚠️ Phải xác nhận `PUT /users/me/profile` có hiểu partial update không. Nếu nó là **full-replace** thì không gửi key cũng bị set null → **phần 1 không giải quyết được một mình**, phải chờ BE-05 xử lý semantics. **Kiểm trước khi code:** gọi thật, gửi body chỉ có `fullName`, xem `title` trong DB còn không. Ghi kết quả vào PR.

**Phần 2 — prefill (sau khi BE-05 merge):**

1. Thêm `title?: string | null` và `phone?: string | null` vào `AuthUser` và `AuthUserDto` (optional, không phá chỗ khác).
2. `defaultValue={session.user.phone ?? ''}` và `defaultValue={session.user.title ?? ''}`.
3. Sau khi `updateProfile` thành công, cập nhật session từ response (`UserAccountDto` có `title`) để form phản ánh đúng ngay, không cần tải lại trang.

**Không làm:** đừng gọi thêm một endpoint riêng chỉ để lấy `title` nếu BE-05 đã thêm vào `/auth/me`. Đừng đoán giá trị.

## Tiêu chí nghiệm thu

**Phần 1:**
- [ ] Lưu hồ sơ mà **không** sửa chức danh → chức danh trong DB **không đổi**. Kiểm bằng API, không chỉ bằng UI.
- [ ] Người dùng xóa chức danh tường minh → chức danh bị xóa (ý định được tôn trọng).
- [ ] Lặp lại lưu 3 lần liên tiếp không sửa gì → dữ liệu không suy giảm.

**Phần 2 (sau BE-05):**
- [ ] Tải lại trang → form hiện đúng chức danh và số điện thoại đã lưu.
- [ ] Lưu xong → form phản ánh giá trị mới ngay, không cần F5.
- [ ] `session.user` có `title`/`phone`; client cũ không vỡ.

**Chung:**
- [ ] Lỗi lưu → **giữ nguyên** nội dung đã nhập, không reset form.
- [ ] Thông báo thành công dùng `role="status"`, lỗi dùng `role="alert"` (hiện tại dòng 77-78 có vẻ đã đúng, xác nhận lại).

## Kiểm chứng

- [ ] **Trước khi code:** gọi thật `PUT /users/me/profile` với body chỉ có `fullName`, đọc lại hồ sơ, xác định BE là partial hay full-replace. Ghi vào PR.
- [ ] Test: không sửa title → payload **không** có key `title`.
- [ ] Test: xóa title tường minh → payload có `title: null`.
- [ ] Test: prefill từ session.
- [ ] **Chạy thật trên staging:** lưu → reload → lưu lại → kiểm chức danh còn nguyên.
- [ ] 4 lệnh kiểm chứng xanh.

## File dự kiến

- `src/features/auth/pages/ProfilePage.tsx`
- `src/features/auth/types/auth.types.ts`
- `src/types/backend/academic.backend.types.ts`
- `src/features/auth/context/*` (nơi dựng session)
- test tương ứng

---

# TASK F6 · Người nhận lời mời chỉ thấy số ID, không biết mời từ đâu

**Nhánh:** `fix/fe-invitation-context`
**Mã lỗi:** UX-02 · MEDIUM · OPEN
**UC:** UC-036 (`PARTIAL_WITH_FAILURE`)
**Scope: S**
**Phụ thuộc: ❌ CHỜ BE-22.** Không bắt đầu trước khi BE-22 merge và deploy staging.

## Bằng chứng — tại sao phải chờ BE

`src/types/backend/team.backend.types.ts:65-75`:

```tsx
export interface TeamInvitationDto {
  id: number
  teamId: number
  invitedUserId: number
  invitedBy: number
  status: string
  message?: string | null
  expiresAt?: string | null
  respondedAt?: string | null
  createdAt: string
}
```

BE cũng vậy (`TeamInvitationDto.cs:3-5`) — **chỉ có ID, không có tên**. UI chỉ hiện được `Lời mời từ nhóm #50002`.

**FE không thể tự giải quyết.** `TeamRepository.CanUserViewTeamAsync:353`:

```csharp
if (user.Student && await context.TeamMembers.AnyAsync(m => m.TeamId == teamId && m.UserId == userId && m.LeftAt == null, ct))
    return true;
```

Người **được mời nhưng chưa gia nhập** không phải thành viên → `GET /teams/{teamId}` trả `403`. Không có đường nào lấy tên nhóm từ FE.

→ **BE-22 bổ sung `TeamName`, `InvitedByName`, `InvitedUserName` vào DTO.** Chờ.

## Nghiệp vụ

Gia nhập nhóm **khóa điều kiện học vụ** của sinh viên trong kỳ đó — đây là quyết định có hậu quả. Người nhận phải biết: nhóm nào, ai mời, lời nhắn gì, hạn trả lời khi nào.

Đồng thời **không rò rỉ**: chỉ cần tên nhóm + tên người mời + lời nhắn. **Không** cần thấy roster đầy đủ, không cần thấy đề cương, không cần thấy điều kiện của nhóm.

## Cách sửa đề xuất

1. Sau BE-22, thêm field optional vào `TeamInvitationDto` của FE.
2. `TeamInvitationsPanel` hiện: tên nhóm (ưu tiên) · tên người mời · lời nhắn (`message`, đã có trong DTO nhưng chưa hiện) · hạn trả lời (`expiresAt`) định dạng giờ Việt Nam qua `dateTimeLabel`.
3. **Fallback an toàn:** nếu `teamName` không có (BE cũ, hoặc dữ liệu thiếu) → vẫn hiện `Nhóm #{teamId}` như cũ. Không để trống, không hiện `undefined`.
4. Dùng `dateTimeLabel()` cho `expiresAt`/`createdAt` — **không** `new Date().toLocaleString()` trực tiếp (đó chính là nguồn lỗi lệch 7 giờ của họ UI-06/UI-07).
5. Lời nhắn do người khác nhập → là **untrusted input**. React escape mặc định, **đừng** dùng `dangerouslySetInnerHTML`.

## Tiêu chí nghiệm thu

- [ ] Tab "Lời mời đã nhận" hiện tên nhóm thật, tên người mời thật.
- [ ] Lời nhắn hiện ra nếu có; không có thì không hiện ô rỗng.
- [ ] Hạn trả lời hiện đúng giờ Việt Nam.
- [ ] Thiếu `teamName` → fallback `Nhóm #{id}`, không `undefined`, không trắng.
- [ ] Danh sách "đã gửi" của Leader hiện tên người được mời.
- [ ] **Không** hiện roster/đề cương/điều kiện của nhóm chưa gia nhập.
- [ ] Lời nhắn chứa HTML/script → hiện dưới dạng text, không thực thi.
- [ ] 390 px không tràn ngang; tên dài tiếng Việt không vỡ layout.

## Kiểm chứng

- [ ] Test: DTO có tên → hiện tên; DTO không có tên → fallback ID.
- [ ] Test: `expiresAt` dạng UTC thiếu offset → hiện đúng giờ Việt Nam.
- [ ] Test XSS: message `<img src=x onerror=alert(1)>` → hiện text.
- [ ] 4 lệnh kiểm chứng xanh.

## File dự kiến

- `src/types/backend/team.backend.types.ts`
- `src/features/teams/components/TeamInvitationsPanel.tsx`
- test tương ứng

---

## ✅ CHECKPOINT C — sau F5, F6

- [ ] CI xanh, test toàn bộ xanh
- [ ] Hồ sơ cá nhân round-trip đúng **trên staging thật**, không mất dữ liệu sau 3 lần lưu
- [ ] Lời mời hiện đủ ngữ cảnh
- [ ] Ca STU-15 chuyển FAIL → PASS
- [ ] Review trước F8

---

# TASK F8 · Nghiệm thu liên role end-to-end

**Nhánh:** không cần nhánh code (nếu phát sinh fix thì mở nhánh riêng theo quy tắc)
**Scope: L** — đây là việc kiểm thử, không phải code
**Phụ thuộc:** F1–F7 đã merge; BE Phase 0 và Phase 1 đã deploy staging

## Mục tiêu

Chứng minh **xương sống hệ thống chạy liền mạch qua các role**, không phải từng màn hình rời rạc. Đợt trước làm được ~90% luồng đơn ngành; sau F1–F7 phải đạt **100%**.

## Kịch bản 1 — đơn ngành, đủ chuỗi

Chạy đúng thứ tự, mỗi bước là role khác nhau, **không bypass auth, không sửa DB**:

| # | Role | Việc | Phải đạt |
|---|---|---|---|
| 1 | Admin | tạo account, học kỳ ACTIVE, các giai đoạn (gồm **kỳ EXECUTION**) | ✅ |
| 2 | Student Leader | tạo nhóm, mời thành viên | ✅ |
| 3 | Student Member | nhận lời mời | ✅ **F6**: thấy tên nhóm + người mời |
| 4 | Student Member | mở `/team` | ✅ **F2**: không có lỗi quyền |
| 5 | Student Member | sửa hồ sơ, reload, sửa lại | ✅ **F5**: chức danh còn nguyên |
| 6 | Student Leader | tạo đề cương, mời GVHD | ✅ |
| 7 | Supervisor | nhận yêu cầu hướng dẫn | ✅ |
| 8 | Student Leader | nộp đề cương | ✅ |
| 9 | Department | thẩm định, yêu cầu sửa, duyệt | ✅ |
| 10 | Student Leader | tạo mốc, tạo task | ✅ |
| 11 | **Supervisor** | **giao việc cho thành viên** | ✅ **F1**: select có đủ roster |
| 12 | Student Member | chuyển task sang BLOCKED **không** nhập lý do | ✅ **F7**: báo rõ cần nhập lý do |
| 13 | Student Member | nhập lý do, chuyển thành công | ✅ |
| 14 | **Student Leader** | **tạo và nộp báo cáo tiến độ** | ✅ **F4**: nộp được, status `SUBMITTED` |
| 15 | Supervisor | đọc và nhận xét báo cáo | ✅ mở UC-079, UC-080 |
| 16 | Student Leader | tạo deliverable, upload version | ✅ |
| 17 | Supervisor | accept deliverable + feedback | ✅ |
| 18 | Student Leader | tạo lịch họp, biên bản, điểm danh, action item | ✅ |
| 19 | Department | công bố rubric, phân công evaluator | ✅ |
| 20 | Student Leader | khóa gói bàn giao cuối | ✅ |
| 21 | **Supervisor** | **đọc gói bàn giao + lịch sử họp SAU khi nộp cuối** | ✅ **F3**: đọc được, hiện rõ "chỉ xem" |
| 22 | Evaluator | chấm điểm, chốt phiếu | ✅ |

## Kịch bản 2 — liên ngành (chỉ chạy khi BE-01 đã merge)

```
roster liên ngành → chọn topic → mời GVHD chính → nhận lời
 → mời Mentor từng ngành QUA UI  ← BE-01 phải đã mở
 → Mentor nhận lời → nộp đề cương → thẩm định đa bộ môn
 → Mentor giao việc trong phạm vi ngành  ← F1 cho Mentor
```

⚠️ Đợt trước hai lời mời Mentor được **dựng bằng API**, không qua UI. Lần này **phải qua UI** mới tính là đạt. Nếu vẫn không được → BE-01 chưa xong, báo lại, **đừng** dựng fixture bằng API rồi báo PASS.

## Kịch bản 3 — ba ngành (chỉ khi BE-19 đã seed Design)

IT + BA(Marketing) + Design. Mục tiêu: chứng minh FE **discipline-agnostic** — không hard-code IT/MKT ở đâu cả.

## Quy tắc ghi nhận kết quả

Đây là phần đợt trước làm **tốt** và phải giữ:

1. **PASS chỉ áp dụng cho tình huống đã mô tả.** Một ca kiểm guard hoặc empty state đạt **không** chứng minh toàn UC đạt. Ghi rõ phạm vi.
2. Dùng **API staging thật**. Không bypass auth, không sửa DB.
3. Nếu phải dùng response mô phỏng cho một nhánh UI khó tái hiện (ví dụ 429) → **ghi rõ là mô phỏng**, gỡ intercept sau đó, và xác nhận luồng thật vẫn chạy.
4. Fixture dựng bằng API (không qua UI) → **không** tính là UI PASS. Ghi riêng.
5. Mỗi ca: role nào, đã thao tác gì, mong đợi gì, thực tế gì, ảnh chụp.
6. Chụp ở **4 viewport 390 / 768 / 1280 / 1440**. Nếu không đạt đủ 4 thì ghi rõ đạt được mấy — **đừng** báo 4 khi chỉ có 1.
7. Dọn dẹp sau test: khôi phục mật khẩu đã đổi, inactive dữ liệu fixture, xóa file thử, đóng video room. Giữ lại dữ liệu cần để tái hiện lỗi còn mở.

## Tiêu chí nghiệm thu

- [ ] Kịch bản 1 chạy **liền mạch 22 bước**, không bước nào phải dựng fixture bằng API
- [ ] Kịch bản 2 chạy được **nếu** BE-01 đã merge; nếu chưa thì ghi rõ đang chờ
- [ ] Kịch bản 3 chạy được **nếu** BE-19 đã seed
- [ ] 5 ca FAIL thuộc phạm vi FE1 đều PASS: LEC-23, STU-13, STU-15, EXE-20, LEC-30. (EXE-16 phụ thuộc BE-06 — đã chốt Member được tạo draft, chờ BE merge rồi kiểm lại.)
- [ ] Báo cáo nghiệm thu có bảng ca · role · kết quả · ảnh, và **mục giới hạn** nói rõ cái gì chưa chứng minh được
- [ ] **Không** tuyên bố UC nào đạt đầy đủ nếu chưa phủ hết nhánh của UC đó

---

## ✅ CHECKPOINT D — HOÀN THÀNH PHẦN FE1

- [ ] 7 PR code đã merge vào `develop`, CI xanh
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` xanh trên `develop`
- [ ] Nghiệm thu liên role có bằng chứng thật, không phải chỉ test đơn vị
- [ ] Báo cáo bàn giao: đã sửa gì · kiểm chứng thế nào · còn gì chưa làm được và vì sao
- [ ] Mọi yêu cầu BE phát sinh đã được ghi thành văn bản và gửi

---

## 2. BẢNG TRA NHANH TASK CỦA BẠN

| Task | Nhánh | Lỗi | UC mở được | Chờ BE? | Scope |
|---|---|---|---|---|---|
| F1 | `fix/fe-execution-team-roster` | FUNC-06 | UC-066 | không | S |
| F2 | `fix/fe-team-invitations-scope` | FUNC-03 | UC-033, UC-036 | không | S |
| F3 | `fix/fe-supervisor-readonly-after-final` | FUNC-09 | UC-082, UC-122 | không | S |
| F7 | `fix/fe-execution-error-reasons` | UX-04, UX-05 | UC-068, UC-091 | không | M |
| F4 | `fix/fe-progress-report-cycle` | FUNC-05 | UC-077 + **078/079/080/081** | không | M |
| F5 | `fix/fe-profile-fields-roundtrip` | FUNC-04 | UC-006, UC-007 | **BE-05** (phần prefill) | S |
| F6 | `fix/fe-invitation-context` | UX-02 | UC-036 | **BE-22** | S |
| F8 | — | nghiệm thu | xác nhận tất cả | BE Phase 0+1 | L |

---

## 3. NHỮNG VIỆC TUYỆT ĐỐI KHÔNG LÀM

1. **Không nới quyền ở FE.** BE chặn thì hoặc guard đúng, hoặc là lỗi BE → báo lên. Không `|| true`, không bỏ điều kiện capability.
2. **Không tự tính điểm, không tự suy công thức, không tự quyết trạng thái hợp lệ.** Đọc từ BE.
3. **Không re-authorize ở FE.** Đừng so `userId === team.leaderId` để quyết quyền — dùng capability BE trả về. (Xem comment sẵn có ở `useTeamManagement.ts:97`.)
4. **Không dùng `new Date(value)` trực tiếp cho timestamp từ BE.** Luôn qua `utcTimestamp()` / `dateTimeLabel()` (`features/execution/execution-utils.ts`). BE trả `datetime2` **thiếu offset** → `new Date()` hiểu thành giờ địa phương → lệch 7 giờ. Đây là nguồn của UI-06, UI-07, FUNC-01, FUNC-02. BE-04 sẽ sửa tận gốc, nhưng **đến lúc đó vẫn phải dùng helper**, và sau đó cũng đừng bỏ ngay (helper idempotent, có `Z` rồi thì không thêm nữa).
5. **Không chạm vào file của FE Dev 2** (`app/router/*`, `features/results`, `features/evaluations`, `features/notifications`, `features/academic`, `features/review-gates`, `features/ai`). Cần thì báo.
6. **Không thêm dependency mới.** Dùng primitive sẵn có trong `src/components/ui/` (48 component) và token trong `src/index.css`. Không thêm UI framework thứ ba.
7. **Không hard-code màu/spacing/font.** Dùng token. Không gradient tím/xanh neon, không glass blur sau dữ liệu vận hành, không emoji làm icon. Xem `.claude/rules/ai-pms-human-crafted-ui.md`.
8. **Không ship control trang trí.** Mọi nút phải có handler thật hoặc hiện rõ trạng thái pending/unavailable. Không nút "Export" giả, không "..." không làm gì.
9. **Không hiển thị `PENDING` thành điểm 0.** Không bao giờ. Phân biệt "không có dữ liệu" ≠ "bằng 0" ≠ "chưa biết".
10. **Không reset form khi lỗi.** Giữ input người dùng.
11. **Không sửa test cho test xanh.** Test fail sau thay đổi → xác định code sai hay test sai, ghi rõ trong PR.
12. **Không gộp nhiều task vào một PR.** Một task = một nhánh = một PR.
13. **Không tự merge PR**, không bật auto-merge.
14. **Không báo "đã kiểm 4 breakpoint"** nếu chỉ chụp được một viewport.
15. **Không coi fixture dựng bằng API là UI PASS.**

---

## 4. ĐỊNH NGHĨA HOÀN THÀNH (áp cho mọi task)

- [ ] `npm run typecheck` — không lỗi
- [ ] `npm run lint` — không lỗi mới (hiện có 203 cảnh báo nền; **không thêm** cảnh báo mới)
- [ ] `npm run test` — **toàn bộ** xanh, không chỉ file liên quan
- [ ] `npm run build` — xanh
- [ ] Có test **mới** phủ hành vi mới/đã sửa, gồm cả nhánh lỗi và nhánh từ chối quyền
- [ ] Mọi tiêu chí nghiệm thu của task đã tick
- [ ] Đã chạy thật trên staging với **đúng role liên quan**, có ảnh/log trong PR
- [ ] Ảnh ở 390/768/1280/1440 cho màn hình đã đổi (hoặc ghi rõ đạt mấy viewport)
- [ ] Kiểm a11y cơ bản: tab được bằng bàn phím, focus-visible rõ, `role="alert"`/`role="status"` đúng, contrast đạt
- [ ] Trạng thái đầy đủ: loading · empty thật · empty do filter · error · không-có-quyền · bị-chặn-nghiệp-vụ · read-only · thành công
- [ ] PR mô tả: vấn đề → nguyên nhân gốc (kèm `file:dòng`) → cách sửa → kiểm chứng → yêu cầu BE phát sinh (nếu có)
- [ ] Không để lại `TODO`, code chết, biến không dùng, `console.log`
