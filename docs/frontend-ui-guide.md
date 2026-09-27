# AI-PMS — Hướng dẫn đồng bộ giao diện frontend

**Cập nhật:** 26/09/2026 · **Hướng thiết kế:** phương án C · **Nhánh triển khai nền tảng:** `feat/ui-c-workspace`.

Tài liệu này dành cho member làm các chức năng khác của AI-PMS. Mục tiêu là các trang dùng chung ngôn ngữ thiết kế, cách diễn đạt và hành vi, đồng thời giữ đúng nghiệp vụ và quyền do backend cung cấp. Không cần sao chép nguyên bố cục của một trang sang mọi chức năng.

Trước khi bắt đầu, kiểm tra checkout đã có các component chung bên dưới. Nếu chưa có, đồng bộ phần nền tảng từ nhánh đã tích hợp giao diện C trước khi sử dụng các import. File hướng dẫn không tự cung cấp các component đó.

## 1. Quy tắc bắt buộc

| Tránh | Cách làm thống nhất |
| --- | --- |
| Gradient, kể cả shimmer loading | Nền màu phẳng, skeleton trung tính |
| Glassmorphism, `backdrop-blur` | Popup nền trắng, backdrop màu tối trong suốt, không blur |
| Card lồng card | Một panel cho một nhóm nội dung; chia bên trong bằng hàng, khoảng cách hoặc đường phân cách |
| Shadow trên mọi khối | Panel và popup không có bóng đổ trang trí; phân cấp bằng viền và chữ |
| Bo góc lớn tùy hứng | Mặc định **6px** cho panel, nút và input; avatar tròn và drawer sát mép màn hình là ngoại lệ hợp lý |
| Nhiều màu nhấn hoặc nút quá đậm | Xanh trầm cho hành động chính; trắng/viền nhẹ cho hành động phụ |
| Dashboard toàn ô thống kê/card | Nội dung và thao tác cần thiết là trọng tâm; chỉ có thống kê khi giúp người dùng quyết định |
| Nút giả, “Sắp có”, tìm kiếm/thông báo chưa hoạt động | Chỉ đưa chức năng sử dụng được vào giao diện |
| Chữ và icon lệch nhau | `inline-flex`, căn giữa, khoảng cách 6–8px; icon không bị co |
| Chỉ làm đẹp trạng thái có dữ liệu | Thiết kế cả tải, lỗi, trống, thiếu quyền và đang lưu |

Một panel chứa bảng hoặc danh sách không phải card lồng card. Vấn đề là mỗi dòng/nhóm con lại có nền, viền, radius và shadow riêng không cần thiết. Badge trạng thái và input vẫn được dùng để thể hiện chức năng.

## 2. Màu, chữ và khoảng cách

### Màu dùng trong giao diện C

| Vai trò | Giá trị tham chiếu | Nguồn dùng lại |
| --- | --- | --- |
| Nền trang | `#F7F8F9` | `.collaboration-shell` |
| Nền panel | `#FFFFFF` | `.ex-panel` |
| Chữ chính | `#202A38` | `--cw-ink` |
| Chữ phụ | `#647080` | `--cw-muted` |
| Viền nhẹ | `#E1E5E9` | `--cw-line` |
| Xanh nhấn | `#235B48` | `--cw-accent` |
| Xanh nền nhẹ | `#EDF4F0` | `--cw-accent-soft` |
| Cảnh báo | Chữ `#886221`, nền `#FBF4E5` | Badge chờ kiểm tra/vướng mắc trong `execution.css` |
| Thao tác nguy hiểm | Chữ `#9B3E34`, viền `#E5CBC6` | `.ex-button-danger` |

Các biến `--cw-*` được khai báo trên `.collaboration-shell`, không phải biến toàn cục ngoài layout này. Trang xác thực/public cần dùng style phù hợp với phạm vi của mình.

**Lưu ý CSS cũ:** `src/index.css` vẫn có một số token và helper xanh dương để tương thích các trang chưa chuyển đổi. Không dùng `bg-blue-600`, helper cũ hoặc màu `primary` ngoài shell làm chuẩn cho tính năng mới. Ưu tiên component và class chung; Button/Modal hiện có một vài giá trị xanh gần nhau, không cần tạo thêm bảng màu riêng để bắt chước chúng.

### Chữ

