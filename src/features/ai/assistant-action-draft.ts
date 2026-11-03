import type { AssistantDraft, AssistantReportDraft, AssistantTaskDraft } from './academic-ai-api'

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown, max = 4000) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const day = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : ''
export function readActionDraft(value: unknown, projectId: number, kind: AssistantDraft['kind']): AssistantDraft | undefined {
  const d = object(value)
  if (d.kind !== kind || d.projectId !== projectId || typeof d.title !== 'string' || !d.title.trim() || typeof d.description !== 'string') return undefined
  const t = object(d.task), r = object(d.report)
  const task: AssistantTaskDraft = {
    dueAt: typeof t.dueAt === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(t.dueAt) && Number.isFinite(Date.parse(t.dueAt)) ? t.dueAt : null,
    priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(String(t.priority)) ? String(t.priority) : null,
    milestoneTitle: text(t.milestoneTitle, 255), primaryMajorName: text(t.primaryMajorName, 255),
    assigneeNames: Array.isArray(t.assigneeNames) ? t.assigneeNames.filter((n): n is string => typeof n === 'string').slice(0, 30).map(n => n.trim().slice(0, 255)) : [],
  }
  const report: AssistantReportDraft = { periodStart: day(r.periodStart), periodEnd: day(r.periodEnd), completedWork: text(r.completedWork), inProgressWork: text(r.inProgressWork), blockers: text(r.blockers), risks: text(r.risks), nextActions: text(r.nextActions), plannedWork: text(r.plannedWork) }
  if (!report.periodStart || !report.periodEnd || report.periodEnd < report.periodStart) report.periodStart = report.periodEnd = ''
  return { kind, title: text(d.title, 255), description: text(d.description), task, report }
}

// Only a unique exact name within the current authorized options can preselect an entity.
export function uniqueNameMatch<T>(items: T[], name: string | null | undefined, label: (item: T) => string): T | undefined {
  if (!name?.trim()) return undefined
  const normalize = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi')
  const matches = items.filter(item => normalize(label(item)) === normalize(name))
  return matches.length === 1 ? matches[0] : undefined
}
