# 06 — ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION ASSIGNMENT MATRIX
**AI-PMS (Academic Information & Project Management System)**  
**Security Model:** ASP.NET Core Claims-based Authorization / Policy Requirements  

---

## 1. System Roles Definition

| Role Identifier | Display Name | Academic Context / Responsibility |
| :--- | :--- | :--- |
| `STUDENT_MEMBER` | Sinh viên thành viên | Active team member; creates tasks, uploads evidence, attends meetings. |
| `STUDENT_LEADER` | Nhóm trưởng sinh viên | Team representative; creates team, invites members, signs off gate submissions, files appeals. |
| `SUPERVISOR` | Giảng viên hướng dẫn | Mentors team, reviews proposals, conducts weekly syncs, provides continuous feedback. |
| `INDEPENDENT_REVIEWER` | Cán bộ phản biện / Giám khảo | Evaluates review gate evidence and pre-defense deliverables (isolated from supervision). |
| `COUNCIL_MEMBER` | Thành viên hội đồng bảo vệ | Scores final oral defense (Chair, Secretary, Reviewer, Member). |
| `DEPARTMENT_HEAD` | Chủ nhiệm bộ môn | Manages cohort policies, assigns reviewers, overrides gate decisions, resolves appeals. |
| `ACADEMIC_ADMIN` | Quản trị viên giáo vụ / Hệ thống | Manages semesters, user accounts, system configuration, database audit. |

---

## 2. Comprehensive RBAC Action Matrix

*Legend: `C` = Create, `R` = Read, `U` = Update, `D` = Delete, `X` = Execute / Transition, `-` = Forbidden*

| Domain & Operation | Student Member | Student Leader | Supervisor | Reviewer | Council Member | Dept Head | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Team Management** | | | | | | | |
| Create Team & Invite Members | - | **C** | - | - | - | - | C/U/D |
| Accept/Decline Invitation | **X** | **X** | - | - | - | - | - |
| Remove Member / Transfer Leader | - | **U/D** | - | - | - | **U/D** | U/D |
| **Project Proposals** | | | | | | | |
| Draft & Submit Proposal | - | **C/U** | - | - | - | - | C/U |
| Endorse / Request Revision | - | - | **X** | - | - | - | - |
| Approve / Reject (Final) | - | - | - | - | - | **X** | X |
| **Milestones, Tasks & Sprints** | | | | | | | |
| View Project Backlog | **R** | **R** | **R** | **R** | **R** | **R** | R |
| Create / Edit Task | **C/U** | **C/U** | - | - | - | - | U/D |
| Start / Complete Sprint | - | **X** | - | - | - | - | X |
| Update Milestone Target Dates | - | - | **U** | - | - | **U** | U |
| **Meetings & LiveKit Video** | | | | | | | |
| Schedule Meeting | - | **C** | **C** | - | - | - | C |
| Join LiveKit Room | **X** | **X** | **X** | **R (Audit)** | - | **R (Audit)**| X |
| Publish Audio/Video Stream | **X** | **X** | **X** | - | - | - | - |
| Sign-off Meeting Minutes | - | **U** | **X** | - | - | - | - |
| **Review Gates Operations** | | | | | | | |
| View Gate Timeline & Status | **R** | **R** | **R** | **R** | **R** | **R** | R |
| Upload Gate Evidence Item | **C/U** | **C/U** | - | - | - | - | C/U |
| Remove Uploaded Evidence | - | **D** | - | - | - | - | D |
| Submit Gate For Review | - | **X** | - | - | - | - | X |
| Mentor Pre-Check Sign-off | - | - | **X** | - | - | - | - |
| Evaluate Gate (Rubric Scoring) | - | - | -* | **C/U/X** | - | - | - |
| Assign Independent Reviewers | - | - | - | - | - | **C/U** | C/U |
| Override Gate Decision | - | - | - | - | - | **X** | X |
| Configure Gate Templates | - | - | - | - | - | **C/U** | C/U |
| View Department Gate Matrix | - | - | **R (Cohort)**| - | - | **R (Full)** | R (Full)|
| **Defense & Evaluation** | | | | | | | |
| Submit Final Thesis Bundle | - | **C/U** | - | - | - | - | C/U |
| Score Final Defense (Rubric) | - | - | - | - | **C/U/X** | - | - |
| Finalize Council Scores | - | - | - | - | **X (Chair)** | **X** | X |
| View Individual Score Breakdown| **R (Own)** | **R (Own)**| **R (Team)**| - | **R (Session)**| **R (All)** | R (All) |
| **Appeals & Resolutions** | | | | | | | |
| File Grade / Gate Appeal | - | **C** | - | - | - | - | - |
| Review Appeal Case & Resolve | - | - | - | - | - | **C/U/X** | X |

*\*Note: Supervisors are strictly forbidden from evaluating review gates for projects they mentor (Isolation Invariant).*

---

## 3. ASP.NET Core Authorization Policy Definitions

The backend must register the following standard Authorization Policies in `Program.cs` / `ServiceCollectionExtensions.cs`:

1. `Policy: ProjectMemberOnly`
   - Requirement: User must have claim `Role: Student` AND must be an active record in `ProjectMembers` for the target `projectId`.
2. `Policy: ProjectLeaderOnly`
   - Requirement: User must be `ProjectMemberOnly` AND `IsLeader == true`.
3. `Policy: AssignedSupervisorOnly`
   - Requirement: User must have claim `Role: Supervisor` AND match `Project.SupervisorId == CurrentUser.Id`.
4. `Policy: AssignedGateReviewerOnly`
   - Requirement: User must have claim `Role: Reviewer` AND exist in `GateReviewerAssignments` for the target `gateId`.
5. `Policy: NonConflictedReviewer`
   - Requirement: `CurrentUser.Id != Project.SupervisorId` AND `CurrentUser.Id != Project.CoSupervisorId`.
6. `Policy: DepartmentHeadOnly`
   - Requirement: User must have claim `Role: DepartmentHead` AND `DepartmentId == TargetProject.DepartmentId`.
7. `Policy: DefenseCouncilMemberOnly`
   - Requirement: User must be registered in `CouncilMembers` for the active `councilId`.