- Dùng font sẵn có: **Geist** cho nội dung giao diện; không thêm font mới theo từng feature.
- Tiêu đề trang khoảng 26–32px, weight 600–650; tiêu đề khối khoảng 14–16px.
- Nội dung chính khoảng 13–14px, line-height 1.5–1.6; thông tin phụ khoảng 11–12px khi vẫn dễ đọc.
- Không thu nhỏ toàn bộ bảng/nội dung để ép vừa màn hình.
- Viết tiêu đề theo kiểu câu: “Báo cáo tiến độ”, “Thành viên nhóm”. Không viết hoa mỗi từ hoặc dùng chữ hoa toàn bộ cho mọi khối.
- Font mono dành cho mã/mốc thời gian khi cần; không dùng cho cả nội dung tiếng Việt.
- Tên dài phải xuống dòng hoặc rút gọn có cách xem đầy đủ. Không làm mất nội dung quan trọng chỉ để các hàng bằng nhau.

### Khoảng cách và kích thước

- Dùng hệ nền **4px**: 4, 8, 12, 16, 20, 24, 32. Có thể tinh chỉnh theo nội dung, không áp cứng nhắc.
- Khoảng giữa các khối chính thường 24px; padding panel 20px desktop, 16px mobile.
- Layout hiện có xử lý padding ngoài: 32px desktop rộng, 24px ở màn hình vừa, `20px 16px` trên mobile. Không cộng thêm một lớp padding lớn cho toàn bộ trang.
- Nội dung trang tối đa khoảng 1360px. Chi tiết có thể có cột phụ khoảng 304px; mobile chuyển thành một cột.
- Nút chính trong cụm execution cao tối thiểu 40px; Button chung có các size 32/36/40px. Ưu tiên 40px cho thao tác chính và vùng chạm khoảng 44px cho nút icon trên mobile.
- Giữ focus outline rõ. Không xóa `outline` mà không có trạng thái focus thay thế.

## 3. Bố cục theo công việc của người dùng

### Trang danh sách

1. Một tiêu đề trang, một câu mô tả ngắn nếu cần, thao tác chính ở cạnh tiêu đề.
2. Một vùng công cụ: tìm kiếm, bộ lọc, cách xem. Bộ lọc ít dùng có thể thu gọn.
3. Danh sách hoặc bảng phẳng, có tên, trạng thái và thông tin giúp lựa chọn.
4. Phân trang theo dữ liệu BE nếu endpoint có phân trang.

Không đặt mỗi bản ghi vào một card riêng chỉ vì dễ viết JSX. Với thành viên nhóm, dùng từng hàng; 5, 7 hoặc số thành viên bất kỳ không được tạo một ô trống cuối lưới.

### Trang chi tiết

- Có “Quay lại”; giữ bộ lọc/trang danh sách trong URL hoặc cơ chế điều hướng sẵn có khi phù hợp.
- Nội dung chính ở cột lớn; thông tin trạng thái và thao tác phụ có thể ở cột nhỏ.
- Dùng một panel cho mỗi nhóm thông tin có ý nghĩa. Trong panel dùng `dl`, hàng và đường phân cách.
- Lịch sử trình bày thành danh sách; dùng nhãn nghiệp vụ, tên người và thời gian, không dump JSON hoặc enum.
- Chỉ mở biểu mẫu sửa, xác nhận hoặc bộ chọn khi người dùng cần. Không bày toàn bộ thao tác ở trạng thái mặc định.

### Biểu mẫu

- Label thật gắn với input; placeholder chỉ là gợi ý, không thay label.
- Nêu rõ trường bắt buộc và lỗi cần sửa. Không dùng thông báo lỗi kỹ thuật làm hướng dẫn.
- Giữ dữ liệu người dùng nhập khi lưu thất bại; không đóng form trước khi biết kết quả.
- Có trạng thái đang gửi và chống gửi trùng; vô hiệu hóa thao tác gây xung đột trong lúc lưu.
- Khi đóng/hủy, đưa focus về nút mở nếu nút còn tồn tại.

## 4. Component và file nên dùng lại

Các đường dẫn dưới đây tính từ thư mục gốc frontend.

