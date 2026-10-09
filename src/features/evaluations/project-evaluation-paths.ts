/** Keep resource navigation in the current identity workspace; APIs enforce resource authority. */
export function projectEvaluationPaths(projectId: number | string, pathname: string) {
  const admin = pathname.startsWith('/admin/')
  const root = `/${admin ? 'admin' : 'department'}/projects/${projectId}`
  return { admin, portfolio: admin ? '/admin/portfolio' : '/department/portfolio', scheme: `${root}/evaluation-schemes`, evaluators: `${root}/evaluators`, submission: `${root}/final-submission`, result: `${root}/result` }
}
