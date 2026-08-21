import {
  DashboardHeader,
  DashboardMetrics,
  MilestoneTimeline,
  TaskList,
  AiPreview,
  ContributionPreview,
} from '../../features/dashboard/components'
import { dashboardPreviewData } from '../../features/dashboard/fixtures/dashboard-preview'

export function OverviewPage() {
  const data = dashboardPreviewData

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header with simulation banner & project metadata */}
      <DashboardHeader
        projectCode={data.projectCode}
        groupCode={data.groupCode}
        semester={data.semester}
        projectName={data.projectName}
        teamLeader={data.teamLeader}
        supervisor={data.supervisor}
        currentMilestone={data.currentMilestone}
      />

      {/* 2. 4-Grid Telemetry KPIs */}
      <DashboardMetrics metrics={data.metrics} />

      {/* 3. 6-Milestone Academic Roadmap */}
      <MilestoneTimeline milestones={data.milestones} />

      {/* 4. Two-Column Workspace (60/40 Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Task Stream (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <TaskList tasks={data.tasks} />
        </section>

        {/* Right Column: AI Assistant & Member Contribution (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <AiPreview insight={data.aiInsight} />
          <ContributionPreview contributions={data.contributions} />
        </section>
      </div>
    </div>
  )
}
