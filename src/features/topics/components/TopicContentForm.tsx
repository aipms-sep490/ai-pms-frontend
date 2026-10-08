import { useId, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { topicErrorMessage } from '../api/topic-api'
import type { CreateTopic, TopicContent } from '../api/topic-api'
import type { useTopicCatalog } from '../hooks/useTopicCatalog'

const emptyTopicContent: TopicContent = { title: '', description: null, problemStatement: null, objectives: null, expectedOutput: null, domain: null, technologies: [], keywords: [], projectMode: 'SINGLE_MAJOR', primaryMajorId: null, requirements: [] }
type Catalog = ReturnType<typeof useTopicCatalog>
type Props = { initial?: TopicContent; catalog: Catalog; busy: boolean; onSave: (content: TopicContent) => Promise<unknown>; onDirtyChange?: (dirty: boolean) => void; create?: { onCreate: (input: CreateTopic) => Promise<unknown> } }

export function TopicContentForm({ initial = emptyTopicContent, catalog, busy, onSave, onDirtyChange, create }: Props) {
  const [content, setContent] = useState<TopicContent>(() => ({ ...initial, requirements: initial.requirements.map(item => ({ ...item })) }))
  const [code, setCode] = useState(''), [periodId, setPeriodId] = useState(''), [message, setMessage] = useState(''), [success, setSuccess] = useState('')
  const lock = useRef(false), summary = useRef<HTMLDivElement>(null)
  const prefix = useId()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const fieldId = (field: string) => `${prefix}-${field}`
  const attributes = (field: string) => ({ id: fieldId(field), 'aria-invalid': Boolean(fieldErrors[field]), 'aria-describedby': fieldErrors[field] ? `${fieldId(field)}-error` : undefined })
  const inlineError = (field: string) => fieldErrors[field] && <span id={`${fieldId(field)}-error`} className="block text-sm text-status-error-text">{fieldErrors[field]}</span>
  const majors = [...catalog.majors, ...initial.requirements.filter(item => !catalog.majors.some(major => major.id === item.majorId)).map(item => ({ id: item.majorId, name: item.majorName || `Ngành #${item.majorId}`, departmentId: item.departmentId ?? null }))]
  const patch = (field: keyof TopicContent, value: TopicContent[keyof TopicContent]) => { onDirtyChange?.(true); setContent(previous => ({ ...previous, [field]: value })) }
  const requirement = (index: number, field: string, value: string | number) => setContent(previous => ({ ...previous, requirements: previous.requirements.map((item, i) => i === index ? { ...item, [field]: value } : item) }))
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (lock.current || busy) return
    setMessage(''); setSuccess(''); setFieldErrors({})
    const ids = content.requirements.map(item => item.majorId)
    const errors: Record<string, string> = {}
    if (!content.title.trim()) errors.title = 'Nhập tên đề tài.'
    if (create && !periodId) errors.period = 'Chọn kỳ đăng ký.'
    if (create && !code.trim()) errors.code = 'Nhập mã đề tài.'
    if (!ids.length || (content.projectMode === 'SINGLE_MAJOR' && ids.length !== 1)) errors.requirements = 'Đề tài một ngành cần đúng một ngành yêu cầu.'
    if (content.projectMode === 'INTERDISCIPLINARY' && ids.length < 2) errors.requirements = 'Đề tài liên ngành cần ít nhất hai ngành yêu cầu.'
    if (content.projectMode === 'SINGLE_MAJOR' && (!content.primaryMajorId || content.primaryMajorId !== ids[0])) errors.primary = 'Chọn ngành chính trùng với ngành yêu cầu.'
    content.requirements.forEach((item, index) => {
      if (item.majorId < 1 || !majors.some(major => major.id === item.majorId)) errors[`major-${index}`] = 'Chọn ngành trong danh mục.'
      else if (ids.filter(id => id === item.majorId).length > 1) errors[`major-${index}`] = 'Ngành yêu cầu không được trùng.'
      if (!Number.isInteger(item.minMembers) || item.minMembers < 1) errors[`min-${index}`] = 'Số tối thiểu phải là số nguyên từ 1.'
      if (!Number.isInteger(item.maxMembers) || item.maxMembers < item.minMembers) errors[`max-${index}`] = 'Số tối đa phải là số nguyên, không nhỏ hơn tối thiểu.'
      if (!item.responsibility.trim()) errors[`responsibility-${index}`] = 'Nhập trách nhiệm của ngành.'
    })
    if (Object.keys(errors).length) { setFieldErrors(errors); requestAnimationFrame(() => summary.current?.focus()); return }
    lock.current = true
    const value = { ...content, title: content.title.trim(), technologies: content.technologies.map(item => item.trim()).filter(Boolean), keywords: content.keywords.map(item => item.trim()).filter(Boolean), requirements: content.requirements.map(item => ({ majorId: item.majorId, minMembers: item.minMembers, maxMembers: item.maxMembers, responsibility: item.responsibility.trim() })) }
    try {
      if (create) {
        if (!catalog.department || !periodId || !code.trim()) { setMessage('Chọn kỳ đăng ký và nhập mã đề tài trong scope bộ môn đã xác minh.'); return }
        await create.onCreate({ projectPeriodId: Number(periodId), leadDepartmentId: catalog.department.id, code: code.trim(), content: value })
        setContent({ ...emptyTopicContent, requirements: [] }); setCode(''); setPeriodId('')
      } else await onSave(value)
      onDirtyChange?.(false)
      setSuccess(create ? 'Đã tạo bản nháp đề tài.' : 'Đã lưu đầy đủ nội dung đề cương.')
    } catch (reason) { setMessage(topicErrorMessage(reason)); requestAnimationFrame(() => summary.current?.focus()) }
    finally { lock.current = false }
  }
  return <form noValidate className="topic__create space-y-4" onChange={() => onDirtyChange?.(true)} onSubmit={event => void submit(event)}>
    {Object.keys(fieldErrors).length > 0 && <div ref={summary} role="alert" tabIndex={-1} className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text"><p className="font-semibold">Kiểm tra các trường sau trước khi lưu:</p><ul>{Object.entries(fieldErrors).map(([field, error]) => <li key={field}><a className="underline" href={`#${fieldId(field)}`} onClick={event => { event.preventDefault(); document.getElementById(fieldId(field))?.focus() }}>{error}</a></li>)}</ul></div>}
    {message && <div ref={summary} role="alert" tabIndex={-1} className="rounded-lg border border-status-error-border bg-status-error-bg p-4 text-sm text-status-error-text">{message}</div>}
    {success && <p role="status" className="text-sm text-status-success-text">{success}</p>}
    {catalog.loading && <p role="status">Đang tải kỳ đăng ký và danh mục ngành…</p>}
    {catalog.error && <div role="alert"><p>Chưa tải được danh mục học vụ để chọn kỳ/ngành.</p><Button type="button" variant="secondary" onClick={catalog.retry}>Tải lại danh mục</Button></div>}
    <fieldset disabled={busy || catalog.loading} className="space-y-4">
      {create && <div className="topic__form-grid"><label>Kỳ đăng ký<select {...attributes('period')} aria-label="Kỳ đăng ký" required value={periodId} onChange={event => setPeriodId(event.target.value)}><option value="">Chọn kỳ đăng ký</option>{catalog.periods.map(period => <option key={period.id} value={period.id}>{period.semesterCode} · {period.name}</option>)}</select>{inlineError('period')}</label><label>Mã đề tài<input aria-label="Mã đề tài" {...attributes('code')} required value={code} onChange={event => setCode(event.target.value)} />{inlineError('code')}</label><p className="topic__wide text-sm">Khoa chủ trì: {catalog.department?.name || 'Chưa có scope đã xác minh'}. Hệ thống kiểm tra lại thời gian và chính sách kỳ khi lưu.</p></div>}
      <div className="topic__form-grid"><label className="topic__wide">Tên đề tài<input aria-label="Tên đề tài" {...attributes('title')} required value={content.title} onChange={event => patch('title', event.target.value)} />{inlineError('title')}</label>
      {([{ key: 'description', label: 'Mô tả' }, { key: 'problemStatement', label: 'Bối cảnh và vấn đề' }, { key: 'objectives', label: 'Mục tiêu' }, { key: 'expectedOutput', label: 'Sản phẩm kỳ vọng' }] as const).map(field => <label key={field.key} className="topic__wide">{field.label}<textarea rows={3} value={content[field.key] ?? ''} onChange={event => patch(field.key, event.target.value || null)} /></label>)}
      <label>Lĩnh vực<input value={content.domain ?? ''} onChange={event => patch('domain', event.target.value || null)} /></label><label>Công nghệ (phân cách bằng dấu phẩy)<input value={content.technologies.join(',')} onChange={event => patch('technologies', event.target.value.split(','))} /></label><label>Từ khóa (phân cách bằng dấu phẩy)<input value={content.keywords.join(',')} onChange={event => patch('keywords', event.target.value.split(','))} /></label>
      <label>Hình thức đồ án<select aria-label="Hình thức đồ án" value={content.projectMode} onChange={event => setContent(previous => ({ ...previous, projectMode: event.target.value as TopicContent['projectMode'], primaryMajorId: null }))}><option value="SINGLE_MAJOR">Một ngành</option><option value="INTERDISCIPLINARY">Liên ngành</option></select></label>
      {content.projectMode === 'SINGLE_MAJOR' && <label>Ngành chính<select {...attributes('primary')} aria-label="Ngành chính" required value={content.primaryMajorId ?? ''} onChange={event => patch('primaryMajorId', Number(event.target.value))}><option value="">Chọn ngành chính</option>{majors.filter(major => major.departmentId === catalog.department?.id || major.id === initial.primaryMajorId).map(major => <option key={major.id} value={major.id}>{major.name}</option>)}</select>{inlineError('primary')}</label>}</div>
      <h3 {...attributes('requirements')} tabIndex={-1} className="font-semibold">Yêu cầu và trách nhiệm theo ngành</h3>{inlineError('requirements')}
      {content.requirements.map((item, index) => <fieldset key={index} className="rounded-lg border border-hairline p-4"><legend className="px-2 text-sm font-semibold">Ngành yêu cầu {index + 1}</legend><div className="topic__form-grid"><label>Ngành yêu cầu {index + 1}<select {...attributes(`major-${index}`)} aria-label={`Ngành yêu cầu ${index + 1}`} required value={item.majorId || ''} onChange={event => requirement(index, 'majorId', Number(event.target.value))}><option value="">Chọn ngành</option>{majors.map(major => <option key={major.id} value={major.id}>{major.name}</option>)}</select>{inlineError(`major-${index}`)}</label><label>Tối thiểu {index + 1}<input aria-label={`Tối thiểu ${index + 1}`} {...attributes(`min-${index}`)} required type="number" min={1} step={1} value={item.minMembers} onChange={event => requirement(index, 'minMembers', Number(event.target.value))} />{inlineError(`min-${index}`)}</label><label>Tối đa {index + 1}<input aria-label={`Tối đa ${index + 1}`} {...attributes(`max-${index}`)} required type="number" min={item.minMembers} step={1} value={item.maxMembers} onChange={event => requirement(index, 'maxMembers', Number(event.target.value))} />{inlineError(`max-${index}`)}</label><label className="topic__wide">Trách nhiệm {index + 1}<textarea aria-label={`Trách nhiệm ${index + 1}`} {...attributes(`responsibility-${index}`)} required rows={2} value={item.responsibility} onChange={event => requirement(index, 'responsibility', event.target.value)} />{inlineError(`responsibility-${index}`)}</label></div><Button type="button" variant="secondary" onClick={() => patch('requirements', content.requirements.filter((_, i) => i !== index))}>Xóa ngành {index + 1}</Button></fieldset>)}
      <Button type="button" variant="secondary" onClick={() => patch('requirements', [...content.requirements, { majorId: 0, minMembers: 1, maxMembers: 1, responsibility: '' }])}>Thêm ngành yêu cầu</Button>
      <p className="text-sm text-slate-600">Bản nháp có thể chưa đủ nội dung để công bố. Trước khi công bố, cần hoàn thiện bối cảnh, mục tiêu, sản phẩm, lĩnh vực, công nghệ và từ khóa; BE kiểm tra điều kiện cuối.</p>
      <Button type="submit" disabled={busy || !!catalog.error || (create !== undefined && !catalog.department)}>{busy ? 'Đang lưu…' : create ? 'Tạo bản nháp' : 'Lưu bản nháp'}</Button>
    </fieldset>
  </form>
}