| Thành phần | File | Khi dùng |
| --- | --- | --- |
| Layout, sidebar, header | `src/app/layouts/` | Khung chung cho route đã đăng nhập; không tự tạo sidebar/header thứ hai |
| Tiêu đề tab/breadcrumb | `src/app/router/RouteFrame.tsx`, `routes.config.ts` | Thêm nhãn cho route mới; không đưa URL vào title |
| `ExecutionPage`, `ExIcon` | `src/features/execution/execution-ui.tsx` | Khung trang nghiệp vụ, tiêu đề, mô tả, action và link quay lại |
| `ExState` | Cùng file trên | Loading theo phần, lỗi có retry, trạng thái trống có hướng dẫn |
| `ExPagination`, `ExProgress` | Cùng file trên | Phân trang và thanh tiến độ có nhãn hỗ trợ đọc màn hình |
| `ExConfirm` | Cùng file trên | Xác nhận xóa gọn ngay trong trang; đây là vùng xác nhận inline, không phải popup |
| Class `.ex-*` | `src/features/execution/execution.css` | Panel, nút, form, facts, toolbar, badge và layout responsive |
| `Button` | `src/components/ui/Button.tsx` | Nút chung: `primary`, `secondary`, `outline`, `ghost`, `danger`; có prop `icon` |
| `PageLoading` | `src/components/ui/PageLoading.tsx` | Skeleton trang/ngữ cảnh; `fullPage` dành cho màn hình chặn tải toàn trang |
| `Modal` | `src/components/ui/Modal.tsx` | Popup hoặc drawer; title, description, busy, onClose và children |
| `useActionConfirmation` | `src/components/ui/useActionConfirmation.tsx` | Xác nhận bất đồng bộ, có thể yêu cầu lý do |
| `useExecutionMutation` | `src/features/execution/useExecutionMutation.ts` | Thao tác ghi đơn giản trong cụm execution; chống trùng và thông báo kết quả |
| Nhãn/lỗi/ngày giờ | `src/features/execution/execution-utils.ts` | Nhãn trạng thái, thông báo lỗi, datetime UTC+7 |
| Trạng thái đồ án | `src/features/projects/utils/project-status.ts` | `projectStatusLabel`, không hiển thị enum trực tiếp |

`ExecutionPage` tự import `execution.css`. Nếu dùng class `.ex-*` trong một trang không sử dụng component này, bảo đảm stylesheet được import. Modal và PageLoading tự import stylesheet của mình.

Trong một cụm trang, chọn một cách dùng nút nhất quán: class `.ex-button*` hoặc Button chung. Không trộn nhiều kiểu tùy biến cho cùng một cấp hành động. Link điều hướng dùng `<Link>`/`<a>` với style nút; không lồng `<button>` trong link.

CSS mới cần giới hạn theo feature/component. Không ghi đè toàn cục `button`, `section`, mọi `.rounded-*` hoặc mọi `.shadow-*` để ép các trang khác đổi theo. Nếu cần sửa component chung, kiểm tra ảnh hưởng tới các trang đang dùng.

### Ví dụ ghép một trang danh sách

Ví dụ đặt tại `src/features/reports/pages/ReportListExample.tsx`. Đây chỉ là mẫu cách ghép UI trong tài liệu; dữ liệu và callback phải được truyền từ hook/API thật của feature, không tạo route xem trước hay dữ liệu mẫu trong sản phẩm.

```tsx
import { ExecutionPage, ExState } from '../../execution/execution-ui'
import { PageLoading } from '../../../components/ui/PageLoading'

type Props = {
  loading: boolean
  error: string | null // Thông báo đã chuyển sang ngôn ngữ người dùng.
  reports: Array<{ id: number; title: string }>
  onRetry: () => void
  onCreate: () => void
  canCreate: boolean
}

export function ReportListExample({
  loading, error, reports, onRetry, onCreate, canCreate,
}: Props) {
  if (loading) return <PageLoading label="Đang tải báo cáo…" />

  return (
    <ExecutionPage
      title="Báo cáo tiến độ"
      description="Theo dõi nội dung nhóm đã báo cáo và nhận xét của giảng viên."
      action={canCreate && (
        <button type="button" className="ex-button ex-button-primary" onClick={onCreate}>
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          Tạo báo cáo
        </button>
      )}
    >
      <section className="ex-panel" aria-label="Danh sách báo cáo">
        {error ? <ExState message={error} retry={onRetry} /> : reports.length ? (
          <ul className="divide-y divide-slate-100">
            {reports.map(report => (
              <li key={report.id} className="ex-padding">{report.title}</li>
            ))}
          </ul>
        ) : (
          <ExState title="Chưa có báo cáo" message="Báo cáo của nhóm sẽ xuất hiện tại đây." />
        )}
      </section>
    </ExecutionPage>
  )
}
```

## 5. Popup và xác nhận thao tác

