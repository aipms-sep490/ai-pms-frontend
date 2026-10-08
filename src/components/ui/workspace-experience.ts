export function isDeferredDepartmentPath(path: string) {
  return path.startsWith('/department/') || path === '/academic/governance' || path === '/academic/rubrics' || path.startsWith('/academic/project-periods/')
}

export function normalizeNavigationQuery(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
}

/** Offer only destinations already exposed by the current guarded project workspace. */
export function contextualNavigation(path:string,role:string) {
  if(role!=='lecturer')return []
  const supervisor=path.match(/^\/supervisor\/projects\/([1-9]\d*)\//)
  const mentor=path.match(/^\/mentor\/projects\/([1-9]\d*)\/majors\/([1-9]\d*)\//)
  const base=supervisor?`/supervisor/projects/${supervisor[1]}`:mentor?`/mentor/projects/${mentor[1]}/majors/${mentor[2]}`:null
  if(!base)return []
  const areas=supervisor?[['workspace','Tổng quan đồ án','space_dashboard'],['tasks','Công việc của đồ án','checklist'],['milestones','Mốc đồ án','flag'],['gantt','Lịch thực hiện','view_timeline'],['reports','Báo cáo của đồ án','assignment'],['meetings','Lịch họp của đồ án','calendar_month'],['deliverables','Hạng mục cần nộp','inventory_2'],['files','Tệp của đồ án','folder_open'],['evidence','Minh chứng của đồ án','fact_check'],['contributions','Đóng góp thành viên','groups'],['final-submission','Bàn giao cuối kỳ','verified']]:[['workspace','Tổng quan chuyên ngành','space_dashboard'],['tasks','Công việc chuyên ngành','checklist'],['reports','Báo cáo của đồ án','assignment'],['meetings','Lịch họp của đồ án','calendar_month'],['evidence','Minh chứng chuyên ngành','fact_check']]
  return areas.map(([suffix,title,icon])=>({id:`context-${suffix}`,path:`${base}/${suffix}`,title,icon}))
}
