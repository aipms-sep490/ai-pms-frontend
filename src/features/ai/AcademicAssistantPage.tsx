import { AcademicAssistantPanel } from './components/AcademicAssistantPanel'

export function AcademicAssistantPage() {
  return <main className="workspace-page mx-auto max-w-5xl space-y-5 pb-12"><header><p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">Trợ lý AI</p><h1 className="mt-1 font-heading text-2xl font-bold text-ink">Trợ lý AI học vụ</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">Hỏi đáp, giải thích kiến thức và tra cứu học vụ trong cùng một nơi.</p></header><AcademicAssistantPanel /></main>
}