- Dùng Modal chung; không dùng `window.alert`, `window.confirm`, `window.prompt` hoặc phiên bản gọi trực tiếp `alert/confirm/prompt`.
- Modal dùng `<dialog>` của HTML với giao diện của ứng dụng, **không phải** hộp thoại “localhost says”.
- Chỉ có một title và nút đóng; không tự thêm lớp header hoặc backdrop thứ hai bên trong Modal.
- Nút hủy/đóng rõ ràng; Escape đóng khi không đang lưu. Khi `busy`, ngăn đóng gây mất trạng thái đang gửi và vô hiệu hóa các thao tác xung đột.
- Popup vừa màn hình; nội dung dài cuộn bên trong. Drawer trên mobile không được có khoảng hở do chiều rộng mặc định của trình duyệt.
- Xác nhận nên nêu đối tượng và hậu quả cụ thể, ví dụ “Xóa công việc này?”; nút ghi “Xóa công việc” thay vì mọi nơi đều ghi “OK”.

Hook xác nhận trả `null` nếu hủy; trả chuỗi rỗng nếu đã xác nhận mà không yêu cầu lý do; trả lý do đã trim nếu có trường lý do. **Không dùng `if (!result)` để kiểm tra hủy.**

```tsx
const { requestConfirmation, confirmationDialog } = useActionConfirmation()

// Trong handler của một thao tác có thật:
const result = await requestConfirmation({
  title: 'Từ chối xác minh',
  description: 'Nêu nội dung còn thiếu để sinh viên biết cách bổ sung.',
  confirmLabel: 'Từ chối xác minh',
  danger: true,
  reasonLabel: 'Lý do từ chối',
})
if (result === null) return
// Gửi result qua API của feature; chỉ thông báo thành công khi BE chấp nhận.
```

Render `{confirmationDialog}` trong JSX của component dùng hook. Tham khảo cách dùng đầy đủ ở `QualificationVerificationPage.tsx`, `LecturerWorkspacePage.tsx` và `ProjectReviewPage.tsx`; phần popup là tham chiếu, không lấy toàn bộ bố cục/copy cũ của các trang đó làm chuẩn.

**Ngoại lệ:** cảnh báo đóng tab/tải lại khi có nội dung chưa lưu vẫn dùng `beforeunload`, do trình duyệt kiểm soát. Không bỏ bảo vệ này để tránh mất bài đang viết. Chuyển trang bên trong app dùng xác nhận riêng của ứng dụng.

## 6. Loading, lỗi, trống và quyền

| Trạng thái | Hiển thị đúng |
| --- | --- |
| Chưa biết ngữ cảnh tài khoản/nhóm | Skeleton; không tạm gán “Chưa có nhóm”, “Đang kiện toàn” hoặc mở menu cũ |
| Đang tải một phần | Skeleton của phần đó; các phần đã có dữ liệu vẫn dùng được |
| API lỗi | Thông báo ngắn và retry khi phù hợp; giữ phân biệt với chưa có dữ liệu |
| BE trả danh sách rỗng | Nêu đối tượng chưa có; hướng dẫn hành động tiếp theo nếu có quyền |
| Không được phép | Giải thích ngắn theo ngữ cảnh; không hiện nút thao tác giả hoặc cho phép bằng điều kiện FE tự đoán |
| Đang ghi | “Đang lưu…”, “Đang gửi…”; chống submit trùng và giữ nội dung |
| Lưu thất bại | Giữ form, chỉ ra việc cần kiểm tra/thử lại; không báo thành công trước |

Không dùng số 0 hoặc “Chưa có…” để che lỗi tải. Không có dữ liệu về một metric thì hiện “Chưa tải được”/“Chưa có thông tin” theo nguyên nhân, không tự dựng phần trăm.

Trạng thái phải phù hợp giai đoạn nghiệp vụ: ví dụ nhóm đã chốt thực hiện đồ án không hiển thị khối FAIL điều kiện đăng ký dành cho giai đoạn lập nhóm.

## 7. Tiếng Việt và nội dung người dùng

Viết như phần mềm dành cho sinh viên, giảng viên và bộ môn. Mỗi câu nên giúp người dùng hiểu đang xem gì hoặc cần làm gì. Không dịch từng từ từ tiếng Anh rồi ghép lại.

