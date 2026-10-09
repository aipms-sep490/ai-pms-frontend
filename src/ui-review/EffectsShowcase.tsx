import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { SpotlightLink } from '../components/ui/SpotlightLink'
import { useEntranceMotion } from '../components/ui/useEntranceMotion'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import '../index.css'
import '../components/ui/workspace-page.css'
import './effects-showcase.css'

export function EffectsShowcase() {
  const [open, setOpen] = useState<'dialog' | 'drawer' | null>(null)
  const [replay, setReplay] = useState(0)
  const [preview, setPreview] = useState<'all'|'unread'>('all')
  const [notice, setNotice] = useState('Di chuột vào ô chức năng hoặc dùng Tab để xem phản hồi.')
  const entrance = useEntranceMotion<HTMLDivElement>(String(replay))
  const areas = [
    ['tasks', 'Công việc', 'Theo dõi việc được giao, hạn hoàn thành và vướng mắc.'],
    ['meetings', 'Lịch họp và biên bản', 'Xem người tham gia, nội dung trao đổi và bước tiếp theo.'],
    ['reports', 'Báo cáo tiến độ', 'Ghi nhận kết quả, kế hoạch và phản hồi của giảng viên.'],
    ['deliverables', 'Hạng mục cần nộp', 'Quản lý phiên bản, tài liệu và nhận xét cho từng đầu ra.'],
  ]
  return <main className="effects-showcase workspace-page">
    <header className="effects-heading"><a className="effects-back" href="/ui-changes.html"><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Báo cáo thay đổi</a><span className="effects-kicker">Bộ component AI-PMS</span><h1>Khám phá giao diện mới</h1><p>Thử các component đang dùng trên web: ô chức năng, nút bấm, bộ lọc và hộp thoại. Mọi thao tác tại đây chỉ để trải nghiệm, không lưu dữ liệu.</p></header>
    <section className="effects-controls" aria-labelledby="effects-control-title"><div><h2 id="effects-control-title">Thử các tương tác</h2><p>Chọn một thao tác để xem cách nội dung xuất hiện và phản hồi.</p></div><div className="effects-control-actions"><Button size="lg" variant="outline" icon="replay" onClick={() => setReplay(value => value + 1)}>Chuyển trang</Button><Button size="lg" onClick={() => setOpen('dialog')} icon="open_in_new">Mở hộp thoại</Button><Button size="lg" variant="outline" onClick={() => setOpen('drawer')} icon="view_sidebar">Mở ngăn chi tiết</Button></div></section>
    <div ref={entrance}><nav className="workspace-launchpad grid sm:grid-cols-2" aria-label="Demo ô chức năng">{areas.map(([path,title,description])=><SpotlightLink key={path} to={`/${path}`} className="flex flex-col gap-3" onClick={event=>{event.preventDefault();setNotice(`Bạn đã chọn “${title}”. Trong web chính, ô này mở chức năng tương ứng.`)}}><strong>{title}</strong><span className="text-sm leading-6 text-slate-600">{description}</span><span className="workspace-action-link">Xem chi tiết <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></span></SpotlightLink>)}</nav></div>
    <p className="effects-status" role="status">{notice}</p>
    <section className="effects-inbox"><div className="effects-inbox-heading"><div><span className="effects-kicker">Component bổ sung · thông báo</span><h2>Bộ lọc có nền trượt</h2></div><SegmentedControl label="Thử bộ lọc thông báo" value={preview} onChange={setPreview} options={[{value:'all',label:'Tất cả'},{value:'unread',label:'Chưa đọc'}]} /></div><p className="text-sm leading-6 text-slate-600">Bấm đổi bộ lọc: phần nền trắng trượt theo lựa chọn, chữ và vùng bấm giữ nguyên. Component này đã áp dụng trên trang thông báo của mọi role.</p><div className="effects-inbox-row"><span className="material-symbols-outlined" aria-hidden="true">notifications_active</span><div><strong>{preview==='all'?'Tất cả cập nhật':'Những cập nhật chưa đọc'}</strong><p>Nội dung minh họa để thử bộ lọc; không lấy từ hộp thông báo thật.</p></div><span className="effects-dot" aria-hidden="true" /></div></section>
    <section className="effects-notes"><h2>Áp dụng ở đâu?</h2><ul><li>Chuyển trang qua AppLayout: khu vực đã đăng nhập của tất cả role.</li><li>Hộp thoại/ngăn chi tiết dùng Modal chung: giữ focus, đóng bằng Escape, khóa đóng khi đang xử lý.</li><li>Ô chức năng giảng viên và hướng dẫn chuyên ngành dùng cùng kiểu surface mới; các link spotlight của bộ môn có icon và ánh sáng.</li><li>Vệt sáng dùng trên Button chính chung; bảng và vùng đọc giữ ổn định.</li><li>Cài đặt giảm chuyển động của hệ điều hành tắt các chuyển động này.</li></ul><p>Tham khảo <a href="https://reactbits.dev/components/spotlight-card">React Bits SpotlightCard</a>, nút tại <a href="https://uiverse.io/">Uiverse</a>; chuyển động dùng <a href="https://motion.dev/docs/react-reduce-bundle-size">Motion mini</a>.</p></section>
    <Modal open={open!==null} title={open==='drawer'?'Ngăn chi tiết — bản thử':'Hộp thoại — bản thử'} description="Bạn đang xem component thật dùng trong các chức năng của hệ thống." drawer={open==='drawer'} onClose={()=>setOpen(null)}><div className="space-y-4"><p className="text-sm leading-6 text-slate-600">Chuyển động chỉ chạy lúc mở. Nội dung vẫn đọc được ngay, bàn phím được giữ trong hộp thoại và quay lại nút mở khi đóng.</p><label className="block text-sm font-medium">Thử nhập nội dung<input className="mt-2 block w-full rounded-lg border border-hairline p-3" placeholder="Không lưu dữ liệu" /></label><div className="flex justify-end gap-3"><Button variant="outline" onClick={()=>setOpen(null)}>Đóng</Button><Button onClick={()=>{setNotice('Đã thử nút chính trong hộp thoại; không lưu dữ liệu.');setOpen(null)}}>Thử hoàn tất</Button></div></div></Modal>
  </main>
}

createRoot(document.getElementById('root')!).render(<MemoryRouter><EffectsShowcase /></MemoryRouter>)