| Ý nghĩa | Nhãn thống nhất |
| --- | --- |
| Workspace của nhóm | Phối hợp nhóm |
| Task / Assignee | Công việc / Người phụ trách |
| Milestone / Timeline | Mốc đồ án / Lịch thực hiện |
| Deliverable | Hạng mục cần nộp |
| Progress report | Báo cáo tiến độ |
| Team / Project dossier | Thành viên nhóm / Hồ sơ đồ án |
| Supervisor | Giảng viên hướng dẫn |
| TODO / IN_PROGRESS | Chưa bắt đầu / Đang làm |
| BLOCKED / IN_REVIEW / DONE | Đang vướng mắc / Chờ kiểm tra / Hoàn thành |
| ACTIVE của đồ án | Đang thực hiện |
| Mutation success | Đã lưu thay đổi. / Đã gửi báo cáo. |
| Load failure | Chưa tải được [thông tin]. Hãy thử lại. |

Ví dụ tránh: “Backend chưa trả Project”, “API BACKEND”, “Domain workflow engine”, “Frontend không suy diễn contract”, “Department scope bị reject”. Viết theo ngữ cảnh: “Chưa tải được hồ sơ đồ án”, “Bạn chưa có quyền xem thông tin này”.

- Enum, endpoint, snapshot ID và chi tiết triển khai nằm trong code/log, không phải nội dung hướng dẫn trên trang.
- Ưu tiên tên người, tên ngành, tên đồ án. Mã sinh viên/mã đồ án có ý nghĩa nghiệp vụ vẫn được hiển thị; không nhầm chúng với ID nội bộ.
- Nếu API thiếu tên, dùng nhãn trung tính hoặc mã tham chiếu cần thiết để phân biệt; không bịa danh tính. Ghi nhận thiếu dữ liệu trong bàn giao nếu ảnh hưởng thao tác.
- Dùng nhãn đúng cho hủy, hết hạn, từ chối, hoàn thành; không gom các trạng thái khác nhau thành một kết quả sai.
- **Giữ nguyên nội dung người dùng nhập**: tên, mô tả, mục tiêu, nhận xét. Không tự dịch hoặc sửa dữ liệu gốc để giao diện trông đồng bộ.

## 8. Tích hợp BE và điều hướng

- Dùng API/client xác thực hiện có của feature. `src/services/service-gateway.ts` gom một số module; các feature khác có API riêng thì dùng API đó. Không tự tạo hệ fetch/token mới.
- Endpoint BE đã có phải được gọi trực tiếp. Không thêm mock runtime, số liệu hardcode hoặc trang “bảng xem trước”. Unit tests có thể mock transport để kiểm tra hành vi.
- FE trình bày và kiểm tra đầu vào; BE quyết định quyền, điều kiện và chuyển trạng thái cuối cùng. Dùng action/permission đã có, không chỉ suy từ chức danh hoặc một boolean tự tạo.
- Tìm kiếm, lọc, phân trang phải phù hợp contract. Không lọc trên một trang dữ liệu rồi trình bày như toàn bộ kết quả.
- Ngày `DateOnly` giữ nguyên ngày. Datetime UTC hiển thị UTC+7; các timestamp SQL thiếu offset trong hệ thống hiện được xử lý là UTC. Dùng helper đã có, không tự parse theo múi giờ máy người dùng.
- Route mới cần đăng ký đúng guard và cập nhật `getBreadcrumbForPath` trong `routes.config.ts`. `RouteFrame` cập nhật title sẵn có; không tự thêm `<title>` thứ hai ở từng page.
- Không dùng pathname, query string hoặc URL làm tiêu đề mặc định. Route không tồn tại có nhãn “Trang không tồn tại”.

## 9. Mobile và khả năng sử dụng

- Kiểm tra tối thiểu desktop khoảng 1440px, màn hình vừa và mobile 390px; thu nhỏ thêm khoảng 360px để phát hiện giới hạn.
- Trang không được cuộn ngang ngoài ý muốn. Bảng/biểu đồ cần rộng có thể cuộn trong vùng riêng, không kéo cả layout.
- Dùng `min-width: 0`, `minmax(0, 1fr)`, wrap nội dung và action; không ép chuỗi dài vào cột cố định.
- Thao tác quan trọng không chỉ xuất hiện khi hover. Button icon phải có `aria-label`.
- Icon trang trí dùng `aria-hidden="true"`; trạng thái không chỉ dựa vào màu.
- Kiểm tra Tab, Shift+Tab, Escape, focus sau đóng popup và menu mobile. Menu đóng không được còn nằm trong luồng bàn phím.
- Không thêm animation liên tục hoặc chuyển động để lấp màn hình; hiệu ứng hover/focus nhẹ là đủ cho phần mềm quản lý đồ án.

## 10. Checklist trước khi bàn giao

- [ ] Đã xem các trang tham chiếu mới; không lấy trang cũ bất kỳ làm chuẩn.
- [ ] Không gradient, glass/blur, card lồng card, shadow trang trí hoặc radius lệch hệ.
- [ ] Các nút hoạt động thật, rõ cấp chính/phụ; chữ và icon thẳng hàng.
- [ ] Không còn “Sắp có”, badge API, enum, debug text hoặc khối trống không có ý nghĩa.
- [ ] Loading từ lần tải mới/mạng chậm không làm nháy layout cũ hoặc trạng thái nhóm giả.
- [ ] Có trạng thái tải, trống, lỗi, thiếu quyền và đang ghi; lỗi không biến thành số 0.
- [ ] Popup dùng UI ứng dụng; hủy không gọi API ghi; Escape/focus/busy đúng.
- [ ] Title và breadcrumb đúng trên route danh sách, chi tiết, tạo mới và route không tồn tại.
- [ ] Đã kiểm tra tên dài, số bản ghi lẻ, nhiều trang dữ liệu và mobile; không tràn ngang toàn trang.
- [ ] API, payload, pagination, ngày giờ và quyền đúng; không tự sửa/dịch dữ liệu người dùng.
- [ ] Audit bằng **Chrome DevTools MCP**: ảnh giao diện, console, network, thao tác và trạng thái tải. Không chỉ xem JSX hoặc chạy build.
- [ ] Chạy `pnpm lint`, `pnpm build`, tests liên quan nghiệp vụ thay đổi và `git diff --check`. Không viết test chỉ để chụp lại chi tiết CSS; cần kiểm tra hành vi, quyền, lỗi hoặc payload có ý nghĩa.
- [ ] Bàn giao ghi rõ route đã làm, vai trò/dữ liệu đã kiểm tra và phần chưa kiểm chứng. Không nói đã kiểm tra mọi vai trò khi chỉ đăng nhập sinh viên.

## 11. Trang tham chiếu và cách phối hợp

Các màn hình tham chiếu chính:

- `/project/workspace`: Phối hợp nhóm, tiến độ theo hàng, nhóm có 5 thành viên.
- `/project/tasks` và `/project/tasks/:taskId`: danh sách, bộ lọc, form và chi tiết.
- `/project/milestones` và `/project/milestones/:milestoneId`: danh sách phẳng, tiến độ và thao tác theo quyền.
- `/project/gantt`: lịch thực hiện, cuộn ngang trong biểu đồ.
- `/projects/lifecycle`: hồ sơ và lịch sử thật, không bảng giải thích hệ thống.

Tham chiếu ý tưởng cụ thể, không bắt mọi feature phải có cùng số cột/khối. Với chức năng mới, ưu tiên thông tin và thao tác người dùng cần nhất ở lần mở đầu tiên; phần ít dùng để thu gọn hoặc mở theo yêu cầu.

Khi nhiều member làm song song, hạn chế chỉnh cùng các file layout/token/shared UI. Thống nhất thay đổi chung trước, giữ CSS feature có phạm vi rõ và audit lại trang đã hoàn thành khi thay shared component.

Các trang cũ theo vai trò và luồng đăng ký chưa phải toàn bộ đã chuyển sang chuẩn này. Xem phạm vi thực tế ở [ui-redesign-checkpoint.md](ui-redesign-checkpoint.md); hướng thiết kế ban đầu ở [design-c.md](design-c.md).

### Đoạn yêu cầu có thể gửi cho công cụ AI của member

> Đọc `docs/frontend-ui-guide.md` và code component chung trước khi làm giao diện AI-PMS. Dùng hướng C: nền phẳng, xanh trầm, radius 6px, spacing nền 4px có điều chỉnh, danh sách rõ và ít khối thừa. Không gradient, glassmorphism, card lồng card, shadow trang trí hoặc nút giả. Tái sử dụng layout, ExecutionPage/ExState, Button, Modal và PageLoading khi phù hợp; không tạo hệ giao diện thứ hai. Dùng tiếng Việt theo ngữ cảnh, không đưa enum/API/debug text lên trang và không dịch lại dữ liệu người dùng. Gọi API BE đã có, giữ đúng quyền và nghiệp vụ. Làm đủ tải/lỗi/trống/busy, popup/focus, title/breadcrumb và mobile. Audit lại các trang liên quan bằng Chrome DevTools MCP trước khi mở rộng, chạy các kiểm tra cần thiết rồi ghi rõ phạm vi đã kiểm chứng.
